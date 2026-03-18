# Contact Form Setup Guide

## Overview
The contact form now sends emails to `contact@learningly.ai` and saves submissions to the database.

## Setup Steps

### 1. Create Database Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Run the migration file
\i sql/create_contact_submissions_table.sql
```

Or copy and paste the contents of `sql/create_contact_submissions_table.sql` into Supabase SQL Editor.

### 2. Configure Environment Variables

Add these to your `.env.local` file:

```env
# SMTP Configuration for Contact Form (Titan Email)
SMTP_HOST=smtp.titan.email
SMTP_PORT=587
SMTP_USER=contact@learningly.ai
SMTP_PASSWORD=your_email_password_here

# Contact email (where messages will be sent)
NEXT_PUBLIC_CONTACT_EMAIL=contact@learningly.ai
```

### 3. Set Up SMTP Password

1. Log into your Titan Email / Hostinger account
2. Make sure `contact@learningly.ai` has SMTP access enabled
3. Use the email password for `SMTP_PASSWORD`
4. If you reset the password, update the `.env.local` file

### 4. Test the Contact Form

1. Go to your landing page
2. Fill out the contact form at the bottom
3. Click "Send Message"
4. You should:
   - See a success message
   - Receive an email at `contact@learningly.ai`
   - The user should receive a confirmation email
   - The submission should be saved to the database

### 5. View Submissions in Database

To view contact form submissions in Supabase:

```sql
SELECT * FROM contact_submissions ORDER BY submitted_at DESC;
```

## Features

### Email Notifications
- **To Admin**: Beautifully formatted HTML email sent to `contact@learningly.ai`
- **To User**: Automatic confirmation email sent to the user
- **Reply-To**: Set to the user's email for easy replies

### Database Storage
- All submissions are saved to `contact_submissions` table
- Fields: name, email, message, submitted_at, read status
- Admin-only access via Row Level Security

### Form Validation
- Required fields: name, email, message
- Email format validation
- Error messages with toast notifications
- Loading states and success feedback

## Troubleshooting

### Emails Not Sending

1. **Check SMTP Credentials**:
   - Verify `SMTP_USER` and `SMTP_PASSWORD` are correct
   - Test login at Titan Email webmail

2. **Check Environment Variables**:
   ```bash
   # Make sure .env.local is loaded
   echo $SMTP_HOST
   ```

3. **Check Logs**:
   - Look for errors in the console
   - Check `/api/contact` endpoint logs

4. **Verify Titan Email Settings**:
   - Host: `smtp.titan.email`
   - Port: `587`
   - TLS/STARTTLS enabled

### Database Errors

1. **Table doesn't exist**:
   - Run the SQL migration file
   - Check if table was created: `\dt contact_submissions`

2. **Permission errors**:
   - Check Row Level Security policies
   - Make sure anonymous users can INSERT

### Form Not Submitting

1. **Check network tab** for `/api/contact` request
2. **Verify API endpoint** is accessible
3. **Check form validation** errors in console

## Advanced: Custom Email Templates

To customize the email templates, edit:
- `/lib/email-sender.ts` - `sendContactEmail()` function
- `/lib/email-sender.ts` - `sendContactConfirmation()` function

## Security Notes

- Emails are sent server-side only (API route)
- SMTP credentials are never exposed to client
- RLS policies protect contact submissions
- Only admins can view submissions
