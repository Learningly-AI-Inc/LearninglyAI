"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Header } from "@/components/ui/header"
import { CalendarView } from "@/components/calendar/calendar-view"
import { EventForm } from "@/components/calendar/event-form"
import { SyllabusUpload } from "@/components/calendar/syllabus-upload"
import { CalendarIntegrationComponent } from "@/components/calendar/calendar-integration"
import { CalendarSettings } from "@/components/calendar/calendar-settings"
import { useCalendar } from "@/hooks/use-calendar"
import { CalendarEvent, EventFormData, GeneratedSchedule } from "@/types/calendar"

const CalendarPage = () => {
  // All hooks must be called at the top level unconditionally
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null)
  const [isEventFormOpen, setIsEventFormOpen] = React.useState(false)
  const [isCreatingEvent, setIsCreatingEvent] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState('calendar')
  const [initialEventData, setInitialEventData] = React.useState<Partial<EventFormData> | null>(null)
  
  // Call calendar hook unconditionally - it should handle its own errors internally
  const {
    createEvent,
    updateEvent,
    deleteEvent,
    refreshEvents,
    error: calendarError
  } = useCalendar()

  // Show error UI if calendar failed to load
  if (calendarError) {
    return (
      <div className="p-4 space-y-4">
        <Header 
          subtitle="Manage your schedule and deadlines with Learningly."
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-destructive mb-2">Calendar Error</h3>
            <p className="text-muted-foreground">There was an error loading the calendar. Please refresh the page.</p>
          </div>
        </div>
      </div>
    )
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsEventFormOpen(true)
  }

  const handleCreateEvent = () => {
    setSelectedEvent(null)
    setInitialEventData(null)
    setIsCreatingEvent(false)
    setIsEventFormOpen(true)
  }

  const handleTimeSlotClick = (date: Date, hour: number) => {
    // Create initial event data with the clicked time slot
    const startTime = new Date(date)
    startTime.setHours(hour, 0, 0, 0)

    const endTime = new Date(startTime)
    endTime.setHours(hour + 1, 0, 0, 0)

    setInitialEventData({
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      all_day: false,
      color: '#3B82F6',
      event_type: 'general'
    })
    setSelectedEvent(null)
    setIsCreatingEvent(false)
    setIsEventFormOpen(true)
  }

  const handleEventFormClose = () => {
    setIsEventFormOpen(false)
    setIsCreatingEvent(false)
    setSelectedEvent(null)
    setInitialEventData(null)
  }

  const handleEventSubmit = async (data: EventFormData) => {
    try {
      setIsCreatingEvent(true)
      if (selectedEvent) {
        await updateEvent(selectedEvent.id, data)
      } else {
        await createEvent(data)
      }
      handleEventFormClose()
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsCreatingEvent(false)
    }
  }

  const handleEventDelete = async (eventId: string) => {
    try {
      await deleteEvent(eventId)
      handleEventFormClose()
    } catch (error) {
      // Error handling is done in the hook
    }
  }

  const handleScheduleGenerated = (schedule: GeneratedSchedule) => {
    console.log('Schedule generated:', schedule)
    // Refresh events to show the new schedule
    refreshEvents()
    // Switch to calendar tab to show the generated events
    setActiveTab('calendar')
  }

  const handleIntegrationChange = () => {
    // Refresh events when integrations change
    refreshEvents()
  }

  return (
    <div className="p-4 space-y-4">
      <Header 
        subtitle="Manage your schedule and deadlines with Learningly."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="syllabus">Syllabus Upload</TabsTrigger>
          <TabsTrigger value="integration">Integrations</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <CalendarView
            onEventClick={handleEventClick}
            onCreateEvent={handleCreateEvent}
            onTimeSlotClick={handleTimeSlotClick}
          />
        </TabsContent>

        <TabsContent value="syllabus" className="space-y-6">
          <SyllabusUpload onScheduleGenerated={handleScheduleGenerated} />
        </TabsContent>

        <TabsContent value="integration" className="space-y-6">
          <CalendarIntegrationComponent onIntegrationChange={handleIntegrationChange} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <CalendarSettings />
        </TabsContent>
      </Tabs>

      {/* Event Form Modal */}
      <EventForm
        event={selectedEvent}
        isOpen={isEventFormOpen}
        onClose={handleEventFormClose}
        onSubmit={handleEventSubmit}
        onDelete={handleEventDelete}
        loading={isCreatingEvent}
        initialData={initialEventData}
      />
    </div>
  )
}

export default CalendarPage
