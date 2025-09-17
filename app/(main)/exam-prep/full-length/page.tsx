"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { FileText, Upload, Bot, History, Sparkles, CheckCircle2, ArrowLeft, AlertCircle } from "lucide-react"
import { SampleQuestionsUpload } from "@/components/exam-prep/sample-questions-upload"
import { LearningMaterialsUpload } from "@/components/exam-prep/learning-materials-upload"
import { QuestionGenerationPanel } from "@/components/exam-prep/question-generation-panel"
import { GeneratedPDFsHistory } from "@/components/exam-prep/generated-pdfs-history"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

// Shared interfaces for file management
interface GenerationSession {
  id: string
  status: 'generating' | 'completed' | 'error'
  progress: number
  currentStep: string
  result?: {
    examData?: any
    allExams?: any[]
    pdfUrl?: string
    downloadType?: 'single' | 'zip'
    totalSets?: number
    questionCount?: number
    fileSize?: number
  }
}

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  uploadDate: string
  status: 'uploading' | 'processing' | 'analyzed' | 'failed'
  category?: string
  extracted_content?: string
  processing_status?: string
  patternAnalysis?: {
    questionTypes: string[]
    difficultyDistribution: { easy: number; medium: number; hard: number }
    topicAreas: string[]
    questionCount: number
    averageWordCount: number
    insights: string[]
  }
}

interface LearningMaterial {
  id: string
  name: string
  size: number
  type: string
  uploadDate: string
  status: 'uploading' | 'processing' | 'analyzed' | 'failed'
  category: string
  extracted_content?: string
  processing_status?: string
  contentAnalysis?: {
    topicCoverage: string[]
    keyConceptsCount: number
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced'
    contentType: 'theoretical' | 'practical' | 'mixed'
    readabilityScore: number
    textLength: number
    isOptimized: boolean
    optimizationSummary?: string
    chapterSummary: {
      title: string
      keyPoints: string[]
      questionPotential: number
    }[]
  }
}

