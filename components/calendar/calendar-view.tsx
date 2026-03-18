"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Grid3X3, List, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/ui/header"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCalendar } from "@/hooks/use-calendar"
import { useCalendarSettings } from "@/hooks/use-calendar-settings"
import { CalendarEvent } from "@/types/calendar"
import { cn } from "@/lib/utils"

interface CalendarViewProps {
  onEventClick?: (event: CalendarEvent) => void
  onCreateEvent?: () => void
  onTimeSlotClick?: (date: Date, hour: number) => void
}

export function CalendarView({ onEventClick, onCreateEvent, onTimeSlotClick }: CalendarViewProps) {
  const calendarHook = useCalendar()
  const { settings } = useCalendarSettings()

  const weekScrollContainerRef = React.useRef<HTMLDivElement | null>(null)
  const dayScrollContainerRef = React.useRef<HTMLDivElement | null>(null)
  const HOUR_BLOCK_HEIGHT = 48 // Tailwind h-12 (12 * 4px)

  // Defensive programming - ensure all functions exist
  if (!calendarHook) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Loading calendar...</div>
        </div>
      </div>
    )
  }

  const {
    events,
    loading,
    view,
    navigateView,
    changeView,
    goToToday,
    getEventsForDate
  } = calendarHook

  // Get week start preference (0 = Sunday, 1 = Monday)
  const weekStartDay = settings?.week_start === 'monday' ? 1 : 0

  const days = weekStartDay === 1
    ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  // Get calendar dates for current view
  const getCalendarDates = () => {
    const year = view.date.getFullYear()
    const month = view.date.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)

    // Adjust start date based on week start preference
    let dayOffset = firstDay.getDay() - weekStartDay
    if (dayOffset < 0) dayOffset += 7
    startDate.setDate(startDate.getDate() - dayOffset)

    const dates = []
    const current = new Date(startDate)

    // Generate 6 weeks of dates
    for (let i = 0; i < 42; i++) {
      dates.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return dates
  }

  const calendarDates = getCalendarDates()
  const today = new Date()
  const currentMonth = view.date.getMonth()
  const currentYear = view.date.getFullYear()

  // Generate year options (current year ± 5 years)
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)

  const handleMonthChange = (monthIndex: string) => {
    const newDate = new Date(view.date)
    newDate.setMonth(parseInt(monthIndex))
    navigateView('set', newDate)
  }

  const handleYearChange = (year: string) => {
    const newDate = new Date(view.date)
    newDate.setFullYear(parseInt(year))
    navigateView('set', newDate)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const use12Hour = settings?.time_format !== '24h'

    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: use12Hour
    })
  }

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString()
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth
  }

  const getEventColor = (color: string) => {
    const colorMap: { [key: string]: string } = {
      '#3B82F6': 'bg-blue-500 hover:bg-blue-600',
      '#1D4ED8': 'bg-blue-600 hover:bg-blue-700',
      '#2563EB': 'bg-blue-600 hover:bg-blue-700',
      '#1E40AF': 'bg-blue-700 hover:bg-blue-800',
      '#EF4444': 'bg-red-500 hover:bg-red-600',
      '#10B981': 'bg-green-500 hover:bg-green-600',
      '#F59E0B': 'bg-yellow-500 hover:bg-yellow-600',
      '#8B5CF6': 'bg-purple-500 hover:bg-purple-600',
      '#EC4899': 'bg-pink-500 hover:bg-pink-600',
      '#6B7280': 'bg-gray-500 hover:bg-gray-600',
    }
    return colorMap[color] || 'bg-blue-500 hover:bg-blue-600'
  }

  // No need for scroll logic anymore - we display hours starting from current time

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                className="border-border"
                onClick={() => navigateView?.('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center space-x-2">
                <Select value={currentMonth.toString()} onValueChange={handleMonthChange}>
                  <SelectTrigger className="w-[130px] h-9 border-blue-300 dark:border-blue-700">
                    <SelectValue>{months[currentMonth]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={currentYear.toString()} onValueChange={handleYearChange}>
                  <SelectTrigger className="w-[90px] h-9 border-blue-300 dark:border-blue-700">
                    <SelectValue>{currentYear}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="icon" 
                className="border-border"
                onClick={() => navigateView?.('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button 
              variant="outline" 
              onClick={goToToday}
              className="text-sm"
            >
              Today
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg p-1">
              <Button
                variant={view.type === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => changeView?.('day')}
                className="h-8 px-3"
              >
                <Clock className="h-4 w-4 mr-1" />
                Day
              </Button>
              <Button
                variant={view.type === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => changeView?.('week')}
                className="h-8 px-3"
              >
                <CalendarIcon className="h-4 w-4 mr-1" />
                Week
              </Button>
              <Button
                variant={view.type === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => changeView?.('month')}
                className="h-8 px-3"
              >
                <Grid3X3 className="h-4 w-4 mr-1" />
                Month
              </Button>
              <Button
                variant={view.type === 'agenda' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => changeView?.('agenda')}
                className="h-8 px-3"
              >
                <List className="h-4 w-4 mr-1" />
                Agenda
              </Button>
            </div>
            
            <Button onClick={onCreateEvent} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {view.type === 'month' && (
            <div className="grid grid-cols-7 gap-px border-l border-t border-border">
              {/* Day headers */}
              {days.map((day) => (
                <div key={day} className="py-3 text-center font-semibold text-blue-700 dark:text-blue-300 border-r border-b border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
                  {day}
                </div>
              ))}
              
              {/* Calendar dates */}
              {calendarDates.map((date, index) => {
                const dayEvents = getEventsForDate?.(date) || []
                const isCurrentDay = isToday(date)
                const isCurrentMonthDay = isCurrentMonth(date)
                
                return (
                  <div
                    key={index}
                    className={cn(
                      "p-2 h-32 border-r border-b border-border relative",
                      !isCurrentMonthDay ? "bg-muted/20" : "bg-background",
                      isCurrentDay && "bg-blue-100 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        "font-semibold text-sm",
                        isCurrentDay ? "text-blue-700 dark:text-blue-300 font-bold" : "text-foreground",
                        !isCurrentMonthDay && "text-muted-foreground"
                      )}>
                        {date.getDate()}
                      </span>
                      {isCurrentDay && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    
                    <div className="space-y-1 overflow-hidden">
                      {dayEvents.slice(0, 3).map((event, eventIndex) => (
                        <div
                          key={eventIndex}
                          className={cn(
                            "text-xs px-2 py-1 rounded text-white cursor-pointer hover:opacity-80 transition-opacity truncate",
                            getEventColor(event.color)
                          )}
                          onClick={() => onEventClick?.(event)}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          
          {view.type === 'week' && (
            <div className="space-y-4">
              <div className="grid grid-cols-8 gap-4">
                <div className="text-sm font-medium text-muted-foreground">Time</div>
                {days.map((day, index) => {
                  // Calculate the start of the week
                  const startOfWeek = new Date(view.date)
                  const currentDay = startOfWeek.getDay()
                  const diff = currentDay - weekStartDay
                  const daysToSubtract = diff >= 0 ? diff : diff + 7
                  startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract)

                  // Add index days to get the current day
                  const dayDate = new Date(startOfWeek)
                  dayDate.setDate(startOfWeek.getDate() + index)

                  return (
                    <div key={day} className="text-center">
                      <div className="text-sm font-medium text-muted-foreground">{day}</div>
                      <div className={cn(
                        "text-lg font-semibold mt-1",
                        isToday(dayDate) ? "text-primary" : "text-foreground"
                      )}>
                        {dayDate.getDate()}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div
                ref={weekScrollContainerRef}
                className="grid grid-cols-8 gap-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-2"
              >
                <div className="space-y-0 sticky left-0 bg-background z-10">
                  {Array.from({ length: 24 }, (_, i) => {
                    // Start from current hour and wrap around
                    const currentHour = new Date().getHours()
                    const displayHour = (currentHour + i) % 24
                    return (
                      <div
                        key={i}
                        data-hour={displayHour}
                        className="h-12 text-xs text-muted-foreground flex items-center border-b border-border"
                      >
                        {displayHour === 0 ? '12 AM' : displayHour < 12 ? `${displayHour} AM` : displayHour === 12 ? '12 PM' : `${displayHour - 12} PM`}
                      </div>
                    )
                  })}
                </div>

                {days.map((_, dayIndex) => {
                  // Calculate the start of the week
                  const startOfWeek = new Date(view.date)
                  const currentDay = startOfWeek.getDay()
                  const diff = currentDay - weekStartDay
                  const daysToSubtract = diff >= 0 ? diff : diff + 7
                  startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract)

                  // Add index days to get the current day
                  const dayDate = new Date(startOfWeek)
                  dayDate.setDate(startOfWeek.getDate() + dayIndex)

                  const dayEvents = getEventsForDate?.(dayDate) || []
                  const currentHourNow = new Date().getHours()

                  return (
                    <div key={dayIndex} className="relative">
                      {/* Time slot grid for clickable hours */}
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = (currentHourNow + i) % 24
                        const slotDate = new Date(dayDate)
                        slotDate.setHours(hour, 0, 0, 0)

                        // Find events that overlap with this hour
                        const hourEvents = dayEvents.filter(event => {
                          const eventStart = new Date(event.start_time)
                          const eventEnd = new Date(event.end_time)
                          const slotEnd = new Date(slotDate)
                          slotEnd.setHours(hour + 1, 0, 0, 0)

                          return eventStart < slotEnd && eventEnd > slotDate
                        })

                        return (
                          <div
                            key={hour}
                            className={cn(
                              "h-12 border-b border-border cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors relative",
                              isToday(dayDate) && "bg-blue-50/50 dark:bg-blue-950/10"
                            )}
                            onClick={() => onTimeSlotClick?.(dayDate, hour)}
                            title={`Click to create event at ${hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}`}
                          >
                            {/* Render events that overlap with this hour */}
                            {hourEvents.map((event, eventIndex) => {
                              const eventStart = new Date(event.start_time)
                              const eventHour = eventStart.getHours()

                              // Only render the event in its starting hour to avoid duplicates
                              if (eventHour !== hour) return null

                              return (
                                <div
                                  key={eventIndex}
                                  className={cn(
                                    "absolute inset-x-0 text-xs p-1.5 rounded text-white cursor-pointer hover:opacity-80 transition-opacity z-10 mx-0.5",
                                    getEventColor(event.color)
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onEventClick?.(event)
                                  }}
                                  style={{
                                    top: `${(eventStart.getMinutes() / 60) * 100}%`,
                                    height: 'auto',
                                    minHeight: '2rem'
                                  }}
                                >
                                  <div className="font-medium truncate text-[10px]">{event.title}</div>
                                  <div className="text-[9px] opacity-90 truncate">
                                    {formatTime(event.start_time)}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
          {view.type === 'day' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold">
                  {view.date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
              </div>
              
              <div
                ref={dayScrollContainerRef}
                className="grid grid-cols-12 gap-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-2"
              >
                <div className="col-span-2 space-y-4 sticky left-0 bg-background z-10">
                  {Array.from({ length: 24 }, (_, i) => {
                    // Start from current hour and wrap around
                    const currentHour = new Date().getHours()
                    const displayHour = (currentHour + i) % 24
                    return (
                      <div
                        key={i}
                        data-hour={displayHour}
                        className="h-12 text-xs text-muted-foreground flex items-center"
                      >
                        {displayHour === 0 ? '12 AM' : displayHour < 12 ? `${displayHour} AM` : displayHour === 12 ? '12 PM' : `${displayHour - 12} PM`}
                      </div>
                    )
                  })}
                </div>
                
                <div className="col-span-10 space-y-1">
                  {(getEventsForDate?.(view.date) || []).map((event, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg text-white cursor-pointer hover:opacity-80 transition-opacity",
                        getEventColor(event.color)
                      )}
                      onClick={() => onEventClick?.(event)}
                    >
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm opacity-90">
                        {formatTime(event.start_time)} - {formatTime(event.end_time)}
                      </div>
                      {event.location && (
                        <div className="text-sm opacity-75 mt-1">📍 {event.location}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {view.type === 'agenda' && (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center space-x-4 p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onEventClick?.(event)}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full",
                    getEventColor(event.color)
                  )}></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">{event.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(event.start_time).toLocaleDateString()} • {formatTime(event.start_time)} - {formatTime(event.end_time)}
                    </div>
                    {event.location && (
                      <div className="text-sm text-muted-foreground">📍 {event.location}</div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {event.event_type}
                  </Badge>
                </div>
              ))}
              
              {events.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No events scheduled</p>
                  <p className="text-sm">Click "Add Event" to get started</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
