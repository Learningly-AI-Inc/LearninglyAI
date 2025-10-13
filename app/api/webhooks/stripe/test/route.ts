import { NextRequest, NextResponse } from 'next/server'

/**
 * Test endpoint to verify webhook configuration
 * Access via: /api/webhooks/stripe/test
 */
export async function GET(request: NextRequest) {
  // Check if webhook secret is configured
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  
  const checks = {
    timestamp: new Date().toISOString(),
    webhookSecretConfigured: !!webhookSecret && webhookSecret.startsWith('whsec_'),
    stripeKeyConfigured: !!stripeSecretKey && (stripeSecretKey.startsWith('sk_test_') || stripeSecretKey.startsWith('sk_live_')),
    environment: stripeSecretKey?.startsWith('sk_live_') ? 'production' : 'test',
    webhookUrl: `${request.nextUrl.origin}/api/webhooks/stripe`,
    status: 'ready'
  }

  // Determine overall status
  if (!checks.webhookSecretConfigured || !checks.stripeKeyConfigured) {
    checks.status = 'not_configured'
  }

  const statusCode = checks.status === 'ready' ? 200 : 500

  return NextResponse.json({
    ...checks,
    instructions: checks.status === 'not_configured' ? 
      'Webhook not configured. See /docs/WEBHOOK_SETUP_URGENT.md for setup instructions.' :
      'Webhook is configured. Test by making a payment or using Stripe CLI.',
    requiredEvents: [
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
      'invoice.payment_failed'
    ]
  }, { status: statusCode })
}

/**
 * POST endpoint for Stripe to verify webhook endpoint is reachable
 */
export async function POST(request: NextRequest) {
  return NextResponse.json({
    message: 'This is the test endpoint. Use /api/webhooks/stripe for actual webhooks.',
    actualWebhookUrl: `${request.nextUrl.origin}/api/webhooks/stripe`
  }, { status: 400 })
}

