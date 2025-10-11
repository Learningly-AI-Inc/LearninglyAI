"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { CalendarEvent, EventFormData, CalendarView, GeneratedSchedule } from '@/types/calendar'
import { useToast } from '@/hooks/use-toast'

export function useCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<CalendarView>({ type: 'month', date: new Date() })
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  
  const supabase = useSupabase()
  const { showSuccess, showError } = useToast()

  // Fetch events for the current view
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setEvents([])
        return
      }

      const startDate = getViewStartDate(view)
      const endDate = getViewEndDate(view)

      const { data, error } = await supabase
        .from('generated_content')
        .select('*')
        .eq('user_id', user.id)
        .eq('content_type', 'calendar_event')
        .order('created_at', { ascending: true })

      if (error) throw error

      // Transform generated_content data to calendar events format
      const allCalendarEvents = (data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        title: item.title,
        description: item.content_data?.description || '',
        start_time: item.content_data?.start_time || item.created_at,
        end_time: item.content_data?.end_time || item.created_at,
        all_day: item.content_data?.all_day || false,
        color: item.content_data?.color || '#3B82F6',
        location: item.content_data?.location || '',
        event_type: item.content_data?.event_type || 'general',
        course_code: item.content_data?.course_code || '',
        recurring_pattern: item.content_data?.recurring_pattern || null,
        created_at: item.created_at,
        updated_at: item.updated_at
      }))

      // Filter events by actual event dates (not creation dates)
      const filteredEvents = allCalendarEvents.filter(event => {
        const eventStart = new Date(event.start_time)
        const eventEnd = new Date(event.end_time)
<<<<<<< HEAD
        
=======

>>>>>>> 5b9d8089b63862dc5b62e41ea9c11781c3b58fd1
        // Check if event overlaps with the current view period
        return (eventStart <= endDate && eventEnd >= startDate)
      })

      console.log(`Fetched ${allCalendarEvents.length} total events, ${filteredEvents.length} events in current view`)
<<<<<<< HEAD
=======
      console.log(`View date range: ${startDate.toISOString()} to ${endDate.toISOString()}`)
      if (allCalendarEvents.length > 0 && filteredEvents.length === 0) {
        console.log('⚠️ Events exist but are outside current view. First event date:', allCalendarEvents[0]?.start_time)
      }
>>>>>>> 5b9d8089b63862dc5b62e41ea9c11781c3b58fd1
      setEvents(filteredEvents)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events')
      showError("Failed to load calendar events")
    } finally {
      setLoading(false)
    }
  }, [view, supabase, showError])

  // Create a new event
  const createEvent = useCallback(async (eventData: EventFormData) => {
    try {
      console.log('Creating event with data:', eventData)
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('User authentication check:', { user: !!user, userError })
      
      if (userError) {
        console.error('User authentication error:', userError)
        throw new Error(`Authentication error: ${userError.message}`)
      }
      
      if (!user) {
        console.error('No user found in session')
        throw new Error('User not authenticated')
      }

      console.log('User authenticated, creating event for user:', user.id)

      const { data, error } = await supabase
        .from('generated_content')
        .insert([{
          user_id: user.id,
          content_type: 'calendar_event',
          title: eventData.title,
          content_data: {
            description: eventData.description || '',
            start_time: eventData.start_time,
            end_time: eventData.end_time,
            all_day: eventData.all_day || false,
            color: eventData.color || '#3B82F6',
            location: eventData.location || '',
            event_type: eventData.event_type || 'general',
            course_code: eventData.course_id || '',
            recurring_pattern: eventData.recurring_pattern || null
          }
        }])
        .select()
        .single()

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      console.log('Event created successfully:', data)
      setEvents(prev => [...prev, data])
      showSuccess("Event created successfully")
      
      return data
    } catch (err) {
      console.error('Error in createEvent:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create event'
      showError(errorMessage)
      throw err
    }
  }, [supabase, showSuccess, showError])

  // Update an existing event
  const updateEvent = useCallback(async (eventId: string, eventData: Partial<EventFormData>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('generated_content')
        .update({
          title: eventData.title,
          content_data: {
            description: eventData.description || '',
            start_time: eventData.start_time,
            end_time: eventData.end_time,
            all_day: eventData.all_day || false,
            color: eventData.color || '#3B82F6',
            location: eventData.location || '',
            event_type: eventData.event_type || 'general',
            course_code: eventData.course_id || '',
            recurring_pattern: eventData.recurring_pattern || null
          }
        })
        .eq('id', eventId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error

      setEvents(prev => prev.map(event => event.id === eventId ? data : event))
      showSuccess("Event updated successfully")
      
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update event'
      showError(errorMessage)
      throw err
    }
  }, [supabase, showSuccess, showError])

  // Delete an event
  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('generated_content')
        .delete()
        .eq('id', eventId)
        .eq('user_id', user.id)

      if (error) throw error

      setEvents(prev => prev.filter(event => event.id !== eventId))
      showSuccess("Event deleted successfully")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete event'
      showError(errorMessage)
      throw err
    }
  }, [supabase, showSuccess, showError])

  // Get events for a specific date
  const getEventsForDate = useCallback((date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(event => {
      const eventDate = new Date(event.start_time).toISOString().split('T')[0]
      return eventDate === dateStr
    })
  }, [events])

  // Navigate calendar view
  const navigateView = useCallback((direction: 'prev' | 'next') => {
    setView(prev => {
      const newDate = new Date(prev.date)
      
      switch (prev.type) {
        case 'month':
          newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
          break
        case 'week':
          newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
          break
        case 'day':
          newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
          break
      }
      
      return { ...prev, date: newDate }
    })
  }, [])

  // Change view type
  const changeView = useCallback((type: CalendarView['type']) => {
    // Handle agenda view as month view for now
    const viewType = type === 'agenda' ? 'month' : type
    setView(prev => ({ ...prev, type: viewType }))
  }, [])

  // Go to today
  const goToToday = useCallback(() => {
    setView(prev => ({ ...prev, date: new Date() }))
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return {
    events,
    loading,
    error,
    view,
    selectedEvent,
    isCreatingEvent,
    setSelectedEvent,
    setIsCreatingEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    navigateView,
    changeView,
    goToToday,
    refreshEvents: fetchEvents
  }
}

// Helper functions
function getViewStartDate(view: CalendarView): Date {
  const date = new Date(view.date)
  
  switch (view.type) {
    case 'month':
      return new Date(date.getFullYear(), date.getMonth(), 1)
    case 'week':
      const startOfWeek = new Date(date)
      startOfWeek.setDate(date.getDate() - date.getDay())
      return startOfWeek
    case 'day':
      return new Date(date.getFullYear(), date.getMonth(), date.getDate())
    default:
      return date
  }
}

function getViewEndDate(view: CalendarView): Date {
  const date = new Date(view.date)
  
  switch (view.type) {
    case 'month':
      return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
    case 'week':
      const endOfWeek = new Date(date)
      endOfWeek.setDate(date.getDate() + (6 - date.getDay()))
      endOfWeek.setHours(23, 59, 59)
      return endOfWeek
    case 'day':
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59)
      return endOfDay
    default:
      return date
  }
}
