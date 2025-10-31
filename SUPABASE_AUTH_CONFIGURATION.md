# Supabase Authentication Configuration Guide

This guide explains how to configure Supabase to fix the two authentication issues:
1. Preventing duplicate email registrations
2. Enabling email verification

## Issue 1: Duplicate Email Registration

### Problem
Users can currently create multiple accounts with the same email address, which should not be allowed.

### Solution
The code has been updated to detect duplicate emails during signup. However, you also need to configure Supabase properly:

#### Supabase Dashboard Settings

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** > **Settings**
3. Under **Auth Providers**, ensure the following settings:
   - **Enable Email Provider**: ✅ Enabled
   - **Confirm Email**: ✅ **Enable this option**
   - **Secure Email Change**: ✅ Enabled (recommended)

4. Under **Security and Protection**:
   - **Enable Email Confirmations**: ✅ **Must be enabled**

### Code Changes Made
- Updated `hooks/use-auth.tsx` to check for duplicate emails
- Added validation that returns an error when a user tries to sign up with an existing email
- The check: `data.user.identities.length === 0` detects when an email is already registered

## Issue 2: Email Verification Not Being Sent

### Problem
Even though email settings are configured in Supabase, verification emails are not being sent because the code wasn't requesting them.

### Solution

#### Code Changes Made

1. **Updated `signUp` function** in `hooks/use-auth.tsx`:
   ```typescript
   options: {
     emailRedirectTo: `${window.location.origin}/api/auth/callback`,
     data: {
       email_confirm: true
     }
   }
   ```

2. **Email redirect URL is now properly configured** to point to your auth callback

#### Supabase Dashboard Settings

1. Go to **Authentication** > **URL Configuration**
2. Add your site URL to **Site URL**: `https://yourdomain.com` (or `http://localhost:3000` for development)
3. Add to **Redirect URLs**:
   - `https://yourdomain.com/api/auth/callback`
   - `http://localhost:3000/api/auth/callback` (for development)

4. Go to **Authentication** > **Email Templates**
5. Verify that the **Confirm signup** template is enabled and configured:
   - Subject: Confirm Your Email
   - The template should include the `{{ .ConfirmationURL }}` variable

### Email Template Configuration

The default Supabase email template should work, but you can customize it:

```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your user:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
```

## Testing the Configuration

### Test Email Signup:

1. Try to sign up with a new email address
2. You should receive a confirmation email
3. Click the confirmation link
4. You should be redirected to `/api/auth/callback` and then to `/dashboard`

### Test Duplicate Email Prevention:

1. Try to sign up with an email that already exists
2. You should see an error: "An account with this email already exists. Please check your email to confirm your account or sign in instead."

### Test OAuth Signup (Google):

1. OAuth providers (Google) automatically verify the email
2. No confirmation email is needed for OAuth
3. Users should be redirected directly to the dashboard

## Important Supabase Settings Checklist

- [ ] **Enable Email Confirmations** (Authentication > Settings)
- [ ] **Confirm Email** enabled for Email Provider
- [ ] **Site URL** configured with your domain
- [ ] **Redirect URLs** include `/api/auth/callback`
- [ ] **Email Templates** are configured (Confirm signup template)
- [ ] **SMTP Settings** are configured (if using custom email provider)

## SMTP Configuration (If Using Custom Email Provider)

If you're using a custom SMTP provider instead of Supabase's built-in email:

1. Go to **Project Settings** > **Authentication**
2. Enable **Custom SMTP**
3. Configure your SMTP settings:
   - SMTP Host
   - SMTP Port
   - SMTP Username
   - SMTP Password
   - Sender Email
   - Sender Name

## Troubleshooting

### Emails Not Being Sent

1. Check Supabase logs: **Logs** > **Auth Logs**
2. Verify SMTP settings if using custom provider
3. Check spam folder
4. Ensure "Confirm Email" is enabled in Auth Settings

### Duplicate Emails Still Allowed

1. Ensure the code changes have been deployed
2. Clear browser cache and cookies
3. Check that email confirmation is required in Supabase settings

### OAuth Issues

1. Verify OAuth provider credentials are correct
2. Check that redirect URLs include `/api/auth/callback`
3. Ensure OAuth provider allows your domain

## Environment Variables

Ensure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Additional Security Recommendations

1. **Rate Limiting**: Enable rate limiting in Supabase to prevent abuse
2. **Password Requirements**: Configure minimum password strength
3. **MFA**: Consider enabling Multi-Factor Authentication for enhanced security
4. **Session Timeout**: Configure appropriate session timeout values
