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
  Zap,
  Loader2,
  RefreshCw
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"

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

interface UploadStats {
  totalFiles: number
  totalSizeMB: number
}

interface LearningMaterialsUploadProps {
  uploadedMaterials: LearningMaterial[]
  setUploadedMaterials: React.Dispatch<React.SetStateAction<LearningMaterial[]>>
  uploading: boolean
  setUploading: React.Dispatch<React.SetStateAction<boolean>>
  selectedFiles: string[]
  setSelectedFiles: React.Dispatch<React.SetStateAction<string[]>>
  isLoading: boolean
}

export function LearningMaterialsUpload({ 
  uploadedMaterials, 
  setUploadedMaterials, 
  uploading, 
  setUploading,
  selectedFiles,
  setSelectedFiles,
  isLoading
}: LearningMaterialsUploadProps) {
  const [dragActive, setDragActive] = React.useState(false)
  const [uploadStats, setUploadStats] = React.useState<UploadStats>({
    totalFiles: uploadedMaterials.length,
    totalSizeMB: uploadedMaterials.reduce((acc, material) => acc + (material.size / (1024 * 1024)), 0)
  })

  // Update stats when uploadedMaterials changes
  React.useEffect(() => {
    setUploadStats({
      totalFiles: uploadedMaterials.length,
      totalSizeMB: uploadedMaterials.reduce((acc, material) => acc + (material.size / (1024 * 1024)), 0)
    })
  }, [uploadedMaterials])

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
        // Upload to real API with learning_materials category
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'exam-prep')
        formData.append('category', 'learning_materials')

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
        setUploadedMaterials(prev => 
          prev.map(m => m.id === fileId ? { ...m, status: 'processing' } : m)
        )

        // Simulate content analysis (in real implementation, this would be handled by webhook)
        await new Promise(resolve => setTimeout(resolve, 3000))

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

        // Refresh files from database to get the actual extracted content
        setTimeout(async () => {
          try {
            const response = await fetch('/api/exam-prep/files')
            if (response.ok) {
              const data = await response.json()
              const files = data.files || []
              const learningMaterials = files.filter((file: any) => file.category === 'learning_materials')
              
              // Ensure all files have proper status mapping
              const properlyMappedFiles = learningMaterials.map((file: any) => ({
                ...file,
                status: file.processing_status === 'completed' ? 'analyzed' : 
                        file.processing_status === 'processing' ? 'processing' :
                        file.processing_status === 'failed' ? 'failed' : 'analyzed'
              }))
              
              setUploadedMaterials(properlyMappedFiles)
            }
          } catch (error) {
            console.error('Failed to refresh files after upload:', error)
          }
        }, 1000)

        toast({
          title: "Upload & Analysis Complete",
          description: `Learning material uploaded and analyzed: ${file.name}`,
        })

      } catch (error) {
        setUploadedMaterials(prev => 
          prev.map(m => m.id === fileId ? { ...m, status: 'failed' } : m)
        )
        toast({
          title: "Upload Failed",
          description: `Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        })
      }
    }

    setUploading(false)
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

  const [deletingMaterials, setDeletingMaterials] = React.useState<Set<string>>(new Set())
  const [refreshing, setRefreshing] = React.useState(false)

  const refreshMaterials = async () => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/exam-prep/files')
      if (response.ok) {
        const data = await response.json()
        const files = data.files || []
        const learningMaterials = files.filter((file: any) => file.category === 'learning_materials')
        
        // Ensure all files have proper status mapping
        const properlyMappedFiles = learningMaterials.map((file: any) => ({
          ...file,
          status: file.processing_status === 'completed' ? 'analyzed' : 
                  file.processing_status === 'processing' ? 'processing' :
                  file.processing_status === 'failed' ? 'failed' : 'analyzed'
        }))
        
        setUploadedMaterials(properlyMappedFiles)
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

  const removeMaterial = async (materialId: string) => {
    setDeletingMaterials(prev => new Set(prev).add(materialId))
    
    try {
      const response = await fetch(`/api/exam-prep/files/${materialId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove from local state
        setUploadedMaterials(prev => prev.filter(m => m.id !== materialId))
        setSelectedFiles(prev => prev.filter(id => id !== materialId))
        
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
      setDeletingMaterials(prev => {
        const newSet = new Set(prev)
        newSet.delete(materialId)
        return newSet
      })
    }
  }

  const toggleFileSelection = (materialId: string) => {
    setSelectedFiles(prev => {
      if (prev.includes(materialId)) {
        return prev.filter(id => id !== materialId)
      } else if (prev.length < 10) {
        return [...prev, materialId]
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <span className="ml-3 text-gray-600">Loading uploaded files...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upload Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold">Learning Materials</h3>
              {/* Select All Checkbox */}
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={uploadedMaterials.length > 0 && selectedFiles.length === uploadedMaterials.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      // Select all analyzed files
                      const analyzedFileIds = uploadedMaterials
                        .filter(material => material.status === 'analyzed')
                        .map(material => material.id)
                        .slice(0, 10) // Limit to 10 files
                      setSelectedFiles(analyzedFileIds)
                    } else {
                      // Deselect all
                      setSelectedFiles([])
                    }
                  }}
                  className="h-5 w-5 border-2 border-gray-400 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 data-[state=checked]:text-white"
                />
                <span className="text-sm text-gray-600">Select All</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshMaterials}
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
            {uploadedMaterials.map((material) => (
              <Card key={material.id} className={`p-4 ${selectedFiles.includes(material.id) ? 'ring-2 ring-green-500 bg-green-50' : ''}`}>
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={selectedFiles.includes(material.id)}
                    onCheckedChange={() => toggleFileSelection(material.id)}
                    disabled={material.status !== 'analyzed'}
                    className="h-6 w-6 border-2 border-gray-300 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 data-[state=checked]:text-white mt-1"
                  />
                  
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

                    {material.status === 'analyzed' && material.contentAnalysis && (
                      <div className="text-xs text-gray-500">
                        {material.contentAnalysis.keyConceptsCount} concepts • {material.contentAnalysis.difficultyLevel} level
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
                          <DialogTitle>Extracted Content: {material.name}</DialogTitle>
                          <DialogDescription>
                            {material.extracted_content ? 
                              `Content extracted from PDF (${material.extracted_content.length} characters)` :
                              'Content not yet extracted or available'
                            }
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4">
                          {material.extracted_content ? (
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <pre className="whitespace-pre-wrap text-sm font-mono">
                                {material.extracted_content}
                              </pre>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>Content extraction is still in progress or failed.</p>
                              <p className="text-sm mt-2">Status: {material.processing_status || 'Unknown'}</p>
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
                          disabled={deletingMaterials.has(material.id)}
                        >
                          {deletingMaterials.has(material.id) ? (
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
                            Are you sure you want to delete "{material.name}"? This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <DialogTrigger asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogTrigger>
                          <Button
                            onClick={() => removeMaterial(material.id)}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deletingMaterials.has(material.id)}
                          >
                            {deletingMaterials.has(material.id) ? (
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


