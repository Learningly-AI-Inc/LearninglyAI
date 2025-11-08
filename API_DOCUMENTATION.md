LearninglyAI - API Services Documentation
================================================================================

Last Updated: November 1, 2025


OVERVIEW
--------
This document lists all third-party APIs and services used in the LearninglyAI platform, including API keys, credentials, and account information.


================================================================================
1. SUPABASE (Database & Authentication)
================================================================================

Provider:           Supabase
Purpose:            Backend database, authentication, and file storage
Documentation:      https://supabase.com/docs


CREDENTIALS
-----------
NEXT_PUBLIC_SUPABASE_URL=https://ghqrockzgurdlwejqplf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdocXJvY2t6Z3VyZGx3ZWpxcGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjQ5NzIsImV4cCI6MjA3MDYwMDk3Mn0.tn3Clx_lVxE_FCvXiQfMvw1ozx8d1syw-78xR7pbxEY


ACCOUNT INFORMATION
-------------------
Project Reference:  ghqrockzgurdlwejqplf
Account Status:     Active
Access:             Project owner has full access via Supabase dashboard

Features Used:
    • PostgreSQL Database
    • Authentication (Email/Password)
    • Storage (reading-documents bucket)
    • Row Level Security (RLS)
    • Real-time subscriptions


INTEGRATION POINTS
------------------
    • User authentication across the app
    • Database operations for user_data, documents, conversations, messages, etc.
    • File storage for uploaded documents and PDFs
    • Used in: All components via /lib/supabase-server.ts and /lib/supabase-client.ts


================================================================================
2. OPENAI (GPT Models)
================================================================================

Provider:           OpenAI
Purpose:            AI chat, text generation, and problem-solving
Documentation:      https://platform.openai.com/docs


CREDENTIALS
-----------
NEXT_PUBLIC_OPENAI_API_KEY=[Not found in .env.local - needs to be added]


ACCOUNT INFORMATION
-------------------
Account Status:     API key required but not configured in .env.local

Models Used:
    • gpt-4o (GPT-5 mapped)
    • gpt-4o-mini (GPT-5 Mini mapped)
    • gpt-3.5-turbo (GPT-5 Nano mapped)

Features Used:
    • Chat completions
    • Vision API (multi-modal with images)
    • Token counting and cost estimation


