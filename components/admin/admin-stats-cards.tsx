"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  UserPlus, 
  Activity, 
  GraduationCap,
  BookOpen,
  Brain,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react"

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
}

interface AdminStatsCardsProps {
  stats: DashboardStats | null
}

export function AdminStatsCards({ stats }: AdminStatsCardsProps) {
  if (!stats) return null

  const statsCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      description: `+${stats.newUsers30d} new users this month`,
      icon: Users,
      trend: stats.newUsers30d > 0 ? "up" : "neutral",
      color: "text-blue-600"
    },
    {
      title: "Active Users",
      value: stats.activeUsers7d,
      description: `${stats.activeUsers30d} active in 30 days`,
      icon: Activity,
      trend: stats.activeUsers7d > 0 ? "up" : "neutral",
      color: "text-green-600"
    },
    {
      title: "Content Processed",
      value: stats.completedContent,
      description: `${stats.processingContent} processing`,
      icon: FileText,
      trend: stats.completedContent > 0 ? "up" : "neutral",
      color: "text-purple-600"
    },
    {
      title: "System Health",
      value: stats.failedContent === 0 ? "100%" : `${Math.round((stats.completedContent / (stats.completedContent + stats.failedContent)) * 100)}%`,
      description: stats.failedContent === 0 ? "All systems operational" : `${stats.failedContent} failed processes`,
      icon: stats.failedContent === 0 ? CheckCircle : AlertCircle,
      trend: stats.failedContent === 0 ? "up" : "down",
      color: stats.failedContent === 0 ? "text-green-600" : "text-red-600"
    }
  ]

  const roleStats = [
    {
      title: "Students",
      value: stats.studentCount,
      icon: GraduationCap,
      color: "text-blue-600"
    },
    {
      title: "Self-Learners",
      value: stats.selfLearnerCount,
      icon: BookOpen,
      color: "text-green-600"
    },
    {
      title: "Educators",
      value: stats.educatorCount,
      icon: Users,
      color: "text-purple-600"
    },
    {
      title: "Admins",
      value: stats.adminCount,
      icon: Brain,
      color: "text-orange-600"
    }
  ]

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
              {stat.trend === "up" && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Growing
                </Badge>
              )}
              {stat.trend === "down" && (
                <Badge variant="destructive" className="mt-2 text-xs">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Issues
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Role Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Role Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {roleStats.map((role, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg bg-muted`}>
                  <role.icon className={`h-4 w-4 ${role.color}`} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {role.title}
                  </p>
                  <p className="text-2xl font-bold">{role.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Content Status Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedContent}</div>
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
            <div className="text-2xl font-bold">{stats.processingContent}</div>
            <p className="text-xs text-muted-foreground">
              Currently in queue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failedContent}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function TrendingUp({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    </svg>
  )
}

function TrendingDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
      />
    </svg>
  )
}
