# Stripe Environment Variables Setup

## Required Environment Variables

Add these to your `.env.local` file:

```env
# Stripe API Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Get from Stripe Dashboard
STRIPE_SECRET_KEY=sk_test_... # Get from Stripe Dashboard
STRIPE_WEBHOOK_SECRET=whsec_g7qIby25Th68PT80CP8mCT2zdRWYoEEG

# Stripe Price IDs (NOT Product IDs)
STRIPE_FREEMIUM_PRICE_ID=price_xxxxx # Get from running get-price-ids.js
STRIPE_PREMIUM_PRICE_ID=price_xxxxx # Get from running get-price-ids.js
```

## How to Get the Missing Values

### 1. Get Stripe API Keys
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Click "Developers" → "API Keys"
3. Copy the "Publishable key" (starts with `pk_test_` or `pk_live_`)
4. Copy the "Secret key" (starts with `sk_test_` or `sk_live_`)

### 2. Get Price IDs from Your Products
Run the script I created to get your price IDs:

```bash
# Install stripe package if not already installed
npm install stripe

# Set your secret key temporarily
export STRIPE_SECRET_KEY=sk_test_...

# Run the script
node get-price-ids.js
```

This will show you the price IDs for your products:
- Freemium Product (prod_T4pBu37GhWbvsC)
- Premium Product (prod_T4pBIbtWpXJo6c)

### 3. Alternative: Get Price IDs from Stripe Dashboard
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/) → "Products"
2. Click on "Learningly AI - Freemium"
3. Look at the "Pricing" section
4. Copy the Price ID (starts with `price_`)
5. Repeat for "Learningly AI - Premium"

## Important Notes

- **Product IDs vs Price IDs**: You provided product IDs (`prod_xxx`), but Stripe checkout needs price IDs (`price_xxx`)
- **One Product, Multiple Prices**: A product can have multiple prices (monthly, yearly, etc.)
- **Choose the Right Price**: Make sure you pick the price ID for the billing interval you want (monthly/yearly)

## Example .env.local File

```env
# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123...
STRIPE_SECRET_KEY=sk_test_51ABC123...
STRIPE_WEBHOOK_SECRET=whsec_g7qIby25Th68PT80CP8mCT2zdRWYoEEG
STRIPE_FREEMIUM_PRICE_ID=price_1ABC123...
STRIPE_PREMIUM_PRICE_ID=price_1DEF456...
```

## After Setting Up Environment Variables

1. Restart your development server: `npm run dev`
2. Test the pricing page: Go to `/pricing`
3. Click "Get Started" buttons to test the checkout flow

## Troubleshooting

If you're still having issues:

1. **Check Environment Variables**: Make sure all variables are set correctly
2. **Restart Server**: Restart your Next.js development server
3. **Check Console**: Look for error messages in browser console
4. **Test API**: Try creating a checkout session manually

## Security Note

- Never commit `.env.local` to version control
- Use test keys for development
- Switch to live keys only when ready for production
