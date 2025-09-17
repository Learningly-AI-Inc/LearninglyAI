"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Brain,
  Trash2,
  Eye,
  Download,
  BookOpen,
  Zap
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface LearningMaterial {
  id: string
  name: string
  size: number
  type: string
  uploadDate: string
  status: 'uploading' | 'processing' | 'analyzed' | 'failed'
  category: 'textbook' | 'notes' | 'presentation' | 'research' | 'other'
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

interface UploadStats {
  totalFiles: number
  totalSizeMB: number
  analyzedFiles: number
  totalConcepts: number
}

export function LearningMaterialsUpload() {
  const [uploadedMaterials, setUploadedMaterials] = React.useState<LearningMaterial[]>([])
  const [uploading, setUploading] = React.useState(false)
  const [dragActive, setDragActive] = React.useState(false)
  const [uploadStats, setUploadStats] = React.useState<UploadStats>({
    totalFiles: 0,
    totalSizeMB: 0,
    analyzedFiles: 0,
    totalConcepts: 0
  })

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const { register, handleSubmit, formState: { errors } } = useForm()

  // Initialize with empty state - no mock data

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getCategoryIcon = (category: LearningMaterial['category']) => {
    switch (category) {
      case 'textbook':
        return <BookOpen className="h-4 w-4" />
      case 'notes':
        return <FileText className="h-4 w-4" />
      case 'presentation':
        return <FileText className="h-4 w-4" />
      case 'research':
        return <Brain className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const validateFiles = (files: FileList) => {
    const validFiles: File[] = []
    const errors: string[] = []

    Array.from(files).forEach(file => {
      // Check file size limit (100MB for learning materials)
      if (file.size > 100 * 1024 * 1024) {
        errors.push(`${file.name} exceeds 100MB limit`)
        return
      }

      // Check file type
      const allowedTypes = [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain'
      ]
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name} is not a supported file type`)
        return
      }

      validFiles.push(file)
    })

    return { validFiles, errors }
  }

  const categorizeFile = (fileName: string): LearningMaterial['category'] => {
    const lowerName = fileName.toLowerCase()
    if (lowerName.includes('textbook') || lowerName.includes('book')) return 'textbook'
    if (lowerName.includes('notes') || lowerName.includes('note')) return 'notes'
    if (lowerName.includes('presentation') || lowerName.includes('slides') || lowerName.includes('ppt')) return 'presentation'
    if (lowerName.includes('research') || lowerName.includes('paper') || lowerName.includes('journal')) return 'research'
    return 'other'
  }

  const handleFileUpload = async (files: FileList) => {
    const { validFiles, errors } = validateFiles(files)

    if (errors.length > 0) {
      errors.forEach(error => {
        toast({
          title: "Upload Error",
          description: error,
          variant: "destructive"
        })
      })
    }

    if (validFiles.length === 0) return

    setUploading(true)

    for (const file of validFiles) {
      const fileId = Math.random().toString(36).substr(2, 9)
      const newMaterial: LearningMaterial = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadDate: new Date().toISOString().split('T')[0],
        status: 'uploading',
        category: categorizeFile(file.name)
      }

      setUploadedMaterials(prev => [...prev, newMaterial])

      try {
        // Simulate file upload
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Update to processing
        setUploadedMaterials(prev => 
          prev.map(m => m.id === fileId ? { ...m, status: 'processing' } : m)
        )

        // Simulate content analysis (longer for learning materials)
        await new Promise(resolve => setTimeout(resolve, 5000))

        // Mock content analysis results
        const mockAnalysis = {
          topicCoverage: ['Topic A', 'Topic B', 'Topic C', 'Topic D', 'Topic E'],
          keyConceptsCount: Math.floor(Math.random() * 100) + 50,
          difficultyLevel: (['beginner', 'intermediate', 'advanced'] as const)[Math.floor(Math.random() * 3)],
          contentType: (['theoretical', 'practical', 'mixed'] as const)[Math.floor(Math.random() * 3)],
          readabilityScore: Math.floor(Math.random() * 30) + 70,
          textLength: Math.floor(Math.random() * 30000) + 10000,
          isOptimized: Math.random() > 0.3,
          optimizationSummary: 'Content processed and optimized for question generation.',
          chapterSummary: [
            {
              title: 'Chapter 1',
              keyPoints: ['Key concept 1', 'Key concept 2', 'Key concept 3'],
              questionPotential: Math.floor(Math.random() * 10) + 5
            },
            {
              title: 'Chapter 2', 
              keyPoints: ['Advanced concept 1', 'Advanced concept 2'],
              questionPotential: Math.floor(Math.random() * 10) + 5
            }
          ]
        }

        setUploadedMaterials(prev => 
          prev.map(m => m.id === fileId ? { 
            ...m, 
            status: 'analyzed',
            contentAnalysis: mockAnalysis
          } : m)
        )

        toast({
          title: "Analysis Complete",
          description: `Content analysis completed for ${file.name}`,
        })

      } catch (error) {
        setUploadedMaterials(prev => 
          prev.map(m => m.id === fileId ? { ...m, status: 'failed' } : m)
        )
        toast({
          title: "Upload Failed",
          description: `Failed to process ${file.name}`,
          variant: "destructive"
        })
      }
    }

    setUploading(false)
    
    // Update stats
    const newStats = uploadedMaterials.reduce((acc, material) => ({
      totalFiles: acc.totalFiles + 1,
      totalSizeMB: acc.totalSizeMB + (material.size / (1024 * 1024)),
      analyzedFiles: acc.analyzedFiles + (material.status === 'analyzed' ? 1 : 0),
      totalConcepts: acc.totalConcepts + (material.contentAnalysis?.keyConceptsCount || 0)
    }), uploadStats)
    
    setUploadStats(newStats)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
  }

  const removeMaterial = (materialId: string) => {
    setUploadedMaterials(prev => prev.filter(m => m.id !== materialId))
  }

  const getStatusIcon = (status: LearningMaterial['status']) => {
    switch (status) {
      case 'uploading':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
      case 'processing':
        return <Brain className="h-4 w-4 text-yellow-600 animate-pulse" />
      case 'analyzed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {uploadStats.totalFiles}
              </div>
              <div className="text-sm text-gray-600">Total Files</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {uploadStats.totalSizeMB.toFixed(1)}MB
              </div>
              <div className="text-sm text-gray-600">Total Size</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {uploadStats.analyzedFiles}
              </div>
              <div className="text-sm text-gray-600">Analyzed</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {uploadStats.totalConcepts}
              </div>
              <div className="text-sm text-gray-600">Key Concepts</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-purple-500 bg-purple-50' 
            : 'border-gray-300 hover:border-gray-400'
        } cursor-pointer`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Upload Learning Materials
        </h3>
        <p className="text-gray-600 mb-4">
          Drop textbooks, notes, presentations here or click to browse
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Supports PDF, DOC, DOCX, PPT, PPTX, TXT (max 100MB per file)
        </p>
        <Button 
          disabled={uploading}
          className="mx-auto"
        >
          Choose Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Progress Bar */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading and analyzing content...</span>
            <span>Processing</span>
          </div>
          <Progress value={75} className="w-full" />
        </div>
      )}

      {/* Uploaded Materials List */}
      {uploadedMaterials.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Learning Materials</h3>
          <div className="grid gap-4">
            {uploadedMaterials.map((material) => (
              <Card key={material.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="text-blue-600 mt-1">
                    {getCategoryIcon(material.category)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium truncate">{material.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {material.category}
                      </Badge>
                      {getStatusIcon(material.status)}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      {formatFileSize(material.size)} • Uploaded {material.uploadDate}
                    </div>

                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeMaterial(material.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Guidelines */}
      <Alert>
        <Brain className="h-4 w-4" />
        <AlertDescription>
          <strong>Content Guidelines:</strong> Upload comprehensive learning materials like textbooks, lecture notes, 
          research papers, and presentations. The AI will extract key concepts, analyze difficulty levels, and identify 
          topics suitable for question generation. Larger files with more content will provide better question variety.
        </AlertDescription>
      </Alert>
    </div>
  )
}


