"use client"

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/hooks/use-toast'

export interface CalendarSettings {
  id?: string
  user_id: string
  default_view: 'month' | 'week' | 'day' | 'agenda'
  week_start: 'sunday' | 'monday'
  time_format: '12h' | '24h'
  timezone: string
  default_event_duration: number
  default_reminder_time: number
  enable_notifications: boolean
  enable_email_reminders: boolean
  enable_sms_reminders: boolean
  working_hours_start: string
  working_hours_end: string
  working_days: number[]
  theme: 'light' | 'dark' | 'auto'
  event_colors: { [key: string]: string }
  auto_sync: boolean
  sync_frequency: number
  created_at?: string
  updated_at?: string
}

const defaultSettings: Omit<CalendarSettings, 'user_id'> = {
  default_view: 'month',
  week_start: 'sunday',
  time_format: '12h',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  default_event_duration: 60,
  default_reminder_time: 15,
  enable_notifications: true,
  enable_email_reminders: true,
  enable_sms_reminders: false,
  working_hours_start: '09:00',
  working_hours_end: '17:00',
  working_days: [1, 2, 3, 4, 5], // Monday to Friday
  theme: 'auto',
  event_colors: {},
  auto_sync: true,
  sync_frequency: 15
}

export function useCalendarSettings() {
  const [settings, setSettings] = useState<CalendarSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const supabase = createClientComponentClient()
  const { showSuccess, showError } = useToast()

  // Load settings from database
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setSettings(null)
        return
      }

      const { data, error } = await supabase
        .from('calendar_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error
      }

      if (data) {
        setSettings(data)
      } else {
        // Create default settings
        const defaultUserSettings = { ...defaultSettings, user_id: user.id }
        setSettings(defaultUserSettings)
      }
    } catch (error) {
      console.error('Error loading calendar settings:', error)
      showError('Failed to load calendar settings')
    } finally {
      setLoading(false)
    }
  }, [supabase, showError])

  // Save settings to database
  const saveSettings = useCallback(async (newSettings: Partial<CalendarSettings>) => {
    if (!settings) return

    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const settingsToSave = { ...settings, ...newSettings, user_id: user.id }

      const { error } = await supabase
        .from('calendar_settings')
        .upsert(settingsToSave, {
          onConflict: 'user_id'
        })

      if (error) throw error

      setSettings(settingsToSave)
      showSuccess('Calendar settings saved successfully')
    } catch (error) {
      console.error('Error saving calendar settings:', error)
      showError('Failed to save calendar settings')
    } finally {
      setSaving(false)
    }
  }, [settings, supabase, showSuccess, showError])

  // Update a specific setting
  const updateSetting = useCallback((key: keyof CalendarSettings, value: any) => {
    if (!settings) return
    
    setSettings(prev => prev ? { ...prev, [key]: value } : null)
  }, [settings])

  // Get a specific setting value with fallback to default
  const getSetting = useCallback((key: keyof CalendarSettings) => {
    if (!settings) {
      // Handle user_id separately since it's not in defaultSettings
      if (key === 'user_id') return ''
      return defaultSettings[key as keyof typeof defaultSettings]
    }
    return settings[key] ?? (key === 'user_id' ? '' : defaultSettings[key as keyof typeof defaultSettings])
  }, [settings])

  // Check if user has working hours configured
  const isWorkingDay = useCallback((date: Date) => {
    const dayOfWeek = date.getDay()
    const workingDays = getSetting('working_days') as number[]
    return workingDays.includes(dayOfWeek)
  }, [getSetting])

  // Check if time is within working hours
  const isWorkingTime = useCallback((date: Date) => {
    const workingStart = getSetting('working_hours_start') as string
    const workingEnd = getSetting('working_hours_end') as string
    
    const time = date.toTimeString().slice(0, 5) // HH:MM format
    return time >= workingStart && time <= workingEnd
  }, [getSetting])

  // Format time according to user's preference
  const formatTime = useCallback((date: Date) => {
    const timeFormat = getSetting('time_format') as '12h' | '24h'
    
    if (timeFormat === '12h') {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    } else {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    }
  }, [getSetting])

  // Get event color for a specific event type
  const getEventColor = useCallback((eventType: string) => {
    const eventColors = getSetting('event_colors') as { [key: string]: string }
    return eventColors[eventType] || '#3B82F6'
  }, [getSetting])

  // Reset to default settings
  const resetToDefaults = useCallback(async () => {
    if (!settings) return
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const defaultUserSettings = { ...defaultSettings, user_id: user.id }
    setSettings(defaultUserSettings)
  }, [settings, supabase])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  return {
    settings,
    loading,
    saving,
    loadSettings,
    saveSettings,
    updateSetting,
    getSetting,
    isWorkingDay,
    isWorkingTime,
    formatTime,
    getEventColor,
    resetToDefaults
  }
}
