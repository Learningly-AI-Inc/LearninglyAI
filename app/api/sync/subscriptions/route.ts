import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { typescript: true })
    
    console.log('Starting subscription sync between Stripe and Supabase...')
    
    // Get all users from Supabase
    const { data: users, error: usersError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    })
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }
    
    console.log(`Found ${users?.users?.length || 0} users to sync`)
    
    let syncedCount = 0
    let errorCount = 0
    
    // Process each user
    for (const user of users?.users || []) {
      try {
        await syncUserSubscription(admin, stripe, user)
        syncedCount++
      } catch (error) {
        console.error(`Error syncing user ${user.id}:`, error)
        errorCount++
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Sync completed. Synced: ${syncedCount}, Errors: ${errorCount}`,
      totalUsers: users?.users?.length || 0,
      syncedCount,
      errorCount
    })
    
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync subscriptions' },
      { status: 500 }
    )
  }
}

async function syncUserSubscription(admin: any, stripe: Stripe, user: any) {
  try {
    // 1. Check if user has Stripe customer ID in metadata
    let stripeCustomerId = user.user_metadata?.stripe_customer_id
    
    // 2. If no customer ID, try to find by email
    if (!stripeCustomerId && user.email) {
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
    }
    
    // 3. If we have a Stripe customer, get their subscriptions
    if (stripeCustomerId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'all',
        limit: 10
      })
      
      // Find the most relevant subscription (active/trialing first, then most recent)
      const activeSub = subscriptions.data.find(s => 
        ['active', 'trialing'].includes(s.status)
      )
      const chosenSub = activeSub || subscriptions.data[0]
      
      if (chosenSub) {
        // Map Stripe subscription to our plan
        const price = chosenSub.items.data[0]?.price
        const priceId = price?.id
        const productId = typeof price?.product === 'string' 
          ? price.product 
          : (price?.product as any)?.id
        
        // Find matching plan in our database
        let planId = null
        try {
          // Try by price ID first
          const { data: planByPrice } = await admin
            .from('subscription_plans')
            .select('id')
            .eq('stripe_price_id', priceId)
            .single()
          
          if (planByPrice) {
            planId = planByPrice.id
          } else if (productId) {
            // Try by product ID
            const { data: planByProduct } = await admin
              .from('subscription_plans')
              .select('id')
              .eq('stripe_price_id', productId)
              .single()
            
            if (planByProduct) {
              planId = planByProduct.id
            }
          }
        } catch (e) {
          // Plan not found by Stripe IDs
        }
        
        // If no plan found, use Free plan
        if (!planId) {
          const { data: freePlan } = await admin
            .from('subscription_plans')
            .select('id')
            .eq('name', 'Free')
            .single()
          planId = freePlan?.id
        }
        
        // Upsert subscription record
        await admin
          .from('user_subscriptions')
          .upsert({
            user_id: user.id,
            plan_id: planId,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: chosenSub.id,
            status: chosenSub.status as any,
            current_period_start: new Date((chosenSub as any).current_period_start * 1000),
            current_period_end: new Date((chosenSub as any).current_period_end * 1000),
            cancel_at_period_end: (chosenSub as any).cancel_at_period_end,
            trial_end: (chosenSub as any).trial_end 
              ? new Date((chosenSub as any).trial_end * 1000) 
              : null,
          }, { onConflict: 'user_id', ignoreDuplicates: false })
        
        console.log(`Synced user ${user.id} with Stripe subscription ${chosenSub.id}`)
      } else {
        // No Stripe subscription found, ensure user has Free plan record
        const { data: freePlan } = await admin
          .from('subscription_plans')
          .select('id')
          .eq('name', 'Free')
          .single()
        
        if (freePlan) {
          await admin
            .from('user_subscriptions')
            .upsert({
              user_id: user.id,
              plan_id: freePlan.id,
              status: 'canceled', // Not premium
              cancel_at_period_end: false,
            }, { onConflict: 'user_id', ignoreDuplicates: false })
        }
      }
    } else {
      // No Stripe customer, ensure user has Free plan record
      const { data: freePlan } = await admin
        .from('subscription_plans')
        .select('id')
        .eq('name', 'Free')
        .single()
      
      if (freePlan) {
        await admin
          .from('user_subscriptions')
          .upsert({
            user_id: user.id,
            plan_id: freePlan.id,
            status: 'canceled', // Not premium
            cancel_at_period_end: false,
          }, { onConflict: 'user_id', ignoreDuplicates: false })
      }
    }
    
  } catch (error) {
    console.error(`Error syncing user ${user.id}:`, error)
    throw error
  }
}
