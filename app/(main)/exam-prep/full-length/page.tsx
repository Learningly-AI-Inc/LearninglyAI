"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Upload, Bot, History, Settings, Sparkles } from "lucide-react"
import { SampleQuestionsUpload } from "@/components/exam-prep/sample-questions-upload"
import { LearningMaterialsUpload } from "@/components/exam-prep/learning-materials-upload"
import { QuestionGenerationPanel } from "@/components/exam-prep/question-generation-panel"
import { GeneratedPDFsHistory } from "@/components/exam-prep/generated-pdfs-history"
import { FileManagement } from "@/components/exam-prep/file-management"

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
          
          console.log('Sample questions loaded:', sampleQuestions.map((f: any) => ({ id: f.id, name: f.name, status: f.status, processing_status: f.processing_status })))
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Professional Header */}
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center gap-4">
            <div className="p-4 bg-primary rounded-2xl shadow-lg">
              <Sparkles className="h-10 w-10 text-primary-foreground" />
            </div>
            <div className="text-left">
              <h1 className="text-5xl font-bold tracking-tight text-foreground">
                Exam Preparation
              </h1>
              <p className="text-xl text-muted-foreground mt-2">
                AI-powered question generation and analysis
              </p>
            </div>
          </div>
          
          {/* Professional Features Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <Bot className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">AI Analysis</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <FileText className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Smart Generation</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <Upload className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Multi-Format</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <History className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">History</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Professional Navigation */}
        <div className="w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-center">
              <TabsList className="grid w-full max-w-4xl grid-cols-5 h-14 bg-muted/30 p-1 rounded-xl">
                <TabsTrigger 
                  value="sample-questions" 
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ease-in-out hover:bg-muted/50 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:scale-105"
                >
                  <Upload className="h-4 w-4 transition-transform duration-300" />
                  <span className="font-medium text-sm">Sample Questions</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="learning-materials" 
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ease-in-out hover:bg-muted/50 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:scale-105"
                >
                  <FileText className="h-4 w-4 transition-transform duration-300" />
                  <span className="font-medium text-sm">Learning Materials</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="generate" 
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ease-in-out hover:bg-muted/50 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:scale-105"
                >
                  <Bot className="h-4 w-4 transition-transform duration-300" />
                  <span className="font-medium text-sm">Generate Exam</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ease-in-out hover:bg-muted/50 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:scale-105"
                >
                  <History className="h-4 w-4 transition-transform duration-300" />
                  <span className="font-medium text-sm">History</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="manage" 
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ease-in-out hover:bg-muted/50 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:scale-105"
                >
                  <Settings className="h-4 w-4 transition-transform duration-300" />
                  <span className="font-medium text-sm">Manage</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="py-6">
              <TabsContent value="sample-questions" className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300">
                <div className="space-y-6 animate-in fade-in-0 duration-300">
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
                </div>
              </TabsContent>

              <TabsContent value="learning-materials" className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300">
                <div className="space-y-6 animate-in fade-in-0 duration-300">
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
                </div>
              </TabsContent>

              <TabsContent value="generate" className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300">
                <div className="space-y-6 animate-in fade-in-0 duration-300">
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
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300">
                <div className="space-y-6 animate-in fade-in-0 duration-300">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Generated Exams</h2>
                    <p className="text-muted-foreground mt-1">
                      View and manage your previously generated exam PDFs
                    </p>
                  </div>
                  <GeneratedPDFsHistory />
                </div>
              </TabsContent>

              <TabsContent value="manage" className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300">
                <div className="space-y-6 animate-in fade-in-0 duration-300">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">File Management</h2>
                    <p className="text-muted-foreground mt-1">
                      View and manage all your uploaded files and materials
                    </p>
                  </div>
                  <FileManagement />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}


