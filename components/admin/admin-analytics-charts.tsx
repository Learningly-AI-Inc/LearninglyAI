"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Users, FileText, Brain, BarChart3, PieChart as PieChartIcon } from "lucide-react"

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

interface AdminAnalyticsChartsProps {
  data: AnalyticsData | null
}


export function AdminAnalyticsCharts({ data }: AdminAnalyticsChartsProps) {
  if (!data) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>Analytics data is being loaded</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* User Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            User Growth
          </CardTitle>
          <CardDescription>
            User registration trends over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Chart visualization coming soon</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Activity Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Daily Activity
            </CardTitle>
            <CardDescription>
              User activity and engagement metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Activity chart coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Content Distribution
            </CardTitle>
            <CardDescription>
              Types of content uploaded by users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <div className="text-center">
                <PieChartIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Content chart coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Model Usage
          </CardTitle>
          <CardDescription>
            AI model requests and associated costs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
            <div className="text-center">
              <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">AI usage chart coming soon</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Peak Daily Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.activityMetrics.length > 0 ? Math.max(...data.activityMetrics.map(d => d.users)) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Highest single day activity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.activityMetrics.reduce((sum, day) => sum + day.sessions, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all tracked days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost/Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.activityMetrics.length > 0 ? (data.aiUsage.reduce((sum, usage) => sum + usage.cost, 0) / data.activityMetrics.length).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              AI service costs
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
