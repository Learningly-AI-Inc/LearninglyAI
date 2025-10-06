import { createClient } from '@supabase/supabase-js'

export interface UserSyncResult {
  success: boolean
  message: string
  stats: {
    totalAuthUsers: number
    totalDbUsers: number
    usersAdded: number
    usersUpdated: number
    usersRemoved: number
    errors: string[]
  }
}

export class UserSyncService {
  /**
   * Fetch all users from Supabase Auth
   */
  static async fetchAuthUsers() {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      // Use the admin API to fetch all users
      // Note: This requires service role key for admin operations
      const { data: { users }, error } = await supabase.auth.admin.listUsers()
      
      if (error) {
        console.error('Error fetching auth users:', error)
        throw new Error(`Failed to fetch auth users: ${error.message}`)
      }
      
      return users || []
    } catch (error: any) {
      console.error('Unexpected error fetching auth users:', error)
      throw new Error(`Unexpected error: ${error.message}`)
    }
  }

  /**
   * Fetch all users from the public.user_data table
   */
  static async fetchDbUsers() {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      const { data: users, error } = await supabase
        .from('user_data')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching db users:', error)
        throw new Error(`Failed to fetch db users: ${error.message}`)
      }
      
      return users || []
    } catch (error: any) {
      console.error('Unexpected error fetching db users:', error)
      throw new Error(`Unexpected error: ${error.message}`)
    }
  }

  /**
   * Sync users between Auth and Database
   */
  static async syncUsers(): Promise<UserSyncResult> {
    const result: UserSyncResult = {
      success: false,
      message: '',
      stats: {
        totalAuthUsers: 0,
        totalDbUsers: 0,
        usersAdded: 0,
        usersUpdated: 0,
        usersRemoved: 0,
        errors: []
      }
    }

    try {
      console.log('🔄 Starting user sync process...')
      
      // Fetch users from both sources
      const [authUsers, dbUsers] = await Promise.all([
        this.fetchAuthUsers(),
        this.fetchDbUsers()
      ])

      result.stats.totalAuthUsers = authUsers.length
      result.stats.totalDbUsers = dbUsers.length

      console.log(`📊 Found ${authUsers.length} auth users and ${dbUsers.length} db users`)

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const authUserIds = new Set(authUsers.map(u => u.id))
      const dbUserMap = new Map(dbUsers.map(u => [u.user_id, u]))

      // 1. Add new users from Auth to Database
      for (const authUser of authUsers) {
        if (!dbUserMap.has(authUser.id)) {
          try {
            const { error } = await supabase
              .from('user_data')
              .insert({
                user_id: authUser.id,
                created_at: authUser.created_at,
                updated_at: new Date().toISOString()
              })

            if (error) {
              result.stats.errors.push(`Failed to add user ${authUser.email}: ${error.message}`)
            } else {
              result.stats.usersAdded++
              console.log(`✅ Added user: ${authUser.email}`)
            }
          } catch (error: any) {
            result.stats.errors.push(`Error adding user ${authUser.email}: ${error.message}`)
          }
        } else {
          // 2. Update existing users
          const dbUser = dbUserMap.get(authUser.id)!
          const needsUpdate = 
            dbUser.updated_at !== new Date().toISOString()

          if (needsUpdate) {
            try {
              const { error } = await supabase
                .from('user_data')
                .update({
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', authUser.id)

              if (error) {
                result.stats.errors.push(`Failed to update user ${authUser.email}: ${error.message}`)
              } else {
                result.stats.usersUpdated++
                console.log(`🔄 Updated user: ${authUser.email}`)
              }
            } catch (error: any) {
              result.stats.errors.push(`Error updating user ${authUser.email}: ${error.message}`)
            }
          }
        }
      }

      // 3. Remove users from Database that no longer exist in Auth
      for (const dbUser of dbUsers) {
        if (!authUserIds.has(dbUser.user_id)) {
          try {
            const { error } = await supabase
              .from('user_data')
              .delete()
              .eq('user_id', dbUser.user_id)

            if (error) {
              result.stats.errors.push(`Failed to remove user ${dbUser.user_id}: ${error.message}`)
            } else {
              result.stats.usersRemoved++
              console.log(`🗑️ Removed user: ${dbUser.user_id}`)
            }
          } catch (error: any) {
            result.stats.errors.push(`Error removing user ${dbUser.user_id}: ${error.message}`)
          }
        }
      }

      // Determine success
      const hasErrors = result.stats.errors.length > 0
      const hasChanges = result.stats.usersAdded > 0 || result.stats.usersUpdated > 0 || result.stats.usersRemoved > 0

      result.success = !hasErrors
      result.message = hasErrors 
        ? `Sync completed with ${result.stats.errors.length} errors`
        : hasChanges 
          ? `Sync completed successfully. Added: ${result.stats.usersAdded}, Updated: ${result.stats.usersUpdated}, Removed: ${result.stats.usersRemoved}`
          : 'Sync completed - no changes needed'

      console.log('✅ User sync completed:', result.message)
      return result

    } catch (error: any) {
      console.error('❌ User sync failed:', error)
      result.success = false
      result.message = `Sync failed: ${error.message}`
      result.stats.errors.push(error.message)
      return result
    }
  }

  /**
   * Get sync statistics without performing sync
   */
  static async getSyncStats() {
    try {
      const [authUsers, dbUsers] = await Promise.all([
        this.fetchAuthUsers(),
        this.fetchDbUsers()
      ])

      const authUserIds = new Set(authUsers.map(u => u.id))
      const dbUserIds = new Set(dbUsers.map(u => u.user_id))

      const usersToAdd = authUsers.filter(u => !dbUserIds.has(u.id))
      const usersToRemove = dbUsers.filter(u => !authUserIds.has(u.user_id))
      const usersToUpdate = authUsers.filter(u => {
        const dbUser = dbUsers.find(d => d.user_id === u.id)
        return dbUser && (
          dbUser.updated_at !== new Date().toISOString()
        )
      })

      return {
        totalAuthUsers: authUsers.length,
        totalDbUsers: dbUsers.length,
        usersToAdd: usersToAdd.length,
        usersToRemove: usersToRemove.length,
        usersToUpdate: usersToUpdate.length,
        isInSync: usersToAdd.length === 0 && usersToRemove.length === 0 && usersToUpdate.length === 0
      }
    } catch (error: any) {
      console.error('Error getting sync stats:', error)
      throw new Error(`Failed to get sync stats: ${error.message}`)
    }
  }
}
