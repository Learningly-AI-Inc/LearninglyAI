# Stripe Setup Guide for Learningly AI

## 🎯 Overview
This guide will walk you through setting up your Stripe account for subscription billing with two tiers:
- **Freemium**: $20/month
- **Premium**: $100/month

---

## 📋 Your Tasks (Stripe Account Setup)

### Step 1: Create/Configure Stripe Account

1. **Sign up/Login to Stripe**
   - Go to [stripe.com](https://stripe.com)
   - Create account or log into existing account
   - Complete business verification if required

2. **Enable Test Mode**
   - Make sure you're in **Test Mode** (toggle in top-left)
   - We'll switch to live mode after everything is working

### Step 2: Create Products and Prices

#### Create Freemium Product
1. Go to **Products** in Stripe Dashboard
2. Click **"+ Add Product"**
3. **Product Information:**
   ```
   Name: Learningly AI - Freemium
   Description: Advanced learning tools with expanded limits and priority support
   Statement descriptor: LEARNINGLY-FREEMIUM
   ```
4. **Pricing:**
   ```
   Pricing model: Standard pricing
   Price: $20.00 USD
   Billing period: Monthly
   ```
5. **Save Product**
6. **📝 COPY the Price ID** (starts with `price_`) - you'll need this!

#### Create Premium Product
1. Click **"+ Add Product"** again
2. **Product Information:**
   ```
   Name: Learningly AI - Premium
   Description: Unlimited access with custom AI models, bulk processing, and premium support
   Statement descriptor: LEARNINGLY-PREMIUM
   ```
3. **Pricing:**
   ```
   Pricing model: Standard pricing
   Price: $100.00 USD
   Billing period: Monthly
   ```
4. **Save Product**
5. **📝 COPY the Price ID** (starts with `price_`) - you'll need this!

### Step 3: Configure Webhooks

1. Go to **Developers > Webhooks** in Stripe Dashboard
2. Click **"+ Add endpoint"**
3. **Endpoint Configuration:**
   ```
   Endpoint URL: https://your-domain.com/api/webhooks/stripe
   Description: Learningly AI Subscription Events
   ```
   ⚠️ **Note**: Replace `your-domain.com` with your actual domain

4. **Select Events to Listen For:**
   ```
   ✅ customer.created
   ✅ customer.updated
   ✅ customer.subscription.created
   ✅ customer.subscription.updated
   ✅ customer.subscription.deleted
   ✅ invoice.payment_succeeded
   ✅ invoice.payment_failed
   ✅ payment_intent.succeeded
   ✅ payment_intent.payment_failed
   ```

5. **Save Endpoint**
6. **📝 COPY the Webhook Signing Secret** (starts with `whsec_`) - you'll need this!

### Step 4: Get API Keys

1. Go to **Developers > API keys**
2. **📝 COPY these keys:**
   ```
   Publishable key (starts with pk_test_)
   Secret key (starts with sk_test_)
   ```
   ⚠️ **Keep secret key secure!**

### Step 5: Configure Customer Portal

1. Go to **Settings > Billing > Customer portal**
2. **Enable Customer Portal**
3. **Configure settings:**
   ```
   ✅ Allow customers to update payment methods
   ✅ Allow customers to update billing details
   ✅ Allow customers to cancel subscriptions
   ✅ Allow customers to switch plans
   ✅ Invoice history
   ```
4. **Save Configuration**

### Step 6: Tax Settings (Optional but Recommended)

1. Go to **Settings > Tax**
2. Enable **Stripe Tax** if available in your region
3. Configure tax collection based on your business requirements

---

## 📝 Information to Provide Me

Once you complete the above steps, provide me with:

```env
# Test Mode Keys (we'll switch to live later)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs
STRIPE_FREEMIUM_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...

# Your domain for webhooks
DOMAIN=https://your-domain.com
```

---

## 🚀 What I'll Do After Your Setup

### Phase 1: Database Security & Schema (Day 1-2)

1. **Fix Critical Security Issues**
   ```sql
   -- Enable RLS on all public tables
   -- Fix function search paths
   -- Optimize auth settings
   -- Add security policies
   ```

2. **Create Subscription Database Schema**
   ```sql
   -- subscription_plans table
   -- user_subscriptions table  
   -- user_usage table
   -- payment_history table
   ```

3. **Add Indexes for Performance**
   ```sql
   -- Foreign key indexes
   -- Usage tracking indexes
   -- Subscription status indexes
   ```

### Phase 2: Stripe Integration (Day 3-4)

4. **Environment Configuration**
   ```typescript
   // Add Stripe keys to environment
   // Configure Stripe client
   // Set up webhook validation
   ```

5. **API Endpoints**
   ```typescript
   // POST /api/subscriptions/create
   // POST /api/subscriptions/cancel
   // GET /api/subscriptions/portal
   // POST /api/webhooks/stripe
   // GET /api/usage/current
   ```

6. **Stripe Services**
   ```typescript
   // Customer creation/management
   // Subscription creation/updates
   // Payment processing
   // Webhook event handling
   ```

### Phase 3: Usage Tracking & Limits (Day 5-6)

7. **Usage Tracking System**
   ```typescript
   // Document upload tracking
   // AI request counting
   // Storage usage monitoring
   // Real-time limit checking
   ```

8. **Feature Gate Implementation**
   ```typescript
   // Middleware for subscription checks
   // Usage limit enforcement
   // Upgrade prompts
   // Graceful degradation
   ```

9. **Background Jobs**
   ```typescript
   // Daily usage reset
   // Usage analytics
   // Subscription sync with Stripe
   ```

### Phase 4: User Interface (Day 7-8)

10. **Pricing Page**
    ```tsx
    // Feature comparison table
    // Stripe Checkout integration
    // Plan upgrade/downgrade flows
    ```

11. **Subscription Management**
    ```tsx
    // Current plan display
    // Usage meters/progress bars
    // Billing portal access
    // Cancel/upgrade buttons
    ```

12. **Usage Notifications**
    ```tsx
    // Limit warning alerts
    // Upgrade prompts
    // Usage dashboard
    ```

### Phase 5: Testing & Deployment (Day 9-10)

13. **Comprehensive Testing**
    ```typescript
    // Subscription flow testing
    // Webhook event simulation
    // Edge case handling
    // Payment failure scenarios
    ```

14. **Migration Scripts**
    ```sql
    -- Migrate existing users to free tier
    -- Set up initial usage tracking
    -- Data validation scripts
    ```

15. **Monitoring & Analytics**
    ```typescript
    // Subscription metrics
    // Usage analytics
    // Error monitoring
    // Performance tracking
    ```

---

## 🔄 Migration Strategy for Existing Users

### Existing User Transition:
1. **All current users** → Free tier (grandfathered for 30 days)
2. **Email notification** about new subscription tiers
3. **Special discount** for early adopters (first month 50% off)
4. **Usage analysis** to recommend appropriate tier

### Timeline:
- **Day 1-10**: Development & testing
- **Day 11-13**: Staging deployment & final testing
- **Day 14**: Production deployment
- **Day 15**: User migration & email campaign
- **Day 16-45**: 30-day grace period for existing users

---

## 🛡️ Security Measures I'll Implement

1. **Payment Security**
   - Webhook signature verification
   - Encrypted subscription data storage
   - PCI compliance best practices

2. **API Security**
   - Rate limiting on subscription endpoints
   - JWT validation for all user actions
   - Audit logging for subscription changes

3. **Data Protection**
   - Row-level security on all tables
   - Encrypted sensitive fields
   - GDPR compliance for EU users

---

## 📊 Analytics & Monitoring I'll Add

1. **Subscription Metrics**
   - Monthly recurring revenue (MRR)
   - Churn rate tracking
   - Upgrade/downgrade analytics

2. **Usage Analytics**
   - Feature usage by tier
   - Limit hit frequency
   - User behavior patterns

3. **System Monitoring**
   - Webhook delivery status
   - Payment success rates
   - API performance metrics

---

## 🎯 Success Criteria

✅ **Seamless subscription management**  
✅ **Secure payment processing**  
✅ **Fair usage limiting**  
✅ **Smooth user experience**  
✅ **Revenue tracking & analytics**  
✅ **Scalable architecture**  

---

## 📞 Next Steps

1. **You**: Complete Stripe setup above
2. **You**: Provide me the environment variables
3. **Me**: Implement the entire subscription system
4. **Us**: Test everything together
5. **Launch**: Deploy to production! 🚀

---

*Questions? Let me know once you have the Stripe setup completed and I'll start implementing immediately!*
