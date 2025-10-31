"use client"

import * as React from "react"
import { X, Calendar as CalendarIcon, Clock, MapPin, Tag, User, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { DatePicker } from "@/components/ui/date-picker"
import { TimePicker } from "@/components/ui/time-picker"
import { CalendarEvent, EventFormData } from "@/types/calendar"
import { cn } from "@/lib/utils"

interface EventFormProps {
  event?: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: EventFormData) => Promise<void>
  onDelete?: (eventId: string) => Promise<void>
  loading?: boolean
}

const eventTypes = [
  { value: 'general', label: 'General', color: '#3B82F6' },
  { value: 'class', label: 'Class', color: '#10B981' },
  { value: 'exam', label: 'Exam', color: '#EF4444' },
  { value: 'assignment', label: 'Assignment', color: '#F59E0B' },
  { value: 'study', label: 'Study', color: '#8B5CF6' },
  { value: 'deadline', label: 'Deadline', color: '#EC4899' },
  { value: 'personal', label: 'Personal', color: '#6B7280' },
]

const colorOptions = [
  { value: '#3B82F6', label: 'Blue', color: 'bg-blue-500' },
  { value: '#EF4444', label: 'Red', color: 'bg-red-500' },
  { value: '#10B981', label: 'Green', color: 'bg-green-500' },
  { value: '#F59E0B', label: 'Yellow', color: 'bg-yellow-500' },
  { value: '#8B5CF6', label: 'Purple', color: 'bg-purple-500' },
  { value: '#EC4899', label: 'Pink', color: 'bg-pink-500' },
  { value: '#6B7280', label: 'Gray', color: 'bg-gray-500' },
]

