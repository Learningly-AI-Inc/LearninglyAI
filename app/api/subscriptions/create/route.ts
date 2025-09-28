import { NextRequest, NextResponse } from 'next/server'
import { subscriptionService } from '@/lib/subscription-service'
import { getPriceIdByPlan } from '@/lib/stripe'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { plan, successUrl, cancelUrl } = await request.json()

    if (!plan || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: plan, successUrl, cancelUrl' },
        { status: 400 }
      )
    }

    // Validate plan (support yearly variant)
    const validPlans = ['freemium', 'premium', 'premium_yearly']
    if (!validPlans.includes(plan.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be freemium, premium, or premium_yearly' },
        { status: 400 }
      )
    }

    // Check if user already has an active subscription
    const existingSubscription = await subscriptionService.getUserSubscription(user.id)
    if (existingSubscription) {
      return NextResponse.json(
        { error: 'User already has an active subscription' },
        { status: 400 }
      )
    }

    // Get price ID for the plan
    const priceId = getPriceIdByPlan(plan)

    // Create checkout session via Stripe directly to avoid importing server secret into client bundle
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/subscriptions/create-checkout-guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, successUrl, cancelUrl })
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json({ error: err.error || 'Failed to create checkout session' }, { status: 500 })
    }
    const { checkoutUrl } = await res.json()

    return NextResponse.json({ checkoutUrl })
  } catch (error) {
    console.error('Error creating subscription:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
