-- Monthly Usage Reset Functions
-- These functions ensure usage counters are reset at the start of each month

-- Function to reset monthly usage for all users at the start of a new month
CREATE OR REPLACE FUNCTION reset_monthly_usage_for_new_month(target_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE))
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER := 0;
  user_record RECORD;
BEGIN
  -- Loop through all users in user_data
  FOR user_record IN
    SELECT user_id FROM user_data
  LOOP
    -- Insert or update monthly usage record with zero values
    INSERT INTO monthly_usage (
      user_id,
      usage_month,
      documents_uploaded,
      writing_words,
      search_queries,
      exam_sessions,
      storage_used_bytes
    ) VALUES (
      user_record.user_id,
      target_month,
      0,
      0,
      0,
      0,
      0
    )
    ON CONFLICT (user_id, usage_month) 
    DO UPDATE SET
      documents_uploaded = 0,
      writing_words = 0,
      search_queries = 0,
      exam_sessions = 0,
      storage_used_bytes = 0,
      updated_at = now();
    
    reset_count := reset_count + 1;
  END LOOP;
  
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically reset usage when a new month is detected
CREATE OR REPLACE FUNCTION ensure_current_month_usage_reset()
RETURNS VOID AS $$
DECLARE
  current_month DATE := DATE_TRUNC('month', CURRENT_DATE);
  last_reset_month DATE;
BEGIN
  -- Check if we have any records for the current month
  SELECT MAX(usage_month) INTO last_reset_month 
  FROM monthly_usage;
  
  -- If no records exist or the latest month is not current month, reset
  IF last_reset_month IS NULL OR last_reset_month < current_month THEN
    PERFORM reset_monthly_usage_for_new_month(current_month);
    RAISE NOTICE 'Monthly usage reset for % users in month %', 
      (SELECT COUNT(*) FROM user_data), current_month;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get or create monthly usage record (updated version)
CREATE OR REPLACE FUNCTION get_or_create_monthly_usage(
  user_uuid UUID,
  target_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)
)
RETURNS TABLE (
  user_id UUID,
  usage_month DATE,
  documents_uploaded INTEGER,
  writing_words INTEGER,
  search_queries INTEGER,
  exam_sessions INTEGER,
  storage_used_bytes BIGINT
) AS $$
BEGIN
  -- Ensure current month usage is reset if needed
  PERFORM ensure_current_month_usage_reset();
  
  -- Get or create monthly usage record for the user
  RETURN QUERY
  INSERT INTO monthly_usage (
    user_id,
    usage_month,
    documents_uploaded,
    writing_words,
    search_queries,
    exam_sessions,
    storage_used_bytes
  )
  SELECT 
    user_uuid,
    target_month,
    0,
    0,
    0,
    0,
    0
  WHERE NOT EXISTS (
    SELECT 1 FROM monthly_usage 
    WHERE monthly_usage.user_id = user_uuid 
    AND monthly_usage.usage_month = target_month
  )
  RETURNING monthly_usage.user_id, monthly_usage.usage_month, monthly_usage.documents_uploaded, 
            monthly_usage.writing_words, monthly_usage.search_queries, monthly_usage.exam_sessions, 
            monthly_usage.storage_used_bytes;
  
  -- If no insert happened, return existing record
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT mu.user_id, mu.usage_month, mu.documents_uploaded, mu.writing_words, 
           mu.search_queries, mu.exam_sessions, mu.storage_used_bytes
    FROM monthly_usage mu
    WHERE mu.user_id = user_uuid AND mu.usage_month = target_month;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually trigger monthly reset (for admin use)
CREATE OR REPLACE FUNCTION trigger_monthly_reset(target_month DATE DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  reset_month DATE;
  reset_count INTEGER;
BEGIN
  -- Use provided month or current month
  reset_month := COALESCE(target_month, DATE_TRUNC('month', CURRENT_DATE));
  
  -- Reset usage for the specified month
  reset_count := reset_monthly_usage_for_new_month(reset_month);
  
  RETURN FORMAT('Reset monthly usage for %s users in month %s', reset_count, reset_month);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if monthly reset is needed
CREATE OR REPLACE FUNCTION check_monthly_reset_status()
RETURNS TABLE (
  current_month DATE,
  latest_usage_month DATE,
  needs_reset BOOLEAN,
  total_users INTEGER,
  users_with_current_month INTEGER
) AS $$
DECLARE
  current_month_val DATE := DATE_TRUNC('month', CURRENT_DATE);
  latest_month DATE;
  user_count INTEGER;
  current_month_count INTEGER;
BEGIN
  -- Get latest usage month
  SELECT MAX(usage_month) INTO latest_month FROM monthly_usage;
  
  -- Get total user count
  SELECT COUNT(*) INTO user_count FROM user_data;
  
  -- Get users with current month records
  SELECT COUNT(*) INTO current_month_count 
  FROM monthly_usage 
  WHERE usage_month = current_month_val;
  
  RETURN QUERY SELECT 
    current_month_val,
    latest_month,
    (latest_month IS NULL OR latest_month < current_month_val),
    user_count,
    current_month_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION reset_monthly_usage_for_new_month(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_current_month_usage_reset() TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_monthly_usage(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_monthly_reset(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION check_monthly_reset_status() TO authenticated;
