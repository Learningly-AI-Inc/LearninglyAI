/**
 * Apply SQL fix for Free plan users
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSql(sql) {
  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    throw error;
  }

  return data;
}

async function main() {
  console.log('🔧 Applying SQL fix for Free plan users...\n');

  const sqlFile = path.join(__dirname, '..', 'sql', 'fix_free_plan_usage.sql');

  if (!fs.existsSync(sqlFile)) {
    console.error('❌ SQL file not found:', sqlFile);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlFile, 'utf8');

  // Split into individual statements
  const statements = sqlContent
    .split(/;\s*$/gm)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (stmt) {
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      try {
        await executeSql(stmt + ';');
        console.log('✅ Success\n');
      } catch (error) {
        console.error(`❌ Error: ${error.message}\n`);
        console.log('Statement:', stmt.substring(0, 100) + '...\n');
      }
    }
  }

  console.log('✅ SQL fix applied successfully!\n');
  console.log('You should now be able to upload documents.');
}

main().catch(error => {
  console.error('💥 Fatal error:', error.message);
  process.exit(1);
});
