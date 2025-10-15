import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/calendar?error=${error}`)
    }

    if (!code) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/calendar?error=no_code`)
    }

    // Get the current user from the session
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/calendar?error=not_authenticated`)
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/google-callback`,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens')
    }

    const tokens = await tokenResponse.json()

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userResponse.ok) {
      throw new Error('Failed to get user info')
    }

    const userInfo = await userResponse.json()

    // Get calendar list
    const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!calendarResponse.ok) {
      throw new Error('Failed to get calendar list')
    }

    const calendarData = await calendarResponse.json()

    // For now, we'll use the primary calendar
    const primaryCalendar = calendarData.items.find((cal: any) => cal.primary) || calendarData.items[0]

    if (!primaryCalendar) {
      throw new Error('No calendar found')
    }

    // Save integration to database using admin client
    const adminSupabase = createAdminClient()
    const { error: dbError } = await adminSupabase
      .from('calendar_integrations')
      .insert([{
        user_id: user.id,
        provider: 'google',
        external_calendar_id: primaryCalendar.id,
        calendar_name: primaryCalendar.summary,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        is_active: true,
      }])

    if (dbError) {
      console.error('Database error:', dbError)
      // Continue anyway, as the integration might still work
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/calendar?success=google_connected`)

  } catch (error) {
    console.error('Error in Google callback:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/calendar?error=callback_failed`)
  }
}