INTEGRATION POINTS
------------------
    • /lib/openai.ts - OpenAI client configuration
    • /app/api/search/enhanced/route.ts - Enhanced search with GPT models
    • /app/api/chat/route.ts - Chat functionality
    • /app/api/reading/* - Reading assistance features (summarize, flashcards, notes, mindmap)


NOTES
-----
    • Default model: gpt-4o-mini
    • Vision support for image analysis
    • Token management via /lib/token-manager.ts


================================================================================
3. GOOGLE GENERATIVE AI (Gemini)
================================================================================

Provider:           Google
Purpose:            Alternative AI model for chat and text generation
Documentation:      https://ai.google.dev/docs


CREDENTIALS
-----------
NEXT_PUBLIC_GOOGLE_API_KEY=[Not found in .env.local - needs to be added]


ACCOUNT INFORMATION
-------------------
Account Status:     API key required but not configured in .env.local

Models Used:
    • gemini-2.5-flash
    • gemini-2.5-flash-lite
    • gemini-2.5-pro

Default Model:      gemini-2.5-flash


INTEGRATION POINTS
------------------
    • /app/api/search/enhanced/route.ts - Enhanced search with Gemini models
    • Alternative to OpenAI for cost optimization
    • Used for document analysis and problem-solving


================================================================================
4. GOOGLE CALENDAR API
================================================================================

Provider:           Google Cloud Platform
Purpose:            Calendar integration and event syncing
Documentation:      https://developers.google.com/calendar/api


CREDENTIALS
-----------
NEXT_PUBLIC_GOOGLE_CLIENT_ID=[Not found in .env.local - needs to be added]
NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=[Not found in .env.local - needs to be added]
NEXT_PUBLIC_APP_URL=[Not found in .env.local - needs to be added]


ACCOUNT INFORMATION
-------------------
Account Status:     Needs configuration

OAuth 2.0 Scopes Required:
    • https://www.googleapis.com/auth/calendar.readonly
    • https://www.googleapis.com/auth/calendar.events

Redirect URI:       {APP_URL}/api/calendar/google-callback


INTEGRATION POINTS
------------------
    • /app/api/calendar/google-auth/route.ts - OAuth initiation
    • /app/api/calendar/google-callback/route.ts - OAuth callback handler
    • /app/api/calendar/sync/route.ts - Calendar event synchronization
    • Database table: calendar_integrations


FEATURES
--------
    • Two-way calendar sync
    • Event creation and updates
    • Token refresh mechanism
    • Multiple calendar support


SETUP INSTRUCTIONS
------------------
See /GOOGLE_CALENDAR_SETUP.md for detailed setup guide


================================================================================
5. ADOBE PDF SERVICES
================================================================================

Provider:           Adobe
Purpose:            PDF processing and document operations
Documentation:      https://developer.adobe.com/document-services/docs/overview/


CREDENTIALS
-----------
File Location:      /app/pdfservices-api-credentials.json

Client ID:          03b30728ff9947dcbdd583cde4cdbd9c
Client Secret:      p8e-A21F76WhgBQyDO-7QnHB7QG2fV_8zHye
Organization ID:    95BE22DD68BEC15A0A495C2C@AdobeOrg


ACCOUNT INFORMATION
-------------------
Organization ID:    95BE22DD68BEC15A0A495C2C@AdobeOrg
Account Status:     Active

Features Used:
    • PDF text extraction
    • Document conversion
    • PDF operations


INTEGRATION POINTS
------------------
    • /app/adobe-dc-pdf-services-sdk-node/ - SDK configuration
    • PDF processing for document uploads
    • Text extraction from PDF files


================================================================================
6. STRIPE (Payment Processing)
================================================================================

Provider:           Stripe
Purpose:            Subscription management and payment processing
Documentation:      https://stripe.com/docs


CREDENTIALS
-----------
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51RygOBDHG1ZDbF0yjGT4TZ015Kk6MtD2
STRIPE_SECRET_KEY=sk_test_51RygOBDHG1ZDbF0yzmfNCSOv0UAH4z0XYG5ch
STRIPE_WEBHOOK_SECRET=whsec_g7qIby25Th68PT80CP8mCT2zdRWYoEEG

PRICE IDs:
STRIPE_FREEMIUM_PRICE_ID=prod_T4pBu37GhWbvsC
STRIPE_PREMIUM_PRICE_ID=prod_T4pBIbtWpXJo6c


ACCOUNT INFORMATION
-------------------
Account Status:     Test mode (using test keys)
Account ID:         acct_RygOBDHG1ZDbF0y
Webhook Endpoint:   https://learningly.ai/api/webhooks/stripe

Plans Configured:
    • Free Plan (Freemium)
    • Premium Plan


WEBHOOK EVENTS MONITORED
-------------------------
    • customer.subscription.created
    • customer.subscription.updated
    • customer.subscription.deleted
    • invoice.payment_succeeded
    • invoice.payment_failed


INTEGRATION POINTS
------------------
    • /lib/stripe.ts - Stripe client configuration
    • /app/api/subscriptions/* - Subscription management APIs
    • /app/api/webhooks/stripe/route.ts - Webhook handler
    • /app/pricing/page.tsx - Pricing page
    • Database tables: subscription_plans, user_subscriptions, usage_meters


FEATURES
--------
    • Subscription management
    • Usage tracking and limits
    • Customer portal
    • Checkout sessions
    • Email reconciliation


SETUP INSTRUCTIONS
------------------
See /docs/STRIPE_SETUP_INSTRUCTIONS.md for detailed setup guide


================================================================================
7. SMTP EMAIL (Titan Email)
================================================================================

Provider:           Titan Email
Purpose:            Contact form email delivery
Documentation:      https://www.titan.email/


CREDENTIALS
-----------
SMTP_HOST=smtp.titan.email
SMTP_PORT=587
SMTP_USER=contact@learningly.ai
SMTP_PASSWORD=your_email_password_here
NEXT_PUBLIC_CONTACT_EMAIL=contact@learningly.ai


ACCOUNT INFORMATION
-------------------
Email Account:      contact@learningly.ai
Account Status:     Configured but password needs to be updated
Protocol:           SMTP with TLS
Authentication:     Username/Password


INTEGRATION POINTS
------------------
    • Contact form email sending
    • System notifications (potentially)
    • Uses nodemailer package


NOTES
-----
    • Password placeholder needs to be replaced with actual password
    • Used for sending contact form submissions to contact@learningly.ai


================================================================================
ENVIRONMENT VARIABLES CHECKLIST
================================================================================

REQUIRED (Currently Missing)
-----------------------------
    ☐ NEXT_PUBLIC_OPENAI_API_KEY - OpenAI API access
    ☐ NEXT_PUBLIC_GOOGLE_API_KEY - Google Gemini API access
    ☐ NEXT_PUBLIC_GOOGLE_CLIENT_ID - Google Calendar OAuth
    ☐ NEXT_PUBLIC_GOOGLE_CLIENT_SECRET - Google Calendar OAuth
    ☐ NEXT_PUBLIC_APP_URL - Application base URL
    ☐ SMTP_PASSWORD - Titan email password (currently placeholder)
    ☐ STRIPE_SECRET_KEY - Production Stripe key (currently test mode)
    ☐ STRIPE_WEBHOOK_SECRET - Production webhook secret (currently test mode)


CONFIGURED
----------
    ☑ NEXT_PUBLIC_SUPABASE_URL
    ☑ NEXT_PUBLIC_SUPABASE_ANON_KEY
    ☑ SMTP_HOST
    ☑ SMTP_PORT
    ☑ SMTP_USER
    ☑ NEXT_PUBLIC_CONTACT_EMAIL
    ☑ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (test mode)
    ☑ STRIPE_FREEMIUM_PRICE_ID
    ☑ STRIPE_PREMIUM_PRICE_ID


================================================================================
COST ESTIMATION
================================================================================

OPENAI API
----------
Model:                  gpt-4o-mini (primary)
Pricing:                ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
Usage:                  Chat, search, document analysis, flashcards, notes generation
Estimated Monthly Cost: Depends on user activity


GOOGLE GEMINI API
-----------------
Model:                  gemini-2.5-flash (primary)
Pricing:                Lower cost alternative to OpenAI
Usage:                  Alternative AI model for search and chat
Estimated Monthly Cost: Depends on user activity


STRIPE
------
Transaction Fee:        2.9% + $0.30 per successful charge
Subscription Mgmt:      Free
Cost:                   Based on revenue


SUPABASE
--------
Free Tier:              500MB database, 1GB file storage, 50K monthly active users
Current Usage:          Within free tier
Upgrade Path:           Pro plan at $25/month if needed


ADOBE PDF SERVICES
------------------
Free Tier:              1,000 document transactions/month
Paid Tier:              Pay-as-you-go or monthly plan
Current Usage:          Depends on PDF uploads


TITAN EMAIL
-----------
Cost:                   Varies by plan
Usage:                  Contact form emails only


================================================================================
SECURITY NOTES
================================================================================

API KEY STORAGE
---------------
    • All API keys stored in .env.local (gitignored)
    • Never commit credentials to version control
    • Adobe credentials stored in separate JSON file (should also be gitignored)


RECOMMENDATIONS
---------------
    1. Rotate Adobe credentials - The credentials in this document are exposed
       and should be regenerated

    2. Add .gitignore entry for /app/pdfservices-api-credentials.json

    3. Move to environment variables - Consider storing Adobe credentials as
       env vars instead of JSON file

    4. Enable API key restrictions - Restrict keys to specific domains/IPs
       where possible

    5. Use separate keys - Different keys for development and production

    6. Monitor usage - Set up alerts for unusual API usage


PRODUCTION DEPLOYMENT CHECKLIST
--------------------------------
Before going to production:
    ☐ Replace all test API keys with production keys
    ☐ Set up proper CORS policies
    ☐ Configure webhook secrets for production URLs
    ☐ Enable rate limiting on API endpoints
    ☐ Set up monitoring and logging
    ☐ Configure proper backup strategies


================================================================================
API DASHBOARD & CONSOLE LINKS
================================================================================

SUPABASE
--------
Dashboard:              https://supabase.com/dashboard/project/ghqrockzgurdlwejqplf
SQL Editor:             https://supabase.com/dashboard/project/ghqrockzgurdlwejqplf/sql
Storage:                https://supabase.com/dashboard/project/ghqrockzgurdlwejqplf/storage/buckets
Auth:                   https://supabase.com/dashboard/project/ghqrockzgurdlwejqplf/auth/users
Settings:               https://supabase.com/dashboard/project/ghqrockzgurdlwejqplf/settings/api


OPENAI
------
API Keys:               https://platform.openai.com/api-keys
Usage:                  https://platform.openai.com/usage
Billing:                https://platform.openai.com/settings/organization/billing/overview
Organization:           https://platform.openai.com/settings/organization/general
Playground:             https://platform.openai.com/playground


GOOGLE CLOUD PLATFORM (Gemini & Calendar)
------------------------------------------
Console Home:           https://console.cloud.google.com/
API Credentials:        https://console.cloud.google.com/apis/credentials
API Library:            https://console.cloud.google.com/apis/library
Gemini AI Studio:       https://aistudio.google.com/
OAuth Consent:          https://console.cloud.google.com/apis/credentials/consent
Billing:                https://console.cloud.google.com/billing


ADOBE PDF SERVICES
------------------
Console:                https://developer.adobe.com/console
Projects:               https://developer.adobe.com/console/projects
Credentials:            https://developer.adobe.com/console/credentials
Usage & Quotas:         https://developer.adobe.com/console


STRIPE
------
Dashboard:              https://dashboard.stripe.com/
Payments:               https://dashboard.stripe.com/payments
Customers:              https://dashboard.stripe.com/customers
Subscriptions:          https://dashboard.stripe.com/subscriptions
Products:               https://dashboard.stripe.com/products
API Keys:               https://dashboard.stripe.com/apikeys
Webhooks:               https://dashboard.stripe.com/webhooks
Test Mode:              https://dashboard.stripe.com/test/dashboard
Billing:                https://dashboard.stripe.com/settings/billing/overview


TITAN EMAIL
-----------
Dashboard:              https://titan.email/
Control Panel:          https://cp.titan.email/
Email Settings:         https://cp.titan.email/


================================================================================
SUPPORT & DOCUMENTATION
================================================================================

OFFICIAL DOCUMENTATION LINKS
-----------------------------
Supabase:               https://supabase.com/docs
OpenAI:                 https://platform.openai.com/docs
Google Gemini:          https://ai.google.dev/docs
Google Calendar:        https://developers.google.com/calendar/api
Adobe PDF Services:     https://developer.adobe.com/document-services/docs
Stripe:                 https://stripe.com/docs
Nodemailer:             https://nodemailer.com/


INTERNAL DOCUMENTATION
----------------------
    • /docs/SEARCH_FEATURE_SETUP.md - Search feature configuration
    • /docs/STRIPE_SETUP_INSTRUCTIONS.md - Stripe integration guide
    • /GOOGLE_CALENDAR_SETUP.md - Google Calendar setup
    • /docs/CHAT_SETUP_GUIDE.md - Chat feature setup
    • /email-templates/SETUP-GUIDE.md - Email template setup


================================================================================
NEXT STEPS
================================================================================

1. COMPLETE API CONFIGURATION
   ---------------------------
    ☐ Add missing OpenAI API key
    ☐ Add missing Google API keys
    ☐ Update SMTP password
    ☐ Configure production Stripe keys


2. SECURITY IMPROVEMENTS
   ----------------------
    ☐ Rotate Adobe PDF credentials
    ☐ Move credentials to environment variables
    ☐ Add rate limiting
    ☐ Set up monitoring


3. TESTING
   -------
    ☐ Test all API integrations
    ☐ Verify webhook deliveries
    ☐ Test error handling
    ☐ Validate usage limits


4. DOCUMENTATION
   -------------
    ☐ Create runbook for API issues
    ☐ Document error codes and solutions
    ☐ Create backup/recovery procedures


================================================================================
CONTACT
================================================================================

For API access issues or credential rotation:

Email:                  contact@learningly.ai
Documentation:          See /docs/ directory for setup guides


================================================================================
END OF DOCUMENT
================================================================================
