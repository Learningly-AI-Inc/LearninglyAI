import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { integration_id } = await request.json()

    if (!integration_id) {
      return NextResponse.json(
        { error: 'Integration ID is required' },
        { status: 400 }
      )
    }

    // Get integration details
    const { data: integration, error: integrationError } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('id', integration_id)
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      )
    }

    // Check if token is expired and refresh if needed
    let accessToken = integration.access_token
    
    if (integration.expires_at && new Date(integration.expires_at) <= new Date()) {
      if (!integration.refresh_token) {
        return NextResponse.json(
          { error: 'Token expired and no refresh token available' },
          { status: 400 }
        )
      }

      // Refresh the token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: integration.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      if (!refreshResponse.ok) {
        return NextResponse.json(
          { error: 'Failed to refresh token' },
          { status: 400 }
        )
      }

      const refreshData = await refreshResponse.json()
      accessToken = refreshData.access_token

      // Update the token in the database
      await supabase
        .from('calendar_integrations')
        .update({
          access_token: refreshData.access_token,
          expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        })
        .eq('id', integration_id)
    }

    // Fetch events from Google Calendar
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const eventsResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${integration.external_calendar_id}/events?` +
      `timeMin=${thirtyDaysAgo.toISOString()}&timeMax=${thirtyDaysFromNow.toISOString()}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!eventsResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch events from Google Calendar' },
        { status: 400 }
      )
    }

    const eventsData = await eventsResponse.json()
    const events = eventsData.items || []

    // Convert Google Calendar events to our format
    const convertedEvents = events.map((event: any) => ({
      user_id: integration.user_id,
      content_type: 'calendar_event',
      title: event.summary || 'Untitled Event',
      content_data: {
        description: event.description || '',
        start_time: event.start?.dateTime || event.start?.date || new Date().toISOString(),
        end_time: event.end?.dateTime || event.end?.date || new Date().toISOString(),
        all_day: !event.start?.dateTime,
        color: event.colorId ? getColorFromId(event.colorId) : '#3B82F6',
        location: event.location || '',
        event_type: 'general',
        external_id: event.id,
        external_calendar_id: integration.external_calendar_id,
      }
    }))

    // Save events to database (upsert to avoid duplicates)
    let eventsSynced = 0
    for (const event of convertedEvents) {
      // Check if event already exists by external_id
      const { data: existingEvent } = await supabase
        .from('generated_content')
        .select('id')
        .eq('user_id', event.user_id)
        .eq('content_type', 'calendar_event')
        .eq('content_data->>external_id', event.content_data.external_id)
        .single()

      if (existingEvent) {
        // Update existing event
        const { error: eventError } = await supabase
          .from('generated_content')
          .update(event)
          .eq('id', existingEvent.id)

        if (!eventError) {
          eventsSynced++
        }
      } else {
        // Insert new event
        const { error: eventError } = await supabase
          .from('generated_content')
          .insert(event)

        if (!eventError) {
          eventsSynced++
        }
      }
    }

    return NextResponse.json({
      events_synced: eventsSynced,
      calendar_name: integration.calendar_name,
      total_events: events.length,
    })

  } catch (error) {
    console.error('Error syncing calendar:', error)
    return NextResponse.json(
      { error: 'Failed to sync calendar' },
      { status: 500 }
    )
  }
}

function getColorFromId(colorId: string): string {
  const colorMap: { [key: string]: string } = {
    '1': '#A4BDFC', // Lavender
    '2': '#7AE7BF', // Sage
    '3': '#DBADFF', // Grape
    '4': '#FF887C', // Flamingo
    '5': '#FBD75B', // Banana
    '6': '#FFB878', // Tangerine
    '7': '#46D6DB', // Peacock
    '8': '#E1E1E1', // Graphite
    '9': '#5484ED', // Blueberry
    '10': '#51B749', // Basil
    '11': '#DC2127', // Tomato
  }
  return colorMap[colorId] || '#3B82F6'
}
