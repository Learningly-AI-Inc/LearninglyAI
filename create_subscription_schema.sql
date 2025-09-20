-- Create subscription plans table
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  interval TEXT NOT NULL CHECK (interval IN ('month', 'year')),
  stripe_price_id TEXT UNIQUE,
  features JSONB DEFAULT '{}',
  limits JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user subscriptions table
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'incomplete', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id) -- One active subscription per user
);

-- Create usage tracking table
CREATE TABLE user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  documents_uploaded INTEGER DEFAULT 0,
  ai_requests INTEGER DEFAULT 0,
  storage_used_bytes BIGINT DEFAULT 0,
  search_queries INTEGER DEFAULT 0,
  exam_sessions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

-- Create payment history table
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id),
  stripe_payment_intent_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed', 'canceled')),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_stripe_subscription_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX idx_user_usage_user_id_date ON user_usage(user_id, usage_date);
CREATE INDEX idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX idx_payment_history_stripe_payment_intent_id ON payment_history(stripe_payment_intent_id);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price_cents, currency, interval, stripe_price_id, features, limits) VALUES
('Free', 'Basic features with limited usage', 0, 'USD', 'month', NULL, 
 '{"ai_requests": 10, "document_uploads": 3, "search_queries": 50}', 
 '{"storage_mb": 100, "max_file_size_mb": 10}'),
('Freemium', 'Advanced features with expanded limits', 2000, 'USD', 'month', 'prod_T4pBu37GhWbvsC',
 '{"ai_requests": 100, "document_uploads": 20, "search_queries": 500, "priority_support": true}', 
 '{"storage_mb": 1000, "max_file_size_mb": 50}'),
('Premium', 'Unlimited access with premium features', 10000, 'USD', 'month', 'prod_T4pBIbtWpXJo6c',
 '{"ai_requests": -1, "document_uploads": -1, "search_queries": -1, "priority_support": true, "custom_models": true, "bulk_processing": true}', 
 '{"storage_mb": 10000, "max_file_size_mb": 500}');

-- Enable RLS on all tables
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Subscription plans: Read-only for authenticated users
CREATE POLICY "Users can view subscription plans" ON subscription_plans
  FOR SELECT TO authenticated USING (true);

-- User subscriptions: Users can only access their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON user_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON user_subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- User usage: Users can only access their own usage data
CREATE POLICY "Users can view own usage" ON user_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON user_usage
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON user_usage
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Payment history: Users can only access their own payment history
CREATE POLICY "Users can view own payment history" ON payment_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment history" ON payment_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create functions for subscription management
CREATE OR REPLACE FUNCTION get_user_subscription(user_uuid UUID)
RETURNS TABLE (
  subscription_id UUID,
  plan_name TEXT,
  status TEXT,
  current_period_end TIMESTAMPTZ,
  features JSONB,
  limits JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.id,
    sp.name,
    us.status,
    us.current_period_end,
    sp.features,
    sp.limits
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = user_uuid
  AND us.status IN ('active', 'trialing')
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has exceeded usage limits
CREATE OR REPLACE FUNCTION check_usage_limit(
  user_uuid UUID,
  limit_type TEXT,
  requested_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  current_usage INTEGER;
  usage_limit INTEGER;
  plan_features JSONB;
BEGIN
  -- Get user's current plan features
  SELECT sp.features INTO plan_features
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = user_uuid
  AND us.status IN ('active', 'trialing')
  LIMIT 1;
  
  -- If no subscription, use free plan limits
  IF plan_features IS NULL THEN
    plan_features := '{"ai_requests": 10, "document_uploads": 3, "search_queries": 50}'::jsonb;
  END IF;
  
  -- Get usage limit (-1 means unlimited)
  usage_limit := COALESCE((plan_features ->> limit_type)::INTEGER, 0);
  
  -- If unlimited, return true
  IF usage_limit = -1 THEN
    RETURN true;
  END IF;
  
  -- Get current usage for today
  SELECT COALESCE(SUM(
    CASE 
      WHEN limit_type = 'ai_requests' THEN ai_requests
      WHEN limit_type = 'document_uploads' THEN documents_uploaded
      WHEN limit_type = 'search_queries' THEN search_queries
      WHEN limit_type = 'exam_sessions' THEN exam_sessions
      ELSE 0
    END
  ), 0) INTO current_usage
  FROM user_usage
  WHERE user_id = user_uuid
  AND usage_date = CURRENT_DATE;
  
  -- Check if adding requested amount would exceed limit
  RETURN (current_usage + requested_amount) <= usage_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(
  user_uuid UUID,
  usage_type TEXT,
  amount INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_usage (user_id, usage_date, 
    documents_uploaded, ai_requests, search_queries, exam_sessions)
  VALUES (
    user_uuid, 
    CURRENT_DATE,
    CASE WHEN usage_type = 'document_uploads' THEN amount ELSE 0 END,
    CASE WHEN usage_type = 'ai_requests' THEN amount ELSE 0 END,
    CASE WHEN usage_type = 'search_queries' THEN amount ELSE 0 END,
    CASE WHEN usage_type = 'exam_sessions' THEN amount ELSE 0 END
  )
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    documents_uploaded = user_usage.documents_uploaded + 
      CASE WHEN usage_type = 'document_uploads' THEN amount ELSE 0 END,
    ai_requests = user_usage.ai_requests + 
      CASE WHEN usage_type = 'ai_requests' THEN amount ELSE 0 END,
    search_queries = user_usage.search_queries + 
      CASE WHEN usage_type = 'search_queries' THEN amount ELSE 0 END,
    exam_sessions = user_usage.exam_sessions + 
      CASE WHEN usage_type = 'exam_sessions' THEN amount ELSE 0 END,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
