import { stripe, STRIPE_CONFIG, validateStripeConfig } from './stripe'
import { createClient, createAdminClient } from './supabase-server'
import type { Stripe } from 'stripe'

// Validate Stripe configuration only when needed (not during build)
let stripeConfigValidated = false
function ensureStripeConfig() {
  if (!stripeConfigValidated && process.env.NODE_ENV !== 'production') {
    try {
      validateStripeConfig()
      stripeConfigValidated = true
    } catch (error) {
      console.warn('Stripe configuration validation skipped during build:', error instanceof Error ? error.message : String(error))
    }
  }
}

export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price_cents: number
  currency: string
  interval: string
  stripe_price_id?: string
  features: Record<string, any>
  limits: Record<string, any>
  is_active: boolean
}

export interface UserSubscription {
  id: string
  user_id: string
  plan_id: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete' | 'trialing'
  current_period_start?: Date
  current_period_end?: Date
  cancel_at_period_end: boolean
  trial_end?: Date
}

export interface UsageData {
  documents_uploaded: number
  writing_words: number
  storage_used_bytes: number
  search_queries: number
  exam_sessions: number
}

export interface PlanLimits {
  documents_uploaded: number
  writing_words: number
  search_queries: number
  exam_sessions: number
  storage_used_bytes: number
}

export class SubscriptionService {
  private async getSupabase() {
    return await createClient()
  }

  // Admin client for webhook/server-side writes that must bypass RLS
  private async getAdminSupabase() {
    return await createAdminClient()
  }

  /**
   * Get all available subscription plans
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_cents')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching subscription plans:', error)
      throw new Error('Failed to fetch subscription plans')
    }
  }

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing'])
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
      return data
    } catch (error) {
      console.error('Error fetching user subscription:', error)
      return null
    }
  }

  /**
   * Get user's subscription with plan details
   */
  async getUserSubscriptionWithPlan(userId: string) {
    try {
      const supabase = await this.getSupabase()
      
      // Get the user's data from consolidated table
      const { data, error } = await supabase
        .from('user_data')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      // Only return if it's a premium plan (not Free) and has active/trialing status
      if (data && data.plan_name !== 'Free' && 
          (data.subscription_status === 'active' || data.subscription_status === 'trialing')) {
        return {
          ...data,
          subscription_plans: {
            name: data.plan_name,
            price_cents: data.plan_price_cents
          },
          status: data.subscription_status
        }
      }
      
      return null
    } catch (error) {
      console.error('Error fetching user subscription with plan:', error)
      return null
    }
  }

