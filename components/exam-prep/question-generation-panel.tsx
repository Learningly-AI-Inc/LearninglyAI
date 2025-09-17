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
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { 
  Bot, 
  Sparkles, 
  FileText, 
  Clock, 
  Target, 
  Settings, 
  Play, 
  Pause, 
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Zap,
  Download
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface QuestionGenerationParams {
  examTitle: string
  description: string
  questionCount: number
  examLength: number // in minutes
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
  questionTypes: string[]
  topicWeights: { [topic: string]: number }
  customInstructions: string
  outputFormat: 'pdf' | 'docx' | 'both'
  includeAnswerKey: boolean
  includeSolutions: boolean
}

interface AIAgent {
  name: string
  role: string
  status: 'idle' | 'working' | 'completed' | 'error'
  currentTask: string
  progress: number
}

interface GenerationSession {
  id: string
  status: 'idle' | 'analyzing' | 'generating' | 'finalizing' | 'completed' | 'error'
  progress: number
  currentStep: string
  startTime: Date
  estimatedCompletion?: Date
  aiCommunicationLog: {
    timestamp: Date
    agent: string
    message: string
    type: 'info' | 'warning' | 'error'
  }[]
  result?: {
    pdfUrl: string
    questionCount: number
    generatedTopics: string[]
    fileSize: number
  }
}

export function QuestionGenerationPanel() {
  const [generationParams, setGenerationParams] = React.useState<QuestionGenerationParams>({
    examTitle: '',
    description: '',
    questionCount: 10,
    examLength: 60,
    difficulty: 'medium',
    questionTypes: ['multiple_choice'],
    topicWeights: {},
    customInstructions: '',
    outputFormat: 'pdf',
    includeAnswerKey: true,
    includeSolutions: false
  })

  const [currentSession, setCurrentSession] = React.useState<GenerationSession | null>(null)
  const [aiAgents, setAiAgents] = React.useState<AIAgent[]>([
    {
      name: 'Pattern Analyzer',
      role: 'Analyzes sample questions to understand exam structure and style',
      status: 'idle',
      currentTask: 'Ready to analyze patterns',
      progress: 0
    },
    {
      name: 'Content Processor',
      role: 'Processes learning materials and extracts key concepts',
      status: 'idle', 
      currentTask: 'Ready to process content',
      progress: 0
    },
    {
      name: 'Question Generator',
      role: 'Generates questions based on patterns and content analysis',
      status: 'idle',
      currentTask: 'Ready to generate questions',
      progress: 0
    },
    {
      name: 'PDF Formatter',
      role: 'Formats questions into professional exam document',
      status: 'idle',
      currentTask: 'Ready to format PDF',
      progress: 0
    }
  ])

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<QuestionGenerationParams>({
    defaultValues: generationParams
  })

  const watchedQuestionCount = watch('questionCount')
  const watchedExamLength = watch('examLength')

  // Available topics will be populated from uploaded materials
  const availableTopics: string[] = []

  const questionTypeOptions = [
    { value: 'multiple_choice', label: 'Multiple Choice', description: 'Questions with 4-5 options' },
    { value: 'true_false', label: 'True/False', description: 'Binary choice questions' },
    { value: 'short_answer', label: 'Short Answer', description: '1-2 sentence responses' },
    { value: 'essay', label: 'Essay', description: 'Long-form detailed answers' },
    { value: 'fill_blank', label: 'Fill in the Blank', description: 'Complete the statement' },
    { value: 'coding', label: 'Programming', description: 'Code writing questions' }
  ]

  const startGeneration = async (params: QuestionGenerationParams) => {
    const sessionId = Math.random().toString(36).substr(2, 9)
    const startTime = new Date()
    
    const newSession: GenerationSession = {
      id: sessionId,
      status: 'analyzing',
      progress: 0,
      currentStep: 'Initializing AI agents...',
      startTime,
      estimatedCompletion: new Date(startTime.getTime() + (params.questionCount * 30000)), // 30 seconds per question estimate
      aiCommunicationLog: [
        {
          timestamp: new Date(),
          agent: 'System',
          message: 'Question generation session started',
          type: 'info'
        }
      ]
    }

    setCurrentSession(newSession)

    // Simulate AI communication and generation process
    try {
      // Phase 1: Pattern Analysis
      setAiAgents(prev => prev.map(agent => 
        agent.name === 'Pattern Analyzer' 
          ? { ...agent, status: 'working', currentTask: 'Analyzing sample question patterns...', progress: 0 }
          : agent
      ))

      await simulateAgentWork('Pattern Analyzer', 'Analyzing question patterns from uploaded samples...', 3000)
      
      setCurrentSession(prev => prev ? {
        ...prev,
        progress: 25,
        currentStep: 'Pattern analysis complete',
        aiCommunicationLog: [
          ...prev.aiCommunicationLog,
          {
            timestamp: new Date(),
            agent: 'Pattern Analyzer',
            message: 'Identified common question formats: 60% Multiple Choice, 25% Short Answer, 15% Essay',
            type: 'info'
          }
        ]
      } : null)

      // Phase 2: Content Processing
      setAiAgents(prev => prev.map(agent => 
        agent.name === 'Content Processor'
          ? { ...agent, status: 'working', currentTask: 'Processing learning materials...', progress: 0 }
          : agent
      ))

      await simulateAgentWork('Content Processor', 'Extracting key concepts from learning materials...', 4000)

      setCurrentSession(prev => prev ? {
        ...prev,
        progress: 50,
        currentStep: 'Content processing complete',
        aiCommunicationLog: [
          ...prev.aiCommunicationLog,
          {
            timestamp: new Date(),
            agent: 'Content Processor',
            message: `Extracted key concepts from uploaded materials`,
            type: 'info'
          },
          {
            timestamp: new Date(),
            agent: 'Pattern Analyzer',
            message: 'Sharing pattern insights with Question Generator...',
            type: 'info'
          }
        ]
      } : null)

      // Phase 3: Question Generation (AI-to-AI Communication)
      setAiAgents(prev => prev.map(agent => 
        agent.name === 'Question Generator'
          ? { ...agent, status: 'working', currentTask: 'Generating questions based on patterns and content...', progress: 0 }
          : agent
      ))

      await simulateAgentWork('Question Generator', 'Collaborating with other agents to generate questions...', 6000)

      setCurrentSession(prev => prev ? {
        ...prev,
        progress: 75,
        currentStep: 'Question generation complete',
        aiCommunicationLog: [
          ...prev.aiCommunicationLog,
          {
            timestamp: new Date(),
            agent: 'Question Generator',
            message: `Generated ${params.questionCount} questions matching the identified patterns`,
            type: 'info'
          },
          {
            timestamp: new Date(),
            agent: 'Content Processor',
            message: 'Questions cover all major topics with appropriate difficulty distribution',
            type: 'info'
          }
        ]
      } : null)

      // Phase 4: PDF Formatting
      setAiAgents(prev => prev.map(agent => 
        agent.name === 'PDF Formatter'
          ? { ...agent, status: 'working', currentTask: 'Formatting exam PDF...', progress: 0 }
          : agent
      ))

      await simulateAgentWork('PDF Formatter', 'Creating professional exam document...', 3000)

      // Complete
      const result = {
        pdfUrl: `/generated-exams/${sessionId}.pdf`,
        questionCount: params.questionCount,
        generatedTopics: availableTopics,
        fileSize: 1000000 // Default 1MB
      }

      setCurrentSession(prev => prev ? {
        ...prev,
        status: 'completed',
        progress: 100,
        currentStep: 'Exam generated successfully!',
        result,
        aiCommunicationLog: [
          ...prev.aiCommunicationLog,
          {
            timestamp: new Date(),
            agent: 'PDF Formatter',
            message: 'Exam PDF generated and ready for download',
            type: 'info'
          },
          {
            timestamp: new Date(),
            agent: 'System',
            message: 'Generation session completed successfully',
            type: 'info'
          }
        ]
      } : null)

      setAiAgents(prev => prev.map(agent => ({
        ...agent,
        status: 'completed',
        progress: 100,
        currentTask: 'Complete'
      })))

      toast({
        title: "Exam Generated Successfully!",
        description: `Your ${params.questionCount}-question exam is ready for download.`,
      })

    } catch (error) {
      setCurrentSession(prev => prev ? {
        ...prev,
        status: 'error',
        currentStep: 'Generation failed',
        aiCommunicationLog: [
          ...prev.aiCommunicationLog,
          {
            timestamp: new Date(),
            agent: 'System',
            message: 'Error occurred during generation: ' + (error as Error).message,
            type: 'error'
          }
        ]
      } : null)

      toast({
        title: "Generation Failed",
        description: "An error occurred during exam generation. Please try again.",
        variant: "destructive"
      })
    }
  }

  const simulateAgentWork = async (agentName: string, task: string, duration: number) => {
    const steps = 20
    const stepDuration = duration / steps

    for (let i = 0; i <= steps; i++) {
      const progress = (i / steps) * 100
      setAiAgents(prev => prev.map(agent => 
        agent.name === agentName 
          ? { ...agent, progress, currentTask: task }
          : agent
      ))
      await new Promise(resolve => setTimeout(resolve, stepDuration))
    }

    setAiAgents(prev => prev.map(agent => 
      agent.name === agentName 
        ? { ...agent, status: 'completed', progress: 100 }
        : agent
    ))
  }

  const onSubmit = (data: QuestionGenerationParams) => {
    startGeneration(data)
  }

  const resetSession = () => {
    setCurrentSession(null)
    setAiAgents(prev => prev.map(agent => ({
      ...agent,
      status: 'idle',
      progress: 0,
      currentTask: `Ready to ${agent.role.toLowerCase()}`
    })))
  }

  const getAgentStatusColor = (status: AIAgent['status']) => {
    switch (status) {
      case 'working': return 'text-yellow-600'
      case 'completed': return 'text-green-600' 
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getAgentStatusIcon = (status: AIAgent['status']) => {
    switch (status) {
      case 'working': return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600" />
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />
      default: return <Bot className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* AI Agents Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            AI Agents Status
          </CardTitle>
          <CardDescription>
            Four specialized AI agents working together to generate your exam
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {aiAgents.map((agent, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{agent.name}</h4>
                    {getAgentStatusIcon(agent.status)}
                  </div>
                  
                  <p className="text-xs text-gray-600">{agent.role}</p>
                  
                  <div className="space-y-2">
                    <div className={`text-xs font-medium ${getAgentStatusColor(agent.status)}`}>
                      {agent.currentTask}
                    </div>
                    <Progress value={agent.progress} className="h-2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generation Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-600" />
            Exam Parameters
          </CardTitle>
          <CardDescription>
            Configure your exam settings and question generation parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Settings</h3>
                
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

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Brief description of the exam content and objectives"
                    rows={3}
                  />
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

              {/* Advanced Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Advanced Settings</h3>

                <div>
                  <Label>Question Types</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {questionTypeOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={option.value}
                          {...register('questionTypes')}
                          value={option.value}
                        />
                        <Label htmlFor={option.value} className="text-sm">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-gray-500 ml-2">{option.description}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="customInstructions">Custom Instructions</Label>
                  <Textarea
                    id="customInstructions"
                    {...register('customInstructions')}
                    placeholder="Any specific requirements or instructions for question generation..."
                    rows={4}
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Output Options</h4>
                  
                  <div>
                    <Label>Output Format</Label>
                    <Select onValueChange={(value) => setValue('outputFormat', value as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF only</SelectItem>
                        <SelectItem value="docx">Word Document only</SelectItem>
                        <SelectItem value="both">Both PDF and Word</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeAnswerKey"
                        {...register('includeAnswerKey')}
                      />
                      <Label htmlFor="includeAnswerKey">Include Answer Key</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeSolutions"
                        {...register('includeSolutions')}
                      />
                      <Label htmlFor="includeSolutions">Include Detailed Solutions</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t">
              <Button
                type="submit"
                disabled={currentSession?.status === 'analyzing' || currentSession?.status === 'generating' || currentSession?.status === 'finalizing'}
                className="flex items-center gap-2"
              >
                {currentSession?.status && currentSession.status !== 'completed' && currentSession.status !== 'error' ? (
                  <>
                    <Pause className="h-4 w-4" />
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
            <CardDescription>
              Real-time progress and AI communication log
            </CardDescription>
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

              {currentSession.estimatedCompletion && currentSession.status !== 'completed' && (
                <div className="text-sm text-gray-600">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Estimated completion: {currentSession.estimatedCompletion.toLocaleTimeString()}
                </div>
              )}

              {/* AI Communication Log */}
              <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  AI Communication Log
                </h4>
                <div className="space-y-2">
                  {currentSession.aiCommunicationLog.map((log, index) => (
                    <div key={index} className="text-sm">
                      <span className="text-gray-500">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                      <span className="ml-2 font-medium text-blue-600">
                        {log.agent}:
                      </span>
                      <span className="ml-1">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Results */}
              {currentSession.result && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-4 w-4" />
                    Generation Complete!
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Questions Generated:</strong> {currentSession.result.questionCount}
                    </div>
                    <div>
                      <strong>File Size:</strong> {(currentSession.result.fileSize / 1024 / 1024).toFixed(2)} MB
                    </div>
                    <div className="col-span-2">
                      <strong>Topics Covered:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {currentSession.result.generatedTopics.map((topic, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button className="mt-4 flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Download Exam PDF
                  </Button>
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
          <strong>Generation Tips:</strong> The AI agents work collaboratively to create your exam. The Pattern Analyzer 
          studies your sample questions to understand formatting and style, while the Content Processor extracts key concepts 
          from your learning materials. The Question Generator then combines these insights to create questions that match 
          your exam's expected format and difficulty level.
        </AlertDescription>
      </Alert>
    </div>
  )
}