export default function FullLengthExamPrepPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = React.useState("sample-questions")
  
  // Shared state for uploaded files
  const [uploadedSampleQuestions, setUploadedSampleQuestions] = React.useState<UploadedFile[]>([])
  const [uploadedLearningMaterials, setUploadedLearningMaterials] = React.useState<LearningMaterial[]>([])
  
  // Shared state for upload status
  const [uploadingSampleQuestions, setUploadingSampleQuestions] = React.useState(false)
  const [uploadingLearningMaterials, setUploadingLearningMaterials] = React.useState(false)
  
  // Shared state for file selection
  const [selectedSampleQuestions, setSelectedSampleQuestions] = React.useState<string[]>([])
  const [selectedLearningMaterials, setSelectedLearningMaterials] = React.useState<string[]>([])
  
  // Loading state
  const [isLoadingFiles, setIsLoadingFiles] = React.useState(true)
  
  // Generation session state (shared across all tabs)
  const [currentSession, setCurrentSession] = React.useState<GenerationSession | null>(null)

  // Load files from database on component mount
  React.useEffect(() => {
    const loadFiles = async () => {
      try {
        const response = await fetch('/api/exam-prep/files')
        if (response.ok) {
          const data = await response.json()
          const files = data.files || []
          
          // Separate files by category and ensure proper status mapping
          const sampleQuestions = files.filter((file: any) => file.category === 'sample_questions').map((file: any) => ({
            ...file,
            status: file.processing_status === 'completed' ? 'analyzed' : 
                    file.processing_status === 'processing' ? 'processing' :
                    file.processing_status === 'failed' ? 'failed' : 'analyzed'
          }))
          
          const learningMaterials = files.filter((file: any) => file.category === 'learning_materials').map((file: any) => ({
            ...file,
            status: file.processing_status === 'completed' ? 'analyzed' : 
                    file.processing_status === 'processing' ? 'processing' :
                    file.processing_status === 'failed' ? 'failed' : 'analyzed'
          }))
          
          setUploadedSampleQuestions(sampleQuestions)
          setUploadedLearningMaterials(learningMaterials)
        } else {
          console.error('Failed to load files:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('Error loading files:', error)
      } finally {
        setIsLoadingFiles(false)
      }
    }

    loadFiles()
  }, [])

  const steps = [
    { id: 'sample-questions', label: 'Sample', icon: Upload },
    { id: 'learning-materials', label: 'Materials', icon: FileText },
    { id: 'generate', label: 'Generate', icon: Bot },
    { id: 'history', label: 'History', icon: History },
  ] as const

  const activeIndex = steps.findIndex(s => s.id === activeTab)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 space-y-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            variant="ghost"
            onClick={() => router.push('/exam-prep')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Exam Prep
          </Button>
        </motion.div>
        {/* Header with motion */}
        <motion.div
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-6"
        >
          <div className="flex items-center justify-center gap-4">
            <motion.div whileHover={{ scale: 1.05 }} className="p-4 bg-primary rounded-2xl shadow-lg">
              <Sparkles className="h-10 w-10 text-primary-foreground" />
            </motion.div>
            <div className="text-left">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                Exam Preparation
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mt-2">
                AI-powered question generation and analysis
              </p>
            </div>
          </div>

          {/* Stepper */}
          <div className="relative max-w-3xl mx-auto">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-muted/50 rounded-full" />
            <div className="relative grid grid-cols-4 gap-2">
              {steps.map((step, idx) => {
                const Icon = step.icon
                const isActive = activeTab === step.id
                const isDone = idx < activeIndex
                return (
                  <div key={step.id} className="flex flex-col items-center">
                    <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border ${
                      isActive ? 'bg-primary text-primary-foreground border-primary' : isDone ? 'bg-green-600 text-white border-green-600' : 'bg-background text-foreground border-muted'
                    }`}> 
                      {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span className={`mt-2 text-xs ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{step.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* Global Generation Progress - Shows across all tabs */}
        {currentSession && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-orange-200 bg-orange-50/50 shadow-lg">
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
                      <span>{Math.round(currentSession.progress * 10) / 10}%</span>
                    </div>
                    <Progress value={currentSession.progress} className="w-full" />
                  </div>

                  {/* Results */}
                  {currentSession.result && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2 text-green-800">
                        <CheckCircle2 className="h-4 w-4" />
                        Generation Complete!
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <strong>Question Sets Generated:</strong> {currentSession.result.totalSets || 1}
                        </div>
                        <div>
                          <strong>Questions per Set:</strong> {currentSession.result.questionCount || 0}
                        </div>
                        <div>
                          <strong>Total Questions:</strong> {(currentSession.result.totalSets || 1) * (currentSession.result.questionCount || 0)}
                        </div>
                        <div>
                          <strong>File Size:</strong> {currentSession.result.fileSize ? (currentSession.result.fileSize / 1024 / 1024).toFixed(2) : '0.00'} MB
                        </div>
                      </div>
                      <div className="text-sm text-green-700">
                        ✅ Exam generated successfully! Switch to the Generate tab to download your files.
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
          </motion.div>
        )}

        {/* Tabs */}
        <div className="w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="sticky top-14 z-10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 rounded-2xl border border-gray-200 shadow-xl">
              <TabsList className="grid w-full grid-cols-4 h-16 p-2 rounded-2xl bg-gradient-to-r from-gray-900 to-black shadow-2xl">
                <TabsTrigger 
                  value="sample-questions" 
                  className="flex items-center gap-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25 data-[state=active]:border data-[state=active]:border-blue-400 data-[state=active]:text-white data-[state=inactive]:text-gray-300 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-gray-800/50 transition-all duration-300 ease-in-out"
                >
                  <Upload className="h-5 w-5 text-blue-400 data-[state=active]:text-white" />
                  <span className="font-semibold text-sm">Sample</span>
                  {uploadedSampleQuestions.length > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-blue-500 text-white border-blue-400 shadow-sm">{uploadedSampleQuestions.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="learning-materials" 
                  className="flex items-center gap-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-green-700 data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 data-[state=active]:border data-[state=active]:border-green-400 data-[state=active]:text-white data-[state=inactive]:text-gray-300 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-gray-800/50 transition-all duration-300 ease-in-out"
                >
                  <FileText className="h-5 w-5 text-green-400 data-[state=active]:text-white" />
                  <span className="font-semibold text-sm">Materials</span>
                  {uploadedLearningMaterials.length > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-green-500 text-white border-green-400 shadow-sm">{uploadedLearningMaterials.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="generate" 
                  className="flex items-center gap-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/25 data-[state=active]:border data-[state=active]:border-purple-400 data-[state=active]:text-white data-[state=inactive]:text-gray-300 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-gray-800/50 transition-all duration-300 ease-in-out"
                >
                  <Bot className="h-5 w-5 text-purple-400 data-[state=active]:text-white" />
                  <span className="font-semibold text-sm">Generate</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="flex items-center gap-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-orange-700 data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/25 data-[state=active]:border data-[state=active]:border-orange-400 data-[state=active]:text-white data-[state=inactive]:text-gray-300 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-gray-800/50 transition-all duration-300 ease-in-out"
                >
                  <History className="h-5 w-5 text-orange-400 data-[state=active]:text-white" />
                  <span className="font-semibold text-sm">History</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="py-6 space-y-2">
              <TabsContent value="sample-questions" className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Upload Sample Questions</h2>
                    <p className="text-muted-foreground mt-1">
                      Upload past exam papers and sample questions for AI pattern analysis
                    </p>
                  </div>
                  <SampleQuestionsUpload 
                    uploadedFiles={uploadedSampleQuestions}
                    setUploadedFiles={setUploadedSampleQuestions}
                    uploading={uploadingSampleQuestions}
                    setUploading={setUploadingSampleQuestions}
                    selectedFiles={selectedSampleQuestions}
                    setSelectedFiles={setSelectedSampleQuestions}
                    isLoading={isLoadingFiles}
                  />
                </motion.div>
              </TabsContent>

              <TabsContent value="learning-materials" className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Learning Materials</h2>
                    <p className="text-muted-foreground mt-1">
                      Upload textbooks, notes, and study materials for content analysis
                    </p>
                  </div>
                  <LearningMaterialsUpload 
                    uploadedMaterials={uploadedLearningMaterials}
                    setUploadedMaterials={setUploadedLearningMaterials}
                    uploading={uploadingLearningMaterials}
                    setUploading={setUploadingLearningMaterials}
                    selectedFiles={selectedLearningMaterials}
                    setSelectedFiles={setSelectedLearningMaterials}
                    isLoading={isLoadingFiles}
                  />
                </motion.div>
              </TabsContent>

              <TabsContent value="generate" className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Generate Exam</h2>
                    <p className="text-muted-foreground mt-1">
                      Create custom exams using AI-powered question generation
                    </p>
                  </div>
                  <QuestionGenerationPanel 
                    uploadedSampleQuestions={uploadedSampleQuestions}
                    uploadedLearningMaterials={uploadedLearningMaterials}
                    selectedSampleQuestions={selectedSampleQuestions}
                    selectedLearningMaterials={selectedLearningMaterials}
                    currentSession={currentSession}
                    setCurrentSession={setCurrentSession}
                  />
                </motion.div>
              </TabsContent>

              <TabsContent value="history" className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Generated Exams</h2>
                    <p className="text-muted-foreground mt-1">
                      View and manage your previously generated exam PDFs
                    </p>
                  </div>
                  <GeneratedPDFsHistory />
                </motion.div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}