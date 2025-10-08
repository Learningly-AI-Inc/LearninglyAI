-- Fix: Allow Free plan users with canceled status to upload documents
-- The issue is that check_usage_limit_new doesn't handle missing user_data records
-- or treats 'canceled' status incorrectly

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
  -- Get user's current plan, defaulting to 'Free' if not found
  SELECT COALESCE(plan_name, 'Free') INTO user_plan
  FROM user_data
  WHERE user_id = user_uuid
  LIMIT 1;

  -- If no record exists, default to Free plan
  IF user_plan IS NULL THEN
    user_plan := 'Free';
  END IF;

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
      -- Default to Free plan limits for unknown plans
      CASE limit_type
        WHEN 'documents_uploaded' THEN usage_limit := 50;
        WHEN 'writing_words' THEN usage_limit := 5000;
        WHEN 'search_queries' THEN usage_limit := 40;
        WHEN 'exam_sessions' THEN usage_limit := 4;
        WHEN 'storage_used_bytes' THEN storage_limit := 250 * 1024 * 1024;
        ELSE usage_limit := 0;
      END CASE;
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

  -- If no usage record exists, default to 0
  IF current_usage IS NULL THEN
    current_usage := 0;
  END IF;

  -- Check if adding requested amount would exceed limit
  IF limit_type = 'storage_used_bytes' THEN
    RETURN (current_usage + requested_amount) <= storage_limit;
  ELSE
    RETURN (current_usage + requested_amount) <= usage_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also ensure users have a user_data record by default
-- This function will be called on auth trigger
CREATE OR REPLACE FUNCTION ensure_user_data_record()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_data (
    user_id,
    plan_name,
    plan_price_cents,
    subscription_status
  ) VALUES (
    NEW.id,
    'Free',
    0,
    'canceled'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create user_data record on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_data_record();
