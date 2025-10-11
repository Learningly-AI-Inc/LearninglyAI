"use client"

import * as React from "react"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function DatePicker({ 
  value, 
  onChange, 
  placeholder = "Select date", 
  disabled = false,
  className 
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [currentMonth, setCurrentMonth] = React.useState(value || new Date())
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value)

  React.useEffect(() => {
    if (value) {
      setSelectedDate(value)
      setCurrentMonth(value)
    }
  }, [value])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    onChange?.(date)
    setOpen(false)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1)
      } else {
        newMonth.setMonth(prev.getMonth() + 1)
      }
      return newMonth
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date) => {
    return selectedDate?.toDateString() === date.toDateString()
  }

  const formatDisplayValue = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const daysInMonth = getDaysInMonth(currentMonth)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? formatDisplayValue(selectedDate) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-semibold text-gray-900">
              {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 p-2">
            {days.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 p-2">
            {daysInMonth.map((date, index) => (
              <div key={index} className="text-center">
                {date ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 w-8 p-0 font-normal",
                      isToday(date) && "bg-blue-100 text-blue-900 font-semibold",
                      isSelected(date) && "bg-blue-600 text-white hover:bg-blue-700",
                      !isSelected(date) && !isToday(date) && "hover:bg-gray-100"
                    )}
                    onClick={() => handleDateSelect(date)}
                  >
                    {date.getDate()}
                  </Button>
                ) : (
                  <div className="h-8 w-8" />
                )}
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
