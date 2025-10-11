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
import { TestDbConnection } from "@/components/calendar/test-db-connection"
import { useCalendar } from "@/hooks/use-calendar"
import { CalendarEvent, EventFormData, GeneratedSchedule } from "@/types/calendar"

const CalendarPage = () => {
  let calendarHook
  try {
    calendarHook = useCalendar()
  } catch (error) {
    console.error('Error initializing calendar hook:', error)
    return (
      <div className="p-4 space-y-4 dark:bg-gray-900 min-h-screen">
        <Header
          subtitle="Manage your schedule and deadlines with Learningly."
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-destructive mb-2">Calendar Error</h3>
            <p className="text-muted-foreground dark:text-gray-400">There was an error loading the calendar. Please refresh the page.</p>
          </div>
        </div>
      </div>
    )
  }

  const {
    createEvent,
    updateEvent,
    deleteEvent,
    refreshEvents
  } = calendarHook

  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null)
  const [isEventFormOpen, setIsEventFormOpen] = React.useState(false)
  const [isCreatingEvent, setIsCreatingEvent] = React.useState(false)
  const [isListening, setIsListening] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState('calendar')

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
    // Switch to calendar tab to show the generated events
    setActiveTab('calendar')
  }

  const handleIntegrationChange = () => {
    // Refresh events when integrations change
    refreshEvents()
  }

  return (
    <div className="p-4 space-y-4 dark:bg-gray-900 min-h-screen">
      <Header
        subtitle="Manage your schedule and deadlines with Learningly."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 dark:bg-gray-800 dark:border-gray-700">
          <TabsTrigger value="calendar" className="dark:data-[state=active]:bg-gray-700 dark:text-gray-300">Calendar</TabsTrigger>
          <TabsTrigger value="syllabus" className="dark:data-[state=active]:bg-gray-700 dark:text-gray-300">Syllabus Upload</TabsTrigger>
          <TabsTrigger value="voice" className="dark:data-[state=active]:bg-gray-700 dark:text-gray-300">Voice Editor</TabsTrigger>
          <TabsTrigger value="integration" className="dark:data-[state=active]:bg-gray-700 dark:text-gray-300">Integrations</TabsTrigger>
          <TabsTrigger value="settings" className="dark:data-[state=active]:bg-gray-700 dark:text-gray-300">Settings</TabsTrigger>
          <TabsTrigger value="debug" className="dark:data-[state=active]:bg-gray-700 dark:text-gray-300">Debug</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
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
        
        <TabsContent value="debug" className="space-y-6">
          <TestDbConnection />
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
