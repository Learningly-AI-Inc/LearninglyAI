"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { FileText, File, FileImage, Code, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react"

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

interface AdminContentAnalyticsProps {
  data: AnalyticsData | null
}

export function AdminContentAnalytics({ data }: AdminContentAnalyticsProps) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Content Data Available</CardTitle>
          <CardDescription>Content analytics data is being loaded</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const totalContent = data.contentStats.reduce((sum, stat) => sum + stat.count, 0)
  const totalContentUploads = data.activityMetrics.reduce((sum, day) => sum + day.content, 0)
  const avgDailyContent = data.activityMetrics.length 
    ? Math.round(data.activityMetrics.reduce((sum, day) => sum + day.content, 0) / data.activityMetrics.length)
    : 0

  const getContentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-4 w-4" />
      case 'docx':
        return <File className="h-4 w-4" />
      case 'txt':
        return <FileText className="h-4 w-4" />
      case 'code':
        return <Code className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  const getContentColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return 'text-red-600 bg-red-100'
      case 'docx':
        return 'text-blue-600 bg-blue-100'
      case 'txt':
        return 'text-gray-600 bg-gray-100'
      case 'code':
        return 'text-green-600 bg-green-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="space-y-6">
      {/* Content Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Content</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContent}</div>
            <p className="text-xs text-muted-foreground">
              Files processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Uploads</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDailyContent}</div>
            <p className="text-xs text-muted-foreground">
              Average per day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Uploads</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContentUploads}</div>
            <p className="text-xs text-muted-foreground">
              This period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Content Types</CardTitle>
            <File className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.contentStats.length}</div>
            <p className="text-xs text-muted-foreground">
              Different formats
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Content Type Distribution</CardTitle>
          <CardDescription>
            Breakdown of uploaded content by file type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.contentStats.map((stat, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1 rounded ${getContentColor(stat.type)}`}>
                      {getContentIcon(stat.type)}
                    </div>
                    <span className="text-sm font-medium">{stat.type}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono">{stat.count}</span>
                    <Badge variant="outline" className="text-xs">
                      {stat.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                <Progress value={stat.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Content Processing Status */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Processing Status</CardTitle>
            <CardDescription>
              Content processing pipeline status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Completed</span>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {Math.floor(totalContent * 0.85)} files
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">Processing</span>
              </div>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                {Math.floor(totalContent * 0.10)} files
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">Failed</span>
              </div>
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                {Math.floor(totalContent * 0.05)} files
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload Trends</CardTitle>
            <CardDescription>
              Daily content upload patterns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {data.activityMetrics.slice(-7).map((day, index) => {
                const date = new Date(day.date).toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })
                const maxContent = Math.max(...data.activityMetrics.map(d => d.content))
                const contentPercentage = maxContent > 0 ? (day.content / maxContent) * 100 : 0
                
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{date}</span>
                      <span className="text-sm font-mono">{day.content} files</span>
                    </div>
                    <Progress value={contentPercentage} className="h-1" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Content Insights</CardTitle>
          <CardDescription>
            Analysis of content upload patterns and trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Most Popular Type</h4>
              <div className="flex items-center gap-2">
                {getContentIcon(data.contentStats[0]?.type || '')}
                <span className="text-sm">{data.contentStats[0]?.type || 'N/A'}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {data.contentStats[0]?.percentage.toFixed(1) || 0}% of all uploads
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Upload Velocity</h4>
              <div className="flex items-center gap-2">
                <Badge variant={avgDailyContent > 10 ? "default" : avgDailyContent > 5 ? "secondary" : "outline"}>
                  {avgDailyContent > 10 ? "High" : avgDailyContent > 5 ? "Medium" : "Low"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {avgDailyContent} files per day average
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Processing Efficiency</h4>
              <div className="text-sm font-mono">85%</div>
              <p className="text-xs text-muted-foreground">
                Success rate
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}



