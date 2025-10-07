import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { syllabus_document_id, semester_name, courses } = await request.json()

    if (!syllabus_document_id || !semester_name || !courses) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Calculate semester dates (Fall 2024 example)
    const semesterStartDate = new Date('2024-08-26') // Fall semester start
    const semesterEndDate = new Date('2024-12-13') // Fall semester end

    // Generate events for each course
    const events = []
    const holidays = [
      { name: "Labor Day", date: "2024-09-02", type: "national" },
      { name: "Thanksgiving Break", date: "2024-11-28", type: "academic" },
      { name: "Thanksgiving Break", date: "2024-11-29", type: "academic" }
    ]

    // Generate class events
    courses.forEach((course: any) => {
      course.schedule.forEach((schedule: any) => {
        const startDate = new Date(semesterStartDate)
        const endDate = new Date(semesterEndDate)
        
        // Find the first occurrence of the day of week
        const dayOffset = (schedule.day_of_week - startDate.getDay() + 7) % 7
        startDate.setDate(startDate.getDate() + dayOffset)
        
        // Generate recurring events for the semester
        while (startDate <= endDate) {
          const eventDate = new Date(startDate)
          const startTime = new Date(eventDate)
          const [hours, minutes] = schedule.start_time.split(':')
          startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
          
          const endTime = new Date(eventDate)
          const [endHours, endMinutes] = schedule.end_time.split(':')
          endTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0)
          
          events.push({
            title: course.name,
            description: `${course.code} - ${schedule.type}`,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            all_day: false,
            color: getEventColor(schedule.type),
            location: schedule.location,
            event_type: schedule.type === 'lab' ? 'study' : 'class',
            course_code: course.code,
            recurring_pattern: {
              type: 'weekly',
              interval: 1,
              days_of_week: [schedule.day_of_week],
              end_date: semesterEndDate.toISOString()
            }
          })
          
          // Move to next week
          startDate.setDate(startDate.getDate() + 7)
        }
      })
    })

    // Add exam periods (midterm and final)
    const midtermWeek = new Date(semesterStartDate)
    midtermWeek.setDate(midtermWeek.getDate() + 42) // ~6 weeks into semester
    
    const finalWeek = new Date(semesterEndDate)
    finalWeek.setDate(finalWeek.getDate() - 7) // Week before finals

    courses.forEach((course: any) => {
      // Midterm exam
      const midtermDate = new Date(midtermWeek)
      midtermDate.setDate(midtermDate.getDate() + (course.schedule[0]?.day_of_week || 1))
      
      events.push({
        title: `${course.name} - Midterm Exam`,
        description: `Midterm exam for ${course.code}`,
        start_time: new Date(midtermDate.getTime() + 9 * 60 * 60 * 1000).toISOString(), // 9 AM
        end_time: new Date(midtermDate.getTime() + 11 * 60 * 60 * 1000).toISOString(), // 11 AM
        all_day: false,
        color: '#EF4444',
        location: course.schedule[0]?.location || 'TBD',
        event_type: 'exam',
        course_code: course.code
      })

      // Final exam
      const finalDate = new Date(finalWeek)
      finalDate.setDate(finalDate.getDate() + (course.schedule[0]?.day_of_week || 1))
      
      events.push({
        title: `${course.name} - Final Exam`,
        description: `Final exam for ${course.code}`,
        start_time: new Date(finalDate.getTime() + 9 * 60 * 60 * 1000).toISOString(), // 9 AM
        end_time: new Date(finalDate.getTime() + 11 * 60 * 60 * 1000).toISOString(), // 11 AM
        all_day: false,
        color: '#EF4444',
        location: course.schedule[0]?.location || 'TBD',
        event_type: 'exam',
        course_code: course.code
      })
    })

    // Add assignment due dates (example)
    courses.forEach((course: any) => {
      for (let i = 1; i <= 5; i++) {
        const assignmentDate = new Date(semesterStartDate)
        assignmentDate.setDate(assignmentDate.getDate() + (i * 14)) // Every 2 weeks
        
        events.push({
          title: `${course.name} - Assignment ${i}`,
          description: `Assignment ${i} due for ${course.code}`,
          start_time: new Date(assignmentDate.getTime() + 23 * 60 * 60 * 1000).toISOString(), // 11 PM
          end_time: new Date(assignmentDate.getTime() + 23 * 60 * 60 * 1000).toISOString(),
          all_day: false,
          color: '#F59E0B',
          event_type: 'assignment',
          course_code: course.code
        })
      }
    })

    const scheduleData = {
      courses,
      events,
      semester_info: {
        name: semester_name,
        start_date: semesterStartDate.toISOString(),
        end_date: semesterEndDate.toISOString(),
        holidays
      }
    }

    return NextResponse.json({
      semester_start_date: semesterStartDate.toISOString().split('T')[0],
      semester_end_date: semesterEndDate.toISOString().split('T')[0],
      ...scheduleData
    })

  } catch (error) {
    console.error('Error generating schedule:', error)
    return NextResponse.json(
      { error: 'Failed to generate schedule' },
      { status: 500 }
    )
  }
}

function getEventColor(eventType: string): string {
  const colorMap: { [key: string]: string } = {
    'lecture': '#3B82F6',
    'lab': '#10B981',
    'tutorial': '#8B5CF6',
    'seminar': '#F59E0B'
  }
  return colorMap[eventType] || '#6B7280'
}
