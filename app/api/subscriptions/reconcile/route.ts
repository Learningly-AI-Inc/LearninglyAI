import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient, createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { typescript: true })

    const { data: { user } } = await supabase.auth.getUser()

    // Optional session id from Stripe success redirect to reconcile guest flows
    const { sessionId } = await request.json().catch(() => ({ sessionId: undefined }))

    // If we have a session id and no signed-in user, attempt guest reconciliation via session
    if (!user && sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId)
        if (session.mode === 'subscription' && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string)
          const email = session.customer_details?.email
          // Delegate to webhook logic for guest creation
          const { subscriptionService } = await import('@/lib/subscription-service')
          await subscriptionService.handleGuestSubscriptionCreated(sub, email || undefined)
          return NextResponse.json({ reconciled: true, guest: true })
        }
      } catch (e) {
        console.error('Guest reconciliation via session failed:', e)
      }
      return NextResponse.json({ reconciled: false, guest: true })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve Stripe customer id for the user
    let stripeCustomerId: string | null = null

    // 1) from user metadata
    const { data: u1 } = await admin.auth.admin.getUserById(user.id)
    stripeCustomerId = (u1 as any)?.user?.user_metadata?.stripe_customer_id || null

    // 2) from subscription table
    if (!stripeCustomerId) {
      try {
        const { data: subRow } = await admin
          .from('user_subscriptions')
          .select('stripe_customer_id')
          .eq('user_id', user.id)
          .single()
        stripeCustomerId = subRow?.stripe_customer_id || null
      } catch (e) {
        // No subscription found
      }
    }

    // 3) from Stripe by email
    if (!stripeCustomerId) {
      const customers = await stripe.customers.list({ email: user.email ?? undefined, limit: 1 })
      stripeCustomerId = customers.data[0]?.id || null
    }

    if (!stripeCustomerId) {
      return NextResponse.json({ reconciled: false, reason: 'no_customer' })
    }

    // Find latest active/trialing subscription for this customer
    const subs = await stripe.subscriptions.list({ customer: stripeCustomerId, status: 'all', limit: 10 })
    const chosen = subs.data.find(s => ['active', 'trialing', 'past_due', 'incomplete'].includes(s.status)) || subs.data[0]

    if (!chosen) {
      return NextResponse.json({ reconciled: false, reason: 'no_subscription' })
    }

    // Map to internal plan by price or product id
    const price = chosen.items.data[0].price
    const priceId = price.id
    const productId = typeof price.product === 'string' ? price.product as string : (price.product as any)?.id

    let plan = null
    try {
      const { data: planByPrice } = await admin
        .from('subscription_plans')
        .select('*')
        .eq('stripe_price_id', priceId)
        .single()
      plan = planByPrice
    } catch (e) {
      // Plan not found by price ID, try product ID if available
      if (productId) {
        try {
          const { data: planByProduct } = await admin
            .from('subscription_plans')
            .select('*')
            .eq('stripe_price_id', productId)
            .single()
          plan = planByProduct
        } catch (e2) {
          // Plan not found by product ID either
        }
      }
    }

    if (!plan) {
      return NextResponse.json({ reconciled: false, reason: 'plan_not_found' })
    }

    // Upsert subscription row
    const { error } = await admin
      .from('user_subscriptions')
      .upsert({
        user_id: user.id,
        plan_id: plan.id,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: chosen.id,
        status: chosen.status as any,
        current_period_start: new Date((chosen as any).current_period_start * 1000),
        current_period_end: new Date((chosen as any).current_period_end * 1000),
        cancel_at_period_end: (chosen as any).cancel_at_period_end,
        trial_end: (chosen as any).trial_end ? new Date((chosen as any).trial_end * 1000) : null,
      }, { onConflict: 'user_id', ignoreDuplicates: false })

    if (error) {
      console.error('Reconcile upsert error:', error)
      return NextResponse.json({ reconciled: false }, { status: 500 })
    }

    // Persist customer id to user metadata for future lookups
    try {
      await admin.auth.admin.updateUserById(user.id, { user_metadata: { stripe_customer_id: stripeCustomerId } })
    } catch {}

    return NextResponse.json({ reconciled: true, status: chosen.status })
  } catch (error) {
    console.error('Reconcile error:', error)
    return NextResponse.json({ error: 'Failed to reconcile' }, { status: 500 })
  }
}


