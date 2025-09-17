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
  Bot,
  Trash2,
  Eye,
  Download
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  uploadDate: string
  status: 'uploading' | 'processing' | 'analyzed' | 'failed'
  patternAnalysis?: {
    questionTypes: string[]
    difficultyDistribution: { easy: number; medium: number; hard: number }
    topicAreas: string[]
    questionCount: number
    averageWordCount: number
    insights: string[]
  }
}

interface UploadLimits {
  maxFiles: number
  maxSizePerFile: number // in MB
  currentCount: number
  remainingFiles: number
}

export function SampleQuestionsUpload() {
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([])
  const [uploading, setUploading] = React.useState(false)
  const [dragActive, setDragActive] = React.useState(false)
  const [uploadLimits, setUploadLimits] = React.useState<UploadLimits>({
    maxFiles: 10,
    maxSizePerFile: 50,
    currentCount: 0,
    remainingFiles: 10
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

  const validateFiles = (files: FileList) => {
    const validFiles: File[] = []
    const errors: string[] = []

    Array.from(files).forEach(file => {
      // Check file count limit
      if (uploadedFiles.length + validFiles.length >= uploadLimits.maxFiles) {
        errors.push(`Maximum ${uploadLimits.maxFiles} files allowed`)
        return
      }

      // Check file size limit
      if (file.size > uploadLimits.maxSizePerFile * 1024 * 1024) {
        errors.push(`${file.name} exceeds ${uploadLimits.maxSizePerFile}MB limit`)
        return
      }

      // Check file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name} is not a supported file type`)
        return
      }

      validFiles.push(file)
    })

    return { validFiles, errors }
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
      const newFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadDate: new Date().toISOString().split('T')[0],
        status: 'uploading'
      }

      setUploadedFiles(prev => [...prev, newFile])

      try {
        // Simulate file upload
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Update to processing
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileId ? { ...f, status: 'processing' } : f)
        )

        // Simulate pattern analysis
        await new Promise(resolve => setTimeout(resolve, 3000))

        // Mock pattern analysis results
        const mockAnalysis = {
          questionTypes: ['Multiple Choice', 'Short Answer', 'Essay'],
          difficultyDistribution: { 
            easy: Math.floor(Math.random() * 30) + 10, 
            medium: Math.floor(Math.random() * 40) + 40, 
            hard: Math.floor(Math.random() * 30) + 10 
          },
          topicAreas: ['Topic A', 'Topic B', 'Topic C', 'Topic D'],
          questionCount: Math.floor(Math.random() * 50) + 20,
          averageWordCount: Math.floor(Math.random() * 50) + 50,
          insights: [
            'Balanced question distribution',
            'Clear difficulty progression',
            'Comprehensive topic coverage'
          ]
        }

        setUploadedFiles(prev => 
          prev.map(f => f.id === fileId ? { 
            ...f, 
            status: 'analyzed',
            patternAnalysis: mockAnalysis
          } : f)
        )

        toast({
          title: "Analysis Complete",
          description: `Pattern analysis completed for ${file.name}`,
        })

      } catch (error) {
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileId ? { ...f, status: 'failed' } : f)
        )
        toast({
          title: "Upload Failed",
          description: `Failed to process ${file.name}`,
          variant: "destructive"
        })
      }
    }

    setUploading(false)
    setUploadLimits(prev => ({
      ...prev,
      currentCount: prev.currentCount + validFiles.length,
      remainingFiles: prev.remainingFiles - validFiles.length
    }))
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

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
    setUploadLimits(prev => ({
      ...prev,
      currentCount: prev.currentCount - 1,
      remainingFiles: prev.remainingFiles + 1
    }))
  }

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
      case 'processing':
        return <Bot className="h-4 w-4 text-yellow-600 animate-pulse" />
      case 'analyzed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Limits Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {uploadedFiles.filter(f => f.status === 'analyzed').length}/{uploadLimits.maxFiles}
              </div>
              <div className="text-sm text-gray-600">Files Uploaded</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {uploadLimits.maxSizePerFile}MB
              </div>
              <div className="text-sm text-gray-600">Per File Limit</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        } ${uploadLimits.remainingFiles === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => uploadLimits.remainingFiles > 0 && fileInputRef.current?.click()}
      >
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Upload Sample Questions
        </h3>
        <p className="text-gray-600 mb-4">
          Drop files here or click to browse. Supports PDF, DOC, DOCX
        </p>
        <Button 
          disabled={uploadLimits.remainingFiles === 0 || uploading}
          className="mx-auto"
        >
          Choose Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Progress Bar */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading and analyzing files...</span>
            <span>Processing</span>
          </div>
          <Progress value={66} className="w-full" />
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Uploaded Files</h3>
          <div className="grid gap-4">
            {uploadedFiles.map((file) => (
              <Card key={file.id} className="p-4">
                <div className="flex items-start gap-4">
                  <FileText className="h-6 w-6 text-blue-600 mt-1" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium truncate">{file.name}</h4>
                      {getStatusIcon(file.status)}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      {formatFileSize(file.size)} • Uploaded {file.uploadDate}
                    </div>

                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeFile(file.id)}
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
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Upload Guidelines:</strong> Upload past exam papers, practice questions, and sample tests. 
          The AI will analyze question patterns, difficulty levels, and formatting styles to understand your exam structure.
          This analysis helps generate questions that match the expected format and difficulty progression.
        </AlertDescription>
      </Alert>
    </div>
  )
}


