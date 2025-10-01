import Stripe from 'stripe'

// Centralized Stripe helpers used by API routes

// Create a single Stripe client instance. This file is only imported in
// server-side routes, so it's safe to instantiate with the secret key.
// We intentionally avoid hard-coding an API version to reduce type churn
// across library updates. If you prefer pinning, set STRIPE_API_VERSION.
const stripeApiKey = process.env.STRIPE_SECRET_KEY || ''
const stripeApiVersion = (process.env.STRIPE_API_VERSION || undefined) as any

export const stripe = new Stripe(stripeApiKey, {
  apiVersion: stripeApiVersion,
})

export const STRIPE_CONFIG = {
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  apiVersion: process.env.STRIPE_API_VERSION || undefined,
}

export function validateStripeConfig() {
  if (!STRIPE_CONFIG.secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY')
  }
  if (!STRIPE_CONFIG.webhookSecret) {
    // Webhook secret is only required where webhooks are used, but validate if present
    console.warn('STRIPE_WEBHOOK_SECRET is not set; webhook verification will fail')
  }
}

/**
 * Verify a Stripe webhook signature and return the constructed event.
 * Throws if verification fails.
 */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!endpointSecret) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET')
  }
  return stripe.webhooks.constructEvent(rawBody, signature, endpointSecret)
}

export type { Stripe }