  /**
   * Ensure a subscription record exists for the given user.
   * - If Stripe has an active/trialing subscription, upsert it with the mapped plan.
   * - Otherwise, upsert a record pointing to the Free plan with a non-active status (e.g., canceled).
   * This keeps `auth.users` and `user_subscriptions` in sync lazily per-user.
   */
  async ensureUserSubscriptionRecord(userId: string): Promise<void> {
    try {
      const admin = await this.getAdminSupabase()

      // If any row exists for this user, do nothing (we only ensure presence, not force-update here)
      const { data: existing, error: existingErr } = await admin
        .from('user_data')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (!existingErr && existing) {
        return
      }

      // Resolve Stripe customer id from user metadata or by email
      let stripeCustomerId: string | null = null
      try {
        const u = await admin.auth.admin.getUserById(userId)
        const user = (u as any)?.user
        stripeCustomerId = user?.user_metadata?.stripe_customer_id || null

        // If not present, try lookup by email via Stripe
        if (!stripeCustomerId && user?.email) {
          ensureStripeConfig()
          const customers = await stripe.customers.list({ email: user.email, limit: 1 })
          stripeCustomerId = customers.data[0]?.id || null
        }
      } catch {}

      // If we have a Stripe customer, attempt to mirror their latest subscription
      if (stripeCustomerId) {
        try {
          ensureStripeConfig()
          const subs = await stripe.subscriptions.list({ customer: stripeCustomerId, status: 'all', limit: 10 })
          const chosen = subs.data.find(s => ['active', 'trialing', 'past_due', 'incomplete', 'unpaid', 'canceled'].includes(s.status)) || subs.data[0]

          if (chosen) {
            const price = chosen.items.data[0]?.price
            const priceId = price?.id
            const productId = typeof price?.product === 'string' ? (price?.product as string) : (price?.product as any)?.id

            // Map Stripe plan to our plan names
            let planName = 'Free'
            let planPrice = 0
            
            if (priceId || productId) {
              // Try to determine plan based on price
              if (price?.unit_amount) {
                if (price.unit_amount === 1500) {
                  planName = 'Premium (Monthly)'  // $15 is Premium Monthly
                  planPrice = 1500
                } else if (price.unit_amount === 10000) {
                  planName = 'Premium (Yearly)'   // $100 is Premium Yearly
                  planPrice = 10000
                }
                // Everything else is Free (default values above)
              }
            }

            const { error } = await admin
              .from('user_data')
              .upsert({
                user_id: userId,
                plan_name: planName,
                plan_price_cents: planPrice,
                stripe_customer_id: stripeCustomerId,
                stripe_subscription_id: chosen.id,
                subscription_status: chosen.status as any,
                current_period_end: new Date((chosen as any).current_period_end * 1000),
                cancel_at_period_end: (chosen as any).cancel_at_period_end,
              }, { onConflict: 'user_id', ignoreDuplicates: false })
            if (error) throw error

            // Persist customer id for future linkage
            try {
              await admin.auth.admin.updateUserById(userId, {
                user_metadata: { stripe_customer_id: stripeCustomerId }
              })
            } catch {}
            return
          }
        } catch (e) {
          // Fall back to free record if Stripe lookup fails
        }
      }

      // Fallback: upsert a record to Free plan with non-active status (represents free tier)
      await admin
        .from('user_data')
        .upsert({
          user_id: userId,
          plan_name: 'Free',
          plan_price_cents: 0,
          subscription_status: 'canceled', // not premium; endpoint logic treats missing active/trialing as free
          cancel_at_period_end: false,
        }, { onConflict: 'user_id', ignoreDuplicates: false })
    } catch (error) {
      console.error('ensureUserSubscriptionRecord error:', error)
    }
  }

