"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Users, 
  FileText, 
  Brain, 
  Activity, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Database,
  Shield,
  GraduationCap,
  MessageSquare,
  BookOpen
} from "lucide-react"
import { AdminStatsCards } from "@/components/admin/admin-stats-cards"
import { AdminRecentActivity } from "@/components/admin/admin-recent-activity"
import { AdminQuickActions } from "@/components/admin/admin-quick-actions"
import { AdminSystemHealth } from "@/components/admin/admin-system-health"
import { useSupabase } from "@/hooks/use-supabase"
import { useAdminAuth } from "@/hooks/use-admin-auth"

interface DashboardStats {
  totalUsers: number
  newUsers30d: number
  activeUsers7d: number
  activeUsers30d: number
  studentCount: number
  selfLearnerCount: number
  educatorCount: number
  adminCount: number
  totalContent: number
  completedContent: number
  processingContent: number
  failedContent: number
  totalSummaries: number
  totalExamSessions: number
  totalQuestions: number
  totalReadingDocs: number
  totalAILogs: number
  totalConversations: number
  totalMessages: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useSupabase()
  const { admin } = useAdminAuth()

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch user statistics
      const { data: userStats, error: userError } = await supabase
        .from('users')
        .select('*')

      if (userError) throw userError

      // Fetch content statistics
      const { data: contentStats, error: contentError } = await supabase
        .from('user_content')
        .select('*')

      if (contentError) throw contentError

      // Fetch AI model logs
      const { data: aiLogs, error: aiError } = await supabase
        .from('ai_model_logs')
        .select('*')

      if (aiError) throw aiError

      // Fetch exam prep sessions
      const { data: examSessions, error: examError } = await supabase
        .from('exam_prep_sessions')
        .select('*')

      if (examError) throw examError

      // Fetch exam prep questions
      const { data: examQuestions, error: questionsError } = await supabase
        .from('exam_prep_questions')
        .select('*')

      if (questionsError) throw questionsError

      // Fetch reading documents
      const { data: readingDocs, error: readingError } = await supabase
        .from('reading_documents')
        .select('*')

      if (readingError) throw readingError

      // Fetch conversations
      const { data: conversations, error: convError } = await supabase
        .from('search_conversations')
        .select('*')

      if (convError) throw convError

      // Fetch messages
      const { data: messages, error: msgError } = await supabase
        .from('search_messages')
        .select('*')

      if (msgError) throw msgError

      // Calculate statistics
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const calculatedStats: DashboardStats = {
        totalUsers: userStats?.length || 0,
        newUsers30d: userStats?.filter(u => new Date(u.created_at) >= thirtyDaysAgo).length || 0,
        activeUsers7d: userStats?.filter(u => u.last_login && new Date(u.last_login) >= sevenDaysAgo).length || 0,
        activeUsers30d: userStats?.filter(u => u.last_login && new Date(u.last_login) >= thirtyDaysAgo).length || 0,
        studentCount: userStats?.filter(u => u.role === 'student').length || 0,
        selfLearnerCount: userStats?.filter(u => u.role === 'self-learner').length || 0,
        educatorCount: userStats?.filter(u => u.role === 'educator').length || 0,
        adminCount: userStats?.filter(u => u.role === 'admin').length || 0,
        totalContent: contentStats?.length || 0,
        completedContent: contentStats?.filter(c => c.status === 'completed').length || 0,
        processingContent: contentStats?.filter(c => c.status === 'processing').length || 0,
        failedContent: contentStats?.filter(c => c.status === 'failed').length || 0,
        totalSummaries: 0, // No summaries table in current schema
        totalExamSessions: examSessions?.length || 0,
        totalQuestions: examQuestions?.length || 0,
        totalReadingDocs: readingDocs?.length || 0,
        totalAILogs: aiLogs?.length || 0,
        totalConversations: conversations?.length || 0,
        totalMessages: messages?.length || 0
      }

      setStats(calculatedStats)
    } catch (err) {
      console.error('Error fetching dashboard stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard statistics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome to the Learningly AI administration panel
            </p>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-muted rounded"></div>
                <div className="h-4 w-4 bg-muted rounded"></div>
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome to the Learningly AI administration panel
            </p>
          </div>
        </div>
        
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error Loading Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchDashboardStats} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to the Learningly AI administration panel
          </p>
          {admin && (
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Authenticated as {admin.email}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            System Online
          </Badge>
          <Button onClick={fetchDashboardStats} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <AdminStatsCards stats={stats} />
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest user activities and system events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminRecentActivity />
              </CardContent>
            </Card>
            
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common administrative tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminQuickActions />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  +{stats?.newUsers30d} new users this month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.activeUsers7d}</div>
                <p className="text-xs text-muted-foreground">
                  Active in the last 7 days
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Content Processed</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.completedContent}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.processingContent} currently processing
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Requests</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalAILogs}</div>
                <p className="text-xs text-muted-foreground">
                  Total AI model requests
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Analytics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Exam Sessions</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalExamSessions}</div>
                <p className="text-xs text-muted-foreground">
                  Total exam sessions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Questions Generated</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalQuestions}</div>
                <p className="text-xs text-muted-foreground">
                  Exam questions created
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reading Documents</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalReadingDocs}</div>
                <p className="text-xs text-muted-foreground">
                  Documents uploaded
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Chat Messages</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalMessages}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.totalConversations} conversations
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <AdminSystemHealth />
        </TabsContent>
      </Tabs>
    </div>
  )
}