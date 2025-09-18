"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Users, UserPlus, Clock, TrendingUp } from "lucide-react"

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

interface AdminUserAnalyticsProps {
  data: AnalyticsData | null
}

export function AdminUserAnalytics({ data }: AdminUserAnalyticsProps) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No User Data Available</CardTitle>
          <CardDescription>User analytics data is being loaded</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const totalUsers = data.userGrowth[data.userGrowth.length - 1]?.total || 0
  const newUsers = data.userGrowth.reduce((sum, day) => sum + day.new, 0)
  const avgDailyActive = data.activityMetrics.length 
    ? Math.round(data.activityMetrics.reduce((sum, day) => sum + day.users, 0) / data.activityMetrics.length)
    : 0
  const peakUsers = Math.max(...data.activityMetrics.map(d => d.users))

  const userRetentionRate = totalUsers > 0 ? (avgDailyActive / totalUsers) * 100 : 0

  return (
    <div className="space-y-6">
      {/* User Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Registered users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Users</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newUsers}</div>
            <p className="text-xs text-muted-foreground">
              This period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Active</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDailyActive}</div>
            <p className="text-xs text-muted-foreground">
              Average per day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Users</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{peakUsers}</div>
            <p className="text-xs text-muted-foreground">
              Highest single day
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Engagement Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Engagement</CardTitle>
            <CardDescription>
              Key engagement metrics and trends
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Retention Rate</span>
                <span className="text-sm font-mono">{userRetentionRate.toFixed(1)}%</span>
              </div>
              <Progress value={userRetentionRate} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Growth Rate</span>
                <span className="text-sm font-mono">
                  {totalUsers > 0 ? ((newUsers / totalUsers) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <Progress 
                value={totalUsers > 0 ? (newUsers / totalUsers) * 100 : 0} 
                className="h-2" 
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Activity Level</span>
                <Badge variant={avgDailyActive > 30 ? "default" : avgDailyActive > 15 ? "secondary" : "outline"}>
                  {avgDailyActive > 30 ? "High" : avgDailyActive > 15 ? "Medium" : "Low"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Activity Trends</CardTitle>
            <CardDescription>
              Recent activity patterns
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
                const activityPercentage = peakUsers > 0 ? (day.users / peakUsers) * 100 : 0
                
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{date}</span>
                      <span className="text-sm font-mono">{day.users} users</span>
                    </div>
                    <Progress value={activityPercentage} className="h-1" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Growth Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Growth Insights</CardTitle>
          <CardDescription>
            Analysis of user growth patterns and trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Growth Trend</h4>
              <div className="flex items-center gap-2">
                {newUsers > 0 ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">Growing</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                    <span className="text-sm text-red-600">Declining</span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {newUsers} new users this period
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Engagement Quality</h4>
              <div className="flex items-center gap-2">
                <Badge variant={userRetentionRate > 20 ? "default" : userRetentionRate > 10 ? "secondary" : "outline"}>
                  {userRetentionRate > 20 ? "Excellent" : userRetentionRate > 10 ? "Good" : "Needs Improvement"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {userRetentionRate.toFixed(1)}% daily retention
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Peak Performance</h4>
              <div className="text-sm font-mono">{peakUsers} users</div>
              <p className="text-xs text-muted-foreground">
                Highest single day activity
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
