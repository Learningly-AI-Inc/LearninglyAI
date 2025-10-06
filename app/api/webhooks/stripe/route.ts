import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/stripe'
import { subscriptionService } from '@/lib/subscription-service'
import type { Stripe } from 'stripe'

// Ensure Node runtime for Stripe webhook verification and admin Supabase usage
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('Missing stripe-signature header')
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
      console.error('Webhook signature verification failed:', error)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    console.log('Received webhook event:', event.type)

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
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log('Checkout session completed:', session.id)
    console.log('Session mode:', session.mode)
    console.log('Session metadata:', session.metadata)
    console.log('Customer details:', session.customer_details)
    
    const customerId = session.customer as string
    const subscriptionId = session.subscription as string
    const customerEmail = session.customer_details?.email
    
    if (!customerId) {
      console.error('Missing customer ID in checkout session')
      return
    }
    
    // Only handle subscription mode (we don't support one-time payments)
    if (session.mode === 'subscription' && subscriptionId) {
      console.log('Processing subscription checkout session')
      const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY!)
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      
      // Handle guest checkout by creating user account if needed
      await subscriptionService.handleGuestSubscriptionCreated(subscription, customerEmail || undefined)
    } else {
      console.error('Invalid checkout session mode or missing subscription ID:', {
        mode: session.mode,
        hasSubscription: !!subscriptionId
      })
    }
    
    console.log('Successfully processed checkout session:', session.id)
  } catch (error) {
    console.error('Error handling checkout session completed:', error)
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    console.log('Invoice payment succeeded:', invoice.id)
    
    if (invoice.subscription) {
      // Get the subscription and update its status
      const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY!)
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
      
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
    
    if (invoice.subscription) {
      // Get the subscription and update its status
      const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY!)
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
      
      // Handle the subscription update (this will mark it as past_due or unpaid)
      await subscriptionService.handleSubscriptionUpdated(subscription)
    }
  } catch (error) {
    console.error('Error handling invoice payment failed:', error)
  }
