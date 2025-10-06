#!/usr/bin/env node

/**
 * Setup Monthly Usage Reset Functions
 * This script adds the monthly reset functionality to the database
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupMonthlyReset() {
  console.log('🔄 Setting up monthly usage reset functionality...')
  
  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('./sql/monthly_usage_reset.sql', 'utf8')
    
    console.log('📄 SQL content loaded, length:', sqlContent.length, 'characters')
    console.log('\n📋 SQL to execute:')
    console.log('─'.repeat(50))
    console.log(sqlContent)
    console.log('─'.repeat(50))
    
    console.log('\n⚠️  Please manually execute this SQL in your Supabase dashboard:')
    console.log('1. Go to https://supabase.com/dashboard')
    console.log('2. Select your LearninglyAI project')
    console.log('3. Click "SQL Editor" → "New query"')
    console.log('4. Copy and paste the SQL above')
    console.log('5. Click "Run" to execute')
    
    console.log('\n🧪 After running the SQL, you can test with:')
    console.log('node scripts/test-monthly-reset.js')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Run the setup
setupMonthlyReset()
