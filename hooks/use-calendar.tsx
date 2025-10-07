"use client"

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { CalendarEvent, EventFormData, CalendarView, GeneratedSchedule } from '@/types/calendar'
import { useToast } from '@/hooks/use-toast'

export function useCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<CalendarView>({ type: 'month', date: new Date() })
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  
  const supabase = createClientComponentClient()
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
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: true })

      if (error) throw error

      setEvents(data || [])
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('calendar_events')
        .insert([{
          user_id: user.id,
          ...eventData,
          start_time: eventData.start_time,
          end_time: eventData.end_time,
        }])
        .select()
        .single()

      if (error) throw error

      setEvents(prev => [...prev, data])
      showSuccess("Event created successfully")
      
      return data
    } catch (err) {
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
        .from('calendar_events')
        .update(eventData)
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
        .from('calendar_events')
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
    setView(prev => ({ ...prev, type }))
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
