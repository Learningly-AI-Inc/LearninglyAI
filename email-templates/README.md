# Email Templates for LearninglyAI

Professional email templates for Supabase authentication flows with custom SMTP.

## 📧 Available Templates

### 1. **confirm-signup.html**
- **Purpose**: Email confirmation for new user signups
- **Supabase Setting**: Authentication > Email Templates > Confirm signup
- **Variables**: `{{ .ConfirmationURL }}`

### 2. **reset-password.html**
- **Purpose**: Password reset requests
- **Supabase Setting**: Authentication > Email Templates > Reset password
- **Variables**: `{{ .ConfirmationURL }}`

### 3. **magic-link.html**
- **Purpose**: Passwordless authentication via magic link
- **Supabase Setting**: Authentication > Email Templates > Magic Link
- **Variables**: `{{ .ConfirmationURL }}`

### 4. **email-change.html**
- **Purpose**: Confirm email address changes
- **Supabase Setting**: Authentication > Email Templates > Change Email Address
- **Variables**: `{{ .ConfirmationURL }}`

## 🎨 Design Features

- ✅ Responsive design (mobile-friendly)
- ✅ Modern gradient header with brand colors
- ✅ Clear call-to-action buttons
- ✅ Security notices and warnings
- ✅ Fallback text links for accessibility
- ✅ Professional footer with links
- ✅ Consistent branding across all templates

## 🚀 How to Use

### Step 1: Configure Custom SMTP in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Project Settings** > **Authentication**
3. Scroll to **SMTP Settings**
4. Enable **Custom SMTP**
5. Enter your SMTP credentials:
   - Host: `your-smtp-host.com`
   - Port: `587` (or your SMTP port)
   - Username: `your-smtp-username`
   - Password: `your-smtp-password`
   - Sender email: `noreply@learninglyai.com`
   - Sender name: `LearninglyAI`

### Step 2: Update Email Templates

1. In Supabase Dashboard, go to **Authentication** > **Email Templates**
2. For each template type, copy the content from the corresponding HTML file
3. Paste into the Supabase template editor
4. Save changes

### Step 3: Test Your Templates

```bash
# Test signup confirmation
curl -X POST 'https://your-project.supabase.co/auth/v1/signup' \
-H "apikey: YOUR_ANON_KEY" \
-H "Content-Type: application/json" \
-d '{
  "email": "test@example.com",
  "password": "securepassword123"
}'

# Test password reset
curl -X POST 'https://your-project.supabase.co/auth/v1/recover' \
-H "apikey: YOUR_ANON_KEY" \
-H "Content-Type: application/json" \
-d '{
  "email": "test@example.com"
}'
```

## 🎯 Customization

### Update Brand Colors

The current gradient uses:
- Primary: `#667eea` (purple-blue)
- Secondary: `#764ba2` (purple)

To change, update these CSS variables in each template:

```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Update Links

Replace these placeholder links in all templates:
- `https://learninglyai.com` - Your homepage
- `https://learninglyai.com/support` - Support page
- `https://learninglyai.com/privacy` - Privacy policy

### Update Footer

Modify the footer section in each template:
```html
<div class="footer">
    <p>Your custom footer text</p>
    <div class="footer-links">
        <a href="your-link">Your Link</a>
    </div>
</div>
```

## 📝 Available Supabase Template Variables

- `{{ .ConfirmationURL }}` - Confirmation/action URL
- `{{ .Token }}` - Verification token
- `{{ .TokenHash }}` - Token hash
- `{{ .SiteURL }}` - Your site URL (configured in Supabase)
- `{{ .Email }}` - User's email address
- `{{ .RedirectTo }}` - Redirect URL after confirmation

## 🔒 Security Best Practices

1. ✅ Always use HTTPS for confirmation URLs
2. ✅ Set appropriate link expiration times (1-24 hours)
3. ✅ Include security warnings in templates
4. ✅ Use SPF, DKIM, and DMARC for email authentication
5. ✅ Monitor bounce rates and spam reports

## 📊 Email Deliverability Tips

1. **Warm up your SMTP**: Start with low volume and gradually increase
2. **Authenticate your domain**: Configure SPF, DKIM, DMARC records
3. **Use a dedicated sending domain**: `mail.learninglyai.com`
4. **Monitor reputation**: Use tools like Google Postmaster
5. **Keep lists clean**: Remove bounced and unsubscribed emails

## 🐛 Troubleshooting

### Emails not sending?
- Check SMTP credentials in Supabase
- Verify sender email is authenticated
- Check spam folder
- Review Supabase logs for errors

### Links not working?
- Ensure `{{ .ConfirmationURL }}` is correctly placed
- Check redirect URL configuration in Supabase
- Verify site URL in project settings

### Styling issues?
- Email clients have limited CSS support
- Use inline styles for critical styling
- Test in multiple email clients (Gmail, Outlook, etc.)

## 📫 Support

For issues or questions:
- Email: support@learninglyai.com
- GitHub Issues: [Project Repository]

---

**© 2025 LearninglyAI. All rights reserved.**
