# Stripe Setup Instructions

## Environment Variables Setup

Add the following environment variables to your `.env.local` file:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51RygOBDHG1ZDbF0yjGT4TZ015Kk6MtD2
STRIPE_SECRET_KEY=sk_test_51RygOBDHG1ZDbF0yzmfNCSOv0UAH4z0XYG5ch
STRIPE_WEBHOOK_SECRET=whsec_g7qIby25Th68PT80CP8mCT2zdRWYoEEG

# Stripe Price IDs
STRIPE_FREEMIUM_PRICE_ID=prod_T4pBu37GhWbvsC
STRIPE_PREMIUM_PRICE_ID=prod_T4pBIbtWpXJo6c

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://learningly.ai
```

## Database Setup

The subscription system requires the following database tables to be created. Since the database is currently in read-only mode, you'll need to:

1. **Apply the migration manually** in your Supabase dashboard:
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor
   - Run the SQL from `create_subscription_schema.sql`

2. **Or use the Supabase CLI** (if you have it set up):
   ```bash
   supabase db reset --linked
   ```

## Webhook Configuration

Make sure your Stripe webhook is configured with:
- **Endpoint URL**: `https://learningly.ai/api/webhooks/stripe`
- **Events to listen for**:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

## Testing the System

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Test the pricing page**:
   - Navigate to `/pricing`
   - Verify that all three plans are displayed correctly

3. **Test subscription creation**:
   - Sign in to your account
   - Try to upgrade to a paid plan
   - Check that Stripe checkout opens correctly

4. **Test webhook handling**:
   - Use Stripe CLI to forward webhooks to your local development server
   - Or test with Stripe's webhook testing tools

## Features Implemented

### ✅ Completed:
- [x] Stripe client configuration
- [x] Subscription service with full CRUD operations
- [x] API endpoints for subscription management
- [x] Webhook handling for subscription events
- [x] Usage tracking and limit enforcement
- [x] React hooks for subscription management
- [x] UI components for subscription management
- [x] Pricing page with plan comparison
- [x] Usage meters and upgrade prompts
- [x] Customer portal integration

### 🔄 Next Steps:
- [ ] Apply database migration
- [ ] Test with real Stripe payments
- [ ] Add usage tracking to existing features
- [ ] Implement subscription limits in middleware
- [ ] Add email notifications for subscription events

## Usage Integration

To integrate usage tracking into existing features:

1. **Document Upload**:
   ```typescript
   import { useUsageLimits } from '@/hooks/use-usage-limits'
   
   const { withUsageCheck } = useUsageLimits()
   
   const handleUpload = async (files: File[]) => {
     const result = await withUsageCheck(
       { action: 'documents_uploaded', amount: files.length },
       async () => {
         // Your upload logic here
         return uploadFiles(files)
       }
     )
     
     if (!result.success && result.needsUpgrade) {
       // Show upgrade prompt
     }
   }
   ```

2. **AI Requests**:
   ```typescript
   const { withUsageCheck } = useUsageLimits()
   
   const handleAIRequest = async () => {
     const result = await withUsageCheck(
       { action: 'ai_requests' },
       async () => {
         // Your AI request logic here
         return makeAIRequest()
       }
     )
   }
   ```

3. **Search Queries**:
   ```typescript
   const { withUsageCheck } = useUsageLimits()
   
   const handleSearch = async (query: string) => {
     const result = await withUsageCheck(
       { action: 'search_queries' },
       async () => {
         // Your search logic here
         return performSearch(query)
       }
     )
   }
   ```

## Troubleshooting

### Common Issues:

1. **"Missing required Stripe environment variables"**
   - Make sure all Stripe environment variables are set in `.env.local`
   - Restart your development server after adding environment variables

2. **"Webhook signature verification failed"**
   - Check that `STRIPE_WEBHOOK_SECRET` matches your webhook endpoint secret
   - Ensure the webhook URL is correctly configured in Stripe dashboard

3. **"Plan not found" error**
   - Verify that the price IDs in your environment variables match those in Stripe
   - Check that the subscription plans are properly inserted into the database

4. **Usage limits not working**
   - Ensure the database migration has been applied
   - Check that the usage tracking functions are being called correctly

### Support:

If you encounter any issues, check:
1. Browser console for client-side errors
2. Server logs for API errors
3. Stripe dashboard for webhook delivery status
4. Supabase logs for database errors

For additional help, refer to the Stripe documentation or contact support.
