"use client"

import * as React from "react"
import { Clock, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value?: string // Format: "HH:MM"
  onChange?: (time: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  format?: '12h' | '24h'
}

export function TimePicker({ 
  value, 
  onChange, 
  placeholder = "Select time", 
  disabled = false,
  className,
  format = '12h'
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedTime, setSelectedTime] = React.useState<string>(value || '')

  React.useEffect(() => {
    if (value) {
      setSelectedTime(value)
    }
  }, [value])

  // Generate time options
  const generateTimeOptions = () => {
    const options = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        options.push(timeString)
      }
    }
    return options
  }

  const timeOptions = generateTimeOptions()

  const formatTimeDisplay = (time: string) => {
    if (!time) return placeholder
    
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const minute = parseInt(minutes)
    
    if (format === '12h') {
      const period = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      return `${displayHour}:${minutes} ${period}`
    }
    
    return time
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    onChange?.(time)
    setOpen(false)
  }

  const isSelected = (time: string) => {
    return selectedTime === time
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal min-w-0",
            !selectedTime && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="truncate">{formatTimeDisplay(selectedTime)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-32 p-0" align="start">
        <div className="bg-background border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          <div className="p-2">
            {timeOptions.map((time) => {
              const [hours, minutes] = time.split(':')
              const hour = parseInt(hours)
              const minute = parseInt(minutes)
              
              let displayTime = time
              if (format === '12h') {
                const period = hour >= 12 ? 'PM' : 'AM'
                const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
                displayTime = `${displayHour}:${minutes} ${period}`
              }
              
              return (
                <Button
                  key={time}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-left font-normal h-8 px-2 text-sm",
                    isSelected(time) && "bg-primary text-primary-foreground hover:bg-primary/90",
                    !isSelected(time) && "hover:bg-accent"
                  )}
                  onClick={() => handleTimeSelect(time)}
                >
                  <span className="truncate">{displayTime}</span>
                </Button>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
