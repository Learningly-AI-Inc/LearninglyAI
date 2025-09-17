"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  FileText, 
  Download, 
  Eye, 
  Trash2, 
  Share2, 
  Search,
  Calendar,
  Filter,
  MoreHorizontal,
  Clock,
  Users,
  Star,
  Copy
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface GeneratedPDF {
  id: string
  title: string
  description: string
  questionCount: number
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
  examLength: number
  createdAt: Date
  fileSize: number
  downloadCount: number
  isPublic: boolean
  isStarred: boolean
  topics: string[]
  generationParameters: {
    questionTypes: string[]
    aiAgentsUsed: string[]
    sourceFiles: {
      sampleQuestions: number
      learningMaterials: number
    }
  }
  status: 'ready' | 'generating' | 'failed'
  pdfUrl: string
  answerKeyUrl?: string
}

export function GeneratedPDFsHistory() {
  const [pdfs, setPdfs] = React.useState<GeneratedPDF[]>([])
  const [searchTerm, setSearchTerm] = React.useState('')
  const [sortBy, setSortBy] = React.useState<'date' | 'title' | 'downloads'>('date')
  const [filterBy, setFilterBy] = React.useState<'all' | 'starred' | 'public'>('all')
  const [loading, setLoading] = React.useState(false)

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

  const getDifficultyColor = (difficulty: GeneratedPDF['difficulty']) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      case 'mixed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredAndSortedPDFs = React.useMemo(() => {
    let filtered = pdfs.filter(pdf => {
      const matchesSearch = pdf.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          pdf.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          pdf.topics.some(topic => topic.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesFilter = filterBy === 'all' || 
                          (filterBy === 'starred' && pdf.isStarred) ||
                          (filterBy === 'public' && pdf.isPublic)
      
      return matchesSearch && matchesFilter
    })

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title)
        case 'downloads':
          return b.downloadCount - a.downloadCount
        case 'date':
        default:
          return b.createdAt.getTime() - a.createdAt.getTime()
      }
    })

    return filtered
  }, [pdfs, searchTerm, sortBy, filterBy])

  const handleDownload = (pdf: GeneratedPDF) => {
    // Simulate download
    setPdfs(prev => prev.map(p => 
      p.id === pdf.id ? { ...p, downloadCount: p.downloadCount + 1 } : p
    ))
    
    toast({
      title: "Download Started",
      description: `Downloading ${pdf.title}...`,
    })
  }

  const handleToggleStar = (pdfId: string) => {
    setPdfs(prev => prev.map(p => 
      p.id === pdfId ? { ...p, isStarred: !p.isStarred } : p
    ))
  }

  const handleTogglePublic = (pdfId: string) => {
    setPdfs(prev => prev.map(p => 
      p.id === pdfId ? { ...p, isPublic: !p.isPublic } : p
    ))
    
    const pdf = pdfs.find(p => p.id === pdfId)
    toast({
      title: pdf?.isPublic ? "Made Private" : "Made Public",
      description: pdf?.isPublic 
        ? "This exam is now private and cannot be accessed by others"
        : "This exam is now public and can be shared with others",
    })
  }

  const handleDelete = (pdfId: string) => {
    const pdf = pdfs.find(p => p.id === pdfId)
    if (pdf && window.confirm(`Are you sure you want to delete "${pdf.title}"? This action cannot be undone.`)) {
      setPdfs(prev => prev.filter(p => p.id !== pdfId))
      toast({
        title: "Exam Deleted",
        description: `"${pdf.title}" has been permanently deleted.`,
      })
    }
  }

  const handleCopyLink = (pdf: GeneratedPDF) => {
    if (!pdf.isPublic) {
      toast({
        title: "Cannot Copy Link",
        description: "This exam is private. Make it public first to share.",
        variant: "destructive"
      })
      return
    }
    
    const link = `${window.location.origin}/exams/public/${pdf.id}`
    navigator.clipboard.writeText(link)
    toast({
      title: "Link Copied",
      description: "Public exam link copied to clipboard!",
    })
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {pdfs.length}
              </div>
              <div className="text-sm text-gray-600">Total Exams</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {pdfs.reduce((sum, pdf) => sum + pdf.downloadCount, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Downloads</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {pdfs.filter(pdf => pdf.isStarred).length}
              </div>
              <div className="text-sm text-gray-600">Starred Exams</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {pdfs.filter(pdf => pdf.isPublic).length}
              </div>
              <div className="text-sm text-gray-600">Public Exams</div>
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
                  placeholder="Search exams by title, description, or topics..."
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
                <SelectItem value="title">Sort by Title</SelectItem>
                <SelectItem value="downloads">Sort by Downloads</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterBy} onValueChange={(value) => setFilterBy(value as any)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exams</SelectItem>
                <SelectItem value="starred">Starred Only</SelectItem>
                <SelectItem value="public">Public Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* PDF List */}
      <div className="space-y-4">
        {filteredAndSortedPDFs.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No exams found</h3>
                <p className="text-gray-600">
                  {searchTerm ? 'Try adjusting your search terms or filters.' : 'Generate your first exam to see it here.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedPDFs.map((pdf) => (
            <Card key={pdf.id} className="p-6">
              <div className="flex items-start gap-4">
                <FileText className="h-6 w-6 text-blue-600 mt-1" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold truncate">{pdf.title}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStar(pdf.id)}
                        className="p-1"
                      >
                        <Star className={`h-4 w-4 ${pdf.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                      </Button>
                      {pdf.isPublic && (
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          Public
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" title="Preview">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDownload(pdf)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {pdf.isPublic && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleCopyLink(pdf)}
                          title="Copy public link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleTogglePublic(pdf.id)}
                        title={pdf.isPublic ? "Make private" : "Make public"}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(pdf.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-3">{pdf.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                    <div>
                      <span className="font-medium">Questions:</span> {pdf.questionCount}
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span> {pdf.examLength} min
                    </div>
                    <div>
                      <span className="font-medium">Size:</span> {formatFileSize(pdf.fileSize)}
                    </div>
                    <div>
                      <span className="font-medium">Downloads:</span> {pdf.downloadCount}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className={getDifficultyColor(pdf.difficulty)}>
                      {pdf.difficulty}
                    </Badge>
                    {pdf.topics.map((topic, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Created {formatDate(pdf.createdAt)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {pdf.generationParameters.sourceFiles.sampleQuestions} samples, {pdf.generationParameters.sourceFiles.learningMaterials} materials
                    </div>
                    {pdf.answerKeyUrl && (
                      <Badge variant="outline" className="text-xs">
                        Answer Key Available
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Guidelines */}
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <strong>Management Tips:</strong> Star important exams for quick access, make exams public to share with 
          colleagues or students, and use the search function to quickly find specific topics or exam types. 
          Downloaded exams are automatically saved to your device.
        </AlertDescription>
      </Alert>
    </div>
  )
}


