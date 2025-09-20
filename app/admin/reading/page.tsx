"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Download,
  RefreshCw,
  BookOpen,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Users,
  BarChart3,
  TrendingUp
} from "lucide-react"
import { useSupabase } from "@/hooks/use-supabase"
import { formatDistanceToNow } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ReadingDocument {
  id: string
  user_id: string
  title: string
  original_filename: string
  file_path: string
  file_type: string
  file_size: number
  mime_type: string
  extracted_text: string | null
  page_count: number
  text_length: number
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  processing_notes: string[]
  public_url: string | null
  metadata: any
  created_at: string
  updated_at: string
  user?: {
    email: string
    full_name: string | null
  }
}

interface ReadingStats {
  totalDocuments: number
  completedDocuments: number
  processingDocuments: number
  failedDocuments: number
  totalPages: number
  totalTextLength: number
  avgProcessingTime: number
}

interface DocumentTypeStats {
  type: string
  count: number
  avgSize: number
  avgPages: number
}

export default function AdminReadingPage() {
  const [documents, setDocuments] = useState<ReadingDocument[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<ReadingDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [stats, setStats] = useState<ReadingStats>({
    totalDocuments: 0,
    completedDocuments: 0,
    processingDocuments: 0,
    failedDocuments: 0,
    totalPages: 0,
    totalTextLength: 0,
    avgProcessingTime: 0
  })
  const [typeStats, setTypeStats] = useState<DocumentTypeStats[]>([])
  const supabase = useSupabase()

  useEffect(() => {
    fetchReadingData()
  }, [])

  useEffect(() => {
    filterDocuments()
  }, [documents, searchTerm, statusFilter, typeFilter])

  const fetchReadingData = async () => {
    try {
      setLoading(true)

      // Fetch reading documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('reading_documents')
        .select(`
          *,
          user:users(email, full_name)
        `)
        .order('created_at', { ascending: false })

      if (documentsError) throw documentsError

      setDocuments(documentsData || [])

      // Calculate statistics
      const totalDocuments = documentsData?.length || 0
      const completedDocuments = documentsData?.filter(doc => doc.processing_status === 'completed').length || 0
      const processingDocuments = documentsData?.filter(doc => doc.processing_status === 'processing').length || 0
      const failedDocuments = documentsData?.filter(doc => doc.processing_status === 'failed').length || 0
      const totalPages = documentsData?.reduce((sum, doc) => sum + (doc.page_count || 0), 0) || 0
      const totalTextLength = documentsData?.reduce((sum, doc) => sum + (doc.text_length || 0), 0) || 0

      setStats({
        totalDocuments,
        completedDocuments,
        processingDocuments,
        failedDocuments,
        totalPages,
        totalTextLength,
        avgProcessingTime: 2.5 // Mock average processing time in minutes
      })

      // Calculate type statistics
      const typeMap = new Map<string, { count: number; totalSize: number; totalPages: number }>()
      documentsData?.forEach(doc => {
        const existing = typeMap.get(doc.file_type) || { count: 0, totalSize: 0, totalPages: 0 }
        existing.count += 1
        existing.totalSize += doc.file_size
        existing.totalPages += doc.page_count || 0
        typeMap.set(doc.file_type, existing)
      })

      const typeStatsArray = Array.from(typeMap.entries()).map(([type, data]) => ({
        type,
        count: data.count,
        avgSize: data.totalSize / data.count,
        avgPages: data.totalPages / data.count
      }))

      setTypeStats(typeStatsArray)
    } catch (error) {
      console.error('Error fetching reading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterDocuments = () => {
    let filtered = documents

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(doc => doc.processing_status === statusFilter)
    }

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter(doc => doc.file_type === typeFilter)
    }

    setFilteredDocuments(filtered)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: "default",
      processing: "secondary",
      pending: "outline",
      failed: "destructive"
    } as const

    const icons = {
      completed: CheckCircle,
      processing: Clock,
      pending: Clock,
      failed: AlertCircle
    } as const

    const Icon = icons[status as keyof typeof icons] || Clock

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    )
  }

  const getFileTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-4 w-4" />
      case 'doc':
      case 'docx':
        return <FileText className="h-4 w-4" />
      case 'txt':
        return <FileText className="h-4 w-4" />
      default:
        return <BookOpen className="h-4 w-4" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`
    }
    return `${bytes} bytes`
  }

  const formatTextLength = (length: number) => {
    if (length >= 1000000) {
      return `${(length / 1000000).toFixed(1)}M`
    } else if (length >= 1000) {
      return `${(length / 1000).toFixed(1)}K`
    }
    return length.toString()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reading Tools Management</h1>
            <p className="text-muted-foreground">
              Manage reading documents and processing
            </p>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-20 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded mb-2"></div>
                <div className="h-3 w-24 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reading Tools Management</h1>
          <p className="text-muted-foreground">
            Manage {stats.totalDocuments} reading documents and processing status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchReadingData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Reading documents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Successfully processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processingDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Currently processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failedDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPages}</div>
            <p className="text-xs text-muted-foreground">
              Pages processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Text Extracted</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTextLength(stats.totalTextLength)}</div>
            <p className="text-xs text-muted-foreground">
              Characters extracted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgProcessingTime}m</div>
            <p className="text-xs text-muted-foreground">
              Average processing time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Document Type Statistics */}
      {typeStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Document Type Statistics</CardTitle>
            <CardDescription>
              Breakdown by file type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {typeStats.map((type) => (
                <div key={type.type} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getFileTypeIcon(type.type)}
                    <div>
                      <div className="font-medium">{type.type.toUpperCase()}</div>
                      <div className="text-sm text-muted-foreground">
                        {type.count} documents
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatFileSize(type.avgSize)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Avg size
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents by title, filename, or user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="doc">DOC</SelectItem>
                <SelectItem value="docx">DOCX</SelectItem>
                <SelectItem value="txt">TXT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reading Documents ({filteredDocuments.length})</CardTitle>
          <CardDescription>
            Manage uploaded reading documents and their processing status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead>Text Length</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-muted">
                        {getFileTypeIcon(doc.file_type)}
                      </div>
                      <div>
                        <div className="font-medium">{doc.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {doc.original_filename}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {doc.user?.full_name || 'Unknown User'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {doc.user?.email || 'No email'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {doc.file_type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatFileSize(doc.file_size)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {doc.page_count || 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatTextLength(doc.text_length || 0)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(doc.processing_status)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View Document
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View Extracted Text
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <X className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
