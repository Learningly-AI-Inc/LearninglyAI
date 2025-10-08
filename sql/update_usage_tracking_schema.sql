-- Update usage tracking schema for new pricing model
-- This adds monthly usage tracking while maintaining backward compatibility

-- Add monthly usage tracking table
CREATE TABLE IF NOT EXISTS monthly_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_month DATE NOT NULL, -- First day of the month (YYYY-MM-01)
  
  -- Monthly usage counters
  documents_uploaded INTEGER DEFAULT 0,
  writing_words INTEGER DEFAULT 0, -- Track writing words separately
  search_queries INTEGER DEFAULT 0,
  exam_sessions INTEGER DEFAULT 0,
  storage_used_bytes BIGINT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure one record per user per month
  UNIQUE(user_id, usage_month)
);

-- Add writing_words column to user_data for backward compatibility
ALTER TABLE user_data 
ADD COLUMN IF NOT EXISTS writing_words INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_monthly_usage_user_id ON monthly_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_usage_month ON monthly_usage(usage_month);
CREATE INDEX IF NOT EXISTS idx_monthly_usage_user_month ON monthly_usage(user_id, usage_month);

-- Enable RLS
ALTER TABLE monthly_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for monthly_usage
-- Drop existing policies if they exist, then create new ones
DO $$ 
BEGIN
    -- Drop policies if they exist
    DROP POLICY IF EXISTS "Users can view their own monthly usage" ON monthly_usage;
    DROP POLICY IF EXISTS "Users can insert their own monthly usage" ON monthly_usage;
    DROP POLICY IF EXISTS "Users can update their own monthly usage" ON monthly_usage;
    
    -- Create new policies
    CREATE POLICY "Users can view their own monthly usage" ON monthly_usage
      FOR SELECT TO authenticated USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own monthly usage" ON monthly_usage
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own monthly usage" ON monthly_usage
      FOR UPDATE TO authenticated USING (auth.uid() = user_id);
END $$;

-- Function to get or create monthly usage record
CREATE OR REPLACE FUNCTION get_or_create_monthly_usage(
  user_uuid UUID,
  target_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)
)
RETURNS UUID AS $$
DECLARE
  usage_id UUID;
BEGIN
  -- Try to get existing record
  SELECT id INTO usage_id
  FROM monthly_usage
  WHERE user_id = user_uuid 
    AND usage_month = target_month;
  
  -- If not found, create new record
  IF usage_id IS NULL THEN
    INSERT INTO monthly_usage (user_id, usage_month)
    VALUES (user_uuid, target_month)
    RETURNING id INTO usage_id;
  END IF;
  
  RETURN usage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated function to check usage limits based on new pricing model
