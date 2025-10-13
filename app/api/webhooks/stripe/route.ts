import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/stripe'
import { subscriptionService } from '@/lib/subscription-service'
import type { Stripe } from 'stripe'

// Ensure Node runtime for Stripe webhook verification and admin Supabase usage
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('[WEBHOOK ERROR] Missing stripe-signature header')
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = verifyWebhookSignature(body, signature)
    } catch (error) {
      console.error('[WEBHOOK ERROR] Signature verification failed:', error)
      console.error('[WEBHOOK ERROR] Make sure STRIPE_WEBHOOK_SECRET is correctly set')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    console.log('✅ [WEBHOOK] Received event:', event.type, 'ID:', event.id)

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
        await subscriptionService.handleSubscriptionCreated(
          event.data.object as Stripe.Subscription
        )
        break

      case 'customer.subscription.updated':
        await subscriptionService.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        )
        break

      case 'customer.subscription.deleted':
        await subscriptionService.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        )
        break

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`ℹ️  [WEBHOOK] Unhandled event type: ${event.type}`)
    }

    const duration = Date.now() - startTime
    console.log(`✅ [WEBHOOK] Successfully processed ${event.type} in ${duration}ms`)
    return NextResponse.json({ received: true })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`❌ [WEBHOOK ERROR] Failed after ${duration}ms:`, error)
    console.error('[WEBHOOK ERROR] Event details:', JSON.stringify(error, null, 2))
    return NextResponse.json(
      { error: 'Webhook handler failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log('🛒 [CHECKOUT] Session completed:', session.id)
    console.log('🛒 [CHECKOUT] Mode:', session.mode)
    console.log('🛒 [CHECKOUT] Email:', session.customer_details?.email)
    console.log('🛒 [CHECKOUT] Customer ID:', session.customer)
    console.log('🛒 [CHECKOUT] Subscription ID:', session.subscription)
    
    const customerId = session.customer as string
    const subscriptionId = session.subscription as string
    const customerEmail = session.customer_details?.email
    
    if (!customerId) {
      console.error('❌ [CHECKOUT ERROR] Missing customer ID in checkout session')
      return
    }
    
    if (!customerEmail) {
      console.error('❌ [CHECKOUT ERROR] Missing customer email in checkout session')
      return
    }
    
    // Only handle subscription mode (we don't support one-time payments)
    if (session.mode === 'subscription' && subscriptionId) {
      console.log('🔄 [CHECKOUT] Processing subscription checkout...')
      const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY!)
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      
      console.log('👤 [CHECKOUT] Creating/linking user account for:', customerEmail)
      // Handle guest checkout by creating user account if needed
      await subscriptionService.handleGuestSubscriptionCreated(subscription, customerEmail || undefined)
      console.log('✅ [CHECKOUT] User account created/linked successfully')
    } else {
      console.error('❌ [CHECKOUT ERROR] Invalid checkout session:', {
        mode: session.mode,
        hasSubscription: !!subscriptionId
      })
    }
    
    console.log('✅ [CHECKOUT] Successfully processed checkout session:', session.id)
  } catch (error) {
    console.error('❌ [CHECKOUT ERROR] Failed to handle checkout session:', error)
    throw error
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    console.log('Invoice payment succeeded:', invoice.id)
    
    const subscriptionId = (invoice as any).subscription
    if (subscriptionId && typeof subscriptionId === 'string') {
      // Get the subscription and update its status
      const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY!)
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      
      // Handle the subscription update
      await subscriptionService.handleSubscriptionUpdated(subscription)
    }
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error)
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    console.log('Invoice payment failed:', invoice.id)
    
    const subscriptionId = (invoice as any).subscription
    if (subscriptionId && typeof subscriptionId === 'string') {
      // Get the subscription and update its status
      const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY!)
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      
      // Handle the subscription update (this will mark it as past_due or unpaid)
      await subscriptionService.handleSubscriptionUpdated(subscription)
    }
  } catch (error) {
    console.error('Error handling invoice payment failed:', error)
  }
}
