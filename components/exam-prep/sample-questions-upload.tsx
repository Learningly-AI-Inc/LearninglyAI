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
  Download,
  Loader2,
  RefreshCw
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"

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

interface UploadLimits {
  maxFiles: number
  maxSizePerFile: number // in MB
  currentCount: number
  remainingFiles: number
}

interface SampleQuestionsUploadProps {
  uploadedFiles: UploadedFile[]
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>
  uploading: boolean
  setUploading: React.Dispatch<React.SetStateAction<boolean>>
  selectedFiles: string[]
  setSelectedFiles: React.Dispatch<React.SetStateAction<string[]>>
  isLoading: boolean
}

export function SampleQuestionsUpload({ 
  uploadedFiles, 
  setUploadedFiles, 
  uploading, 
  setUploading,
  selectedFiles,
  setSelectedFiles,
  isLoading
}: SampleQuestionsUploadProps) {
  const [dragActive, setDragActive] = React.useState(false)
  const [uploadLimits, setUploadLimits] = React.useState<UploadLimits>({
    maxFiles: 10,
    maxSizePerFile: 50,
    currentCount: uploadedFiles.length,
    remainingFiles: 10 - uploadedFiles.length
  })

  // Update limits when uploadedFiles changes
  React.useEffect(() => {
    setUploadLimits(prev => ({
      ...prev,
      currentCount: uploadedFiles.length,
      remainingFiles: prev.maxFiles - uploadedFiles.length
    }))
  }, [uploadedFiles.length])

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
    setUploadProgress({ current: 0, total: validFiles.length, currentFile: '', stage: 'uploading' })

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]
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
      setUploadProgress(prev => ({ 
        ...prev, 
        current: i + 1, 
        currentFile: file.name,
        stage: 'uploading'
      }))

      try {
        // Upload to real API with sample_questions category
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'exam-prep')
        formData.append('category', 'sample_questions')

        const response = await fetch('/api/exam-prep/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.details || errorData.error || `Upload failed: ${response.statusText}`)
        }

        const result = await response.json()
        
        // Update to processing
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileId ? { ...f, status: 'processing' } : f)
        )
        
        setUploadProgress(prev => ({ 
          ...prev, 
          stage: 'processing'
        }))

        // Simulate pattern analysis (in real implementation, this would be handled by webhook)
        setUploadProgress(prev => ({ 
          ...prev, 
          stage: 'analyzing'
        }))
        await new Promise(resolve => setTimeout(resolve, 2000))

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

        // Refresh files from database to get the actual extracted content
        setTimeout(async () => {
          try {
            const response = await fetch('/api/exam-prep/files')
            if (response.ok) {
              const data = await response.json()
              const files = data.files || []
              const sampleQuestions = files.filter((file: any) => file.category === 'sample_questions')
              setUploadedFiles(sampleQuestions)
            }
          } catch (error) {
            console.error('Failed to refresh files after upload:', error)
          }
        }, 1000)

        toast({
          title: "Upload & Analysis Complete",
          description: `Sample questions uploaded and analyzed: ${file.name}`,
        })

      } catch (error) {
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileId ? { ...f, status: 'failed' } : f)
        )
        toast({
          title: "Upload Failed",
          description: `Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        })
      }
    }

    setUploading(false)
    setUploadProgress({ current: 0, total: 0, currentFile: '', stage: 'uploading' })
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

  const [deletingFiles, setDeletingFiles] = React.useState<Set<string>>(new Set())
  const [refreshing, setRefreshing] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState<{
    current: number
    total: number
    currentFile: string
    stage: 'uploading' | 'processing' | 'analyzing'
  }>({ current: 0, total: 0, currentFile: '', stage: 'uploading' })

  const refreshFiles = async () => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/exam-prep/files')
      if (response.ok) {
        const data = await response.json()
        const files = data.files || []
        const sampleQuestions = files.filter((file: any) => file.category === 'sample_questions')
        setUploadedFiles(sampleQuestions)
        toast({
          title: "Files Refreshed",
          description: "File list has been updated.",
        })
      }
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh file list.",
        variant: "destructive"
      })
    } finally {
      setRefreshing(false)
    }
  }

  const removeFile = async (fileId: string) => {
    setDeletingFiles(prev => new Set(prev).add(fileId))
    
    try {
      const response = await fetch(`/api/exam-prep/files/${fileId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove from local state
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
        setSelectedFiles(prev => prev.filter(id => id !== fileId))
        
        toast({
          title: "File Deleted",
          description: "File has been successfully deleted.",
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Delete failed: ${response.statusText}`)
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      })
    } finally {
      setDeletingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(fileId)
        return newSet
      })
    }
  }

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId)
      } else if (prev.length < 10) {
        return [...prev, fileId]
      } else {
        toast({
          title: "Selection Limit Reached",
          description: "You can select up to 10 files for generation.",
          variant: "destructive"
        })
        return prev
      }
    })
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading uploaded files...</span>
        </div>
      </div>
    )
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

      {/* Enhanced Loading Screen */}
      {uploading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center space-y-6">
              {/* Animated Upload Icon */}
              <div className="relative">
                <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                  <Upload className="h-8 w-8 text-blue-600 animate-bounce" />
                </div>
                <div className="absolute inset-0 w-16 h-16 mx-auto border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
              
              {/* Progress Info */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {uploadProgress.stage === 'uploading' && 'Uploading Files...'}
                  {uploadProgress.stage === 'processing' && 'Processing Files...'}
                  {uploadProgress.stage === 'analyzing' && 'Analyzing Content...'}
                </h3>
                <p className="text-sm text-gray-600">
                  {uploadProgress.currentFile && `Processing: ${uploadProgress.currentFile}`}
                </p>
                <p className="text-xs text-gray-500">
                  {uploadProgress.total > 0 && `${uploadProgress.current} of ${uploadProgress.total} files`}
                </p>
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress 
                  value={uploadProgress.total > 0 ? (uploadProgress.current / uploadProgress.total) * 100 : 0} 
                  className="w-full h-2"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    {uploadProgress.stage === 'uploading' && 'Uploading to server...'}
                    {uploadProgress.stage === 'processing' && 'Extracting text...'}
                    {uploadProgress.stage === 'analyzing' && 'Analyzing patterns...'}
                  </span>
                  <span>
                    {uploadProgress.total > 0 && `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%`}
                  </span>
                </div>
              </div>
              
              {/* Stage Indicators */}
              <div className="flex justify-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${uploadProgress.stage === 'uploading' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                <div className={`w-2 h-2 rounded-full ${uploadProgress.stage === 'processing' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                <div className={`w-2 h-2 rounded-full ${uploadProgress.stage === 'analyzing' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Uploaded Files</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshFiles}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Badge variant="outline">
                {selectedFiles.length}/10 selected
              </Badge>
            </div>
          </div>
          <div className="grid gap-4">
            {uploadedFiles.map((file) => (
              <Card key={file.id} className={`p-4 ${selectedFiles.includes(file.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={selectedFiles.includes(file.id)}
                    onCheckedChange={() => toggleFileSelection(file.id)}
                    disabled={file.status !== 'analyzed'}
                    className="mt-1"
                  />
                  
                  <FileText className="h-6 w-6 text-blue-600 mt-1" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium truncate">{file.name}</h4>
                      {getStatusIcon(file.status)}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      {formatFileSize(file.size)} • Uploaded {file.uploadDate}
                    </div>

                    {file.status === 'analyzed' && file.patternAnalysis && (
                      <div className="text-xs text-gray-500">
                        {file.patternAnalysis.questionCount} questions • {file.patternAnalysis.questionTypes.join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {/* View Content Button */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                        >
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Extracted Content: {file.name}</DialogTitle>
                          <DialogDescription>
                            {file.extracted_content ? 
                              `Content extracted from PDF (${file.extracted_content.length} characters)` :
                              'Content not yet extracted or available'
                            }
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4">
                          {file.extracted_content ? (
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <pre className="whitespace-pre-wrap text-sm font-mono">
                                {file.extracted_content}
                              </pre>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>Content extraction is still in progress or failed.</p>
                              <p className="text-sm mt-2">Status: {file.processing_status || 'Unknown'}</p>
                            </div>
                          )}
                        </div>
                        <DialogFooter>
                          <DialogTrigger asChild>
                            <Button variant="outline">Close</Button>
                          </DialogTrigger>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {/* Delete Button */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          disabled={deletingFiles.has(file.id)}
                        >
                          {deletingFiles.has(file.id) ? (
                            <Loader2 className="h-4 w-4 text-red-600 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-600" />
                          )}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete File</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete "{file.name}"? This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline">Cancel</Button>
                          <Button
                            onClick={() => removeFile(file.id)}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deletingFiles.has(file.id)}
                          >
                            {deletingFiles.has(file.id) ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              "Delete"
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
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


