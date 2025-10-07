"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Header } from "@/components/ui/header"
import { CalendarView } from "@/components/calendar/calendar-view"
import { EventForm } from "@/components/calendar/event-form"
import { SyllabusUpload } from "@/components/calendar/syllabus-upload"
import { VoiceEditor } from "@/components/calendar/voice-editor"
import { CalendarIntegrationComponent } from "@/components/calendar/calendar-integration"
import { CalendarSettings } from "@/components/calendar/calendar-settings"
import { useCalendar } from "@/hooks/use-calendar"
import { CalendarEvent, EventFormData, GeneratedSchedule } from "@/types/calendar"

const CalendarPage = () => {
  const {
    createEvent,
    updateEvent,
    deleteEvent,
    refreshEvents
  } = useCalendar()

  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null)
  const [isEventFormOpen, setIsEventFormOpen] = React.useState(false)
  const [isCreatingEvent, setIsCreatingEvent] = React.useState(false)
  const [isListening, setIsListening] = React.useState(false)

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsEventFormOpen(true)
  }

  const handleCreateEvent = () => {
    setSelectedEvent(null)
    setIsCreatingEvent(false)
    setIsEventFormOpen(true)
  }

  const handleEventFormClose = () => {
    setIsEventFormOpen(false)
    setIsCreatingEvent(false)
    setSelectedEvent(null)
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

  const handleVoiceCommand = (command: any) => {
    // Process voice commands
    console.log('Voice command received:', command)
    
    // Example: Create event from voice command
    if (command.action === 'create' && command.event_title && command.start_time) {
      const eventData: EventFormData = {
        title: command.event_title,
        start_time: command.start_time,
        end_time: command.end_time || command.start_time,
        all_day: false,
        color: '#3B82F6',
        event_type: 'general',
        location: command.location || '',
        description: command.description || ''
      }
      
      createEvent(eventData)
    }
  }

  const handleScheduleGenerated = (schedule: GeneratedSchedule) => {
    console.log('Schedule generated:', schedule)
    // Refresh events to show the new schedule
    refreshEvents()
  }

  const handleIntegrationChange = () => {
    // Refresh events when integrations change
    refreshEvents()
  }

  return (
    <div className="p-6 space-y-6">
      <Header 
        title="Calendar" 
        subtitle="Manage your academic schedule and deadlines."
      />

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="syllabus">Syllabus Upload</TabsTrigger>
          <TabsTrigger value="voice">Voice Editor</TabsTrigger>
          <TabsTrigger value="integration">Integrations</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          <CalendarView 
            onEventClick={handleEventClick}
            onCreateEvent={handleCreateEvent}
          />
        </TabsContent>

        <TabsContent value="syllabus" className="space-y-6">
          <SyllabusUpload onScheduleGenerated={handleScheduleGenerated} />
        </TabsContent>

        <TabsContent value="voice" className="space-y-6">
          <VoiceEditor 
            onCommand={handleVoiceCommand}
            isListening={isListening}
            onStartListening={() => setIsListening(true)}
            onStopListening={() => setIsListening(false)}
          />
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
        loading={isCreatingEvent}
      />
    </div>
  )
}

export default CalendarPage