  /**
   * Create a Stripe customer
   */
  async createStripeCustomer(userId: string, email: string, name?: string): Promise<string> {
    try {
      ensureStripeConfig()
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          user_id: userId,
        },
      })

      return customer.id
    } catch (error) {
      console.error('Error creating Stripe customer:', error)
      throw new Error('Failed to create customer')
    }
  }

  /**
   * Create a subscription checkout session
   */
  async createCheckoutSession(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    try {
      ensureStripeConfig()
      // Get or create Stripe customer
      let customerId = await this.getStripeCustomerId(userId)
      
      if (!customerId) {
        const supabase = await this.getSupabase()
        const { data: user } = await supabase.auth.getUser()
        if (!user.user) throw new Error('User not found')
        
        customerId = await this.createStripeCustomer(
          userId,
          user.user.email!,
          user.user.user_metadata?.full_name
        )
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true, // Enable promotion codes in checkout
        metadata: {
          user_id: userId,
        },
        subscription_data: {
          metadata: {
            user_id: userId,
          },
        },
      })

      return session.url!
    } catch (error) {
      console.error('Error creating checkout session:', error)
      throw new Error('Failed to create checkout session')
    }
  }

  /**
   * Create a customer portal session
   */
  async createPortalSession(userId: string, returnUrl: string): Promise<string> {
    try {
      ensureStripeConfig()
      const customerId = await this.getStripeCustomerId(userId)
      if (!customerId) throw new Error('No Stripe customer found')

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      })

      return session.url
    } catch (error) {
      console.error('Error creating portal session:', error)
      throw new Error('Failed to create portal session')
    }
  }

  /**
   * Get Stripe customer ID for user
   */
  private async getStripeCustomerId(userId: string): Promise<string | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('user_data')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .not('stripe_customer_id', 'is', null)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data?.stripe_customer_id || null
    } catch (error) {
      console.error('Error fetching Stripe customer ID:', error)
      return null
    }
  }

  /**
   * Handle successful subscription creation
   */
  async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const userId = (subscription.metadata as any)?.user_id
      const price = subscription.items.data[0].price
      const priceId = price.id
      const productId = typeof price.product === 'string' ? (price.product as string) : (price.product as any)?.id
      
      // Get plan details (support both price and product mapping)
      const plan = await this.getPlanByStripeIds(priceId, productId)
      if (!plan) throw new Error('Plan not found')

      // If we didn't get a user_id (guest checkout or metadata missing), fall back to guest flow
      if (!userId) {
        // Attempt to get customer email to map account
        try {
          const cust = await stripe.customers.retrieve(subscription.customer as string)
          const email = (cust as any)?.email as string | undefined
          await this.handleGuestSubscriptionCreated(subscription, email)
          return
        } catch (e) {
          console.error('Failed to map guest subscription via customer lookup:', e)
          throw e
        }
      }

      // Create or update subscription record for known user in user_data table
      const supabase = await this.getAdminSupabase()
      const { error } = await supabase
        .from('user_data')
        .upsert({
          user_id: userId,
          plan_name: plan.name,
          plan_price_cents: plan.price_cents,
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status as any,
          current_period_end: new Date((subscription as any).current_period_end * 1000),
          cancel_at_period_end: (subscription as any).cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id', ignoreDuplicates: false })

      if (error) throw error

      // Persist Stripe customer id on the user for future linkage
      if (userId) {
        try {
          await supabase.auth.admin.updateUserById(userId, {
            user_metadata: { stripe_customer_id: subscription.customer as string }
          })
        } catch (e) {
          console.warn('Failed to update user metadata with stripe_customer_id:', e)
        }
      }
    } catch (error) {
      console.error('Error handling subscription created:', error)
      throw error
    }
  }

  /**
   * Handle guest subscription created (for non-authenticated users)
   */
  async handleGuestSubscriptionCreated(subscription: Stripe.Subscription, customerEmail?: string | null): Promise<void> {
    try {
      const price = subscription.items.data[0].price
      const priceId = price.id
      const productId = typeof price.product === 'string' ? (price.product as string) : (price.product as any)?.id
      
      // Get plan details (support both price and product mapping)
      const plan = await this.getPlanByStripeIds(priceId, productId)
      if (!plan) throw new Error('Plan not found')

      const supabase = await this.getAdminSupabase()

      // Check if user already exists with this email
      let userId: string | null = null
      
      if (customerEmail) {
        const { data: users } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000
        })
        const existingUser = users?.users?.find((u: any) => u.email === customerEmail)
        if (existingUser) {
          userId = existingUser.id
          console.log('Found existing user with email:', customerEmail)
        }
      }

      // If no existing user, create a new one
      if (!userId) {
        if (!customerEmail) {
          throw new Error('Customer email is required for guest checkout')
        }

        console.log('Creating new user account for guest checkout:', customerEmail)
        
        // Create user account with email/password auth (they can link OAuth later)
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: customerEmail,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            source: 'stripe_guest_checkout',
            stripe_customer_id: subscription.customer as string,
          }
        })

        if (createError) throw createError
        userId = newUser.user.id
        console.log('Created new user account:', userId)
      }

      // Create or update subscription record in user_data table
      const { error: subscriptionError } = await supabase
        .from('user_data')
        .upsert({
          user_id: userId,
          plan_name: plan.name,
          plan_price_cents: plan.price_cents,
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status as any,
          current_period_end: new Date((subscription as any).current_period_end * 1000),
          cancel_at_period_end: (subscription as any).cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id', ignoreDuplicates: false })

      if (subscriptionError) throw subscriptionError

      console.log('Guest subscription created successfully for user:', userId)

      // Persist Stripe customer id on the user for future linkage
      try {
        await supabase.auth.admin.updateUserById(userId!, {
          user_metadata: { stripe_customer_id: subscription.customer as string }
        })
      } catch (e) {
        console.warn('Failed to update user metadata with stripe_customer_id:', e)
      }
    } catch (error) {
      console.error('Error handling guest subscription created:', error)
      throw error
    }
  }

  /**
   * Handle subscription updates
   */
  async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const supabase = await this.getAdminSupabase()
      
      // Find user by stripe_subscription_id in user_data table
      const { data: userData, error: findError } = await supabase
        .from('user_data')
        .select('user_id')
        .eq('stripe_subscription_id', subscription.id)
        .single()

      if (findError || !userData) {
        console.error('User not found for subscription:', subscription.id)
        return
      }

      // Map subscription status to plan name
      let planName = 'Free'
      let planPrice = 0
      
      if (subscription.status === 'active' || subscription.status === 'trialing') {
        const price = subscription.items.data[0]?.price
        if (price?.unit_amount) {
          if (price.unit_amount === 1500) {
            planName = 'Premium (Monthly)'  // $15 is Premium Monthly
            planPrice = 1500
          } else if (price.unit_amount === 10000) {
            planName = 'Premium (Yearly)'   // $100 is Premium Yearly
            planPrice = 10000
          }
          // Everything else is Free (default values above)
        }
      }

      const { error } = await supabase
        .from('user_data')
        .update({
          plan_name: planName,
          plan_price_cents: planPrice,
          subscription_status: subscription.status as any,
          current_period_end: new Date((subscription as any).current_period_end * 1000),
          cancel_at_period_end: (subscription as any).cancel_at_period_end,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userData.user_id)

      if (error) throw error
      console.log(`Updated subscription for user ${userData.user_id}: ${subscription.status}`)
    } catch (error) {
      console.error('Error handling subscription updated:', error)
      throw error
    }
  }

  /**
   * Handle subscription cancellation
   */
  async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      const supabase = await this.getAdminSupabase()
      
      // Find user by stripe_subscription_id in user_data table
      const { data: userData, error: findError } = await supabase
        .from('user_data')
        .select('user_id')
        .eq('stripe_subscription_id', subscription.id)
        .single()

      if (findError || !userData) {
        console.error('User not found for subscription:', subscription.id)
        return
      }

      const { error } = await supabase
        .from('user_data')
        .update({
          plan_name: 'Free',
          plan_price_cents: 0,
          subscription_status: 'canceled',
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userData.user_id)

      if (error) throw error
      console.log(`Canceled subscription for user ${userData.user_id}`)
    } catch (error) {
      console.error('Error handling subscription deleted:', error)
      throw error
    }
  }

  /**
   * Get plan by price ID - simplified for user_data table structure
   */
  private async getPlanByStripeIds(priceId: string, productId?: string): Promise<{ name: string; price_cents: number } | null> {
    try {
      // Since we don't have a subscription_plans table, we'll map based on price
      // This is a simplified mapping - you can expand this based on your actual Stripe price IDs
      
      // You can store your price mappings in environment variables or a config file
      const priceMappings: Record<string, { name: string; price_cents: number }> = {
        // Add your actual Stripe price IDs here
        // 'price_1234567890': { name: 'Freemium', price_cents: 2000 },
        // 'price_0987654321': { name: 'Premium', price_cents: 10000 },
      }

      if (priceMappings[priceId]) {
        return priceMappings[priceId]
      }

      // Fallback: try to determine plan based on price amount from Stripe
      const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY!)
      const price = await stripe.prices.retrieve(priceId)
      
      if (price.unit_amount) {
        if (price.unit_amount === 1500) {
          return { name: 'Premium (Monthly)', price_cents: price.unit_amount }  // $15 is Premium Monthly
        } else if (price.unit_amount === 10000) {
          return { name: 'Premium (Yearly)', price_cents: price.unit_amount }   // $100 is Premium Yearly
        }
        // Everything else is Free - return null to use default Free plan
      }

      return null
    } catch (error) {
      console.error('Error fetching plan by Stripe IDs:', error)
      return null
    }
  }

  /**
   * Get user's current monthly usage
   */
  async getCurrentUsage(userId: string): Promise<UsageData> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .rpc('get_monthly_usage', { user_uuid: userId })

      if (error) throw error
      
      return data?.[0] || {
        documents_uploaded: 0,
        writing_words: 0,
        storage_used_bytes: 0,
        search_queries: 0,
        exam_sessions: 0,
      }
    } catch (error) {
      console.error('Error fetching current usage:', error)
      return {
        documents_uploaded: 0,
        writing_words: 0,
        storage_used_bytes: 0,
        search_queries: 0,
        exam_sessions: 0,
      }
    }
  }

  /**
   * Get plan limits based on plan name
   */
  getPlanLimits(planName: string): PlanLimits {
    const normalizedPlanName = (planName || '').toLowerCase();

    // Check if it's a Free plan
    if (normalizedPlanName === 'free' || normalizedPlanName === '') {
      return {
        documents_uploaded: 12, // 3 per week = ~12 per month
        writing_words: 5000, // 5,000 words/month
        search_queries: 40, // 10 per week = ~40 per month
        exam_sessions: 1, // 1 per month
        storage_used_bytes: 250 * 1024 * 1024, // 250MB
      }
    }

    // Check if it's Premium Elite / Yearly (unlimited)
    if (normalizedPlanName.includes('elite') || normalizedPlanName.includes('yearly')) {
      return {
        documents_uploaded: -1, // Unlimited
        writing_words: -1, // Unlimited
        search_queries: -1, // Unlimited
        exam_sessions: -1, // Unlimited
        storage_used_bytes: 100 * 1024 * 1024 * 1024, // 100GB
      }
    }

    // Check if it's any Premium plan (monthly or otherwise)
    if (normalizedPlanName.includes('premium')) {
      return {
        documents_uploaded: 3000, // 100 per day = ~3000 per month
        writing_words: 750000, // 25,000 per day = ~750,000 per month
        search_queries: 15000, // 500 per day = ~15,000 per month
        exam_sessions: 200, // 50 per week = ~200 per month
        storage_used_bytes: 10 * 1024 * 1024 * 1024, // 10GB
      }
    }

    // Default fallback
    return {
      documents_uploaded: 0,
      writing_words: 0,
      search_queries: 0,
      exam_sessions: 0,
      storage_used_bytes: 0,
    }
  }

  /**
   * Check if user can perform an action based on their subscription limits
   */
  async checkUsageLimit(userId: string, action: keyof UsageData, amount: number = 1): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .rpc('check_usage_limit_new', { 
          user_uuid: userId, 
          limit_type: action, 
          requested_amount: amount 
        })

      if (error) throw error
      
      return data || false
    } catch (error) {
      console.error('Error checking usage limit:', error)
      return false
    }
  }

  /**
   * Increment monthly usage for a user
   */
  async incrementUsage(userId: string, action: keyof UsageData, amount: number = 1): Promise<void> {
    try {
      const supabase = await this.getSupabase()
      
      const { error } = await supabase
        .rpc('increment_monthly_usage', {
          user_uuid: userId,
          usage_type: action,
          amount: amount
        })

      if (error) throw error
    } catch (error) {
      console.error('Error incrementing usage:', error)
      throw error
    }
  }

  /**
   * Get usage summary with limits and percentages
   */
  async getUsageSummary(userId: string): Promise<{
    usage: UsageData
    limits: PlanLimits
    percentages: {
      documents_uploaded: number
      writing_words: number
      search_queries: number
      exam_sessions: number
      storage_used_bytes: number
    }
  } | null> {
    try {
      const supabase = await this.getSupabase()
      
      // Get user plan
      const { data: userData, error: userError } = await supabase
        .from('user_data')
        .select('plan_name')
        .eq('user_id', userId)
        .single()

      if (userError) throw userError
      if (!userData) return null

      const usage = await this.getCurrentUsage(userId)
      const limits = this.getPlanLimits(userData.plan_name)

      const percentages = {
        documents_uploaded: limits.documents_uploaded === -1 ? 0 : Math.round((usage.documents_uploaded / limits.documents_uploaded) * 100),
        writing_words: limits.writing_words === -1 ? 0 : Math.round((usage.writing_words / limits.writing_words) * 100),
        search_queries: limits.search_queries === -1 ? 0 : Math.round((usage.search_queries / limits.search_queries) * 100),
        exam_sessions: limits.exam_sessions === -1 ? 0 : Math.round((usage.exam_sessions / limits.exam_sessions) * 100),
        storage_used_bytes: limits.storage_used_bytes === -1 ? 0 : Math.round((usage.storage_used_bytes / limits.storage_used_bytes) * 100),
      }

      return { usage, limits, percentages }
    } catch (error) {
      console.error('Error getting usage summary:', error)
      return null
    }
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService()
