"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { 
  FileText, 
  Download, 
  Eye, 
  Trash2, 
  Share2, 
  Search,
  Calendar,
  Filter,
  MoreHorizontal,
  Clock,
  Users,
  Star,
  Copy,
  X,
  ChevronDown
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import jsPDF from 'jspdf'

interface GeneratedPDF {
  id: string
  title: string
  description: string
  questionCount: number
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
  examLength: number
  createdAt: Date
  fileSize: number
  downloadCount: number
  isPublic: boolean
  isStarred: boolean
  topics: string[]
  generationParameters: {
    questionTypes: string[]
    aiAgentsUsed: string[]
    sourceFiles: {
      sampleQuestions: number
      learningMaterials: number
    }
  }
  status: 'ready' | 'generating' | 'failed'
  pdfUrl: string
  answerKeyUrl?: string
}

export function GeneratedPDFsHistory() {
  const [pdfs, setPdfs] = React.useState<GeneratedPDF[]>([])
  const [searchTerm, setSearchTerm] = React.useState('')
  const [sortBy, setSortBy] = React.useState<'date' | 'title' | 'downloads'>('date')
  const [filterBy, setFilterBy] = React.useState<'all' | 'starred' | 'public'>('all')
  const [loading, setLoading] = React.useState(false)
  const [viewingPdf, setViewingPdf] = React.useState<(GeneratedPDF & { type: 'questions' | 'answerKey' }) | null>(null)
  const [pdfContent, setPdfContent] = React.useState<string>('')
  const [loadingPdf, setLoadingPdf] = React.useState(false)
  const [deletingPdf, setDeletingPdf] = React.useState<GeneratedPDF | null>(null)

  // Fetch generated exams from database
  React.useEffect(() => {
    const fetchGeneratedExams = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/exam-prep/sessions')
        if (response.ok) {
          const data = await response.json()
          const sessions = data.sessions || []
          
          // Transform sessions to GeneratedPDF format
          const transformedPdfs: GeneratedPDF[] = sessions.map((session: any) => {
            const examData = session.exam_parameters?.exam_data
            const questions = examData?.questions || []
            
            return {
              id: session.id,
              title: session.title || examData?.examTitle || 'Untitled Exam',
              description: session.description || `Generated ${examData?.examType || 'exam'} with ${questions.length} questions`,
              questionCount: questions.length,
              difficulty: examData?.questions?.[0]?.difficulty || 'medium',
              examLength: examData?.duration || 60,
              createdAt: new Date(session.created_at),
              fileSize: Math.floor(Math.random() * 1000000) + 500000, // Mock file size
              downloadCount: Math.floor(Math.random() * 50), // Mock download count
              isPublic: false, // Default to private
              isStarred: false, // Default to not starred
              topics: questions.map((q: any) => q.topic).filter(Boolean).slice(0, 3) || ['General'],
              generationParameters: {
                questionTypes: (() => {
                  const types = [...new Set(questions.map((q: any) => q.type || 'mcq'))];
                  return types.length > 0 ? types : ['multiple_choice'];
                })(),
                aiAgentsUsed: ['GPT-4'],
                sourceFiles: {
                  sampleQuestions: 0,
                  learningMaterials: 0
                }
              },
              status: 'ready',
              pdfUrl: `#exam-${session.id}`, // Placeholder URL
              answerKeyUrl: undefined
            }
          })
          
          setPdfs(transformedPdfs)
        } else {
          console.error('Failed to fetch generated exams:', response.statusText)
        }
      } catch (error) {
        console.error('Error fetching generated exams:', error)
        toast({
          title: "Error",
          description: "Failed to load generated exams. Please try again.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchGeneratedExams()
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getDifficultyColor = (difficulty: GeneratedPDF['difficulty']) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      case 'mixed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredAndSortedPDFs = React.useMemo(() => {
    let filtered = pdfs.filter(pdf => {
      const matchesSearch = pdf.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          pdf.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          pdf.topics.some(topic => topic.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesFilter = filterBy === 'all' || 
                          (filterBy === 'starred' && pdf.isStarred) ||
                          (filterBy === 'public' && pdf.isPublic)
      
      return matchesSearch && matchesFilter
    })

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title)
        case 'downloads':
          return b.downloadCount - a.downloadCount
        case 'date':
        default:
          return b.createdAt.getTime() - a.createdAt.getTime()
      }
    })

    return filtered
  }, [pdfs, searchTerm, sortBy, filterBy])

  const handleDownloadQuestions = async (pdf: GeneratedPDF) => {
    try {
      // Fetch the full exam data from the API
      const response = await fetch(`/api/exam-prep/sessions/${pdf.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch exam data')
      }
      
      const data = await response.json()
      const examData = data.session.exam_parameters?.exam_data
      
      if (!examData) {
        throw new Error('No exam data found')
      }

      // Check if there are multiple exam sets
      const allExams = data.session.exam_parameters?.exams || [examData]
      const isMultipleSets = allExams.length > 1

      // Generate questions PDF using jsPDF
      const questionsBlob = await generateQuestionsPDF(examData)
      const url = URL.createObjectURL(questionsBlob)
      
      // Generate filename based on whether it's multiple sets or single set
      let filename: string
      if (isMultipleSets) {
        // For multiple sets, we need to determine which set this is
        // Since we're in history, we'll use the first set (index 0)
        const baseTitle = examData.examTitle || pdf.title
        filename = `${baseTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_question_set_1.pdf`
      } else {
        filename = `${pdf.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_question.pdf`
      }
      
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up the URL
      URL.revokeObjectURL(url)
      
      // Update download count
      setPdfs(prev => prev.map(p => 
        p.id === pdf.id ? { ...p, downloadCount: p.downloadCount + 1 } : p
      ))
      
      toast({
        title: "Download Started",
        description: `Downloading ${pdf.title} questions...`,
      })
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: "Download Failed",
        description: "Failed to generate questions PDF. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleDownloadAnswerKey = async (pdf: GeneratedPDF) => {
    try {
      // Fetch the full exam data from the API
      const response = await fetch(`/api/exam-prep/sessions/${pdf.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch exam data')
      }
      
      const data = await response.json()
      const examData = data.session.exam_parameters?.exam_data
      
      if (!examData) {
        throw new Error('No exam data found')
      }

      // Check if there are multiple exam sets
      const allExams = data.session.exam_parameters?.exams || [examData]
      const isMultipleSets = allExams.length > 1

      // Generate answer key PDF using jsPDF
      const answerKeyBlob = await generateAnswerKeyPDF(examData)
      const url = URL.createObjectURL(answerKeyBlob)
      
      // Generate filename based on whether it's multiple sets or single set
      let filename: string
      if (isMultipleSets) {
        // For multiple sets, we need to determine which set this is
        // Since we're in history, we'll use the first set (index 0)
        const baseTitle = examData.examTitle || pdf.title
        filename = `${baseTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_answer_set_1.pdf`
      } else {
        filename = `${pdf.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_answer.pdf`
      }
      
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up the URL
      URL.revokeObjectURL(url)
      
      toast({
        title: "Download Started",
        description: `Downloading ${pdf.title} answer key...`,
      })
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: "Download Failed",
        description: "Failed to generate answer key PDF. Please try again.",
        variant: "destructive"
      })
    }
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

  const generatePDFContent = (examData: any): string => {
    const questions = examData.questions || []
    
    return `
${examData.examTitle || 'Generated Exam'}
Duration: ${examData.duration || 60} minutes
Questions: ${questions.length}

Instructions:
${examData.instructions || 'Please read each question carefully and select the best answer. Choose only one answer per question.'}

${questions.map((q: any, index: number) => `
Question ${index + 1} (${q.type?.toUpperCase() || 'MCQ'}): ${q.question}
${q.type === 'mcq' && q.options ? q.options.map((option: string, optIndex: number) => 
  option.match(/^[A-D]\.\s/) ? option : `${String.fromCharCode(65 + optIndex)}. ${option}`
).join('\n') : ''}
${q.type === 'true_false' ? 'A. True\nB. False' : ''}
${q.type === 'short_answer' || q.type === 'essay' ? 'Answer: _____________________________' : ''}
${q.type === 'fill_blank' ? 'Fill in the blank: _____________________________' : ''}
${q.type === 'code_writing' ? `Write your code (${q.codeLanguage || 'any language'}):\n\n\n\n\n` : ''}
${q.type === 'numerical' ? 'Numerical Answer: _____________________________' : ''}

`).join('')}

Answer Key:
${questions.map((q: any, index: number) => 
  `Question ${index + 1}: ${q.correctAnswer} - ${q.explanation}`
).join('\n')}

End of Exam
    `.trim()
  }

  const handleToggleStar = (pdfId: string) => {
    setPdfs(prev => prev.map(p => 
      p.id === pdfId ? { ...p, isStarred: !p.isStarred } : p
    ))
  }

  const handleTogglePublic = (pdfId: string) => {
    setPdfs(prev => prev.map(p => 
      p.id === pdfId ? { ...p, isPublic: !p.isPublic } : p
    ))
    
    const pdf = pdfs.find(p => p.id === pdfId)
    toast({
      title: pdf?.isPublic ? "Made Private" : "Made Public",
      description: pdf?.isPublic 
        ? "This exam is now private and cannot be accessed by others"
        : "This exam is now public and can be shared with others",
    })
  }

  const handleDelete = (pdfId: string) => {
    const pdf = pdfs.find(p => p.id === pdfId)
    if (pdf) {
      setDeletingPdf(pdf)
    }
  }

  const confirmDelete = async () => {
    if (!deletingPdf) return

    try {
      // Call API to delete from database
      const response = await fetch(`/api/exam-prep/sessions/${deletingPdf.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Remove from local state
        setPdfs(prev => prev.filter(p => p.id !== deletingPdf.id))
        toast({
          title: "Exam Deleted",
          description: `"${deletingPdf.title}" has been permanently deleted.`,
        })
      } else {
        throw new Error('Failed to delete exam')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: "Delete Failed",
        description: "Failed to delete exam. Please try again.",
        variant: "destructive"
      })
    } finally {
      setDeletingPdf(null)
    }
  }

  const handleCopyLink = (pdf: GeneratedPDF) => {
    if (!pdf.isPublic) {
      toast({
        title: "Cannot Copy Link",
        description: "This exam is private. Make it public first to share.",
        variant: "destructive"
      })
      return
    }
    
    const link = `${window.location.origin}/exams/public/${pdf.id}`
    navigator.clipboard.writeText(link)
    toast({
      title: "Link Copied",
      description: "Public exam link copied to clipboard!",
    })
  }

  const handleViewQuestions = async (pdf: GeneratedPDF) => {
    setViewingPdf({ ...pdf, type: 'questions' })
    setLoadingPdf(true)
    
    try {
      // Fetch the full exam data from the API
      const response = await fetch(`/api/exam-prep/sessions/${pdf.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch exam data')
      }
      
      const data = await response.json()
      const examData = data.session.exam_parameters?.exam_data
      
      if (!examData) {
        throw new Error('No exam data found')
      }

      // Generate formatted content for questions viewing
      const content = generateQuestionsContent(examData)
      setPdfContent(content)
    } catch (error) {
      console.error('Error loading questions:', error)
      toast({
        title: "Error",
        description: "Failed to load exam questions. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoadingPdf(false)
    }
  }

  const handleViewAnswerKey = async (pdf: GeneratedPDF) => {
    setViewingPdf({ ...pdf, type: 'answerKey' })
    setLoadingPdf(true)
    
    try {
      // Fetch the full exam data from the API
      const response = await fetch(`/api/exam-prep/sessions/${pdf.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch exam data')
      }
      
      const data = await response.json()
      const examData = data.session.exam_parameters?.exam_data
      
      if (!examData) {
        throw new Error('No exam data found')
      }

      // Generate formatted content for answer key viewing
      const content = generateAnswerKeyContent(examData)
      setPdfContent(content)
    } catch (error) {
      console.error('Error loading answer key:', error)
      toast({
        title: "Error",
        description: "Failed to load answer key. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoadingPdf(false)
    }
  }

  const generateQuestionsContent = (examData: any): string => {
    const questions = examData.questions || []
    
    return `
EXAM QUESTIONS: ${examData.examTitle || 'Generated Exam'}
Duration: ${examData.duration || 60} minutes
Questions: ${questions.length}

${questions.map((question: any, index: number) => {
  let content = `Question ${index + 1} (${question.type?.toUpperCase() || 'MCQ'}):\n${question.question}\n`
  
  if (question.type === 'mcq' && question.options) {
    question.options.forEach((option: string, optIndex: number) => {
      // Check if option already has A, B, C, D prefix
      if (option.match(/^[A-D]\.\s/)) {
        content += `${option}\n`
      } else {
        content += `${String.fromCharCode(65 + optIndex)}. ${option}\n`
      }
    })
  } else if (question.type === 'true_false') {
    content += `A. True\nB. False\n`
  } else if (['short_answer', 'essay', 'fill_blank', 'code_writing', 'numerical'].includes(question.type)) {
    content += `[Answer space for written response]\n`
  }
  
  return content + '\n'
}).join('')}
`.trim()
  }

  const generateAnswerKeyContent = (examData: any): string => {
    const questions = examData.questions || []
    
    return `
ANSWER KEY: ${examData.examTitle || 'Generated Exam'}
Duration: ${examData.duration || 60} minutes
Questions: ${questions.length}

${questions.map((question: any, index: number) => {
  let content = `Question ${index + 1}:\n`
  
  // Show correct answer
  let correctAnswer = question.correctAnswer || 'Answer not provided'
  
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
  
  content += `Answer: ${correctAnswer}\n`
  
  if (question.explanation) {
    content += `Explanation: ${question.explanation}\n`
  }
  
  return content + '\n'
}).join('')}
`.trim()
  }

  const generateViewableContent = (examData: any): string => {
    const questions = examData.questions || []
    
    return `
${examData.examTitle || 'Generated Exam'}
Duration: ${examData.duration || 60} minutes
Questions: ${questions.length}

Instructions:
${examData.instructions || 'Please read each question carefully and select the best answer. Choose only one answer per question.'}

${questions.map((q: any, index: number) => `
Question ${index + 1} (${q.type?.toUpperCase() || 'MCQ'}): ${q.question}
${q.type === 'mcq' && q.options ? q.options.map((option: string, optIndex: number) => 
  option.match(/^[A-D]\.\s/) ? option : `${String.fromCharCode(65 + optIndex)}. ${option}`
).join('\n') : ''}
${q.type === 'true_false' ? 'A. True\nB. False' : ''}
${q.type === 'short_answer' || q.type === 'essay' ? 'Answer: _____________________________' : ''}
${q.type === 'fill_blank' ? 'Fill in the blank: _____________________________' : ''}
${q.type === 'code_writing' ? `Write your code (${q.codeLanguage || 'any language'}):\n\n\n\n\n` : ''}
${q.type === 'numerical' ? 'Numerical Answer: _____________________________' : ''}

`).join('')}

Answer Key:
${questions.map((q: any, index: number) => 
  `Question ${index + 1}: ${q.correctAnswer} - ${q.explanation}`
).join('\n')}

End of Exam
    `.trim()
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {pdfs.length}
              </div>
              <div className="text-sm text-gray-600">Total Exams</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search exams by title, description, or topics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort by Date</SelectItem>
                <SelectItem value="title">Sort by Title</SelectItem>
                <SelectItem value="downloads">Sort by Downloads</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterBy} onValueChange={(value) => setFilterBy(value as any)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exams</SelectItem>
                <SelectItem value="starred">Starred Only</SelectItem>
                <SelectItem value="public">Public Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* PDF List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Loading exams...</h3>
                <p className="text-gray-600">Fetching your generated exams from the database.</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredAndSortedPDFs.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No exams found</h3>
                <p className="text-gray-600">
                  {searchTerm ? 'Try adjusting your search terms or filters.' : 'Generate your first exam to see it here.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedPDFs.map((pdf) => (
            <Card key={pdf.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="bg-blue-50 p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{pdf.title}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStar(pdf.id)}
                          className="p-1 h-6 w-6"
                        >
                          <Star className={`h-4 w-4 ${pdf.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                        </Button>
                        {pdf.isPublic && (
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            Public
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{pdf.description}</p>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleViewQuestions(pdf)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Questions
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewAnswerKey(pdf)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Answer Key
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDownloadQuestions(pdf)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Questions
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownloadAnswerKey(pdf)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Answer Key
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDelete(pdf.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                  
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-semibold text-gray-900">{pdf.questionCount}</div>
                    <div className="text-xs text-gray-600">Questions</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-semibold text-gray-900">{pdf.examLength}</div>
                    <div className="text-xs text-gray-600">Minutes</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-semibold text-gray-900">{formatFileSize(pdf.fileSize)}</div>
                    <div className="text-xs text-gray-600">Size</div>
                  </div>
                </div>
                  
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className={getDifficultyColor(pdf.difficulty)}>
                    {pdf.difficulty}
                  </Badge>
                  {pdf.topics.slice(0, 3).map((topic, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                  {pdf.topics.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{pdf.topics.length - 3} more
                    </Badge>
                  )}
                </div>
                  
                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Created {formatDate(pdf.createdAt)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {pdf.downloadCount} downloads
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

       {/* Guidelines */}
       <Alert>
         <FileText className="h-4 w-4" />
         <AlertDescription>
           <strong>Management Tips:</strong> Star important exams for quick access, make exams public to share with 
           colleagues or students, and use the search function to quickly find specific topics or exam types. 
           Downloaded exams are automatically saved to your device.
         </AlertDescription>
       </Alert>

       {/* PDF Viewer Dialog */}
       <Dialog open={!!viewingPdf} onOpenChange={() => setViewingPdf(null)}>
         <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
           <DialogHeader className="flex-shrink-0">
             <DialogTitle className="text-lg font-semibold">
               {viewingPdf?.type === 'questions' ? 'Exam Questions' : 'Answer Key'} - {viewingPdf?.title || 'Generated Exam'}
             </DialogTitle>
           </DialogHeader>
           
           <div className="flex-1 min-h-0 overflow-hidden">
             {loadingPdf ? (
               <div className="flex items-center justify-center h-full">
                 <div className="text-center">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                   <p className="text-gray-600">Loading exam content...</p>
                 </div>
               </div>
             ) : (
               <div className="h-full overflow-y-auto bg-gray-50 rounded-lg p-6">
                 <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-800">
                   {pdfContent}
                 </pre>
               </div>
             )}
           </div>
           
           <div className="flex justify-end pt-4 border-t flex-shrink-0">
             <Button
               variant="outline"
               onClick={() => setViewingPdf(null)}
             >
               Close
             </Button>
           </div>
         </DialogContent>
       </Dialog>

       {/* Delete Confirmation Dialog */}
       <Dialog open={!!deletingPdf} onOpenChange={() => setDeletingPdf(null)}>
         <DialogContent className="max-w-md">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2 text-red-600">
               <Trash2 className="h-5 w-5" />
               Delete Exam
             </DialogTitle>
           </DialogHeader>
           
           <div className="py-4">
             <p className="text-gray-700 mb-4">
               Are you sure you want to delete <strong>"{deletingPdf?.title}"</strong>?
             </p>
             <p className="text-sm text-gray-500">
               This action cannot be undone. The exam and all its data will be permanently removed.
             </p>
           </div>
           
           <div className="flex justify-end gap-3">
             <Button
               variant="outline"
               onClick={() => setDeletingPdf(null)}
             >
               Cancel
             </Button>
             <Button
               variant="destructive"
               onClick={confirmDelete}
               className="flex items-center gap-2"
             >
               <Trash2 className="h-4 w-4" />
               Delete
             </Button>
           </div>
         </DialogContent>
       </Dialog>
     </div>
   )
 }


