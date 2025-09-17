"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Upload, Bot, History, Sparkles, CheckCircle2, ArrowLeft } from "lucide-react"
import { SampleQuestionsUpload } from "@/components/exam-prep/sample-questions-upload"
import { LearningMaterialsUpload } from "@/components/exam-prep/learning-materials-upload"
import { QuestionGenerationPanel } from "@/components/exam-prep/question-generation-panel"
import { GeneratedPDFsHistory } from "@/components/exam-prep/generated-pdfs-history"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

// Shared interfaces for file management
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

        {/* Tabs */}
        <div className="w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="sticky top-14 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-xl border shadow-sm">
              <TabsList className="grid w-full grid-cols-4 h-14 p-1 rounded-xl">
                <TabsTrigger value="sample-questions" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background">
                  <Upload className="h-4 w-4" />
                  <span className="font-medium text-sm">Sample</span>
                  {uploadedSampleQuestions.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{uploadedSampleQuestions.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="learning-materials" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium text-sm">Materials</span>
                  {uploadedLearningMaterials.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{uploadedLearningMaterials.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="generate" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background">
                  <Bot className="h-4 w-4" />
                  <span className="font-medium text-sm">Generate</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background">
                  <History className="h-4 w-4" />
                  <span className="font-medium text-sm">History</span>
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