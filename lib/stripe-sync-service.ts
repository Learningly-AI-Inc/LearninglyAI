import { createAdminClient } from './supabase-server'
import { stripe } from './stripe'
import type { Stripe } from 'stripe'

export interface SyncResult {
  success: boolean
  message: string
  stats: {
    totalUsers: number
    usersSynced: number
    subscriptionsUpdated: number
    errors: string[]
  }
}

export class StripeSyncService {
  /**
   * Comprehensive sync between Stripe and Supabase
   * This ensures all subscription data is up to date
   */
  static async syncAllSubscriptions(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      message: '',
      stats: {
        totalUsers: 0,
        usersSynced: 0,
        subscriptionsUpdated: 0,
        errors: []
      }
    }

    try {
      console.log('🔄 Starting comprehensive Stripe-Supabase sync...')
      
      const admin = await createAdminClient()
      
      // Get all users from Supabase Auth
      const { data: authUsers, error: authError } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      })

      if (authError) {
        throw new Error(`Failed to fetch auth users: ${authError.message}`)
      }

      result.stats.totalUsers = authUsers?.users?.length || 0
      console.log(`📊 Found ${result.stats.totalUsers} users to sync`)

      // Process each user
      for (const user of authUsers?.users || []) {
        try {
          await this.syncUserSubscription(admin, user)
          result.stats.usersSynced++
        } catch (error: any) {
          const errorMsg = `Error syncing user ${user.email || user.id}: ${error.message}`
          console.error(errorMsg)
          result.stats.errors.push(errorMsg)
        }
      }

      // Also sync any Stripe subscriptions that might not have corresponding users
      await this.syncOrphanedSubscriptions(admin)
      
      result.success = result.stats.errors.length === 0
      result.message = result.success 
        ? `Sync completed successfully. Synced ${result.stats.usersSynced} users.`
        : `Sync completed with ${result.stats.errors.length} errors.`

      console.log('✅ Sync completed:', result.message)
      return result

    } catch (error: any) {
      console.error('❌ Sync failed:', error)
      result.success = false
      result.message = `Sync failed: ${error.message}`
      result.stats.errors.push(error.message)
      return result
    }
  }

  /**
   * Sync a single user's subscription data
   */
  private static async syncUserSubscription(admin: any, user: any): Promise<void> {
    // Check if user has Stripe customer ID in metadata
    let stripeCustomerId = user.user_metadata?.stripe_customer_id
    
    // If no customer ID, try to find by email
    if (!stripeCustomerId && user.email) {
      try {
        const customers = await stripe.customers.list({ 
          email: user.email, 
          limit: 1 
        })
        if (customers.data.length > 0) {
          stripeCustomerId = customers.data[0].id
          // Update user metadata with customer ID
          await admin.auth.admin.updateUserById(user.id, {
            user_metadata: { 
              ...user.user_metadata, 
              stripe_customer_id: stripeCustomerId 
            }
          })
        }
      } catch (error) {
        console.warn(`Failed to lookup customer by email for ${user.email}:`, error)
      }
    }
    
    // If we have a Stripe customer, get their subscriptions
    if (stripeCustomerId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: 'all',
          limit: 10
        })

        // Find the most relevant subscription (active > trialing > past_due > others)
        const priorityOrder = ['active', 'trialing', 'past_due', 'incomplete', 'unpaid', 'canceled']
        const chosenSub = subscriptions.data.find(sub => priorityOrder.includes(sub.status)) || subscriptions.data[0]

        if (chosenSub) {
          const price = chosenSub.items.data[0]?.price
          const planName = this.mapPriceToPlanName(price)
          const planPrice = price?.unit_amount || 0

          // Update user_data table
          const { error } = await admin
            .from('user_data')
            .upsert({
              user_id: user.id,
              plan_name: planName,
              plan_price_cents: planPrice,
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: chosenSub.id,
              subscription_status: chosenSub.status as any,
              current_period_end: new Date((chosenSub as any).current_period_end * 1000),
              cancel_at_period_end: (chosenSub as any).cancel_at_period_end,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id', ignoreDuplicates: false })

          if (error) {
            throw new Error(`Failed to update user_data: ${error.message}`)
          }

          console.log(`✅ Synced user ${user.email}: ${chosenSub.status} subscription`)
        } else {
          // No Stripe subscription found, set to Free plan
          await this.setUserToFreePlan(admin, user.id)
          console.log(`📝 Set user ${user.email} to Free plan (no Stripe subscription)`)
        }
      } catch (error) {
        console.warn(`Failed to sync Stripe data for user ${user.email}:`, error)
        // Fallback to Free plan
        await this.setUserToFreePlan(admin, user.id)
      }
    } else {
      // No Stripe customer, set to Free plan
      await this.setUserToFreePlan(admin, user.id)
      console.log(`📝 Set user ${user.email} to Free plan (no Stripe customer)`)
    }
  }

  /**
   * Set user to Free plan
   */
  private static async setUserToFreePlan(admin: any, userId: string): Promise<void> {
    const { error } = await admin
      .from('user_data')
      .upsert({
        user_id: userId,
        plan_name: 'Free',
        plan_price_cents: 0,
        subscription_status: 'canceled',
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id', ignoreDuplicates: false })

    if (error) {
      throw new Error(`Failed to set user to Free plan: ${error.message}`)
    }
  }

  /**
   * Map Stripe price to plan name
   */
  private static mapPriceToPlanName(price: Stripe.Price | null): string {
    if (!price?.unit_amount) return 'Free'
    
    // Correct mapping based on your actual Stripe prices:
    // $100.00 (10000 cents) → Premium
    // $15.00 (1500 cents) → Premium  
    // Everything else → Free
    
    if (price.unit_amount >= 1500) return 'Premium'  // $15+ is Premium (both $15 and $100)
    return 'Free'
  }

  /**
   * Sync orphaned Stripe subscriptions (subscriptions without corresponding users)
   */
  private static async syncOrphanedSubscriptions(admin: any): Promise<void> {
    try {
      console.log('🔍 Checking for orphaned Stripe subscriptions...')
      
      // Get all active subscriptions from Stripe
      const subscriptions = await stripe.subscriptions.list({
        status: 'all',
        limit: 100
      })

      for (const subscription of subscriptions.data) {
        // Check if this subscription exists in our user_data table
        const { data: existingUser } = await admin
          .from('user_data')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        if (!existingUser) {
          console.log(`⚠️ Found orphaned subscription: ${subscription.id}`)
          
          // Try to find user by customer email
          const customer = await stripe.customers.retrieve(subscription.customer as string)
          const email = (customer as any)?.email

          if (email) {
            // Find user by email
            const { data: authUsers } = await admin.auth.admin.listUsers({
              page: 1,
              perPage: 1000
            })
            
            const user = authUsers?.users?.find(u => u.email === email)
            
            if (user) {
              console.log(`🔗 Linking orphaned subscription to user: ${email}`)
              await this.syncUserSubscription(admin, user)
            } else {
              console.log(`❌ No user found for orphaned subscription email: ${email}`)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error syncing orphaned subscriptions:', error)
    }
  }

  /**
   * Verify subscription data integrity
   */
  static async verifySyncIntegrity(): Promise<{
    mismatches: Array<{
      userId: string
      email: string
      supabaseStatus: string
      stripeStatus: string
      issue: string
    }>
  }> {
    const mismatches: any[] = []

    try {
      const admin = await createAdminClient()
      
      // Get all users with subscriptions
      const { data: users, error } = await admin
        .from('user_data')
        .select('*')
        .not('stripe_subscription_id', 'is', null)

      if (error) throw error

      for (const user of users || []) {
        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id)
          
          if (subscription.status !== user.subscription_status) {
            mismatches.push({
              userId: user.user_id,
              email: user.email || 'unknown',
              supabaseStatus: user.subscription_status,
              stripeStatus: subscription.status,
              issue: 'Status mismatch'
            })
          }
        } catch (error) {
          mismatches.push({
            userId: user.user_id,
            email: user.email || 'unknown',
            supabaseStatus: user.subscription_status,
            stripeStatus: 'not_found',
            issue: 'Subscription not found in Stripe'
          })
        }
      }
    } catch (error) {
      console.error('Error verifying sync integrity:', error)
    }

    return { mismatches }
  }

  /**
   * Force sync a specific user's subscription
   */
  static async syncUserById(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const admin = await createAdminClient()
      
      // Get user from Auth
      const { data: user, error } = await admin.auth.admin.getUserById(userId)
      
      if (error || !user) {
        return { success: false, message: 'User not found' }
      }

      await this.syncUserSubscription(admin, user)
      
      return { success: true, message: 'User synced successfully' }
    } catch (error: any) {
      return { success: false, message: `Sync failed: ${error.message}` }
    }
  }
}
