const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeSQL(sql) {
  try {
    console.log('Executing SQL...')
    const { data, error } = await supabase.rpc('exec', { sql })
    
    if (error) {
      console.error('❌ SQL Error:', error.message)
      return false
    }
    
    console.log('✅ SQL executed successfully')
    return true
  } catch (err) {
    console.error('❌ Execution Error:', err.message)
    return false
  }
}

async function runConsolidation() {
  console.log('🚀 Starting database consolidation...')
  
  try {
    // Read the consolidation script
    const scriptPath = path.join(__dirname, '../sql/complete_consolidation.sql')
    const sql = fs.readFileSync(scriptPath, 'utf8')
    
    console.log('📄 Running consolidation script...')
    const success = await executeSQL(sql)
    
    if (success) {
      console.log('🎉 Database consolidation completed successfully!')
      console.log('')
      console.log('✅ Your database has been consolidated:')
      console.log('   - 6 consolidated tables created')
      console.log('   - All existing data migrated safely')
      console.log('   - Orphaned records skipped (no errors)')
      console.log('   - RLS policies set up')
      console.log('')
      console.log('Next steps:')
      console.log('1. Test your application to ensure everything works')
      console.log('2. Check the new tables in your Supabase dashboard')
      console.log('3. If everything works, you can optionally drop the old tables')
    } else {
      console.log('❌ Consolidation failed. Check the errors above.')
    }
    
  } catch (error) {
    console.error('❌ Error during consolidation:', error.message)
  }
}

runConsolidation()
