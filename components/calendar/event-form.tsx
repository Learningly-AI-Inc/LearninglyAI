"use client"

import * as React from "react"
import { X, Calendar as CalendarIcon, Clock, MapPin, Tag, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { CalendarEvent, EventFormData } from "@/types/calendar"
import { cn } from "@/lib/utils"

interface EventFormProps {
  event?: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: EventFormData) => Promise<void>
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

export function EventForm({ event, isOpen, onClose, onSubmit, loading = false }: EventFormProps) {
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

  const [errors, setErrors] = React.useState<{ [key: string]: string }>({})

  // Initialize form data when event changes
  React.useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        start_time: new Date(event.start_time).toISOString().slice(0, 16),
        end_time: new Date(event.end_time).toISOString().slice(0, 16),
        all_day: event.all_day,
        color: event.color,
        location: event.location || '',
        event_type: event.event_type,
      })
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
    }
    setErrors({})
  }, [event])

  const handleInputChange = (field: keyof EventFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!formData.start_time) {
      newErrors.start_time = 'Start time is required'
    }

    if (!formData.end_time) {
      newErrors.end_time = 'End time is required'
    }

    if (formData.start_time && formData.end_time) {
      const start = new Date(formData.start_time)
      const end = new Date(formData.end_time)
      
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
      await onSubmit(formData)
      onClose()
    } catch (error) {
      // Error handling is done in the parent component
    }
  }

  const handleAllDayChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, all_day: checked }))
    
    if (checked) {
      // Set times to start and end of day
      const startDate = formData.start_time ? new Date(formData.start_time) : new Date()
      const endDate = new Date(startDate)
      endDate.setHours(23, 59, 59, 999)
      
      setFormData(prev => ({
        ...prev,
        start_time: startDate.toISOString().slice(0, 16),
        end_time: endDate.toISOString().slice(0, 16),
      }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {event ? 'Edit Event' : 'Create Event'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start {formData.all_day ? 'Date' : 'Date & Time'} *</Label>
                <Input
                  id="start_time"
                  type={formData.all_day ? 'date' : 'datetime-local'}
                  value={formData.start_time}
                  onChange={(e) => handleInputChange('start_time', e.target.value)}
                  className={errors.start_time ? 'border-destructive' : ''}
                />
                {errors.start_time && (
                  <p className="text-sm text-destructive">{errors.start_time}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time">End {formData.all_day ? 'Date' : 'Date & Time'} *</Label>
                <Input
                  id="end_time"
                  type={formData.all_day ? 'date' : 'datetime-local'}
                  value={formData.end_time}
                  onChange={(e) => handleInputChange('end_time', e.target.value)}
                  className={errors.end_time ? 'border-destructive' : ''}
                />
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
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : (event ? 'Update Event' : 'Create Event')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
