import Stripe from 'stripe'

// Initialize Stripe with your secret key. Use library default API version to avoid breaking changes.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
})

// Stripe configuration
export const STRIPE_CONFIG = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  priceIds: {
    freemium: process.env.STRIPE_FREEMIUM_PRICE_ID!,
    premium: process.env.STRIPE_PREMIUM_PRICE_ID!,
    // Optional: yearly premium price (if configured)
    premium_yearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
  },
  webhookUrl: 'https://learningly.ai/api/webhooks/stripe',
} as const

// Validate environment variables
export function validateStripeConfig() {
  const required = [
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_FREEMIUM_PRICE_ID',
    'STRIPE_PREMIUM_PRICE_ID',
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required Stripe environment variables: ${missing.join(', ')}`)
  }
  
  return true
}

// Stripe webhook signature verification
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string = STRIPE_CONFIG.webhookSecret
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    throw new Error('Invalid webhook signature')
  }
}

// Helper function to format price for display
export function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount / 100)
}

// Helper function to get price ID by plan name
export function getPriceIdByPlan(planName: string): string {
  switch (planName.toLowerCase()) {
    case 'freemium':
      return STRIPE_CONFIG.priceIds.freemium
    case 'premium':
      return STRIPE_CONFIG.priceIds.premium
    case 'premium_yearly':
      if (!STRIPE_CONFIG.priceIds.premium_yearly) {
        throw new Error('Missing STRIPE_PREMIUM_YEARLY_PRICE_ID for yearly premium plan')
      }
      return STRIPE_CONFIG.priceIds.premium_yearly
    default:
      throw new Error(`Unknown plan: ${planName}`)
  }
}

// Helper function to get plan name by price ID
export function getPlanByPriceId(priceId: string): string {
  switch (priceId) {
    case STRIPE_CONFIG.priceIds.freemium:
      return 'Freemium'
    case STRIPE_CONFIG.priceIds.premium:
      return 'Premium'
    case STRIPE_CONFIG.priceIds.premium_yearly as string:
      return 'Premium (Yearly)'
    default:
      throw new Error(`Unknown price ID: ${priceId}`)
  }
}
