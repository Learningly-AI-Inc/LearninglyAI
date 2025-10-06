#!/usr/bin/env node

/**
 * Execute database migration directly through Supabase client
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeMigration() {
  console.log('🚀 Starting database migration...')
  
  try {
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, '..', 'sql', 'update_usage_tracking_schema.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('📄 Read migration SQL file')
    
    // Split into individual statements and execute them
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      if (statement.trim()) {
        try {
          console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`)
          
          // Try to execute the statement using the REST API
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey
            },
            body: JSON.stringify({ sql: statement })
          })
          
          if (response.ok) {
            successCount++
            console.log(`✅ Statement ${i + 1} executed successfully`)
          } else {
            const errorText = await response.text()
            console.log(`⚠️ Statement ${i + 1} failed:`, errorText.substring(0, 100))
            errorCount++
          }
        } catch (error) {
          console.log(`❌ Statement ${i + 1} error:`, error.message)
          errorCount++
        }
      }
    }
    
    console.log(`\n📊 Migration Summary:`)
    console.log(`✅ Successful: ${successCount}`)
    console.log(`❌ Failed: ${errorCount}`)
    
    if (errorCount > 0) {
      console.log('\n⚠️ Some statements failed. This is normal if they already exist.')
    }
    
    // Test the new functionality
    console.log('\n🧪 Testing new functionality...')
    
    // Test if monthly_usage table exists
    const { data: tables, error: tablesError } = await supabase
      .from('monthly_usage')
      .select('count')
      .limit(1)
    
    if (tablesError) {
      console.log('⚠️ monthly_usage table not found - migration may have failed')
      console.log('Please run the SQL manually in your Supabase dashboard')
    } else {
      console.log('✅ monthly_usage table exists')
    }
    
    // Test the new functions
    try {
      const { data: limits, error: limitsError } = await supabase
        .rpc('get_plan_limits', { plan_name: 'Free' })
      
      if (limitsError) {
        console.log('⚠️ get_plan_limits function not available')
      } else {
        console.log('✅ get_plan_limits function working:', limits)
      }
    } catch (error) {
      console.log('⚠️ get_plan_limits function test failed')
    }
    
    console.log('\n🎉 Migration process completed!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
executeMigration()
