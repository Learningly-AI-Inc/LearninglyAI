"use client"

import * as React from "react"
import { Settings, Bell, Palette, Clock, Globe, Save, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useCalendarSettings } from "@/hooks/use-calendar-settings"

interface CalendarSettings {
  id?: string
  user_id: string
  default_view: 'month' | 'week' | 'day' | 'agenda'
  week_start: 'sunday' | 'monday'
  time_format: '12h' | '24h'
  timezone: string
  default_event_duration: number // in minutes
  default_reminder_time: number // in minutes before event
  enable_notifications: boolean
  enable_email_reminders: boolean
  enable_sms_reminders: boolean
  working_hours_start: string
  working_hours_end: string
  working_days: number[] // 0-6 for Sunday-Saturday
  theme: 'light' | 'dark' | 'auto'
  event_colors: { [key: string]: string }
  auto_sync: boolean
  sync_frequency: number // in minutes
  created_at?: string
  updated_at?: string
}

const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'UTC'
]

const eventTypes = [
  { key: 'general', label: 'General', color: '#3B82F6' },
  { key: 'class', label: 'Class', color: '#10B981' },
  { key: 'exam', label: 'Exam', color: '#EF4444' },
  { key: 'assignment', label: 'Assignment', color: '#F59E0B' },
  { key: 'study', label: 'Study', color: '#8B5CF6' },
  { key: 'deadline', label: 'Deadline', color: '#EC4899' },
  { key: 'personal', label: 'Personal', color: '#6B7280' }
]

const workingDays = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
]

