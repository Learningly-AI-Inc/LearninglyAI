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
  Target
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface QuestionGenerationParams {
  examTitle: string
  questionCount: number
  examLength: number // in minutes
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
  customInstructions?: string
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

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<QuestionGenerationParams>({
    defaultValues: {
      examTitle: '',
      questionCount: 10,
      examLength: 60,
      difficulty: 'medium',
      customInstructions: ''
    }
  })

  const watchedQuestionCount = watch('questionCount')
  const watchedExamLength = watch('examLength')

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

    try {
      // Simulate the AI communication and generation process
      const steps = [
        { step: 'Analyzing sample questions...', progress: 20, duration: 2000 },
        { step: 'Processing learning materials...', progress: 40, duration: 3000 },
        { step: 'AI agents communicating...', progress: 60, duration: 2000 },
        { step: 'Generating questions...', progress: 80, duration: 4000 },
        { step: 'Creating PDF...', progress: 95, duration: 2000 },
        { step: 'Saving to database...', progress: 100, duration: 1000 }
      ]

      for (const step of steps) {
        setCurrentSession(prev => prev ? {
          ...prev,
          progress: step.progress,
          currentStep: step.step
        } : null)
        
        await new Promise(resolve => setTimeout(resolve, step.duration))
      }

      // Complete generation
      const result = {
        pdfUrl: `/generated-exams/${sessionId}.pdf`,
        questionCount: params.questionCount,
        fileSize: 1024000 // 1MB
      }

      setCurrentSession(prev => prev ? {
        ...prev,
        status: 'completed',
        progress: 100,
        currentStep: 'Exam generated successfully!',
        result
      } : null)

      toast({
        title: "Exam Generated Successfully!",
        description: `Your ${params.questionCount}-question exam is ready for download.`,
      })

    } catch (error) {
      setCurrentSession(prev => prev ? {
        ...prev,
        status: 'error',
        currentStep: 'Generation failed',
      } : null)

      toast({
        title: "Generation Failed",
        description: "An error occurred during exam generation. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Bot className="h-6 w-6 text-blue-600" />
              <div className="flex-1">
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
              <Badge variant={selectedSampleQuestions.length > 0 ? "default" : "secondary"}>
                {selectedSampleQuestions.length > 0 ? `${selectedSampleQuestions.length} Selected` : "None Selected"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <Brain className="h-6 w-6 text-green-600" />
              <div className="flex-1">
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
              <Badge variant={selectedLearningMaterials.length > 0 ? "default" : "secondary"}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="examTitle">Exam Title</Label>
                  <Input
                    id="examTitle"
                    {...register('examTitle', { required: 'Exam title is required' })}
                    placeholder="e.g., Computer Science Final Exam"
                  />
                  {errors.examTitle && (
                    <p className="text-sm text-red-600 mt-1">{errors.examTitle.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div>
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select onValueChange={(value) => setValue('difficulty', value as any)}>
                    <SelectTrigger>
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

              <div className="space-y-4">
                <div>
                  <Label htmlFor="customInstructions">Custom Instructions (Optional)</Label>
                  <Textarea
                    id="customInstructions"
                    {...register('customInstructions')}
                    placeholder="Any specific requirements for question generation..."
                    rows={6}
                  />
                </div>

                {/* Quick Stats */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Quick Stats</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>Questions: {watchedQuestionCount}</div>
                    <div>Duration: {watchedExamLength} minutes</div>
                    <div>Time per question: {Math.round(watchedExamLength / watchedQuestionCount)} minutes</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t">
              <Button
                type="submit"
                disabled={isGenerating || (selectedSampleQuestions.length === 0 && selectedLearningMaterials.length === 0)}
                className="flex items-center gap-2"
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

              {currentSession && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetSession}
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
                      <strong>Questions Generated:</strong> {currentSession.result.questionCount}
                    </div>
                    <div>
                      <strong>File Size:</strong> {(currentSession.result.fileSize / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                  <Button className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Download Exam PDF
                  </Button>
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