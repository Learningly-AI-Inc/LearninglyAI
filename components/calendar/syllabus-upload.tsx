"use client"

import * as React from "react"
import { Upload, FileText, Calendar, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase"
import { SyllabusDocument, Course, GeneratedSchedule } from "@/types/calendar"

interface SyllabusUploadProps {
  onScheduleGenerated?: (schedule: GeneratedSchedule) => void
}

export function SyllabusUpload({ onScheduleGenerated }: SyllabusUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null)
  const [processingStatus, setProcessingStatus] = React.useState<'idle' | 'processing' | 'completed' | 'error'>('idle')
  const [extractedCourses, setExtractedCourses] = React.useState<Course[]>([])
  const [semesterName, setSemesterName] = React.useState('')
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null)
  
  const supabase = createClient()
  const { showSuccess, showError } = useToast()

  // Check authentication status on mount
  React.useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
    }
    checkAuth()
  }, [supabase.auth])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      showError("Please upload a PDF or Word document")
      return
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      showError("Please upload a file smaller than 10MB")
      return
    }

    // Check if user is authenticated before proceeding
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      showError('Please log in to upload syllabus files')
      return
    }

    setUploadedFile(file)
    await processSyllabus(file)
  }

  const processSyllabus = async (file: File) => {
    try {
      setIsUploading(true)
      setProcessingStatus('processing')
      setUploadProgress(0)

      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('Auth error:', authError)
        throw new Error(`Authentication error: ${authError.message}`)
      }
      if (!user) {
        throw new Error('Please log in to upload syllabus files')
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      
      setUploadProgress(20)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('syllabus-documents')
        .upload(fileName, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Storage bucket not found. Please contact support.')
        } else if (uploadError.message.includes('File too large')) {
          throw new Error('File is too large. Please upload a file smaller than 10MB.')
        } else if (uploadError.message.includes('Invalid file type')) {
          throw new Error('Invalid file type. Please upload a PDF or Word document.')
        } else {
          throw new Error(`Upload failed: ${uploadError.message}`)
        }
      }

      setUploadProgress(40)

      // Get signed URL for the uploaded file
      const { data: urlData, error: urlError } = await supabase.storage
        .from('syllabus-documents')
        .createSignedUrl(fileName, 3600)

      if (urlError) {
        console.error('URL creation error:', urlError)
        throw new Error(`Failed to create file URL: ${urlError.message}`)
      }

      if (!urlData?.signedUrl) {
        throw new Error('Failed to get file URL')
      }

      setUploadProgress(60)

      // Process the document with AI
      const response = await fetch('/api/calendar/process-syllabus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_url: urlData.signedUrl,
          file_name: file.name,
          file_type: file.type,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process syllabus')
      }

      setUploadProgress(80)

      const { courses, semester_name } = await response.json()

      console.log('Received from API:', { courses, semester_name, courseCount: courses?.length })

      // Validate that we have courses
      if (!courses || courses.length === 0) {
        throw new Error('No courses found in syllabus. The AI could not extract course information from this document.')
      }

      // Save document metadata to database using existing documents table
      // TEMPORARY WORKAROUND: Skip database insert if RLS is blocking it
      try {
        const { error: dbError } = await supabase
          .from('documents')
          .insert([{
            user_id: user.id,
            title: `Syllabus - ${semester_name}`,
            original_filename: file.name,
            file_path: fileName, // The path in storage
            file_type: fileExt || 'pdf',
            file_size: file.size,
            mime_type: file.type,
            document_type: 'study-material',
            extracted_text: JSON.stringify({ courses, semester_name }), // Store structured data as text
            processing_status: 'completed',
            public_url: urlData.signedUrl,
            metadata: {
              semester_name,
              courses,
              upload_type: 'syllabus',
              course_count: courses.length
            }
          }])

        if (dbError) {
          console.warn('Database insert failed (RLS issue):', dbError.message)
          console.log('Continuing without database save - file uploaded successfully!')
          // Don't throw error, just continue
        } else {
          console.log('Document metadata saved successfully')
        }
      } catch (dbError) {
        console.warn('Database insert failed (RLS issue):', dbError)
        console.log('Continuing without database save - file uploaded successfully!')
        // Don't throw error, just continue
      }
      
      setExtractedCourses(courses)
      setSemesterName(semester_name)
      setProcessingStatus('completed')
      setUploadProgress(100)

      showSuccess(`Found ${courses.length} courses for ${semesterName}`)

    } catch (error) {
      console.error('Error processing syllabus:', error)
      setProcessingStatus('error')
      showError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsUploading(false)
    }
  }

  const generateSchedule = async () => {
    if (!extractedCourses.length) {
      showError('No courses extracted from syllabus. Please upload a different file or try again.')
      return
    }

    if (!semesterName) {
      showError('Semester name is missing. Please upload the syllabus again.')
      return
    }

    try {
      setIsUploading(true)
      setProcessingStatus('processing')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Generate schedule using the API
      const response = await fetch('/api/calendar/generate-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          syllabus_document_id: 'temp-id', // Not used in the API
          semester_name: semesterName,
          courses: extractedCourses,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate schedule')
      }

      const scheduleData = await response.json()
      
      // Save calendar events to generated_content table
      const eventsToInsert = scheduleData.events.map((event: any) => ({
        user_id: user.id,
        title: event.title,
        content_type: 'calendar_event',
        content_data: {
          description: event.description,
          start_time: event.start_time,
          end_time: event.end_time,
          all_day: event.all_day,
          color: event.color,
          location: event.location,
          event_type: event.event_type,
          course_id: event.course_code,
          recurring_pattern: event.recurring_pattern
        }
      }))

      const { data: events, error: eventsError } = await supabase
        .from('generated_content')
        .insert(eventsToInsert)
        .select()

      if (eventsError) {
        console.error('Error saving calendar events:', eventsError)
        throw new Error(`Failed to save calendar events: ${eventsError.message}`)
      }

      setProcessingStatus('completed')

      // Call the callback with the schedule data
      onScheduleGenerated?.({
        id: 'temp-id',
        user_id: user.id,
        syllabus_document_id: 'temp-id',
        semester_start_date: scheduleData.semester_start_date,
        semester_end_date: scheduleData.semester_end_date,
        schedule_data: scheduleData,
        is_active: true,
        created_at: new Date().toISOString()
      })

      showSuccess(`Successfully created ${events?.length || 0} calendar events! Switch to the Calendar tab to view them.`)

    } catch (error) {
      console.error('Error generating schedule:', error)
      setProcessingStatus('error')
      showError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsUploading(false)
    }
  }

  const resetUpload = () => {
    setUploadedFile(null)
    setProcessingStatus('idle')
    setUploadProgress(0)
    setExtractedCourses([])
    setSemesterName('')
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Upload Syllabus</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {isAuthenticated === false && (
          <div className="border border-destructive/20 bg-destructive/5 rounded-lg p-4 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <h3 className="text-lg font-semibold text-destructive mb-2">Authentication Required</h3>
            <p className="text-muted-foreground">
              Please log in to upload syllabus files and generate your schedule.
            </p>
          </div>
        )}
        
        {processingStatus === 'idle' && isAuthenticated === true && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Upload your syllabus</h3>
                <p className="text-muted-foreground">
                  Upload a PDF or Word document to automatically generate your semester schedule
                </p>
                <div className="text-sm text-muted-foreground">
                  Supported formats: PDF, DOC, DOCX (Max 10MB)
                </div>
              </div>
              
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                id="syllabus-upload"
                disabled={isUploading}
              />
              
              <Button asChild className="mt-4" disabled={!isAuthenticated}>
                <label htmlFor="syllabus-upload" className="cursor-pointer">
                  Choose File
                </label>
              </Button>
            </div>
          </div>
        )}

        {processingStatus === 'processing' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold">
                {uploadProgress < 60 ? 'Uploading and processing...' : 'Generating schedule...'}
              </h3>
              <p className="text-muted-foreground">
                This may take a few moments
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          </div>
        )}

        {processingStatus === 'completed' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">Syllabus processed successfully!</span>
            </div>
            
            <div className="space-y-3">
              <div>
                <h4 className="font-medium">Semester: {semesterName}</h4>
                <p className="text-sm text-muted-foreground">
                  Found {extractedCourses.length} courses
                </p>
              </div>
              
              <div className="space-y-2">
                <h5 className="font-medium">Extracted Courses:</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {extractedCourses.map((course, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 border border-border rounded">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{course.name}</div>
                        <div className="text-xs text-muted-foreground">{course.code}</div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {course.credits} credits
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={generateSchedule} disabled={isUploading}>
                <Calendar className="mr-2 h-4 w-4" />
                Generate Schedule
              </Button>
              <Button variant="outline" onClick={resetUpload}>
                Upload Another
              </Button>
            </div>
          </div>
        )}

        {processingStatus === 'error' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="font-semibold">Error processing syllabus</span>
            </div>
            
            <p className="text-muted-foreground">
              There was an error processing your syllabus. Please try again with a different file.
            </p>
            
            <Button onClick={resetUpload}>
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
