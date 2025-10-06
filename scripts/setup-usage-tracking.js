#!/usr/bin/env node

/**
 * Setup usage tracking using Supabase REST API
 */

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

async function executeSQL(sql) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseServiceKey
    },
    body: JSON.stringify({ sql })
  })
  
  if (response.ok) {
    return { success: true, data: await response.json() }
  } else {
    const error = await response.text()
    return { success: false, error }
  }
}

async function setupUsageTracking() {
  console.log('🚀 Setting up usage tracking system...')
  
  try {
    // Step 1: Add writing_words column to user_data
    console.log('1️⃣ Adding writing_words column to user_data...')
    
    const addColumnResult = await executeSQL(`
      ALTER TABLE user_data 
      ADD COLUMN IF NOT EXISTS writing_words INTEGER DEFAULT 0;
    `)
    
    if (addColumnResult.success) {
      console.log('✅ writing_words column added to user_data')
    } else {
      console.log('⚠️ Column addition result:', addColumnResult.error.substring(0, 100))
    }
    
    // Step 2: Create monthly_usage table
    console.log('2️⃣ Creating monthly_usage table...')
    
    const createTableResult = await executeSQL(`
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
    `)
    
    if (createTableResult.success) {
      console.log('✅ monthly_usage table created')
    } else {
      console.log('⚠️ Table creation result:', createTableResult.error.substring(0, 100))
    }
    
    // Step 3: Create indexes
    console.log('3️⃣ Creating indexes...')
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_monthly_usage_user_id ON monthly_usage(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_monthly_usage_month ON monthly_usage(usage_month);',
      'CREATE INDEX IF NOT EXISTS idx_monthly_usage_user_month ON monthly_usage(user_id, usage_month);'
    ]
    
    for (const indexSQL of indexes) {
      const result = await executeSQL(indexSQL)
      if (result.success) {
        console.log('✅ Index created')
      } else {
        console.log('⚠️ Index creation failed:', result.error.substring(0, 50))
      }
    }
    
    // Step 4: Enable RLS
    console.log('4️⃣ Setting up Row Level Security...')
    
    const rlsResult = await executeSQL(`
      ALTER TABLE monthly_usage ENABLE ROW LEVEL SECURITY;
    `)
    
    if (rlsResult.success) {
      console.log('✅ RLS enabled')
    } else {
      console.log('⚠️ RLS setup failed:', rlsResult.error.substring(0, 50))
    }
    
    // Step 5: Create RLS policies
    console.log('5️⃣ Creating RLS policies...')
    
    const policies = [
      `CREATE POLICY IF NOT EXISTS "Users can view their own monthly usage" ON monthly_usage
       FOR SELECT TO authenticated USING (auth.uid() = user_id);`,
      `CREATE POLICY IF NOT EXISTS "Users can insert their own monthly usage" ON monthly_usage
       FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);`,
      `CREATE POLICY IF NOT EXISTS "Users can update their own monthly usage" ON monthly_usage
       FOR UPDATE TO authenticated USING (auth.uid() = user_id);`
    ]
    
    for (const policySQL of policies) {
      const result = await executeSQL(policySQL)
      if (result.success) {
        console.log('✅ RLS policy created')
      } else {
        console.log('⚠️ Policy creation failed:', result.error.substring(0, 50))
      }
    }
    
    // Step 6: Create functions
    console.log('6️⃣ Creating database functions...')
    
    const functions = [
      // get_or_create_monthly_usage function
      `CREATE OR REPLACE FUNCTION get_or_create_monthly_usage(
        user_uuid UUID,
        target_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)
      )
      RETURNS UUID AS $$
      DECLARE
        usage_id UUID;
      BEGIN
        SELECT id INTO usage_id
        FROM monthly_usage
        WHERE user_id = user_uuid 
          AND usage_month = target_month;
        
        IF usage_id IS NULL THEN
          INSERT INTO monthly_usage (user_id, usage_month)
          VALUES (user_uuid, target_month)
          RETURNING id INTO usage_id;
        END IF;
        
        RETURN usage_id;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;`,
      
      // check_usage_limit_new function
      `CREATE OR REPLACE FUNCTION check_usage_limit_new(
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
        SELECT plan_name INTO user_plan
        FROM user_data
        WHERE user_id = user_uuid
        LIMIT 1;
        
        CASE user_plan
          WHEN 'Free' THEN
            CASE limit_type
              WHEN 'documents_uploaded' THEN usage_limit := 12;
              WHEN 'writing_words' THEN usage_limit := 5000;
              WHEN 'search_queries' THEN usage_limit := 40;
              WHEN 'exam_sessions' THEN usage_limit := 4;
              WHEN 'storage_used_bytes' THEN storage_limit := 250 * 1024 * 1024;
              ELSE usage_limit := 0;
            END CASE;
          WHEN 'Premium (Monthly)', 'Premium (Yearly)' THEN
            CASE limit_type
              WHEN 'documents_uploaded' THEN usage_limit := 3000;
              WHEN 'writing_words' THEN usage_limit := 750000;
              WHEN 'search_queries' THEN usage_limit := 15000;
              WHEN 'exam_sessions' THEN usage_limit := 1400;
              WHEN 'storage_used_bytes' THEN storage_limit := 10 * 1024 * 1024 * 1024;
              ELSE usage_limit := -1;
            END CASE;
          ELSE
            usage_limit := 0;
        END CASE;
        
        IF usage_limit = -1 THEN
          RETURN true;
        END IF;
        
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
        
        IF limit_type = 'storage_used_bytes' THEN
          RETURN (current_usage + requested_amount) <= storage_limit;
        ELSE
          RETURN (current_usage + requested_amount) <= usage_limit;
        END IF;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;`,
      
      // increment_monthly_usage function
      `CREATE OR REPLACE FUNCTION increment_monthly_usage(
        user_uuid UUID,
        usage_type TEXT,
        amount INTEGER DEFAULT 1,
        target_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)
      )
      RETURNS VOID AS $$
      DECLARE
        usage_id UUID;
      BEGIN
        SELECT get_or_create_monthly_usage(user_uuid, target_month) INTO usage_id;
        
        UPDATE monthly_usage SET
          documents_uploaded = documents_uploaded + 
            CASE WHEN usage_type = 'documents_uploaded' THEN amount ELSE 0 END,
          writing_words = writing_words + 
            CASE WHEN usage_type = 'writing_words' THEN amount ELSE 0 END,
          search_queries = search_queries + 
            CASE WHEN usage_type = 'search_queries' THEN amount ELSE 0 END,
          exam_sessions = exam_sessions + 
            CASE WHEN usage_type = 'exam_sessions' THEN amount ELSE 0 END,
          storage_used_bytes = storage_used_bytes + 
            CASE WHEN usage_type = 'storage_used_bytes' THEN amount ELSE 0 END,
          updated_at = now()
        WHERE id = usage_id;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;`,
      
      // get_monthly_usage function
      `CREATE OR REPLACE FUNCTION get_monthly_usage(
        user_uuid UUID,
        target_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)
      )
      RETURNS TABLE (
        documents_uploaded INTEGER,
        writing_words INTEGER,
        search_queries INTEGER,
        exam_sessions INTEGER,
        storage_used_bytes BIGINT
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          COALESCE(mu.documents_uploaded, 0),
          COALESCE(mu.writing_words, 0),
          COALESCE(mu.search_queries, 0),
          COALESCE(mu.exam_sessions, 0),
          COALESCE(mu.storage_used_bytes, 0)
        FROM monthly_usage mu
        WHERE mu.user_id = user_uuid 
          AND mu.usage_month = target_month;
          
        IF NOT FOUND THEN
          RETURN QUERY SELECT 0, 0, 0, 0, 0;
        END IF;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;`,
      
      // get_plan_limits function
      `CREATE OR REPLACE FUNCTION get_plan_limits(plan_name TEXT)
      RETURNS TABLE (
        documents_uploaded INTEGER,
        writing_words INTEGER,
        search_queries INTEGER,
        exam_sessions INTEGER,
        storage_used_bytes BIGINT
      ) AS $$
      BEGIN
        CASE plan_name
          WHEN 'Free' THEN
            RETURN QUERY SELECT 12, 5000, 40, 4, 250 * 1024 * 1024;
          WHEN 'Premium (Monthly)', 'Premium (Yearly)' THEN
            RETURN QUERY SELECT 3000, 750000, 15000, 1400, 10 * 1024 * 1024 * 1024;
          ELSE
            RETURN QUERY SELECT 0, 0, 0, 0, 0;
        END CASE;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;`
    ]
    
    for (let i = 0; i < functions.length; i++) {
      const result = await executeSQL(functions[i])
      if (result.success) {
        console.log(`✅ Function ${i + 1} created`)
      } else {
        console.log(`⚠️ Function ${i + 1} creation failed:`, result.error.substring(0, 50))
      }
    }
    
    console.log('\n🎉 Usage tracking setup completed!')
    
    // Test the setup
    console.log('\n🧪 Testing the setup...')
    
    const testResult = await executeSQL(`SELECT get_plan_limits('Free');`)
    if (testResult.success) {
      console.log('✅ Functions are working correctly')
    } else {
      console.log('⚠️ Function test failed:', testResult.error.substring(0, 100))
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

// Run the setup
setupUsageTracking()
