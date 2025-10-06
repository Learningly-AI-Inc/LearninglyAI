'use client'

import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, Zap } from 'lucide-react'

interface UsageMeterProps {
  label: string
  used: number
  limit: number | string
  percentage: number
  icon?: React.ReactNode
  description?: string
}

export function UsageMeter({ label, used, limit, percentage, icon, description }: UsageMeterProps) {
  const isUnlimited = limit === 'Unlimited' || limit === -1
  const isNearLimit = percentage >= 80
  const isAtLimit = percentage >= 100

  const getStatusColor = () => {
    if (isAtLimit) return 'destructive'
    if (isNearLimit) return 'secondary'
    return 'default'
  }

  const getStatusIcon = () => {
    if (isAtLimit) return <AlertTriangle className="h-4 w-4 text-red-500" />
    if (isNearLimit) return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon && <div className="text-muted-foreground">{icon}</div>}
            <CardTitle className="text-sm font-medium">{label}</CardTitle>
          </div>
          {getStatusIcon()}
        </div>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {used} {isUnlimited ? '' : `of ${limit} used`}
          </span>
          {!isUnlimited && (
            <Badge variant={getStatusColor()} className="text-xs">
              {Math.round(percentage)}%
            </Badge>
          )}
        </div>
        
        {!isUnlimited ? (
          <Progress value={percentage} className="h-2" />
        ) : (
          <div className="flex items-center space-x-2 text-sm text-green-600">
            <Zap className="h-4 w-4" />
            <span>Unlimited</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface UsageDashboardProps {
  usage: {
    documents: { used: number; limit: number | string; percentage: number }
    writingWords: { used: number; limit: number | string; percentage: number }
    searchQueries: { used: number; limit: number | string; percentage: number }
    examSessions: { used: number; limit: number | string; percentage: number }
  }
}

export function UsageDashboard({ usage }: UsageDashboardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UsageMeter
        label="Document Uploads"
        used={usage.documents.used}
        limit={usage.documents.limit}
        percentage={usage.documents.percentage}
        icon="📄"
        description="PDF and document processing"
      />
      
      <UsageMeter
        label="Writing Words"
        used={usage.writingWords.used}
        limit={usage.writingWords.limit}
        percentage={usage.writingWords.percentage}
        icon="✍️"
        description="AI-powered writing and content generation"
      />
      
      <UsageMeter
        label="Search Queries"
        used={usage.searchQueries.used}
        limit={usage.searchQueries.limit}
        percentage={usage.searchQueries.percentage}
        icon="🔍"
        description="Document search and retrieval"
      />
      
      <UsageMeter
        label="Exam Sessions"
        used={usage.examSessions.used}
        limit={usage.examSessions.limit}
        percentage={usage.examSessions.percentage}
        icon="📝"
        description="Practice exams and quizzes"
      />
    </div>
  )
}
