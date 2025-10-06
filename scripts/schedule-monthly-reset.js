#!/usr/bin/env node

/**
 * Monthly Usage Reset Scheduler
 * This script can be run as a cron job to automatically reset usage at the start of each month
 * 
 * To set up automatic monthly resets, add this to your crontab:
 * 0 0 1 * * cd /path/to/LearninglyAI && node scripts/schedule-monthly-reset.js
 * 
 * This will run at midnight on the 1st of every month
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

async function performMonthlyReset() {
  const timestamp = new Date().toISOString()
  console.log(`🔄 Starting monthly usage reset at ${timestamp}`)
  
  try {
    // Check if reset is needed
    const { data: resetStatus, error: statusError } = await supabase
      .rpc('check_monthly_reset_status')
    
    if (statusError) {
      console.error('❌ Error checking reset status:', statusError.message)
      process.exit(1)
    }
    
    if (resetStatus && resetStatus.length > 0) {
      const status = resetStatus[0]
      console.log('📊 Current Status:')
      console.log('  Current month:', status.current_month)
      console.log('  Latest usage month:', status.latest_usage_month)
      console.log('  Needs reset:', status.needs_reset)
      console.log('  Total users:', status.total_users)
      console.log('  Users with current month:', status.users_with_current_month)
      
      if (status.needs_reset) {
        console.log('\n🔄 Performing monthly reset...')
        
        const { data: resetResult, error: resetError } = await supabase
          .rpc('trigger_monthly_reset')
        
        if (resetError) {
          console.error('❌ Reset failed:', resetError.message)
          process.exit(1)
        }
        
        console.log('✅ Monthly reset completed:', resetResult)
        
        // Verify the reset
        const { data: verifyStatus, error: verifyError } = await supabase
          .rpc('check_monthly_reset_status')
        
        if (!verifyError && verifyStatus && verifyStatus.length > 0) {
          const verify = verifyStatus[0]
          console.log('🔍 Verification:')
          console.log('  Users with current month:', verify.users_with_current_month)
          console.log('  Needs reset:', verify.needs_reset)
          
          if (!verify.needs_reset && verify.users_with_current_month === verify.total_users) {
            console.log('✅ Monthly reset verified successfully!')
          } else {
            console.log('⚠️ Reset verification failed')
          }
        }
        
      } else {
        console.log('✅ No reset needed - usage is already current')
      }
    }
    
    console.log(`\n🎉 Monthly reset process completed at ${new Date().toISOString()}`)
    
  } catch (error) {
    console.error('❌ Monthly reset failed:', error.message)
    process.exit(1)
  }
}

// Run the monthly reset
performMonthlyReset()
