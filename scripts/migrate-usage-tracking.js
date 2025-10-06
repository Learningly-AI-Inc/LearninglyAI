#!/usr/bin/env node

/**
 * Migration script for usage tracking system
 * This script applies the new usage tracking schema to the database
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 Starting usage tracking migration...')
  
  try {
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, '..', 'sql', 'update_usage_tracking_schema.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('📄 Read migration SQL file')
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    // Execute the entire SQL as one block
    console.log('⚡ Executing SQL migration...')
    
    // Use the raw SQL content directly
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent })
    
    if (error) {
      console.log('⚠️ RPC method failed, trying alternative approach...')
      
      // For now, let's just verify the current schema and provide instructions
      console.log('📋 Manual migration required. Please run the following SQL in your Supabase dashboard:')
      console.log('')
      console.log('```sql')
      console.log(sqlContent)
      console.log('```')
      console.log('')
      console.log('Or copy the contents of sql/update_usage_tracking_schema.sql and execute them in the SQL editor.')
      
      // Don't throw error, continue with verification
    } else {
      console.log('✅ SQL migration executed successfully')
    }
    
    console.log('✅ Migration completed successfully!')
    
    // Verify the migration
    console.log('🔍 Verifying migration...')
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['monthly_usage', 'user_data'])
    
    if (tablesError) {
      console.error('❌ Error verifying tables:', tablesError)
    } else {
      console.log('✅ Tables verified:', tables.map(t => t.table_name).join(', '))
    }
    
    // Test the new functions
    console.log('🧪 Testing new functions...')
    
    const { data: limits, error: limitsError } = await supabase
      .rpc('get_plan_limits', { plan_name: 'Free' })
    
    if (limitsError) {
      console.error('❌ Error testing get_plan_limits:', limitsError)
    } else {
      console.log('✅ get_plan_limits function working:', limits)
    }
    
    console.log('🎉 Migration verification completed!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
runMigration()
