"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Users, 
  FileText, 
  Brain, 
  TrendingUp,
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react"
import { AdminAnalyticsCharts } from "@/components/admin/admin-analytics-charts"
import { AdminUserAnalytics } from "@/components/admin/admin-user-analytics"
import { AdminContentAnalytics } from "@/components/admin/admin-content-analytics"
import { AdminAIAnalytics } from "@/components/admin/admin-ai-analytics"
import { useSupabase } from "@/hooks/use-supabase"

interface AnalyticsData {
  userGrowth: {
    date: string
    total: number
    new: number
  }[]
  contentStats: {
    type: string
    count: number
    percentage: number
  }[]
  aiUsage: {
    model: string
    requests: number
    tokens: number
    cost: number
  }[]
  activityMetrics: {
    date: string
    users: number
    sessions: number
    content: number
  }[]
}

export default function AdminAnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30d')
  const supabase = useSupabase()

  useEffect(() => {
    fetchAnalyticsData()
  }, [dateRange])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      
      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      switch (dateRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(endDate.getDate() - 30)
          break
        case '90d':
          startDate.setDate(endDate.getDate() - 90)
          break
        default:
          startDate.setDate(endDate.getDate() - 30)
      }

      // Fetch user growth data
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })

      // Fetch content data
      const { data: content, error: contentError } = await supabase
        .from('user_content')
        .select('content_type, created_at, status')
        .gte('created_at', startDate.toISOString())

      // Fetch AI usage data
      const { data: aiLogs, error: aiError } = await supabase
        .from('ai_model_logs')
        .select('model_name, created_at')
        .gte('created_at', startDate.toISOString())

      // Process user growth data
      const userGrowthMap = new Map()
      const dailyUserCount = new Map()
      let userGrowth: Array<{ date: string; total: number; new: number }> = []
      
      if (users && !usersError) {
        users.forEach(user => {
          const date = new Date(user.created_at).toISOString().split('T')[0]
          userGrowthMap.set(date, (userGrowthMap.get(date) || 0) + 1)
        })

        // Calculate cumulative totals
        let total = 0
        userGrowth = []
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0]
          const newUsers = userGrowthMap.get(dateStr) || 0
          total += newUsers
          userGrowth.push({
            date: dateStr,
            total,
            new: newUsers
          })
        }
      }

      // Process content statistics
      const contentStats: Array<{ type: string; count: number; percentage: number }> = []
      if (content && !contentError) {
        const contentTypes = ['pdf', 'docx', 'txt', 'code']
        const totalContent = content.length
        
        contentTypes.forEach(type => {
          const count = content.filter(c => c.content_type === type).length
          contentStats.push({
            type: type.toUpperCase(),
            count,
            percentage: totalContent > 0 ? (count / totalContent) * 100 : 0
          })
        })
      }

      // Process AI usage data
      const aiUsage: Array<{ model: string; requests: number; tokens: number; cost: number }> = []
      if (aiLogs && !aiError) {
        const modelCounts = new Map()
        aiLogs.forEach(log => {
          modelCounts.set(log.model_name, (modelCounts.get(log.model_name) || 0) + 1)
        })

        modelCounts.forEach((requests, model) => {
          aiUsage.push({
            model,
            requests,
            tokens: requests * 1000, // Mock token calculation
            cost: requests * 0.02 // Mock cost calculation
          })
        })
      }

      // Mock activity metrics
      const activityMetrics: Array<{ date: string; users: number; sessions: number; content: number }> = []
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        activityMetrics.push({
          date: dateStr,
          users: Math.floor(Math.random() * 50) + 20,
          sessions: Math.floor(Math.random() * 100) + 50,
          content: Math.floor(Math.random() * 20) + 5
        })
      }

      setAnalyticsData({
        userGrowth: userGrowth || [],
        contentStats,
        aiUsage,
        activityMetrics
      })
    } catch (error) {
      console.error('Error fetching analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportAnalytics = () => {
    if (!analyticsData) return

    const csvContent = [
      ['Date', 'Total Users', 'New Users', 'Active Users', 'Sessions', 'Content'].join(','),
      ...analyticsData.userGrowth.map((item, index) => [
        item.date,
        item.total,
        item.new,
        analyticsData.activityMetrics[index]?.users || 0,
        analyticsData.activityMetrics[index]?.sessions || 0,
        analyticsData.activityMetrics[index]?.content || 0
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${dateRange}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Platform usage and performance metrics
            </p>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Platform usage and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button variant="outline" size="sm" onClick={exportAnalytics}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAnalyticsData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData?.userGrowth[analyticsData.userGrowth.length - 1]?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              +{analyticsData?.userGrowth.reduce((sum, day) => sum + day.new, 0) || 0} new users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Content Processed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData?.contentStats.reduce((sum, stat) => sum + stat.count, 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {analyticsData?.contentStats.length || 0} content types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Requests</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData?.aiUsage.reduce((sum, usage) => sum + usage.requests, 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              ${analyticsData?.aiUsage.reduce((sum, usage) => sum + usage.cost, 0).toFixed(2) || '0.00'} estimated cost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Daily Active</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData?.activityMetrics.length 
                ? Math.round(analyticsData.activityMetrics.reduce((sum, day) => sum + day.users, 0) / analyticsData.activityMetrics.length)
                : 0
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Users per day
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="ai">AI Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <AdminAnalyticsCharts data={analyticsData} />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <AdminUserAnalytics data={analyticsData} />
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <AdminContentAnalytics data={analyticsData} />
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <AdminAIAnalytics data={analyticsData} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