export function CalendarSettings() {
  const [hasChanges, setHasChanges] = React.useState(false)
  const [localSettings, setLocalSettings] = React.useState<CalendarSettings | null>(null)
  
  const {
    settings,
    loading,
    saving,
    saveSettings,
    updateSetting,
    getSetting,
    resetToDefaults
  } = useCalendarSettings()

  // Update local settings when settings change
  React.useEffect(() => {
    if (settings) {
      setLocalSettings(settings)
    }
  }, [settings])

  // Update setting value
  const handleUpdateSetting = (key: keyof CalendarSettings, value: any) => {
    if (!localSettings) return
    
    setLocalSettings(prev => prev ? { ...prev, [key]: value } : null)
    setHasChanges(true)
  }

  // Update working days
  const updateWorkingDays = (day: number, checked: boolean) => {
    if (!localSettings) return
    
    setLocalSettings(prev => prev ? ({
      ...prev,
      working_days: checked 
        ? [...prev.working_days, day]
        : prev.working_days.filter(d => d !== day)
    }) : null)
    setHasChanges(true)
  }

  // Update event color
  const updateEventColor = (eventType: string, color: string) => {
    if (!localSettings) return
    
    setLocalSettings(prev => prev ? ({
      ...prev,
      event_colors: {
        ...prev.event_colors,
        [eventType]: color
      }
    }) : null)
    setHasChanges(true)
  }

  // Save settings
  const handleSaveSettings = async () => {
    if (!localSettings) return
    
    await saveSettings(localSettings)
    setHasChanges(false)
  }

  // Reset to defaults
  const handleResetToDefaults = () => {
    resetToDefaults()
    setHasChanges(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Calendar Settings</h2>
          <p className="text-muted-foreground">Customize your calendar experience</p>
        </div>
        <div className="flex items-center space-x-2">
          {hasChanges && (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              Unsaved changes
            </Badge>
          )}
          <Button onClick={handleResetToDefaults} variant="outline" size="sm">
            Reset to Defaults
          </Button>
          <Button onClick={handleSaveSettings} disabled={!hasChanges || saving}>
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>General</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default_view">Default View</Label>
              <Select
                value={localSettings?.default_view || 'month'}
                onValueChange={(value: any) => handleUpdateSetting('default_view', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="agenda">Agenda</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="week_start">Week Starts On</Label>
              <Select
                value={localSettings?.week_start || 'sunday'}
                onValueChange={(value: any) => handleUpdateSetting('week_start', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sunday">Sunday</SelectItem>
                  <SelectItem value="monday">Monday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time_format">Time Format</Label>
              <Select
                value={localSettings?.time_format || '12h'}
                onValueChange={(value: any) => handleUpdateSetting('time_format', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                  <SelectItem value="24h">24-hour</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={localSettings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                onValueChange={(value) => handleUpdateSetting('timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={localSettings?.theme || 'auto'}
                onValueChange={(value: any) => handleUpdateSetting('theme', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="auto">Auto (System)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Event Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Events</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default_duration">Default Event Duration (minutes)</Label>
              <Input
                id="default_duration"
                type="number"
                value={localSettings?.default_event_duration || 60}
                onChange={(e) => handleUpdateSetting('default_event_duration', parseInt(e.target.value))}
                min="15"
                max="480"
                step="15"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminder_time">Default Reminder Time (minutes before)</Label>
              <Input
                id="reminder_time"
                type="number"
                value={localSettings?.default_reminder_time || 15}
                onChange={(e) => handleUpdateSetting('default_reminder_time', parseInt(e.target.value))}
                min="0"
                max="1440"
                step="5"
              />
            </div>

            <div className="space-y-2">
              <Label>Working Hours</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="time"
                  value={localSettings?.working_hours_start || '09:00'}
                  onChange={(e) => handleUpdateSetting('working_hours_start', e.target.value)}
                />
                <span>to</span>
                <Input
                  type="time"
                  value={localSettings?.working_hours_end || '17:00'}
                  onChange={(e) => handleUpdateSetting('working_hours_end', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Working Days</Label>
              <div className="grid grid-cols-2 gap-2">
                {workingDays.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Switch
                      checked={localSettings?.working_days?.includes(day.value) || false}
                      onCheckedChange={(checked) => updateWorkingDays(day.value, checked)}
                    />
                    <Label className="text-sm">{day.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enable_notifications">Enable Notifications</Label>
                <p className="text-sm text-muted-foreground">Show browser notifications for events</p>
              </div>
              <Switch
                id="enable_notifications"
                checked={localSettings?.enable_notifications || true}
                onCheckedChange={(checked) => handleUpdateSetting('enable_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enable_email">Email Reminders</Label>
                <p className="text-sm text-muted-foreground">Send email reminders for events</p>
              </div>
              <Switch
                id="enable_email"
                checked={localSettings?.enable_email_reminders || true}
                onCheckedChange={(checked) => handleUpdateSetting('enable_email_reminders', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enable_sms">SMS Reminders</Label>
                <p className="text-sm text-muted-foreground">Send SMS reminders for events</p>
              </div>
              <Switch
                id="enable_sms"
                checked={localSettings?.enable_sms_reminders || false}
                onCheckedChange={(checked) => handleUpdateSetting('enable_sms_reminders', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sync Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Sync & Integration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto_sync">Auto Sync</Label>
                <p className="text-sm text-muted-foreground">Automatically sync with external calendars</p>
              </div>
              <Switch
                id="auto_sync"
                checked={localSettings?.auto_sync || true}
                onCheckedChange={(checked) => handleUpdateSetting('auto_sync', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sync_frequency">Sync Frequency (minutes)</Label>
              <Select
                value={localSettings?.sync_frequency?.toString() || '15'}
                onValueChange={(value) => handleUpdateSetting('sync_frequency', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Every 5 minutes</SelectItem>
                  <SelectItem value="15">Every 15 minutes</SelectItem>
                  <SelectItem value="30">Every 30 minutes</SelectItem>
                  <SelectItem value="60">Every hour</SelectItem>
                  <SelectItem value="240">Every 4 hours</SelectItem>
                  <SelectItem value="1440">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Event Colors */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Palette className="h-5 w-5" />
              <span>Event Colors</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {eventTypes.map((eventType) => (
                <div key={eventType.key} className="flex items-center space-x-3">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-gray-300 cursor-pointer"
                    style={{ backgroundColor: localSettings?.event_colors?.[eventType.key] || eventType.color }}
                    onClick={() => {
                      const newColor = prompt('Enter hex color:', localSettings?.event_colors?.[eventType.key] || eventType.color)
                      if (newColor && /^#[0-9A-F]{6}$/i.test(newColor)) {
                        updateEventColor(eventType.key, newColor)
                      }
                    }}
                  />
                  <Label className="flex-1">{eventType.label}</Label>
                  <Input
                    type="text"
                    value={localSettings?.event_colors?.[eventType.key] || eventType.color}
                    onChange={(e) => updateEventColor(eventType.key, e.target.value)}
                    className="w-20 text-xs"
                    placeholder="#000000"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
