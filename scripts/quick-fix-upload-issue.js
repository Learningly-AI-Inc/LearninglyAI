/**
 * Quick fix for upload issue
 * This directly updates the check_usage_limit_new function via Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testUsageLimit(userId) {
  console.log(`🧪 Testing usage limit for user: ${userId}\n`);

  // Test the current function
  const { data, error } = await supabase.rpc('check_usage_limit_new', {
    user_uuid: userId,
    limit_type: 'documents_uploaded',
    requested_amount: 1
  });

  if (error) {
    console.error('❌ Error calling check_usage_limit_new:', error.message);
    return false;
  }

  console.log('Result:', data);
  return data;
}

async function getUserData(userId) {
  const { data, error } = await supabase
    .from('user_data')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('❌ Error fetching user_data:', error.message);
    return null;
  }

  return data;
}

async function getMonthlyUsage(userId) {
  const { data, error } = await supabase.rpc('get_monthly_usage', {
    user_uuid: userId
  });

  if (error) {
    console.error('❌ Error fetching monthly usage:', error.message);
    return null;
  }

  return data?.[0] || null;
}

async function main() {
  console.log('🔍 Diagnosing upload issue...\n');

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  let userId;
  if (authError || !user) {
    // Use a test user ID
    console.log('⚠️  Not authenticated. Please provide a user ID:');
    console.log('   Usage: node scripts/quick-fix-upload-issue.js <user_id>\n');

    // Try to use command line arg
    userId = process.argv[2];
    if (!userId) {
      console.log('ℹ️  Checking all Free plan users...\n');

      // Get all Free plan users
      const { data: users, error: usersError } = await supabase
        .from('user_data')
        .select('user_id, plan_name, subscription_status')
        .eq('plan_name', 'Free')
        .limit(5);

      if (usersError) {
        console.error('❌ Error fetching users:', usersError.message);
        process.exit(1);
      }

      console.log(`Found ${users.length} Free plan users:\n`);

      for (const userData of users) {
        console.log('─'.repeat(60));
        console.log(`User: ${userData.user_id}`);
        console.log(`Plan: ${userData.plan_name}`);
        console.log(`Status: ${userData.subscription_status}`);

        const usage = await getMonthlyUsage(userData.user_id);
        console.log('Current usage:', usage);

        const canUpload = await testUsageLimit(userData.user_id);
        console.log(`Can upload: ${canUpload ? '✅ YES' : '❌ NO'}`);
        console.log();
      }

      return;
    }
  } else {
    userId = user.id;
  }

  console.log(`👤 User ID: ${userId}\n`);

  // Get user data
  console.log('📊 User Data:');
  const userData = await getUserData(userId);
  if (userData) {
    console.log('   Plan:', userData.plan_name);
    console.log('   Status:', userData.subscription_status);
    console.log('   Price:', userData.plan_price_cents, 'cents');
  } else {
    console.log('   ⚠️  No user_data record found!');
  }
  console.log();

  // Get usage
  console.log('📈 Monthly Usage:');
  const usage = await getMonthlyUsage(userId);
  if (usage) {
    console.log('   Documents uploaded:', usage.documents_uploaded || 0);
    console.log('   Writing words:', usage.writing_words || 0);
    console.log('   Search queries:', usage.search_queries || 0);
    console.log('   Exam sessions:', usage.exam_sessions || 0);
  } else {
    console.log('   ⚠️  No usage record found (will default to 0)');
  }
  console.log();

  // Test limit check
  const canUpload = await testUsageLimit(userId);
  console.log('🎯 Upload Check Result:', canUpload ? '✅ CAN UPLOAD' : '❌ CANNOT UPLOAD');

  if (!canUpload && userData?.plan_name === 'Free') {
    console.log('\n⚠️  ISSUE DETECTED: Free plan user cannot upload!');
    console.log('\n📋 To fix this, run the following SQL in your Supabase SQL Editor:');
    console.log('   File: sql/fix_free_plan_usage.sql');
    console.log('\nOr manually run:');
    console.log(`
-- Quick fix: Update check_usage_limit_new to handle Free plan correctly
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

  -- Set limits for Free plan
  IF user_plan = 'Free' THEN
    CASE limit_type
      WHEN 'documents_uploaded' THEN usage_limit := 50;
      WHEN 'writing_words' THEN usage_limit := 5000;
      WHEN 'search_queries' THEN usage_limit := 40;
      WHEN 'exam_sessions' THEN usage_limit := 4;
      WHEN 'storage_used_bytes' THEN storage_limit := 250 * 1024 * 1024;
      ELSE usage_limit := 0;
    END CASE;
  ELSIF user_plan IN ('Premium (Monthly)', 'Premium (Yearly)') THEN
    CASE limit_type
      WHEN 'documents_uploaded' THEN usage_limit := 3000;
      WHEN 'writing_words' THEN usage_limit := 750000;
      WHEN 'search_queries' THEN usage_limit := 15000;
      WHEN 'exam_sessions' THEN usage_limit := 1400;
      WHEN 'storage_used_bytes' THEN storage_limit := 10 * 1024 * 1024 * 1024;
      ELSE usage_limit := -1;
    END CASE;
  ELSE
    -- Unknown plan: default to Free
    CASE limit_type
      WHEN 'documents_uploaded' THEN usage_limit := 50;
      WHEN 'writing_words' THEN usage_limit := 5000;
      WHEN 'search_queries' THEN usage_limit := 40;
      WHEN 'exam_sessions' THEN usage_limit := 4;
      WHEN 'storage_used_bytes' THEN storage_limit := 250 * 1024 * 1024;
      ELSE usage_limit := 0;
    END CASE;
  END IF;

  -- If unlimited, return true
  IF usage_limit = -1 THEN
    RETURN true;
  END IF;

  -- Get current usage
  SELECT COALESCE(
    CASE limit_type
      WHEN 'documents_uploaded' THEN documents_uploaded
      WHEN 'writing_words' THEN writing_words
      WHEN 'search_queries' THEN search_queries
      WHEN 'exam_sessions' THEN exam_sessions
      WHEN 'storage_used_bytes' THEN storage_used_bytes::INTEGER
      ELSE 0
    END, 0
  ) INTO current_usage
  FROM monthly_usage
  WHERE user_id = user_uuid AND usage_month = current_month;

  -- If no usage record, default to 0
  IF current_usage IS NULL THEN
    current_usage := 0;
  END IF;

  -- Check limit
  IF limit_type = 'storage_used_bytes' THEN
    RETURN (current_usage + requested_amount) <= storage_limit;
  ELSE
    RETURN (current_usage + requested_amount) <= usage_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
  }
}

main().catch(error => {
  console.error('💥 Error:', error.message);
  process.exit(1);
});
