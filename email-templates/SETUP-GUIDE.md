# Email Templates Setup Guide for Supabase

Quick setup guide for implementing custom email templates in Supabase.

## 🚀 Quick Setup (5 minutes)

### Step 1: Access Supabase Email Templates

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to: **Authentication** → **Email Templates**

### Step 2: Configure Each Template

#### 📧 Confirm Signup Template

**Location in Supabase:** Email Templates → **Confirm signup**

```html
<!-- Copy the entire contents of confirm-signup.html and paste here -->
```

**Subject Line:** `Confirm Your Email - Welcome to LearninglyAI! 🎉`

---

#### 🔐 Reset Password Template

**Location in Supabase:** Email Templates → **Reset Password**

```html
<!-- Copy the entire contents of reset-password.html and paste here -->
```

**Subject Line:** `Reset Your LearninglyAI Password 🔒`

---

#### ✨ Magic Link Template

**Location in Supabase:** Email Templates → **Magic Link**

```html
<!-- Copy the entire contents of magic-link.html and paste here -->
```

**Subject Line:** `Your LearninglyAI Magic Link ✨`

---

#### 📬 Change Email Template

**Location in Supabase:** Email Templates → **Change Email Address**

```html
<!-- Copy the entire contents of email-change.html and paste here -->
```

**Subject Line:** `Confirm Your New Email Address - LearninglyAI 📧`

---

#### 🎉 Invite User Template

**Location in Supabase:** Email Templates → **Invite User**

```html
<!-- Copy the entire contents of invite-user.html and paste here -->
```

**Subject Line:** `You're Invited to Join LearninglyAI! 🎉`

---

## ⚙️ SMTP Configuration

### Step 1: Enable Custom SMTP

**Location:** Project Settings → Authentication → SMTP Settings

### Step 2: Enter Your SMTP Credentials

**Example Configuration (using Gmail):**

```
Enable Custom SMTP: ✅ ON

Sender name: LearninglyAI
Sender email: noreply@learninglyai.com

Host: smtp.gmail.com
Port number: 587
Username: your-email@gmail.com
Password: your-app-specific-password

(Optional) Admin email: admin@learninglyai.com
Max frequency (emails per hour): 30
```

### Popular SMTP Providers

#### SendGrid
```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: YOUR_SENDGRID_API_KEY
```

#### Mailgun
```
Host: smtp.mailgun.org
Port: 587
Username: postmaster@yourdomain.mailgun.org
Password: YOUR_MAILGUN_SMTP_PASSWORD
```

#### Amazon SES
```
Host: email-smtp.us-east-1.amazonaws.com
Port: 587
Username: YOUR_SES_SMTP_USERNAME
Password: YOUR_SES_SMTP_PASSWORD
```

#### Gmail (For testing only)
```
Host: smtp.gmail.com
Port: 587
Username: your-email@gmail.com
Password: your-app-specific-password
```

**⚠️ Note:** For Gmail, you need to create an [App-Specific Password](https://support.google.com/accounts/answer/185833)

---

## 🎨 Customization Checklist

Before going live, update these in all templates:

- [ ] Replace `https://learninglyai.com` with your actual domain
- [ ] Update `noreply@learninglyai.com` with your sender email
- [ ] Customize brand colors if needed
- [ ] Update footer links (Home, Support, Privacy Policy)
- [ ] Test all templates with real email addresses
- [ ] Verify links work correctly
- [ ] Check mobile responsiveness

---

## 🧪 Testing Your Templates

### Test Signup Confirmation

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/auth/v1/signup' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

### Test Password Reset

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/auth/v1/recover' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

### Test Magic Link

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/auth/v1/magiclink' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

---

## 📊 Monitoring & Analytics

### Check Email Delivery in Supabase

**Location:** Authentication → Logs

Monitor:
- ✅ Successful sends
- ❌ Failed deliveries
- 📊 Bounce rates
- 🚫 Spam reports

### SMTP Provider Dashboards

Check your SMTP provider's dashboard for:
- Delivery rates
- Open rates
- Click rates
- Bounce reasons

---

## 🔧 Troubleshooting

### Problem: Emails not being sent

**Solution:**
1. Check SMTP credentials in Supabase settings
2. Verify your SMTP provider account is active
3. Check sender email is verified with your SMTP provider
4. Review Authentication logs for error messages

### Problem: Emails going to spam

**Solution:**
1. Configure SPF record: `v=spf1 include:_spf.your-smtp-provider.com ~all`
2. Configure DKIM signing (usually done in SMTP provider)
3. Add DMARC record: `v=DMARC1; p=none; rua=mailto:admin@yourdomain.com`
4. Use a dedicated sending domain

### Problem: Confirmation links not working

**Solution:**
1. Check Site URL in Supabase: Project Settings → API → Site URL
2. Verify redirect URLs are configured correctly
3. Ensure `{{ .ConfirmationURL }}` is present in template
4. Check URL Configuration in Authentication settings

### Problem: Template styling broken

**Solution:**
1. Email clients have limited CSS support
2. Use inline styles for critical formatting
3. Test in multiple email clients (Gmail, Outlook, Apple Mail)
4. Avoid advanced CSS features

---

## 📝 Subject Line Best Practices

Good subject lines:
- ✅ "Confirm Your Email - Welcome to LearninglyAI! 🎉"
- ✅ "Reset Your LearninglyAI Password 🔒"
- ✅ "Your LearninglyAI Magic Link ✨"

Avoid:
- ❌ ALL CAPS SUBJECT LINES
- ❌ Too many emojis 🎉🎊🎁🎈
- ❌ Spammy words (FREE, WIN, URGENT)
- ❌ Misleading or clickbait subjects

---

## 🔒 Security Best Practices

1. **Use HTTPS:** Ensure all links use HTTPS
2. **Short expiration times:**
   - Confirmation emails: 24 hours
   - Password reset: 1 hour
   - Magic links: 1 hour
3. **Rate limiting:** Configure in SMTP settings
4. **Monitor suspicious activity:** Check Auth logs regularly
5. **Keep templates updated:** Review and update quarterly

---

## 📞 Need Help?

- **Supabase Docs:** https://supabase.com/docs/guides/auth/auth-email-templates
- **Email Support:** support@learninglyai.com
- **GitHub Issues:** [Your Repository]

---

**Last Updated:** 2025-10-11
**Version:** 1.0.0
