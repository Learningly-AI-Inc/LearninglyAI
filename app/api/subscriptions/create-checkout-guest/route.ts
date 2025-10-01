import { NextRequest, NextResponse } from 'next/server'
// Import Stripe server-side directly to avoid bundling server secrets into the client
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  typescript: true,
})
// Avoid importing helpers here to keep this route self-contained and robust

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

    // Resolve plan; per requirement, premium_yearly maps to premium price id
    const normalizedPlan = plan.toLowerCase()
    const resolvedPlan = normalizedPlan === 'premium_yearly' ? 'premium' : normalizedPlan

    // Resolve Stripe price ID directly from env per plan
    const getPriceIdByPlan = (p: string): string => {
      const map: Record<string, string | undefined> = {
        freemium: process.env.STRIPE_FREEMIUM_PRICE_ID,
        premium: process.env.STRIPE_PREMIUM_PRICE_ID,
      }
      const id = map[p]
      if (!id) throw new Error(`Missing price id for plan: ${p}`)
      return id
    }

    // Get price ID for the resolved plan with explicit validation
    let priceId: string
    try {
      priceId = getPriceIdByPlan(resolvedPlan)
    } catch (e: any) {
      console.error('Price ID resolution failed:', e?.message || e)
      return NextResponse.json(
        { 
          error: `Stripe price ID not configured for plan: ${resolvedPlan}. Please set the corresponding env var (e.g., STRIPE_FREEMIUM_PRICE_ID, STRIPE_PREMIUM_PRICE_ID, or STRIPE_PREMIUM_YEARLY_PRICE_ID).` 
        },
        { status: 400 }
      )
    }

    if (!priceId || typeof priceId !== 'string' || !priceId.trim()) {
      console.error('Empty or invalid price ID for plan:', resolvedPlan)
      return NextResponse.json(
        { error: 'Invalid Stripe price ID. Please verify your environment variables.' },
        { status: 400 }
      )
    }
    
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
        plan: resolvedPlan,
        source: 'landing_page',
        price_type: price.type,
        billing_interval: price.recurring.interval
      },
      // For subscription mode, customer is created automatically
      // No need for customer_creation parameter
    })

    return NextResponse.json({ checkoutUrl: session.url })
  } catch (error) {
    const keyMode = (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_live') ? 'live' : 'test'
    const rawMsg = (error as any)?.raw?.message || (error as Error)?.message || String(error)
    console.error('Error creating guest checkout session:', rawMsg)

    // Helpful diagnostics for common misconfigurations
    if (/No such price/i.test(rawMsg) || /resource_missing/i.test((error as any)?.type || '')) {
      return NextResponse.json(
        { 
          error: `Stripe could not find the specified price. Ensure the price ID exists in the ${keyMode} environment and matches your env vars.`
        },
        { status: 400 }
      )
    }

    if (/Invalid API Key provided/i.test(rawMsg)) {
      return NextResponse.json(
        { error: 'Invalid Stripe API key. Please verify STRIPE_SECRET_KEY.' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: `Failed to create checkout session: ${rawMsg}` },
      { status: 500 }
    )
  }
}
