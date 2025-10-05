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
  ai_requests: number
  storage_used_bytes: number
  search_queries: number
  exam_sessions: number
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
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (
            id,
            name,
            description,
            price_cents,
            currency,
            interval,
            features,
            limits
          )
        `)
        .eq('user_id', userId)
        .in('status', ['active', 'trialing'])
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    } catch (error) {
      console.error('Error fetching user subscription with plan:', error)
      return null
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
        .from('user_subscriptions')
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

      // Create or update subscription record for known user
      const supabase = await this.getAdminSupabase()
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          plan_id: plan.id,
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          status: subscription.status as any,
          current_period_start: new Date((subscription as any).current_period_start * 1000),
          current_period_end: new Date((subscription as any).current_period_end * 1000),
          cancel_at_period_end: (subscription as any).cancel_at_period_end,
          trial_end: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000) : null,
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
        const existingUser = users?.users?.find(u => u.email === customerEmail)
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

      // Create or update subscription record
      const { error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          plan_id: plan.id,
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          status: subscription.status as any,
          current_period_start: new Date((subscription as any).current_period_start * 1000),
          current_period_end: new Date((subscription as any).current_period_end * 1000),
          cancel_at_period_end: (subscription as any).cancel_at_period_end,
          trial_end: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000) : null,
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
      const userId = subscription.metadata.user_id
      
      const supabase = await this.getAdminSupabase()
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: subscription.status as any,
          current_period_start: new Date((subscription as any).current_period_start * 1000),
          current_period_end: new Date((subscription as any).current_period_end * 1000),
          cancel_at_period_end: (subscription as any).cancel_at_period_end,
          trial_end: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000) : null,
        })
        .eq('stripe_subscription_id', subscription.id)

      if (error) throw error
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
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', subscription.id)

      if (error) throw error
    } catch (error) {
      console.error('Error handling subscription deleted:', error)
      throw error
    }
  }

  /**
   * Get plan by price ID
   */
  private async getPlanByStripeIds(priceId: string, productId?: string): Promise<SubscriptionPlan | null> {
    try {
      const supabase = await this.getAdminSupabase()
      // Try by price ID first
      let { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('stripe_price_id', priceId)
        .single()

      if (data) return data
      if (error && error.code !== 'PGRST116') throw error

      // Fallback: some databases mistakenly store product id in stripe_price_id
      if (productId) {
        const res = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('stripe_price_id', productId)
          .single()
        if (res.data) return res.data
        if (res.error && res.error.code !== 'PGRST116') throw res.error
      }

      return null
    } catch (error) {
      console.error('Error fetching plan by Stripe IDs:', error)
      return null
    }
  }

  /**
   * Get user's current usage for today
   */
  async getCurrentUsage(userId: string): Promise<UsageData> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('usage_date', new Date().toISOString().split('T')[0])
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      return data || {
        documents_uploaded: 0,
        ai_requests: 0,
        storage_used_bytes: 0,
        search_queries: 0,
        exam_sessions: 0,
      }
    } catch (error) {
      console.error('Error fetching current usage:', error)
      return {
        documents_uploaded: 0,
        ai_requests: 0,
        storage_used_bytes: 0,
        search_queries: 0,
        exam_sessions: 0,
      }
    }
  }

  /**
   * Check if user can perform an action based on their subscription limits
   */
  async checkUsageLimit(userId: string, action: keyof UsageData, amount: number = 1): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscriptionWithPlan(userId)
      const currentUsage = await this.getCurrentUsage(userId)
      
      // If no subscription, use free plan limits (1 free trial as per requirements)
      const limits = subscription?.subscription_plans?.limits || {
        ai_requests: 10,
        document_uploads: 1, // 1 free trial upload
        search_queries: 50,
        exam_sessions: 5,
      }

      const limitKey = action === 'documents_uploaded' ? 'document_uploads' : action
      const limit = limits[limitKey]
      
      // -1 means unlimited
      if (limit === -1) return true
      
      const current = currentUsage[action] || 0
      return (current + amount) <= limit
    } catch (error) {
      console.error('Error checking usage limit:', error)
      return false
    }
  }

  /**
   * Increment usage for a user
   */
  async incrementUsage(userId: string, action: keyof UsageData, amount: number = 1): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const updateData: Partial<UsageData> = {}
      updateData[action] = amount

      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from('user_usage')
        .upsert({
          user_id: userId,
          usage_date: today,
          ...updateData,
        }, {
          onConflict: 'user_id,usage_date',
          ignoreDuplicates: false,
        })

      if (error) throw error
    } catch (error) {
      console.error('Error incrementing usage:', error)
      throw error
    }
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService()
