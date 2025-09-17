"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Bot, 
  Sparkles, 
  FileText, 
  Clock, 
  Play, 
  CheckCircle,
  AlertCircle,
  Download,
  Brain,
  Target,
  X
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useGlobalLoading } from "@/hooks/use-global-loading"
import jsPDF from 'jspdf'
import JSZip from 'jszip'

// Unicode-safe base64 encoding function
const encodeUnicodeToBase64 = (str: string): string => {
  try {
    // First encode to UTF-8 bytes, then to base64
    return btoa(unescape(encodeURIComponent(str)))
  } catch (error) {
    console.error('Error encoding to base64:', error)
    // Fallback: remove non-ASCII characters and try again
    const asciiStr = str.replace(/[^\x00-\x7F]/g, '')
    return btoa(asciiStr)
  }
}

interface QuestionGenerationParams {
  examTitle: string
  questionCount: number
  examLength: number // in minutes
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
  customInstructions?: string
  questionSets: number // number of different question sets to generate
}

interface GenerationSession {
  id: string
  status: 'idle' | 'generating' | 'completed' | 'error'
  progress: number
  currentStep: string
  result?: {
    pdfUrl: string
    questionCount: number
    fileSize: number
    examData: any
    allExams?: any[]
    totalSets?: number
    downloadType?: 'single' | 'zip'
  }
}

interface QuestionGenerationPanelProps {
  uploadedSampleQuestions: any[]
  uploadedLearningMaterials: any[]
  selectedSampleQuestions: string[]
  selectedLearningMaterials: string[]
}

