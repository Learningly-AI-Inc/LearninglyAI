"use client"

import * as React from "react"
import { Mic, MicOff, Square, Play, Pause, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { VoiceCommand } from "@/types/calendar"

interface VoiceEditorProps {
  onCommand: (command: VoiceCommand) => void
  isListening?: boolean
  onStartListening?: () => void
  onStopListening?: () => void
}

export function VoiceEditor({ onCommand, isListening = false, onStartListening, onStopListening }: VoiceEditorProps) {
  const [isSupported, setIsSupported] = React.useState(false)
  const [transcript, setTranscript] = React.useState('')
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [isMuted, setIsMuted] = React.useState(false)
  const [recognition, setRecognition] = React.useState<any>(null)
  
  const { showSuccess, showError } = useToast()

  React.useEffect(() => {
    // Check if speech recognition is supported
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition
      const recognitionInstance = new SpeechRecognition()
      
      recognitionInstance.continuous = true
      recognitionInstance.interimResults = true
      recognitionInstance.lang = 'en-US'
      
      recognitionInstance.onstart = () => {
        console.log('Speech recognition started')
      }
      
      recognitionInstance.onresult = (event: any) => {
        let finalTranscript = ''
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }
        
        setTranscript(finalTranscript + interimTranscript)
        
        if (finalTranscript) {
          processVoiceCommand(finalTranscript)
        }
      }
      
      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        showError(`Voice recognition error: ${event.error}`)
        onStopListening?.()
      }
      
      recognitionInstance.onend = () => {
        console.log('Speech recognition ended')
        onStopListening?.()
      }
      
      setRecognition(recognitionInstance)
      setIsSupported(true)
    } else {
      setIsSupported(false)
    }
  }, [onStopListening, showError])

  const processVoiceCommand = async (text: string) => {
    setIsProcessing(true)
    
    try {
      // Send to AI for command processing
      const response = await fetch('/api/calendar/process-voice-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error('Failed to process voice command')
      }

      const command: VoiceCommand = await response.json()
      
      if (command.action) {
        onCommand(command)
        showSuccess(`Executed: ${text}`)
      } else {
        showError("Command not recognized. Please try a different command")
      }
    } catch (error) {
      console.error('Error processing voice command:', error)
      showError("Error processing command. Please try again")
    } finally {
      setIsProcessing(false)
    }
  }

  const startListening = () => {
    if (recognition && !isListening) {
      setTranscript('')
      recognition.start()
      onStartListening?.()
    }
  }

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop()
      onStopListening?.()
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const getVoiceCommands = () => [
    "Create event [title] on [date] at [time]",
    "Schedule [title] for [date] from [start time] to [end time]",
    "Move [event title] to [new date]",
    "Reschedule [event title] to [new time]",
    "Delete [event title]",
    "Add [title] to my calendar",
    "What's on my schedule for [date]?",
    "Show my events for [date]"
  ]

  if (!isSupported) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mic className="h-5 w-5" />
            <span>Voice Editor</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MicOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Voice editing not supported</h3>
            <p className="text-muted-foreground">
              Your browser doesn't support voice recognition. Please use Chrome or Edge for voice editing.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mic className="h-5 w-5" />
          <span>Voice Editor</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Voice Controls */}
        <div className="flex items-center justify-center space-x-4">
          <Button
            size="lg"
            variant={isListening ? "destructive" : "default"}
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            className="w-16 h-16 rounded-full"
          >
            {isListening ? (
              <Square className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={toggleMute}
            className="w-10 h-10"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Status */}
        <div className="text-center">
          {isListening && (
            <div className="flex items-center justify-center space-x-2 text-primary">
              <div className="animate-pulse w-2 h-2 bg-primary rounded-full"></div>
              <span className="font-medium">Listening...</span>
            </div>
          )}
          
          {isProcessing && (
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Processing command...</span>
            </div>
          )}
        </div>

        {/* Transcript */}
        {transcript && (
          <div className="space-y-2">
            <h4 className="font-medium">Transcript:</h4>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">{transcript}</p>
            </div>
          </div>
        )}

        {/* Voice Commands Help */}
        <div className="space-y-3">
          <h4 className="font-medium">Try saying:</h4>
          <div className="grid grid-cols-1 gap-2">
            {getVoiceCommands().map((command, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {index + 1}
                </Badge>
                <span className="text-sm text-muted-foreground">{command}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Speak clearly and at a normal pace</p>
          <p>• Use specific dates and times (e.g., "tomorrow at 2 PM")</p>
          <p>• Mention event titles clearly</p>
          <p>• Click the microphone to start/stop listening</p>
        </div>
      </CardContent>
    </Card>
  )
}
