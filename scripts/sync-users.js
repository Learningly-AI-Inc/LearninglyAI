#!/usr/bin/env node

/**
 * Manual User Sync Script
 * 
 * This script can be run manually to sync users between Supabase Auth and the database.
 * Usage: node scripts/sync-users.js [--dry-run]
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fetchAuthUsers() {
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      throw new Error(`Failed to fetch auth users: ${error.message}`)
    }
    
    return users || []
  } catch (error) {
    console.error('Error fetching auth users:', error)
    throw error
  }
}

async function fetchDbUsers() {
  try {
    const { data: users, error } = await supabase
      .from('user_data')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      throw new Error(`Failed to fetch db users: ${error.message}`)
    }
    
    return users || []
  } catch (error) {
    console.error('Error fetching db users:', error)
    throw error
  }
}

async function syncUsers(dryRun = false) {
  console.log('🔄 Starting user sync process...')
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE SYNC'}`)
  
  try {
    // Fetch users from both sources
    const [authUsers, dbUsers] = await Promise.all([
      fetchAuthUsers(),
      fetchDbUsers()
    ])

    console.log(`📊 Found ${authUsers.length} auth users and ${dbUsers.length} db users`)

    const authUserIds = new Set(authUsers.map(u => u.id))
    const dbUserMap = new Map(dbUsers.map(u => [u.user_id, u]))

    let usersAdded = 0
    let usersUpdated = 0
    let usersRemoved = 0
    const errors = []

    // 1. Add new users from Auth to Database
    for (const authUser of authUsers) {
      if (!dbUserMap.has(authUser.id)) {
        try {
          if (!dryRun) {
            const { error } = await supabase
              .from('user_data')
              .insert({
                user_id: authUser.id,
                created_at: authUser.created_at,
                updated_at: new Date().toISOString()
              })

            if (error) {
              errors.push(`Failed to add user ${authUser.email}: ${error.message}`)
            } else {
              usersAdded++
              console.log(`✅ Added user: ${authUser.email}`)
            }
          } else {
            usersAdded++
            console.log(`[DRY RUN] Would add user: ${authUser.email}`)
          }
        } catch (error) {
          errors.push(`Error adding user ${authUser.email}: ${error.message}`)
        }
      } else {
        // 2. Update existing users
        const dbUser = dbUserMap.get(authUser.id)!
        const needsUpdate = 
          dbUser.updated_at !== new Date().toISOString()

        if (needsUpdate) {
          try {
            if (!dryRun) {
              const { error } = await supabase
                .from('user_data')
                .update({
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', authUser.id)

              if (error) {
                errors.push(`Failed to update user ${authUser.email}: ${error.message}`)
              } else {
                usersUpdated++
                console.log(`🔄 Updated user: ${authUser.email}`)
              }
            } else {
              usersUpdated++
              console.log(`[DRY RUN] Would update user: ${authUser.email}`)
            }
          } catch (error) {
            errors.push(`Error updating user ${authUser.email}: ${error.message}`)
          }
        }
      }
    }

    // 3. Remove users from Database that no longer exist in Auth
    for (const dbUser of dbUsers) {
      if (!authUserIds.has(dbUser.user_id)) {
        try {
          if (!dryRun) {
            const { error } = await supabase
              .from('user_data')
              .delete()
              .eq('user_id', dbUser.user_id)

            if (error) {
              errors.push(`Failed to remove user ${dbUser.user_id}: ${error.message}`)
            } else {
              usersRemoved++
              console.log(`🗑️ Removed user: ${dbUser.user_id}`)
            }
          } else {
            usersRemoved++
            console.log(`[DRY RUN] Would remove user: ${dbUser.user_id}`)
          }
        } catch (error) {
          errors.push(`Error removing user ${dbUser.user_id}: ${error.message}`)
        }
      }
    }

    // Summary
    console.log('\n📋 Sync Summary:')
    console.log(`   Total Auth Users: ${authUsers.length}`)
    console.log(`   Total DB Users: ${dbUsers.length}`)
    console.log(`   Users Added: ${usersAdded}`)
    console.log(`   Users Updated: ${usersUpdated}`)
    console.log(`   Users Removed: ${usersRemoved}`)
    console.log(`   Errors: ${errors.length}`)

    if (errors.length > 0) {
      console.log('\n❌ Errors:')
      errors.forEach(error => console.log(`   - ${error}`))
    }

    const hasErrors = errors.length > 0
    const hasChanges = usersAdded > 0 || usersUpdated > 0 || usersRemoved > 0

    if (dryRun) {
      console.log('\n✅ Dry run completed - no changes were made')
    } else if (hasErrors) {
      console.log('\n⚠️ Sync completed with errors')
    } else if (hasChanges) {
      console.log('\n✅ Sync completed successfully')
    } else {
      console.log('\n✅ Sync completed - no changes needed')
    }

  } catch (error) {
    console.error('❌ Sync failed:', error.message)
    process.exit(1)
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run') || args.includes('-d')
  
  try {
    await syncUsers(dryRun)
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { syncUsers, fetchAuthUsers, fetchDbUsers }
