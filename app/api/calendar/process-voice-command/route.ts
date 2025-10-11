import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    // Simple voice command processing
    // In a real implementation, you would use AI/NLP to parse the command
    const command = parseVoiceCommand(text.toLowerCase())

    return NextResponse.json(command)

  } catch (error) {
    console.error('Error processing voice command:', error)
    return NextResponse.json(
      { error: 'Failed to process voice command' },
      { status: 500 }
    )
  }
}

function parseVoiceCommand(text: string) {
  // Create event patterns
  if (text.includes('create') || text.includes('add') || text.includes('schedule')) {
    const title = extractTitle(text)
    const date = extractDate(text)
    const time = extractTime(text)
    
    if (title && date && time) {
      return {
        action: 'create',
        event_title: title,
        start_time: formatDateTime(date, time),
        end_time: formatDateTime(date, addHour(time))
      }
    }
  }

  // Move event patterns
  if (text.includes('move') || text.includes('reschedule')) {
    const title = extractTitle(text)
    const newDate = extractDate(text)
    const newTime = extractTime(text)
    
    if (title && (newDate || newTime)) {
      return {
        action: 'move',
        event_title: title,
        new_date: newDate,
        new_time: newTime
      }
    }
  }

  // Delete event patterns
  if (text.includes('delete') || text.includes('remove') || text.includes('cancel')) {
    const title = extractTitle(text)
    
    if (title) {
      return {
        action: 'delete',
        event_title: title
      }
    }
  }

  // Default response
  return {
    action: null,
    message: 'Command not recognized'
  }
}

function extractTitle(text: string): string | null {
  // Look for patterns like "create [title] on [date]"
  const patterns = [
    /(?:create|add|schedule)\s+(.+?)\s+(?:on|for|at)/i,
    /(?:move|reschedule)\s+(.+?)\s+(?:to|on)/i,
    /(?:delete|remove|cancel)\s+(.+?)(?:\s|$)/i
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  return null
}

function extractDate(text: string): string | null {
  const today = new Date()
  
  // Relative dates
  if (text.includes('today')) {
    return today.toISOString().split('T')[0]
  }
  
  if (text.includes('tomorrow')) {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }
  
  if (text.includes('next week')) {
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)
    return nextWeek.toISOString().split('T')[0]
  }
  
  // Specific dates (simplified)
  const datePattern = /(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/
  const match = text.match(datePattern)
  if (match) {
    const month = parseInt(match[1])
    const day = parseInt(match[2])
    const year = match[3] ? parseInt(match[3]) : today.getFullYear()
    
    const date = new Date(year, month - 1, day)
    return date.toISOString().split('T')[0]
  }

  return null
}

function extractTime(text: string): string | null {
  // Time patterns
  const timePattern = /(\d{1,2}):?(\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?/i
  const match = text.match(timePattern)
  
  if (match) {
    let hours = parseInt(match[1])
    const minutes = match[2] ? parseInt(match[2]) : 0
    const period = match[3]?.toLowerCase()
    
    // Convert to 24-hour format
    if (period === 'pm' || period === 'p.m.') {
      if (hours !== 12) hours += 12
    } else if (period === 'am' || period === 'a.m.') {
      if (hours === 12) hours = 0
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  return null
}

function formatDateTime(date: string, time: string): string {
  return `${date}T${time}:00`
}

function addHour(time: string): string {
  const [hours, minutes] = time.split(':')
  const newHour = (parseInt(hours) + 1) % 24
  return `${newHour.toString().padStart(2, '0')}:${minutes}`
}
