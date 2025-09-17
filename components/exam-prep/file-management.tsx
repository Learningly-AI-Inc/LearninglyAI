"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  Trash2, 
  Edit3,
  Search,
  Filter,
  BookOpen,
  Brain,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  MoreHorizontal,
  Calendar,
  Folder,
  Archive
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface UploadedFile {
  id: string
  name: string
  originalName: string
  size: number
  type: string
  category: 'sample_questions' | 'learning_materials'
  subcategory?: 'textbook' | 'notes' | 'presentation' | 'research' | 'exam_paper' | 'practice_questions'
  uploadDate: Date
  lastModified: Date
  status: 'pending' | 'processing' | 'analyzed' | 'failed'
  analysisResults?: {
    keyPoints: string[]
    topicsCovered: string[]
    difficultyLevel: string
    questionPotential: number
    readabilityScore?: number
  }
  usageCount: number // How many times used in exam generation
  isArchived: boolean
  tags: string[]
  notes: string
}

interface FileStats {
  totalFiles: number
  totalSizeMB: number
  sampleQuestions: {
    count: number
    sizeMB: number
    analyzed: number
  }
  learningMaterials: {
    count: number
    sizeMB: number
    analyzed: number
  }
  archivedFiles: number
}

export function FileManagement() {
  const [files, setFiles] = React.useState<UploadedFile[]>([])
  const [searchTerm, setSearchTerm] = React.useState('')
  const [activeTab, setActiveTab] = React.useState<'all' | 'sample_questions' | 'learning_materials' | 'archived'>('all')
  const [sortBy, setSortBy] = React.useState<'date' | 'name' | 'size' | 'usage'>('date')
  const [filterBy, setFilterBy] = React.useState<'all' | 'analyzed' | 'pending'>('all')
  const [editingFile, setEditingFile] = React.useState<string | null>(null)
  const [fileStats, setFileStats] = React.useState<FileStats>({
    totalFiles: 0,
    totalSizeMB: 0,
    sampleQuestions: { count: 0, sizeMB: 0, analyzed: 0 },
    learningMaterials: { count: 0, sizeMB: 0, analyzed: 0 },
    archivedFiles: 0
  })

  // Initialize with empty state - no mock data

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getCategoryIcon = (category: UploadedFile['category']) => {
    return category === 'sample_questions' ? <Upload className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />
  }

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'analyzed': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'processing': return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600" />
      case 'pending': return <HelpCircle className="h-4 w-4 text-gray-400" />
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-600" />
      default: return null
    }
  }

  const filteredFiles = React.useMemo(() => {
    let filtered = files.filter(file => {
      // Tab filter
      if (activeTab === 'sample_questions' && file.category !== 'sample_questions') return false
      if (activeTab === 'learning_materials' && file.category !== 'learning_materials') return false
      if (activeTab === 'archived' && !file.isArchived) return false
      if (activeTab === 'all' && file.isArchived) return false

      // Search filter
      const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          file.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          file.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          file.notes.toLowerCase().includes(searchTerm.toLowerCase())

      // Status filter
      const matchesStatus = filterBy === 'all' || 
                          (filterBy === 'analyzed' && file.status === 'analyzed') ||
                          (filterBy === 'pending' && file.status !== 'analyzed')

      return matchesSearch && matchesStatus
    })

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.originalName.localeCompare(b.originalName)
        case 'size':
          return b.size - a.size
        case 'usage':
          return b.usageCount - a.usageCount
        case 'date':
        default:
          return b.uploadDate.getTime() - a.uploadDate.getTime()
      }
    })

    return filtered
  }, [files, activeTab, searchTerm, filterBy, sortBy])

  const handleDeleteFile = (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (file && window.confirm(`Are you sure you want to delete "${file.originalName}"? This action cannot be undone.`)) {
      setFiles(prev => prev.filter(f => f.id !== fileId))
      toast({
        title: "File Deleted",
        description: `"${file.originalName}" has been permanently deleted.`,
      })
    }
  }

  const handleArchiveFile = (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, isArchived: !f.isArchived } : f
    ))
    
    toast({
      title: file?.isArchived ? "File Unarchived" : "File Archived",
      description: file?.isArchived 
        ? `"${file.originalName}" has been moved back to active files.`
        : `"${file.originalName}" has been archived.`,
    })
  }

  const handleUpdateFile = (fileId: string, updates: Partial<UploadedFile>) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, ...updates, lastModified: new Date() } : f
    ))
    setEditingFile(null)
    toast({
      title: "File Updated",
      description: "File information has been updated successfully.",
    })
  }

  return (
    <div className="space-y-6">
      {/* File Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {fileStats.totalFiles}
              </div>
              <div className="text-sm text-gray-600">Active Files</div>
              <div className="text-xs text-gray-500 mt-1">
                {fileStats.totalSizeMB.toFixed(1)} MB
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {fileStats.sampleQuestions.count}
              </div>
              <div className="text-sm text-gray-600">Sample Questions</div>
              <div className="text-xs text-gray-500 mt-1">
                {fileStats.sampleQuestions.analyzed} analyzed
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {fileStats.learningMaterials.count}
              </div>
              <div className="text-sm text-gray-600">Learning Materials</div>
              <div className="text-xs text-gray-500 mt-1">
                {fileStats.learningMaterials.analyzed} analyzed
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {fileStats.archivedFiles}
              </div>
              <div className="text-sm text-gray-600">Archived Files</div>
              <div className="text-xs text-gray-500 mt-1">
                Hidden from active use
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search files by name, tags, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort by Date</SelectItem>
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="size">Sort by Size</SelectItem>
                <SelectItem value="usage">Sort by Usage</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterBy} onValueChange={(value) => setFilterBy(value as any)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Files</SelectItem>
                <SelectItem value="analyzed">Analyzed Only</SelectItem>
                <SelectItem value="pending">Pending Analysis</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* File Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Folder className="h-4 w-4" />
            All Files
          </TabsTrigger>
          <TabsTrigger value="sample_questions" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Sample Questions
          </TabsTrigger>
          <TabsTrigger value="learning_materials" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Learning Materials
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Archived
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {/* File List */}
          <div className="space-y-4">
            {filteredFiles.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
                    <p className="text-gray-600">
                      {searchTerm ? 'Try adjusting your search terms or filters.' : 'Upload files to see them here.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredFiles.map((file) => (
                <Card key={file.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="text-blue-600 mt-1">
                      {getCategoryIcon(file.category)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium truncate">{file.originalName}</h4>
                        <Badge variant="outline" className="text-xs">
                          {file.subcategory?.replace('_', ' ') || file.category.replace('_', ' ')}
                        </Badge>
                        {getStatusIcon(file.status)}
                        {file.isArchived && (
                          <Badge variant="secondary" className="text-xs">
                            <Archive className="h-3 w-3 mr-1" />
                            Archived
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
                        <div>Size: {formatFileSize(file.size)}</div>
                        <div>Uploaded: {formatDate(file.uploadDate)}</div>
                        <div>Used: {file.usageCount} times</div>
                        <div>Modified: {formatDate(file.lastModified)}</div>
                      </div>
                      
                      {file.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {file.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {file.notes && (
                        <p className="text-sm text-gray-600 italic mb-2">"{file.notes}"</p>
                      )}
                      
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEditingFile(file.id)}
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleArchiveFile(file.id)}
                        title={file.isArchived ? "Unarchive" : "Archive"}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteFile(file.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Guidelines */}
      <Alert>
        <Folder className="h-4 w-4" />
        <AlertDescription>
          <strong>File Management Tips:</strong> Use tags and notes to organize your files effectively. Archive old or 
          outdated files to keep your active workspace clean. Files that have been used in exam generation show usage 
          counts to help you identify valuable content. Regular analysis ensures your files are ready for question generation.
        </AlertDescription>
      </Alert>
    </div>
  )
}


