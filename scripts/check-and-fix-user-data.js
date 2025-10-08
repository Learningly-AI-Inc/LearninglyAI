/**
 * Check and fix user_data records for Free plan users
 * This script ensures all authenticated users have a user_data record
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkAndFixUserData() {
  console.log('🔍 Checking user_data records...\n');

  try {
    // Get all users from auth.users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      throw authError;
    }

    console.log(`Found ${users.length} total users\n`);

    // Check each user's user_data record
    let fixed = 0;
    let existing = 0;

    for (const user of users) {
      const { data: userData, error: dataError } = await supabase
        .from('user_data')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (dataError && dataError.code === 'PGRST116') {
        // No record exists, create one
        console.log(`⚠️  User ${user.email} (${user.id}) has no user_data record`);
        console.log('   Creating Free plan record...');

        const { error: insertError } = await supabase
          .from('user_data')
          .insert({
            user_id: user.id,
            plan_name: 'Free',
            plan_price_cents: 0,
            subscription_status: 'canceled',
            cancel_at_period_end: false
          });

        if (insertError) {
          console.error(`   ❌ Failed to create record: ${insertError.message}`);
        } else {
          console.log('   ✅ Created Free plan record\n');
          fixed++;
        }
      } else if (dataError) {
        console.error(`❌ Error checking user ${user.email}: ${dataError.message}`);
      } else {
        console.log(`✓ User ${user.email} has user_data record: ${userData.plan_name} (${userData.subscription_status})`);
        existing++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   Total users: ${users.length}`);
    console.log(`   Existing records: ${existing}`);
    console.log(`   Fixed (created): ${fixed}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('💥 Error:', error.message);
    process.exit(1);
  }
}

async function applyDatabaseFix() {
  console.log('\n🔧 Applying database function fix...\n');

  const fs = require('fs');
  const path = require('path');

  // Read the SQL fix file
  const sqlFile = path.join(__dirname, '..', 'sql', 'fix_free_plan_usage.sql');
  const sqlContent = fs.readFileSync(sqlFile, 'utf8');

  try {
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent }).single();

    if (error) {
      // Try alternative approach - execute via direct SQL
      console.log('   Trying direct SQL execution...');

      // Split by statement and execute each
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const stmt of statements) {
        if (stmt) {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: stmt });
          if (stmtError) {
            console.error(`   ⚠️  Statement error: ${stmtError.message}`);
          }
        }
      }

      console.log('   ⚠️  Manual SQL execution required. Please run sql/fix_free_plan_usage.sql manually.');
    } else {
      console.log('   ✅ Database functions updated successfully\n');
    }
  } catch (error) {
    console.log('   ⚠️  Automatic SQL execution not available.');
    console.log('   📋 Please manually run: sql/fix_free_plan_usage.sql in your Supabase SQL editor\n');
  }
}

async function main() {
  console.log('🚀 User Data Fix Script\n');
  console.log('This script will:');
  console.log('1. Check all users for user_data records');
  console.log('2. Create Free plan records for users without one');
  console.log('3. Apply database function fixes\n');

  await checkAndFixUserData();
  console.log('\n📝 Next step: Apply the SQL fix manually');
  console.log('Run the following SQL in your Supabase SQL Editor:');
  console.log('   File: sql/fix_free_plan_usage.sql\n');
}

main();