export function EventForm({ event, isOpen, onClose, onSubmit, onDelete, loading = false }: EventFormProps) {
  const [formData, setFormData] = React.useState<EventFormData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    all_day: false,
    color: '#3B82F6',
    location: '',
    event_type: 'general',
  })

  const [startDate, setStartDate] = React.useState<Date | undefined>()
  const [endDate, setEndDate] = React.useState<Date | undefined>()
  const [startTime, setStartTime] = React.useState<string>('')
  const [endTime, setEndTime] = React.useState<string>('')

  const [errors, setErrors] = React.useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)

  // Initialize form data when event changes
  React.useEffect(() => {
    if (event) {
      const startDate = new Date(event.start_time)
      const endDate = new Date(event.end_time)
      
      setFormData({
        title: event.title,
        description: event.description || '',
        start_time: event.start_time,
        end_time: event.end_time,
        all_day: event.all_day,
        color: event.color,
        location: event.location || '',
        event_type: event.event_type,
      })
      
      setStartDate(startDate)
      setEndDate(endDate)
      setStartTime(startDate.toTimeString().slice(0, 5))
      setEndTime(endDate.toTimeString().slice(0, 5))
    } else {
      setFormData({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        all_day: false,
        color: '#3B82F6',
        location: '',
        event_type: 'general',
      })
      
      setStartDate(undefined)
      setEndDate(undefined)
      setStartTime('')
      setEndTime('')
    }
    setErrors({})
    setIsSubmitting(false) // Reset submitting state when form opens
  }, [event, isOpen])

  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false)
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      setErrors({})
    }
  }, [isOpen])

  const handleInputChange = (field: keyof EventFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date)
    if (date && startTime) {
      const [hours, minutes] = startTime.split(':')
      const newDateTime = new Date(date)
      newDateTime.setHours(parseInt(hours), parseInt(minutes))
      setFormData(prev => ({ ...prev, start_time: newDateTime.toISOString() }))
    }
  }

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date)
    if (date && endTime) {
      const [hours, minutes] = endTime.split(':')
      const newDateTime = new Date(date)
      newDateTime.setHours(parseInt(hours), parseInt(minutes))
      setFormData(prev => ({ ...prev, end_time: newDateTime.toISOString() }))
    }
  }

  const handleStartTimeChange = (time: string) => {
    setStartTime(time)
    if (startDate && time) {
      const [hours, minutes] = time.split(':')
      const newDateTime = new Date(startDate)
      newDateTime.setHours(parseInt(hours), parseInt(minutes))
      setFormData(prev => ({ ...prev, start_time: newDateTime.toISOString() }))
    }
  }

  const handleEndTimeChange = (time: string) => {
    setEndTime(time)
    if (endDate && time) {
      const [hours, minutes] = time.split(':')
      const newDateTime = new Date(endDate)
      newDateTime.setHours(parseInt(hours), parseInt(minutes))
      setFormData(prev => ({ ...prev, end_time: newDateTime.toISOString() }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!startDate) {
      newErrors.start_time = 'Start date is required'
    }

    if (!endDate) {
      newErrors.end_time = 'End date is required'
    }

    if (!formData.all_day && !startTime) {
      newErrors.start_time = 'Start time is required'
    }

    if (!formData.all_day && !endTime) {
      newErrors.end_time = 'End time is required'
    }

    if (startDate && endDate && startTime && endTime) {
      const start = new Date(startDate)
      const [startHours, startMinutes] = startTime.split(':')
      start.setHours(parseInt(startHours), parseInt(startMinutes))
      
      const end = new Date(endDate)
      const [endHours, endMinutes] = endTime.split(':')
      end.setHours(parseInt(endHours), parseInt(endMinutes))
      
      if (start >= end) {
        newErrors.end_time = 'End time must be after start time'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      setIsSubmitting(true)
      
      // Combine date and time for submission
      let finalStartTime = ''
      let finalEndTime = ''
      
      if (formData.all_day) {
        // For all-day events, use just the date
        finalStartTime = startDate?.toISOString().split('T')[0] + 'T00:00:00.000Z'
        finalEndTime = endDate?.toISOString().split('T')[0] + 'T23:59:59.999Z'
      } else {
        // For timed events, combine date and time
        if (startDate && startTime) {
          const [hours, minutes] = startTime.split(':')
          const startDateTime = new Date(startDate)
          startDateTime.setHours(parseInt(hours), parseInt(minutes))
          finalStartTime = startDateTime.toISOString()
        }
        
        if (endDate && endTime) {
          const [hours, minutes] = endTime.split(':')
          const endDateTime = new Date(endDate)
          endDateTime.setHours(parseInt(hours), parseInt(minutes))
          finalEndTime = endDateTime.toISOString()
        }
      }
      
      const submitData = {
        ...formData,
        start_time: finalStartTime,
        end_time: finalEndTime
      }
      
      await onSubmit(submitData)
      onClose()
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAllDayChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, all_day: checked }))

    if (checked) {
      // When switching to all-day, set times to start/end of day
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        setFormData(prev => ({ ...prev, start_time: start.toISOString() }))
      }

      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        setFormData(prev => ({ ...prev, end_time: end.toISOString() }))
      }
    }
  }

  const handleDelete = async () => {
    if (!event || !onDelete) return

    try {
      setIsDeleting(true)
      await onDelete(event.id)
      onClose()
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background border-border">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border">
          <CardTitle className="text-xl font-semibold text-foreground">
            {event ? 'Edit Event' : 'Create Event'}
          </CardTitle>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} className="hover:bg-accent">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Event title"
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Event description"
                rows={3}
              />
            </div>

            {/* All Day Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="all_day"
                checked={formData.all_day}
                onCheckedChange={handleAllDayChange}
              />
              <Label htmlFor="all_day">All day event</Label>
            </div>

            {/* Date and Time */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Start {formData.all_day ? 'Date' : 'Date & Time'} *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <DatePicker
                    value={startDate}
                    onChange={handleStartDateChange}
                    placeholder="Select start date"
                    className={errors.start_time ? 'border-destructive' : ''}
                  />
                  {!formData.all_day && (
                    <TimePicker
                      value={startTime}
                      onChange={handleStartTimeChange}
                      placeholder="Select time"
                      className={cn("w-full", errors.start_time ? 'border-destructive' : '')}
                    />
                  )}
                </div>
                {errors.start_time && (
                  <p className="text-sm text-destructive">{errors.start_time}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>End {formData.all_day ? 'Date' : 'Date & Time'} *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <DatePicker
                    value={endDate}
                    onChange={handleEndDateChange}
                    placeholder="Select end date"
                    className={errors.end_time ? 'border-destructive' : ''}
                  />
                  {!formData.all_day && (
                    <TimePicker
                      value={endTime}
                      onChange={handleEndTimeChange}
                      placeholder="Select time"
                      className={cn("w-full", errors.end_time ? 'border-destructive' : '')}
                    />
                  )}
                </div>
                {errors.end_time && (
                  <p className="text-sm text-destructive">{errors.end_time}</p>
                )}
              </div>
            </div>

            {/* Event Type and Color */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_type">Event Type</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value) => handleInputChange('event_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: type.color }}
                          />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Select
                  value={formData.color}
                  onValueChange={(value) => handleInputChange('color', value)}
                >
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: formData.color }}
                        />
                        <span>{colorOptions.find(c => c.value === formData.color)?.label}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center space-x-2">
                          <div className={cn("w-4 h-4 rounded-full", color.color)} />
                          <span>{color.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Event location"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t border-border">
              <div>
                {event && onDelete && (
                  showDeleteConfirm ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-destructive">Delete this event?</span>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'Deleting...' : 'Confirm'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Event
                    </Button>
                  )
                )}
              </div>
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={onClose} className="px-6">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || loading} className="px-6">
                  {isSubmitting || loading ? 'Saving...' : (event ? 'Update Event' : 'Create Event')}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
