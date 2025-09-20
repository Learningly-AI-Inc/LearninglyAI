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
  GraduationCap,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  BookOpen,
  BarChart3
} from "lucide-react"
import { useSupabase } from "@/hooks/use-supabase"
import { formatDistanceToNow } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ExamSession {
  id: string
  user_id: string
  title: string
  description: string | null
  session_type: 'quiz' | 'flashcards' | 'meme' | 'full_exam'
  status: 'draft' | 'active' | 'completed' | 'paused'
  created_at: string
  updated_at: string
  user?: {
    email: string
    full_name: string | null
  }
}

interface ExamDocument {
  id: string
  user_id: string
  filename: string
  file_size: number
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  user?: {
    email: string
    full_name: string | null
  }
}

interface ExamStats {
  totalSessions: number
  totalDocuments: number
  completedSessions: number
  activeSessions: number
  totalQuestions: number
  totalFlashcards: number
}

export default function AdminExamPrepPage() {
  const [sessions, setSessions] = useState<ExamSession[]>([])
  const [documents, setDocuments] = useState<ExamDocument[]>([])
  const [filteredSessions, setFilteredSessions] = useState<ExamSession[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<ExamDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [stats, setStats] = useState<ExamStats>({
    totalSessions: 0,
    totalDocuments: 0,
    completedSessions: 0,
    activeSessions: 0,
    totalQuestions: 0,
    totalFlashcards: 0
  })
  const supabase = useSupabase()

  useEffect(() => {
    fetchExamPrepData()
  }, [])

  useEffect(() => {
    filterSessions()
    filterDocuments()
  }, [sessions, documents, searchTerm, statusFilter, typeFilter])

  const fetchExamPrepData = async () => {
    try {
      setLoading(true)

      // Fetch exam sessions
      const { data: sessionData, error: sessionError } = await supabase
        .from('exam_prep_sessions')
        .select(`
          *,
          user:users(email, full_name)
        `)
        .order('created_at', { ascending: false })

      if (sessionError) throw sessionError

      // Fetch exam documents
      const { data: documentData, error: documentError } = await supabase
        .from('exam_prep_documents')
        .select(`
          *,
          user:users(email, full_name)
        `)
        .order('created_at', { ascending: false })

      if (documentError) throw documentError

      // Fetch additional stats
      const { data: questionsData } = await supabase
        .from('exam_prep_questions')
        .select('id')

      const { data: flashcardsData } = await supabase
        .from('exam_prep_flashcards')
        .select('id')

      setSessions(sessionData || [])
      setDocuments(documentData || [])
      
      setStats({
        totalSessions: sessionData?.length || 0,
        totalDocuments: documentData?.length || 0,
        completedSessions: sessionData?.filter(s => s.status === 'completed').length || 0,
        activeSessions: sessionData?.filter(s => s.status === 'active').length || 0,
        totalQuestions: questionsData?.length || 0,
        totalFlashcards: flashcardsData?.length || 0
      })
    } catch (error) {
      console.error('Error fetching exam prep data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterSessions = () => {
    let filtered = sessions

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(session =>
        session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(session => session.status === statusFilter)
    }

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter(session => session.session_type === typeFilter)
    }

    setFilteredSessions(filtered)
  }

  const filterDocuments = () => {
    let filtered = documents

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredDocuments(filtered)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: "default",
      active: "secondary",
      draft: "outline",
      paused: "destructive"
    } as const

    const icons = {
      completed: CheckCircle,
      active: Clock,
      draft: Clock,
      paused: AlertCircle
    } as const

    const Icon = icons[status as keyof typeof icons] || Clock

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    )
  }

  const getTypeBadge = (type: string) => {
    const variants = {
      'full_exam': "default",
      'quiz': "secondary",
      'flashcards': "outline",
      'meme': "destructive"
    } as const

    return (
      <Badge variant={variants[type as keyof typeof variants] || "outline"}>
        {type.replace('_', ' ')}
      </Badge>
    )
  }

  const getProcessingStatusBadge = (status: string) => {
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Exam Prep Management</h1>
            <p className="text-muted-foreground">
              Manage exam preparation sessions and documents
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
          <h1 className="text-3xl font-bold tracking-tight">Exam Prep Management</h1>
          <p className="text-muted-foreground">
            Manage {stats.totalSessions} exam sessions and {stats.totalDocuments} documents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchExamPrepData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeSessions} active sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Uploaded documents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuestions}</div>
            <p className="text-xs text-muted-foreground">
              Generated questions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flashcards</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFlashcards}</div>
            <p className="text-xs text-muted-foreground">
              Study flashcards
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sessions, documents, users..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="full_exam">Full Exam</SelectItem>
                <SelectItem value="quiz">Quiz</SelectItem>
                <SelectItem value="flashcards">Flashcards</SelectItem>
                <SelectItem value="meme">Meme</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Sessions and Documents */}
      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions">Exam Sessions ({filteredSessions.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({filteredDocuments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exam Sessions</CardTitle>
              <CardDescription>
                Manage exam preparation sessions and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{session.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {session.description || 'No description'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {session.user?.full_name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {session.user?.email || 'No email'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(session.session_type)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(session.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
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
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Export Results
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
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exam Documents</CardTitle>
              <CardDescription>
                Manage uploaded exam preparation documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Size</TableHead>
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
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">{doc.filename}</div>
                            <div className="text-sm text-muted-foreground">
                              ID: {doc.id.slice(0, 8)}...
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
                        <div className="text-sm">
                          {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </TableCell>
                      <TableCell>
                        {getProcessingStatusBadge(doc.processing_status)}
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
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Download
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