export function QuestionGenerationPanel({ 
  uploadedSampleQuestions, 
  uploadedLearningMaterials,
  selectedSampleQuestions,
  selectedLearningMaterials
}: QuestionGenerationPanelProps) {
  const [currentSession, setCurrentSession] = React.useState<GenerationSession | null>(null)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const { setGenerating, updateProgress, clearGeneration } = useGlobalLoading()

  const cancelGeneration = () => {
    setCurrentSession(null)
    setIsGenerating(false)
    clearGeneration()
    toast({
      title: "Generation Cancelled",
      description: "Exam generation has been cancelled.",
    })
  }

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<QuestionGenerationParams>({
    defaultValues: {
      examTitle: '',
      questionCount: 10,
      examLength: 60,
      difficulty: 'medium',
      customInstructions: '',
      questionSets: 1
    }
  })

  const watchedQuestionCount = watch('questionCount')
  const watchedExamLength = watch('examLength')
  const watchedQuestionSets = watch('questionSets')

  const startGeneration = async (params: QuestionGenerationParams) => {
    const sessionId = Math.random().toString(36).substr(2, 9)
    
    const newSession: GenerationSession = {
      id: sessionId,
      status: 'generating',
      progress: 0,
      currentStep: 'Initializing AI agents...'
    }

    setCurrentSession(newSession)
    setIsGenerating(true)
    setGenerating(true, sessionId)

    try {
      // Update progress
      setCurrentSession(prev => prev ? {
        ...prev,
        progress: 20,
        currentStep: 'Preparing files for analysis...'
      } : null)
      updateProgress(20, 'Preparing files for analysis...')

      // Get file URLs from selected files
      const selectedFiles = [
        ...uploadedSampleQuestions.filter(f => selectedSampleQuestions.includes(f.id)),
        ...uploadedLearningMaterials.filter(f => selectedLearningMaterials.includes(f.id))
      ]

      const filesForAPI = selectedFiles.map(file => ({
        url: file.extracted_content ? `data:text/plain;base64,${encodeUnicodeToBase64(file.extracted_content)}` : '',
        name: file.name,
        category: file.category || (uploadedSampleQuestions.includes(file) ? 'sample_questions' : 'learning_materials')
      }))

      setCurrentSession(prev => prev ? {
        ...prev,
        progress: 40,
        currentStep: 'Sending request to AI...'
      } : null)
      updateProgress(40, 'Sending request to AI...')

      // Call the real API
      const response = await fetch('/api/exam-prep/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: filesForAPI,
          config: {
            numMCQ: params.questionCount,
            examDuration: params.examLength,
            difficulty: params.difficulty,
            examTitle: params.examTitle,
            additionalInstructions: params.customInstructions || '',
            numExams: params.questionSets,
            examType: 'full-length'
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Generation failed: ${response.statusText}`)
      }

      setCurrentSession(prev => prev ? {
        ...prev,
        progress: 80,
        currentStep: 'Processing AI response...'
      } : null)
      updateProgress(80, 'Processing AI response...')

      const result = await response.json()

      setCurrentSession(prev => prev ? {
        ...prev,
        progress: 95,
        currentStep: 'Creating PDFs...'
      } : null)
      updateProgress(95, 'Creating PDFs...')

      // Generate PDFs from all exam data
      const allExams = result.exams || []
      const examFiles: Array<{
        questionsBlob: Blob;
        answerKeyBlob: Blob;
        examData: any;
        title: string;
      }> = []
      
      for (let i = 0; i < allExams.length; i++) {
        const examData = allExams[i]
        const questionsBlob = await generateQuestionsPDF(examData)
        const answerKeyBlob = await generateAnswerKeyPDF(examData)
        
        examFiles.push({
          questionsBlob: questionsBlob,
          answerKeyBlob: answerKeyBlob,
          examData: examData,
          title: examData.examTitle || `Exam Set ${i + 1}`
        })
      }

      // Create zip file if multiple exam sets, otherwise use single PDFs
      let downloadUrl: string
      let fileSize: number
      let downloadType: 'single' | 'zip'

      if (allExams.length > 1) {
        // Create zip file with all exam sets (questions and answer keys separate)
        const zip = new JSZip()
        
        for (let i = 0; i < examFiles.length; i++) {
          const exam = examFiles[i]
          const baseFilename = exam.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
          
          // Add questions PDF
          const questionsFilename = `${baseFilename}_set_${i + 1}_question.pdf`
          zip.file(questionsFilename, exam.questionsBlob)
          
          // Add answer key PDF
          const answerKeyFilename = `${baseFilename}_set_${i + 1}_answer.pdf`
          zip.file(answerKeyFilename, exam.answerKeyBlob)
        }

        // Generate zip file
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        downloadUrl = URL.createObjectURL(zipBlob)
        fileSize = zipBlob.size
        downloadType = 'zip'
      } else {
        // Single exam - use first exam's questions PDF as main download
        const mainExam = examFiles[0]
        downloadUrl = URL.createObjectURL(mainExam.questionsBlob)
        fileSize = mainExam.questionsBlob.size
        downloadType = 'single'
      }

      setCurrentSession(prev => prev ? {
        ...prev,
        progress: 100,
        currentStep: 'Exams generated successfully!',
        status: 'completed',
        result: {
          pdfUrl: downloadUrl,
          questionCount: examFiles[0].examData.questions.length,
          fileSize: fileSize,
          examData: examFiles[0].examData,
          allExams: examFiles,
          totalSets: allExams.length,
          downloadType: downloadType
        }
      } : null)
      updateProgress(100, 'Exams generated successfully!')

      toast({
        title: "Exams Generated Successfully!",
        description: `Generated ${allExams.length} question set${allExams.length > 1 ? 's' : ''} with ${examFiles[0].examData.questions.length} questions each.`,
      })

    } catch (error) {
      setCurrentSession(prev => prev ? {
        ...prev,
        status: 'error',
        currentStep: 'Generation failed',
      } : null)
      updateProgress(0, 'Generation failed')

      toast({
        title: "Generation Failed",
        description: `An error occurred during exam generation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
      // Clear global loading after a short delay to show completion/error state
      setTimeout(() => {
        clearGeneration()
      }, 2000)
    }
  }

  const onSubmit = (data: QuestionGenerationParams) => {
    // Check if user has selected files
    if (selectedSampleQuestions.length === 0 && selectedLearningMaterials.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select sample questions and/or learning materials before generating an exam.",
        variant: "destructive"
      })
      return
    }

    startGeneration(data)
  }

  const resetSession = () => {
    setCurrentSession(null)
    setIsGenerating(false)
  }

  const generateQuestionsPDF = async (examData: any): Promise<Blob> => {
    // Create a new PDF document for questions only
    const doc = new jsPDF()
    
    // Set document properties
    doc.setProperties({
      title: `${examData.examTitle || 'Generated Exam'} - Questions`,
      subject: 'AI-Generated Exam Questions',
      author: 'Learningly AI',
      creator: 'Learningly AI Exam Generator'
    })
    
    // Set font and initial position
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    
    // Add title
    doc.text(examData.examTitle || 'Generated Exam', 20, 30)
    
    // Add exam info
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Duration: ${examData.duration} minutes`, 20, 45)
    doc.text(`Questions: ${examData.questions.length}`, 20, 55)
    
    // Add instructions
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Instructions:', 20, 75)
    doc.setFont('helvetica', 'normal')
    
    const instructions = examData.instructions || 'Please read each question carefully and select the best answer. Choose only one answer per question.'
    const instructionLines = doc.splitTextToSize(instructions, 170)
    doc.text(instructionLines, 20, 85)
    
    // Add questions
    let yPosition = 105
    const questions = examData.questions || []
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }
      
      // Add question number and type
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(`Question ${i + 1} (${question.type?.toUpperCase() || 'MCQ'}):`, 20, yPosition)
      yPosition += 10
      
      // Add question text
      doc.setFont('helvetica', 'normal')
      const questionLines = doc.splitTextToSize(question.question, 170)
      doc.text(questionLines, 20, yPosition)
      yPosition += questionLines.length * 5 + 5
      
      // Add options for MCQ
      if (question.type === 'mcq' && question.options) {
        question.options.forEach((option: string, optIndex: number) => {
          if (yPosition > 250) {
            doc.addPage()
            yPosition = 20
          }
          // Check if option already has A, B, C, D prefix
          if (option.match(/^[A-D]\.\s/)) {
            doc.text(option, 30, yPosition)
          } else {
            doc.text(`${String.fromCharCode(65 + optIndex)}. ${option}`, 30, yPosition)
          }
          yPosition += 6
        })
      }
      
      // Add options for true/false
      if (question.type === 'true_false') {
        if (yPosition > 250) {
          doc.addPage()
          yPosition = 20
        }
        doc.text('A. True', 30, yPosition)
        yPosition += 6
        doc.text('B. False', 30, yPosition)
        yPosition += 6
      }
      
      // Add answer space for written questions
      if (['short_answer', 'essay', 'fill_blank', 'code_writing', 'numerical'].includes(question.type)) {
        if (yPosition > 250) {
          doc.addPage()
          yPosition = 20
        }
        
        let answerLabel = 'Answer:'
        if (question.type === 'fill_blank') answerLabel = 'Fill in the blank:'
        if (question.type === 'code_writing') answerLabel = `Write your code (${question.codeLanguage || 'any language'}):`
        if (question.type === 'numerical') answerLabel = 'Numerical Answer:'
        
        doc.setFont('helvetica', 'bold')
        doc.text(answerLabel, 20, yPosition)
        yPosition += 10
        
        // Add answer space
        const answerSpaceHeight = question.type === 'essay' ? 40 : question.type === 'code_writing' ? 30 : 15
        doc.rect(20, yPosition, 170, answerSpaceHeight)
        yPosition += answerSpaceHeight + 10
      }
      
      yPosition += 5 // Space between questions
    }
    
    // Add footer
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Generated by Learningly AI', 20, 290)
      doc.text(`Page ${i} of ${pageCount}`, 170, 290)
    }
    
    // Return the PDF as a blob
    return doc.output('blob')
  }

  const generateAnswerKeyPDF = async (examData: any): Promise<Blob> => {
    // Create a new PDF document for answer key only
    const doc = new jsPDF()
    
    // Set document properties
    doc.setProperties({
      title: `${examData.examTitle || 'Generated Exam'} - Answer Key`,
      subject: 'AI-Generated Exam Answer Key',
      author: 'Learningly AI',
      creator: 'Learningly AI Exam Generator'
    })
    
    // Set font and initial position
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    
    // Add title
    doc.text(`${examData.examTitle || 'Generated Exam'} - Answer Key`, 20, 30)
    
    // Add exam info
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Duration: ${examData.duration} minutes`, 20, 45)
    doc.text(`Questions: ${examData.questions.length}`, 20, 55)
    
    // Add answer key instructions
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Answer Key:', 20, 75)
    doc.setFont('helvetica', 'normal')
    doc.text('Correct answers and explanations for all questions:', 20, 85)
    
    // Add answers for each question
    let yPosition = 105
    const questions = examData.questions || []
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }
      
      // Add question number and correct answer
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(`Question ${i + 1}:`, 20, yPosition)
      yPosition += 10
      
      // Add correct answer
      doc.setFont('helvetica', 'normal')
      let correctAnswer = question.correctAnswer || 'Answer not provided'
      
      // Format the answer based on question type
      if (question.type === 'mcq' && question.options) {
        const answerIndex = question.correctAnswer
        if (answerIndex && question.options[answerIndex]) {
          correctAnswer = `${answerIndex}. ${question.options[answerIndex]}`
        } else if (typeof answerIndex === 'string' && ['A', 'B', 'C', 'D'].includes(answerIndex)) {
          const index = answerIndex.charCodeAt(0) - 65
          if (question.options[index]) {
            correctAnswer = `${answerIndex}. ${question.options[index]}`
          }
        }
      } else if (question.type === 'true_false') {
        correctAnswer = question.correctAnswer === 'true' ? 'A. True' : 'B. False'
      }
      
      const answerLines = doc.splitTextToSize(`Answer: ${correctAnswer}`, 170)
      doc.text(answerLines, 30, yPosition)
      yPosition += answerLines.length * 5 + 5
      
      // Add explanation if available
      if (question.explanation) {
        doc.setFont('helvetica', 'bold')
        doc.text('Explanation:', 30, yPosition)
        yPosition += 8
        
        doc.setFont('helvetica', 'normal')
        const explanationLines = doc.splitTextToSize(question.explanation, 160)
        doc.text(explanationLines, 30, yPosition)
        yPosition += explanationLines.length * 5 + 10
      } else {
        yPosition += 5
      }
    }
    
    // Add footer
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Generated by Learningly AI', 20, 290)
      doc.text(`Page ${i} of ${pageCount}`, 170, 290)
    }
    
    // Return the PDF as a blob
    return doc.output('blob')
  }

  const generatePDFFromExam = async (examData: any): Promise<Blob> => {
    // Create a new PDF document
    const doc = new jsPDF()
    
    // Set document properties
    doc.setProperties({
      title: examData.examTitle || 'Generated Exam',
      subject: 'AI-Generated Exam',
      author: 'Learningly AI',
      creator: 'Learningly AI Exam Generator'
    })
    
    // Set font and initial position
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    
    // Add title
    doc.text(examData.examTitle || 'Generated Exam', 20, 30)
    
    // Add exam info
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Duration: ${examData.duration} minutes`, 20, 45)
    doc.text(`Questions: ${examData.questions.length}`, 20, 55)
    
    // Add instructions
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Instructions:', 20, 75)
    doc.setFont('helvetica', 'normal')
    
    const instructions = examData.instructions || 'Please read each question carefully and select the best answer. Choose only one answer per question.'
    const instructionLines = doc.splitTextToSize(instructions, 170)
    doc.text(instructionLines, 20, 85)
    
    // Add questions
    let yPosition = 105
    const questions = examData.questions || []
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }
      
      // Add question number and type
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(`Question ${i + 1} (${question.type?.toUpperCase() || 'MCQ'}):`, 20, yPosition)
      yPosition += 10
      
      // Add question text
      doc.setFont('helvetica', 'normal')
      const questionLines = doc.splitTextToSize(question.question, 170)
      doc.text(questionLines, 20, yPosition)
      yPosition += questionLines.length * 5 + 5
      
      // Add options for MCQ
      if (question.type === 'mcq' && question.options) {
        question.options.forEach((option: string, optIndex: number) => {
          if (yPosition > 250) {
            doc.addPage()
            yPosition = 20
          }
          // Check if option already has A, B, C, D prefix
          if (option.match(/^[A-D]\.\s/)) {
            doc.text(option, 30, yPosition)
          } else {
            doc.text(`${String.fromCharCode(65 + optIndex)}. ${option}`, 30, yPosition)
          }
          yPosition += 6
        })
      }
      
      // Add options for true/false
      if (question.type === 'true_false') {
        if (yPosition > 250) {
          doc.addPage()
          yPosition = 20
        }
        doc.text('A. True', 30, yPosition)
        yPosition += 6
        doc.text('B. False', 30, yPosition)
        yPosition += 6
      }
      
      // Add answer space for written questions
      if (['short_answer', 'essay', 'fill_blank', 'code_writing', 'numerical'].includes(question.type)) {
        if (yPosition > 250) {
          doc.addPage()
          yPosition = 20
        }
        
        let answerLabel = 'Answer:'
        if (question.type === 'fill_blank') answerLabel = 'Fill in the blank:'
        if (question.type === 'code_writing') answerLabel = `Write your code (${question.codeLanguage || 'any language'}):`
        if (question.type === 'numerical') answerLabel = 'Numerical Answer:'
        
        doc.setFont('helvetica', 'bold')
        doc.text(answerLabel, 20, yPosition)
        yPosition += 10
        
        // Add answer space
        const answerSpaceHeight = question.type === 'essay' ? 40 : question.type === 'code_writing' ? 30 : 15
        doc.rect(20, yPosition, 170, answerSpaceHeight)
        yPosition += answerSpaceHeight + 10
      }
      
      yPosition += 5 // Space between questions
    }
    
    // Add a new page for the answer key
    doc.addPage()
    yPosition = 20
    
    // Add Answer Key header
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('ANSWER KEY', 20, yPosition)
    yPosition += 20
    
    // Add answer key instructions
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Correct answers and explanations for all questions:', 20, yPosition)
    yPosition += 15
    
    // Add answers for each question
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }
      
      // Add question number and correct answer
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(`Question ${i + 1}:`, 20, yPosition)
      yPosition += 10
      
      // Add correct answer
      doc.setFont('helvetica', 'normal')
      let correctAnswer = question.correctAnswer || 'Answer not provided'
      
      // Format the answer based on question type
      if (question.type === 'mcq' && question.options) {
        const answerIndex = question.correctAnswer
        if (answerIndex && question.options[answerIndex]) {
          correctAnswer = `${answerIndex}. ${question.options[answerIndex]}`
        } else if (typeof answerIndex === 'string' && ['A', 'B', 'C', 'D'].includes(answerIndex)) {
          const index = answerIndex.charCodeAt(0) - 65
          if (question.options[index]) {
            correctAnswer = `${answerIndex}. ${question.options[index]}`
          }
        }
      } else if (question.type === 'true_false') {
        correctAnswer = question.correctAnswer === 'true' ? 'A. True' : 'B. False'
      }
      
      const answerLines = doc.splitTextToSize(`Answer: ${correctAnswer}`, 170)
      doc.text(answerLines, 30, yPosition)
      yPosition += answerLines.length * 5 + 5
      
      // Add explanation if available
      if (question.explanation) {
        doc.setFont('helvetica', 'bold')
        doc.text('Explanation:', 30, yPosition)
        yPosition += 8
        
        doc.setFont('helvetica', 'normal')
        const explanationLines = doc.splitTextToSize(question.explanation, 160)
        doc.text(explanationLines, 30, yPosition)
        yPosition += explanationLines.length * 5 + 10
      } else {
        yPosition += 5
      }
    }
    
    // Add footer
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Generated by Learningly AI', 20, 290)
      doc.text(`Page ${i} of ${pageCount}`, 170, 290)
    }
    
    // Return the PDF as a blob
    return doc.output('blob')
  }

  const handleDownload = () => {
    if (currentSession?.result?.pdfUrl) {
      const link = document.createElement('a')
      link.href = currentSession.result.pdfUrl
      
      // Generate appropriate filename based on download type
      let filename: string
      if (currentSession.result.downloadType === 'zip') {
        const baseTitle = currentSession.result.examData?.examTitle || 'Generated Exam'
        filename = `${baseTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_exam_sets.zip`
      } else {
        filename = `${currentSession.result.examData?.examTitle || 'Generated Exam'}_question.pdf`
      }
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      const downloadType = currentSession.result.downloadType === 'zip' ? 'ZIP file' : 'Questions PDF'
      toast({
        title: "Download Started",
        description: `Your exam ${downloadType} is being downloaded.`,
      })
    }
  }

  const handleDownloadAnswerKey = () => {
    if (currentSession?.result?.allExams?.[0]?.answerKeyBlob) {
      const answerKeyBlob = currentSession.result.allExams[0].answerKeyBlob
      const url = URL.createObjectURL(answerKeyBlob)
      
      const link = document.createElement('a')
      link.href = url
      const filename = `${currentSession.result.examData?.examTitle || 'Generated Exam'}_answer.pdf`
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up the URL
      URL.revokeObjectURL(url)
      
      toast({
        title: "Download Started",
        description: "Your answer key PDF is being downloaded.",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Uploaded Files Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Uploaded Materials
          </CardTitle>
          <CardDescription>
            Status of your uploaded sample questions and learning materials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <Bot className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium">Sample Questions</h4>
                <p className="text-sm text-gray-600">
                  {uploadedSampleQuestions.length} uploaded • {selectedSampleQuestions.length} selected
                </p>
                {selectedSampleQuestions.length === 0 && uploadedSampleQuestions.length > 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    Select files for generation
                  </p>
                )}
                {uploadedSampleQuestions.length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    Upload sample questions to analyze patterns
                  </p>
                )}
              </div>
              <Badge variant={selectedSampleQuestions.length > 0 ? "default" : "secondary"} className="flex-shrink-0">
                {selectedSampleQuestions.length > 0 ? `${selectedSampleQuestions.length} Selected` : "None Selected"}
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-green-50 rounded-lg">
              <Brain className="h-6 w-6 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium">Learning Materials</h4>
                <p className="text-sm text-gray-600">
                  {uploadedLearningMaterials.length} uploaded • {selectedLearningMaterials.length} selected
                </p>
                {selectedLearningMaterials.length === 0 && uploadedLearningMaterials.length > 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    Select files for generation
                  </p>
                )}
                {uploadedLearningMaterials.length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    Upload learning materials for content analysis
                  </p>
                )}
              </div>
              <Badge variant={selectedLearningMaterials.length > 0 ? "default" : "secondary"} className="flex-shrink-0">
                {selectedLearningMaterials.length > 0 ? `${selectedLearningMaterials.length} Selected` : "None Selected"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exam Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Exam Parameters
          </CardTitle>
          <CardDescription>
            Configure your exam settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Exam Title - Full Width */}
                <div>
                  <Label htmlFor="examTitle">Exam Title</Label>
                  <Input
                    id="examTitle"
                    {...register('examTitle', { required: 'Exam title is required' })}
                    placeholder="e.g., Computer Science Final Exam"
                className="w-full"
                  />
                  {errors.examTitle && (
                    <p className="text-sm text-red-600 mt-1">{errors.examTitle.message}</p>
                  )}
                </div>

            {/* Main Parameters - Responsive Grid */}
            <div className="space-y-4">
              {/* Number inputs - Stack on mobile, grid on larger screens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="questionCount">Number of Questions (1-20)</Label>
                    <Input
                      id="questionCount"
                      type="number"
                      min="1"
                      max="20"
                      {...register('questionCount', { 
                        required: 'Question count is required',
                        min: { value: 1, message: 'Minimum 1 question' },
                        max: { value: 20, message: 'Maximum 20 questions' }
                      })}
                    />
                    {errors.questionCount && (
                      <p className="text-sm text-red-600 mt-1">{errors.questionCount.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="examLength">Exam Length (minutes)</Label>
                    <Input
                      id="examLength"
                      type="number"
                      min="15"
                      max="300"
                      {...register('examLength', { 
                        required: 'Exam length is required',
                        min: { value: 15, message: 'Minimum 15 minutes' },
                        max: { value: 300, message: 'Maximum 300 minutes' }
                      })}
                    />
                    {errors.examLength && (
                      <p className="text-sm text-red-600 mt-1">{errors.examLength.message}</p>
                    )}
                  </div>

                <div>
                  <Label htmlFor="questionSets">Question Sets (1-5)</Label>
                  <Input
                    id="questionSets"
                    type="number"
                    min="1"
                    max="5"
                    {...register('questionSets', { 
                      required: 'Number of question sets is required',
                      min: { value: 1, message: 'Minimum 1 set' },
                      max: { value: 5, message: 'Maximum 5 sets' }
                    })}
                  />
                  {errors.questionSets && (
                    <p className="text-sm text-red-600 mt-1">{errors.questionSets.message}</p>
                  )}
                </div>
                </div>

              {/* Difficulty - Full Width */}
                <div>
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select 
                  onValueChange={(value) => setValue('difficulty', value as any)}
                  defaultValue="medium"
                >
                  <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                      <SelectItem value="mixed">Mixed (Gradual progression)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            {/* Custom Instructions and Quick Stats - Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Custom Instructions */}
                <div>
                  <Label htmlFor="customInstructions">Custom Instructions (Optional)</Label>
                  <Textarea
                    id="customInstructions"
                    {...register('customInstructions')}
                    placeholder="Any specific requirements for question generation..."
                    rows={6}
                  className="w-full"
                  />
                </div>

                {/* Quick Stats */}
              <div>
                <div className="bg-gray-50 rounded-lg p-4 h-full">
                  <h4 className="font-medium mb-3">Quick Stats</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Questions per set:</span>
                      <span className="font-medium">{watchedQuestionCount}</span>
                  </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="font-medium">{watchedExamLength} min</span>
                </div>
                    <div className="flex justify-between">
                      <span>Time per question:</span>
                      <span className="font-medium">{Math.round(watchedExamLength / watchedQuestionCount)} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Question sets:</span>
                      <span className="font-medium">{watchedQuestionSets}</span>
                    </div>
                    <div className="flex justify-between col-span-full border-t pt-2 mt-2">
                      <span className="font-semibold">Total questions:</span>
                      <span className="font-bold text-blue-600">{watchedQuestionCount * watchedQuestionSets}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
              <Button
                type="submit"
                disabled={isGenerating || (selectedSampleQuestions.length === 0 && selectedLearningMaterials.length === 0)}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Generate Exam
                  </>
                )}
              </Button>

              {currentSession && currentSession.status === 'generating' && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={cancelGeneration}
                  className="w-full sm:w-auto"
                >
                  Cancel Generation
                </Button>
              )}

              {currentSession && currentSession.status !== 'generating' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetSession}
                  className="w-full sm:w-auto"
                >
                  Reset
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Generation Progress */}
      {currentSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-600" />
              Generation Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{currentSession.currentStep}</span>
                  <span>{currentSession.progress}%</span>
                </div>
                <Progress value={currentSession.progress} className="w-full" />
              </div>

              {/* Results */}
              {currentSession.result && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-4 w-4" />
                    Generation Complete!
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <strong>Question Sets Generated:</strong> {currentSession.result.totalSets || 1}
                    </div>
                    <div>
                      <strong>Questions per Set:</strong> {currentSession.result.questionCount}
                    </div>
                    <div>
                      <strong>Total Questions:</strong> {(currentSession.result.totalSets || 1) * currentSession.result.questionCount}
                    </div>
                    <div>
                      <strong>File Size:</strong> {(currentSession.result.fileSize / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    onClick={handleDownload}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                      {currentSession.result.downloadType === 'zip' 
                        ? 'Download All Exam Sets (ZIP)' 
                        : 'Download Questions PDF'
                      }
                  </Button>
                    
                    {currentSession.result.downloadType === 'single' && (
                      <Button 
                        onClick={() => handleDownloadAnswerKey()}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Answer Key PDF
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {currentSession.status === 'error' && (
                <div className="bg-red-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2 text-red-800">
                    <AlertCircle className="h-4 w-4" />
                    Generation Failed
                  </h4>
                  <p className="text-sm text-red-600">
                    An error occurred during generation. Please try again.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Alert>
        <Target className="h-4 w-4" />
        <AlertDescription>
          <strong>How it works:</strong> Upload sample questions to understand exam patterns, then upload learning materials for content analysis. 
          The AI agents will communicate to generate questions that match your exam's style and cover the right topics.
        </AlertDescription>
      </Alert>
    </div>
  )
}