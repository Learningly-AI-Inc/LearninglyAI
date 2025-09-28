import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getPriceIdByPlan } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
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

    // Get price ID for the plan
    const priceId = getPriceIdByPlan(plan.toLowerCase())
    
    console.log('Creating checkout session with price ID:', priceId)

    // First, let's check if the price is recurring
    const price = await stripe.prices.retrieve(priceId)
    console.log('Price details:', { 
      id: price.id, 
      type: price.type, 
      recurring: price.recurring,
      unit_amount: price.unit_amount 
    })

    // CRITICAL: Only allow recurring prices for subscriptions
    if (price.type !== 'recurring') {
      console.error('Price is not recurring! This will cause billing issues.')
      return NextResponse.json(
        { 
          error: 'Invalid price type. Only recurring subscription prices are supported. Please contact support.',
          details: 'The selected plan must be a recurring subscription, not a one-time payment.'
        },
        { status: 400 }
      )
    }

    // Verify it's a recurring price with allowed interval
    const allowedIntervals = ['month', 'year']
    if (!price.recurring || !allowedIntervals.includes(price.recurring.interval)) {
      console.error('Price interval is not allowed!')
      return NextResponse.json(
        { 
          error: 'Invalid billing interval. Only monthly or yearly subscriptions are supported.',
          details: 'The selected plan must be billed monthly or yearly.'
        },
        { status: 400 }
      )
    }

    // Create Stripe checkout session (subscription mode only)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Customer will be created automatically by Stripe
      // We'll handle user creation in the webhook
      metadata: {
        plan: plan.toLowerCase(),
        source: 'landing_page',
        price_type: price.type,
        billing_interval: price.recurring.interval
      },
      // For subscription mode, customer is created automatically
      // No need for customer_creation parameter
    })

    return NextResponse.json({ checkoutUrl: session.url })
  } catch (error) {
    console.error('Error creating guest checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
