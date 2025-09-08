"use client"

import * as React from "react"
import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileText, X, Check, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { useDocument } from "./document-context"

interface FileUploaderProps {
  onClose?: () => void
}

const SUPPORTED_TYPES = {
  'pdf': { mime: 'application/pdf', label: 'PDF' },
  'txt': { mime: 'text/plain', label: 'TXT' }
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function FileUploaderComponent({ onClose }: FileUploaderProps) {
  const router = useRouter()
  const { uploadDocument, uploadProgress, resetUpload } = useDocument()
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const validateFile = (selectedFile: File): string | null => {
    // Check file size
    if (selectedFile.size === 0) {
      return 'File is empty'
    }
    
    if (selectedFile.size > MAX_FILE_SIZE) {
      return `File size (${Math.round(selectedFile.size / 1024 / 1024)}MB) exceeds 20MB limit`
    }
    
    // Check file extension
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase() || ''
    if (!Object.keys(SUPPORTED_TYPES).includes(fileExtension)) {
      return `Unsupported file type ".${fileExtension}". Please use PDF or TXT files.`
    }
    
    return null // No errors
  }
  
  const handleFileSelect = (selectedFile: File) => {
    console.log('📁 File selected:', {
      name: selectedFile.name,
      type: selectedFile.type,
      size: selectedFile.size
    })
    
    const error = validateFile(selectedFile)
    if (error) {
      toast({
        title: "Invalid file",
        description: error,
        variant: "destructive"
      })
      return
    }
    
    setFile(selectedFile)
    resetUpload()
  }

  const handleChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleUpload = useCallback(async () => {
    if (!file) return
    
    try {
      const result = await uploadDocument(file)
      
      toast({
        title: "Upload successful",
        description: `${file.name} has been processed and is ready for analysis.`,
      })
      
      // Navigate to document viewer with the actual file URL and document ID
      const title = result.title || file.name
      const url = result.fileUrl
      const documentId = result.documentId
      
      if (url && documentId) {
        router.push(`/reading/document-viewer?title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}&documentId=${encodeURIComponent(documentId)}`)
      } else if (url) {
        router.push(`/reading/document-viewer?title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`)
      } else {
        // Fallback if no URL returned
        router.push(`/reading/document-viewer?title=${encodeURIComponent(title)}`)
      }
      
      onClose?.()
      
    } catch (error: any) {
      console.error('Upload failed:', error)
      
      toast({
        title: "Upload failed",
        description: error.message || "Please try again or contact support if the issue persists.",
        variant: "destructive"
      })
    }
  }, [file, uploadDocument, router, onClose])
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!dragActive) setDragActive(true)
  }
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleRetry = () => {
    resetUpload()
    setFile(null)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Upload Document</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* File Selection Stage */}
        {!file && uploadProgress.stage === 'idle' && (
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              Drag & drop your document here or click to browse
            </p>
            <p className="text-gray-500 text-sm mb-4">
              Supports PDF, TXT • Max 20MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              onChange={(e) => handleChange(e.target.files)}
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()}>
              Browse Files
            </Button>
          </div>
        )}

        {/* File Selected Stage */}
        {file && uploadProgress.stage === 'idle' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <FileText className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <p className="font-medium mb-2">Ready to Upload</p>
            <p className="text-gray-600 mb-1">{file.name}</p>
            <p className="text-gray-500 text-sm mb-4">{formatFileSize(file.size)}</p>
            <div className="flex gap-2">
              <Button variant="outline" className="w-1/2" onClick={() => setFile(null)}>
                Change file
              </Button>
              <Button className="w-1/2" onClick={handleUpload}>
                Upload
              </Button>
            </div>
          </div>
        )}

        {/* Upload Progress Stage */}
        {uploadProgress.stage === 'uploading' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
            </div>
            <p className="font-medium mb-2">Uploading...</p>
            <p className="text-gray-600 mb-4">{uploadProgress.message}</p>
            <Progress value={uploadProgress.progress} className="h-2 mb-2" />
            <p className="text-sm text-gray-500">{uploadProgress.progress}% complete</p>
          </div>
        )}

        {/* Processing Stage */}
        {uploadProgress.stage === 'processing' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 text-yellow-600 animate-spin" />
              </div>
            </div>
            <p className="font-medium mb-2">Processing Document</p>
            <p className="text-gray-600 mb-4">{uploadProgress.message}</p>
            <Progress value={uploadProgress.progress} className="h-2 mb-2" />
            <p className="text-sm text-gray-500">{uploadProgress.progress}% complete</p>
          </div>
        )}

        {/* Success Stage */}
        {uploadProgress.stage === 'complete' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <p className="font-medium mb-2">Upload Complete!</p>
            <p className="text-gray-600 mb-4">{uploadProgress.message}</p>
            <Progress value={100} className="h-2" />
          </div>
        )}

        {/* Error Stage */}
        {uploadProgress.stage === 'error' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <p className="font-medium mb-2 text-red-600">Upload Failed</p>
            <p className="text-gray-600 mb-4 text-sm">{uploadProgress.message}</p>
            <div className="flex gap-2">
              <Button variant="outline" className="w-1/2" onClick={handleRetry}>
                Try Again
              </Button>
              <Button variant="outline" className="w-1/2" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}