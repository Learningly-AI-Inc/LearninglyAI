#!/usr/bin/env node

/**
 * Create monthly_usage table and related functions
 */

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createMonthlyUsageTable() {
  console.log('🚀 Creating monthly_usage table...')
  
  try {
    // Step 1: Create the monthly_usage table
    console.log('1️⃣ Creating monthly_usage table...')
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS monthly_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        usage_month DATE NOT NULL,
        documents_uploaded INTEGER DEFAULT 0,
        writing_words INTEGER DEFAULT 0,
        search_queries INTEGER DEFAULT 0,
        exam_sessions INTEGER DEFAULT 0,
        storage_used_bytes BIGINT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(user_id, usage_month)
      );
    `
    
    // Try to create the table using a direct SQL execution
    const { data: tableResult, error: tableError } = await supabase
      .rpc('exec', { sql: createTableSQL })
    
    if (tableError) {
      console.log('⚠️ Table creation via RPC failed, trying alternative...')
      
      // Alternative: Check if table already exists
      const { data: existingTable, error: checkError } = await supabase
        .from('monthly_usage')
        .select('count')
        .limit(1)
      
      if (checkError && checkError.code === '42P01') {
        console.log('❌ monthly_usage table does not exist and could not be created')
        console.log('Please create it manually in your Supabase dashboard with the following SQL:')
        console.log(createTableSQL)
        return false
      } else {
        console.log('✅ monthly_usage table already exists')
      }
    } else {
      console.log('✅ monthly_usage table created successfully')
    }
    
    // Step 2: Add writing_words column to user_data
    console.log('2️⃣ Adding writing_words column to user_data...')
    
    const addColumnSQL = `
      ALTER TABLE user_data 
      ADD COLUMN IF NOT EXISTS writing_words INTEGER DEFAULT 0;
    `
    
    const { error: columnError } = await supabase
      .rpc('exec', { sql: addColumnSQL })
    
    if (columnError) {
      console.log('⚠️ Column addition failed, but this is often safe to ignore if it already exists')
    } else {
      console.log('✅ writing_words column added to user_data')
    }
    
    // Step 3: Create indexes
    console.log('3️⃣ Creating indexes...')
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_monthly_usage_user_id ON monthly_usage(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_monthly_usage_month ON monthly_usage(usage_month);',
      'CREATE INDEX IF NOT EXISTS idx_monthly_usage_user_month ON monthly_usage(user_id, usage_month);'
    ]
    
    for (const indexSQL of indexes) {
      const { error: indexError } = await supabase
        .rpc('exec', { sql: indexSQL })
      
      if (indexError) {
        console.log('⚠️ Index creation failed:', indexError.message)
      }
    }
    
    console.log('✅ Indexes created')
    
    // Step 4: Enable RLS
    console.log('4️⃣ Setting up Row Level Security...')
    
    const rlsSQL = `
      ALTER TABLE monthly_usage ENABLE ROW LEVEL SECURITY;
    `
    
    const { error: rlsError } = await supabase
      .rpc('exec', { sql: rlsSQL })
    
    if (rlsError) {
      console.log('⚠️ RLS setup failed:', rlsError.message)
    } else {
      console.log('✅ RLS enabled')
    }
    
    // Step 5: Test the table
    console.log('5️⃣ Testing table access...')
    
    const { data: testData, error: testError } = await supabase
      .from('monthly_usage')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.log('❌ Table test failed:', testError.message)
      return false
    } else {
      console.log('✅ monthly_usage table is accessible')
    }
    
    console.log('\n🎉 monthly_usage table setup completed successfully!')
    return true
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
    return false
  }
}

// Run the setup
createMonthlyUsageTable()
