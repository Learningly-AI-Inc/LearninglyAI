"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  X, 
  FileText, 
  Calendar, 
  HardDrive, 
  Eye, 
  Trash2, 
  Loader2,
  AlertCircle,
  RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

interface Document {
  id: string
  title: string
  originalFilename: string
  fileType: string
  fileSize: number
  pageCount: number
  textLength: number
  processingStatus: string
  publicUrl: string
  filePath: string
  createdAt: string
  updatedAt: string
  metadata: any
}

interface DocumentListModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DocumentListModal({ isOpen, onClose }: DocumentListModalProps) {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/reading/documents')
      const data = await response.json()
      
      if (data.success) {
        setDocuments(data.documents)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch documents",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error)
      toast({
        title: "Error",
        description: "Failed to fetch documents",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchDocuments()
    }
  }, [isOpen])

  const handleLoadDocument = (document: Document) => {
    const title = encodeURIComponent(document.title)
    const url = encodeURIComponent(document.publicUrl)
    router.push(`/reading/document-viewer?title=${title}&url=${url}`)
    onClose()
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return
    }

    setDeletingId(documentId)
    try {
      const response = await fetch(`/api/reading/documents?id=${documentId}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Document deleted successfully"
        })
        // Remove from local state
        setDocuments(prev => prev.filter(doc => doc.id !== documentId))
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete document",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Failed to delete document:', error)
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive"
      })
    } finally {
      setDeletingId(null)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>
      case 'processing':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Processing</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-semibold">Your Documents</h2>
            <p className="text-gray-600 mt-1">Load an existing document to continue reading</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchDocuments}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading documents...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
              <p className="text-gray-600">Upload your first document to get started</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {documents.map((document) => (
                <Card key={document.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {document.title}
                            </h3>
                            <p className="text-sm text-gray-500 truncate">
                              {document.originalFilename}
                            </p>
                          </div>
                          {getStatusBadge(document.processingStatus)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(document.createdAt)}
                          </div>
                          <div className="flex items-center gap-1">
                            <HardDrive className="h-4 w-4" />
                            {formatFileSize(document.fileSize)}
                          </div>
                          {document.pageCount > 0 && (
                            <span>{document.pageCount} page{document.pageCount !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLoadDocument(document)}
                          disabled={document.processingStatus !== 'completed'}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Load
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDocument(document.id)}
                          disabled={deletingId === document.id}
                        >
                          {deletingId === document.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