CREATE OR REPLACE FUNCTION check_usage_limit_new(
  user_uuid UUID,
  limit_type TEXT,
  requested_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  current_usage INTEGER;
  usage_limit INTEGER;
  user_plan TEXT;
  current_month DATE := DATE_TRUNC('month', CURRENT_DATE);
  storage_limit BIGINT;
BEGIN
  -- Get user's current plan
  SELECT plan_name INTO user_plan
  FROM user_data
  WHERE user_id = user_uuid
  LIMIT 1;
  
  -- Set limits based on plan (new pricing model)
  CASE user_plan
    WHEN 'Free' THEN
      CASE limit_type
        WHEN 'documents_uploaded' THEN usage_limit := 50; -- 50 documents per month
        WHEN 'writing_words' THEN usage_limit := 5000; -- 5,000 words/month
        WHEN 'search_queries' THEN usage_limit := 40; -- 10 per week = ~40 per month
        WHEN 'exam_sessions' THEN usage_limit := 4; -- 1 per week = ~4 per month
        WHEN 'storage_used_bytes' THEN storage_limit := 250 * 1024 * 1024; -- 250MB
        ELSE usage_limit := 0;
      END CASE;
    WHEN 'Premium (Monthly)' THEN
      CASE limit_type
        WHEN 'documents_uploaded' THEN usage_limit := 3000; -- 100 per day = ~3000 per month
        WHEN 'writing_words' THEN usage_limit := 750000; -- 25,000 per day = ~750,000 per month
        WHEN 'search_queries' THEN usage_limit := 15000; -- 500 per day = ~15,000 per month
        WHEN 'exam_sessions' THEN usage_limit := 1400; -- 50 per week = ~1400 per month
        WHEN 'storage_used_bytes' THEN storage_limit := 10 * 1024 * 1024 * 1024; -- 10GB
        ELSE usage_limit := -1;
      END CASE;
    WHEN 'Premium (Yearly)' THEN
      CASE limit_type
        WHEN 'documents_uploaded' THEN usage_limit := 3000; -- 100 per day = ~3000 per month
        WHEN 'writing_words' THEN usage_limit := 750000; -- 25,000 per day = ~750,000 per month
        WHEN 'search_queries' THEN usage_limit := 15000; -- 500 per day = ~15,000 per month
        WHEN 'exam_sessions' THEN usage_limit := 1400; -- 50 per week = ~1400 per month
        WHEN 'storage_used_bytes' THEN storage_limit := 10 * 1024 * 1024 * 1024; -- 10GB
        ELSE usage_limit := -1;
      END CASE;
    ELSE
      usage_limit := 0; -- Default to no access
  END CASE;
  
  -- If unlimited, return true
  IF usage_limit = -1 THEN
    RETURN true;
  END IF;
  
  -- Get current usage from monthly_usage table
  CASE limit_type
    WHEN 'documents_uploaded' THEN
      SELECT COALESCE(documents_uploaded, 0) INTO current_usage 
      FROM monthly_usage 
      WHERE user_id = user_uuid AND usage_month = current_month;
    WHEN 'writing_words' THEN
      SELECT COALESCE(writing_words, 0) INTO current_usage 
      FROM monthly_usage 
      WHERE user_id = user_uuid AND usage_month = current_month;
    WHEN 'search_queries' THEN
      SELECT COALESCE(search_queries, 0) INTO current_usage 
      FROM monthly_usage 
      WHERE user_id = user_uuid AND usage_month = current_month;
    WHEN 'exam_sessions' THEN
      SELECT COALESCE(exam_sessions, 0) INTO current_usage 
      FROM monthly_usage 
      WHERE user_id = user_uuid AND usage_month = current_month;
    WHEN 'storage_used_bytes' THEN
      SELECT COALESCE(storage_used_bytes, 0) INTO current_usage 
      FROM monthly_usage 
      WHERE user_id = user_uuid AND usage_month = current_month;
    ELSE
      current_usage := 0;
  END CASE;
  
  -- Check if adding requested amount would exceed limit
  IF limit_type = 'storage_used_bytes' THEN
    RETURN (current_usage + requested_amount) <= storage_limit;
  ELSE
    RETURN (current_usage + requested_amount) <= usage_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated function to increment monthly usage
CREATE OR REPLACE FUNCTION increment_monthly_usage(
  user_uuid UUID,
  usage_type TEXT,
  amount INTEGER DEFAULT 1,
  target_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)
)
RETURNS VOID AS $$
DECLARE
  usage_id UUID;
BEGIN
  -- Get or create monthly usage record
  SELECT get_or_create_monthly_usage(user_uuid, target_month) INTO usage_id;
  
  -- Update the appropriate counter
  UPDATE monthly_usage SET
    documents_uploaded = documents_uploaded + 
      CASE WHEN usage_type = 'documents_uploaded' THEN amount ELSE 0 END,
    writing_words = writing_words + 
      CASE WHEN usage_type = 'writing_words' THEN amount ELSE 0 END,
    search_queries = search_queries + 
      CASE WHEN usage_type = 'search_queries' THEN amount ELSE 0 END,
    exam_sessions = exam_sessions + 
      CASE WHEN usage_type = 'exam_sessions' THEN amount ELSE 0 END,
    storage_used_bytes = storage_used_bytes + 
      CASE WHEN usage_type = 'storage_used_bytes' THEN amount ELSE 0 END,
    updated_at = now()
  WHERE id = usage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current monthly usage
