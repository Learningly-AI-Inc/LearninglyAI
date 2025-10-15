# Google Calendar Integration Setup Guide

This guide will help you set up Google Calendar integration for the LearninglyAI calendar feature.

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "LearninglyAI Calendar")
5. Click "Create"

## Step 2: Enable Google Calendar API

1. In your Google Cloud project, go to **APIs & Services** > **Library**
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in the app name: "LearninglyAI"
   - Add your support email
   - Add your domain (or leave blank for development)
   - Add scopes: `https://www.googleapis.com/auth/calendar.readonly` and `https://www.googleapis.com/auth/calendar.events`
   - Add test users if needed (for development)
   - Save and continue

4. Create OAuth Client ID:
   - Application type: "Web application"
   - Name: "LearninglyAI Calendar Integration"
   - **Authorized JavaScript origins**:
     - For development: `http://localhost:3000`
     - For production: `https://yourdomain.com`
   - **Authorized redirect URIs**:
     - For development: `http://localhost:3000/api/calendar/google-callback`
     - For production: `https://yourdomain.com/api/calendar/google-callback`
   - Click "Create"

5. Copy the **Client ID** and **Client Secret** that appear

## Step 4: Add Credentials to .env.local

Add the following to your `.env.local` file:

```env
# Google Calendar Integration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, update `NEXT_PUBLIC_APP_URL` to your production domain.

## Step 5: Database Schema

The integration requires the following tables in your Supabase database:

### calendar_integrations table

```sql
CREATE TABLE IF NOT EXISTS calendar_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_calendar_id TEXT NOT NULL,
  calendar_name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_calendar_integrations_user_id ON calendar_integrations(user_id);
CREATE INDEX idx_calendar_integrations_provider ON calendar_integrations(provider);
```

### generated_content table (for storing synced events)

The integration stores calendar events in the `generated_content` table with:
- `content_type = 'calendar_event'`
- `content_data` containing event details including `external_id` and `external_calendar_id`

## Step 6: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/calendar` in your browser

3. Click on the "Integrations" tab

4. Click "Connect" next to Google Calendar

5. Authorize the app when prompted by Google

6. Once connected, you should see your Google Calendar listed

7. Click the sync button to sync events from Google Calendar

## Features

### Current Features

- **OAuth 2.0 Authentication**: Secure authentication with Google
- **Token Management**: Automatic token refresh when expired
- **Calendar Sync**: Sync events from Google Calendar to LearninglyAI
- **Two-way Sync**: Events synced from Google can be viewed in your calendar
- **Event Updates**: Existing events are updated when synced again
- **Enable/Disable**: Turn integrations on/off without disconnecting

### How It Works

1. **Connection Flow**:
   - User clicks "Connect" on Google Calendar
   - User is redirected to Google OAuth consent screen
   - Google redirects back with authorization code
   - App exchanges code for access and refresh tokens
   - Tokens and calendar info are stored in database

2. **Sync Process**:
   - User clicks sync button
   - App fetches events from last 30 days and next 30 days
   - Events are converted to LearninglyAI format
   - Events are upserted to database (updates existing, inserts new)
   - User sees synced events in calendar view

3. **Token Refresh**:
   - Before each sync, app checks if token is expired
   - If expired, app uses refresh token to get new access token
   - New token is stored in database for future use

## Troubleshooting

### "OAuth not configured" error
- Make sure you've added `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env.local`
- Restart your development server after adding environment variables

### "Redirect URI mismatch" error
- Ensure your redirect URI in Google Cloud Console exactly matches: `http://localhost:3000/api/calendar/google-callback`
- Check that `NEXT_PUBLIC_APP_URL` in `.env.local` matches your app URL

### "Not authenticated" error
- Make sure you're logged in to LearninglyAI
- Try logging out and logging back in
- Check that your session cookies are enabled

### Events not syncing
- Check the browser console for errors
- Verify that Google Calendar API is enabled in your project
- Ensure you granted the necessary scopes during OAuth

## Security Best Practices

1. **Never commit credentials**: Keep `.env.local` in `.gitignore`
2. **Use environment variables**: All sensitive data should be in env vars
3. **Rotate tokens**: If tokens are compromised, revoke access in Google Cloud Console
4. **Limit scopes**: Only request necessary Calendar API scopes
5. **Use HTTPS**: In production, always use HTTPS for OAuth redirects

## API Endpoints

- `POST /api/calendar/google-auth`: Initiates OAuth flow
- `GET /api/calendar/google-callback`: Handles OAuth callback
- `POST /api/calendar/sync`: Syncs events from Google Calendar

## Next Steps

Consider implementing:
- Two-way sync (create events in Google Calendar from LearninglyAI)
- Multiple calendar selection
- Real-time sync using webhooks
- Calendar event notifications
- Support for recurring events
- Calendar color customization