CREATE OR REPLACE FUNCTION get_monthly_usage(
  user_uuid UUID,
  target_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)
)
RETURNS TABLE (
  documents_uploaded INTEGER,
  writing_words INTEGER,
  search_queries INTEGER,
  exam_sessions INTEGER,
  storage_used_bytes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(mu.documents_uploaded, 0),
    COALESCE(mu.writing_words, 0),
    COALESCE(mu.search_queries, 0),
    COALESCE(mu.exam_sessions, 0),
    COALESCE(mu.storage_used_bytes, 0)
  FROM monthly_usage mu
  WHERE mu.user_id = user_uuid 
    AND mu.usage_month = target_month;
    
  -- If no record found, return zeros
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 0, 0, 0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get usage limits for a plan
CREATE OR REPLACE FUNCTION get_plan_limits(plan_name TEXT)
RETURNS TABLE (
  documents_uploaded INTEGER,
  writing_words INTEGER,
  search_queries INTEGER,
  exam_sessions INTEGER,
  storage_used_bytes BIGINT
) AS $$
BEGIN
  CASE plan_name
    WHEN 'Free' THEN
      RETURN QUERY SELECT 50, 5000, 40, 4, 250 * 1024 * 1024;
    WHEN 'Premium (Monthly)' THEN
      RETURN QUERY SELECT 3000, 750000, 15000, 1400, 10 * 1024 * 1024 * 1024;
    WHEN 'Premium (Yearly)' THEN
      RETURN QUERY SELECT 3000, 750000, 15000, 1400, 10 * 1024 * 1024 * 1024;
    ELSE
      RETURN QUERY SELECT 0, 0, 0, 0, 0;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for easy usage monitoring
CREATE OR REPLACE VIEW user_usage_summary AS
SELECT 
  ud.user_id,
  ud.plan_name,
  ud.subscription_status,
  COALESCE(mu.documents_uploaded, 0) as current_documents_uploaded,
  COALESCE(mu.writing_words, 0) as current_writing_words,
  COALESCE(mu.search_queries, 0) as current_search_queries,
  COALESCE(mu.exam_sessions, 0) as current_exam_sessions,
  COALESCE(mu.storage_used_bytes, 0) as current_storage_used_bytes,
  pl.documents_uploaded as limit_documents_uploaded,
  pl.writing_words as limit_writing_words,
  pl.search_queries as limit_search_queries,
  pl.exam_sessions as limit_exam_sessions,
  pl.storage_used_bytes as limit_storage_used_bytes,
  CASE 
    WHEN pl.documents_uploaded = -1 THEN 0
    ELSE ROUND((COALESCE(mu.documents_uploaded, 0)::DECIMAL / pl.documents_uploaded) * 100, 2)
  END as documents_usage_percentage,
  CASE 
    WHEN pl.writing_words = -1 THEN 0
    ELSE ROUND((COALESCE(mu.writing_words, 0)::DECIMAL / pl.writing_words) * 100, 2)
  END as writing_usage_percentage,
  CASE 
    WHEN pl.search_queries = -1 THEN 0
    ELSE ROUND((COALESCE(mu.search_queries, 0)::DECIMAL / pl.search_queries) * 100, 2)
  END as search_usage_percentage,
  CASE 
    WHEN pl.exam_sessions = -1 THEN 0
    ELSE ROUND((COALESCE(mu.exam_sessions, 0)::DECIMAL / pl.exam_sessions) * 100, 2)
  END as exam_usage_percentage,
  CASE 
    WHEN pl.storage_used_bytes = -1 THEN 0
    ELSE ROUND((COALESCE(mu.storage_used_bytes, 0)::DECIMAL / pl.storage_used_bytes) * 100, 2)
  END as storage_usage_percentage
FROM user_data ud
LEFT JOIN monthly_usage mu ON ud.user_id = mu.user_id 
  AND mu.usage_month = DATE_TRUNC('month', CURRENT_DATE)
CROSS JOIN LATERAL get_plan_limits(ud.plan_name) pl;

-- Grant access to the view
GRANT SELECT ON user_usage_summary TO authenticated;
