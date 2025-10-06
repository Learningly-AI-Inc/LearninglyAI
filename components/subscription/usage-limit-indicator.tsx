'use client'

import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, Zap } from 'lucide-react'
import { useSubscription } from '@/hooks/use-subscription'

interface UsageLimitIndicatorProps {
  feature: 'writing_words' | 'documents_uploaded' | 'search_queries' | 'exam_sessions'
  className?: string
  showPercentage?: boolean
}

export function UsageLimitIndicator({ 
  feature, 
  className = '', 
  showPercentage = true 
}: UsageLimitIndicatorProps) {
  const { subscription, loading } = useSubscription()

  if (loading || !subscription) {
    return null
  }

  const usage = subscription.usage[feature]
  const limit = subscription.plan.limits[feature === 'documents_uploaded' ? 'document_uploads' : feature] || 0
  
  // Handle unlimited limits
  if (limit === -1) {
    return (
      <Badge className={`bg-green-100 text-green-800 border-green-200 ${className}`}>
        <Zap className="h-3 w-3 mr-1" />
        Unlimited
      </Badge>
    )
  }

  const percentage = Math.round((usage / limit) * 100)
  const isNearLimit = percentage >= 80
  const isAtLimit = percentage >= 100

  const getStatus = () => {
    if (isAtLimit) return {
      variant: 'destructive' as const,
      icon: AlertTriangle,
      text: 'Limit Reached',
      className: 'bg-red-100 text-red-800 border-red-200'
    }
    if (isNearLimit) return {
      variant: 'secondary' as const,
      icon: AlertTriangle,
      text: 'Near Limit',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
    return {
      variant: 'default' as const,
      icon: CheckCircle,
      text: 'Good',
      className: 'bg-green-100 text-green-800 border-green-200'
    }
  }

  const status = getStatus()
  const IconComponent = status.icon

  return (
    <Badge className={`${status.className} ${className}`}>
      <IconComponent className="h-3 w-3 mr-1" />
      {status.text}
      {showPercentage && ` (${percentage}%)`}
    </Badge>
  )
}

interface UsageQuickStatsProps {
  className?: string
}

export function UsageQuickStats({ className = '' }: UsageQuickStatsProps) {
  const { subscription, loading } = useSubscription()

  if (loading || !subscription) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    )
  }

  const features = [
    { key: 'writing_words' as const, label: 'Writing Words' },
    { key: 'documents_uploaded' as const, label: 'Documents' },
    { key: 'search_queries' as const, label: 'Searches' },
    { key: 'exam_sessions' as const, label: 'Exams' },
  ]

  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="text-sm font-medium text-gray-700">Usage Status</h4>
      <div className="space-y-1">
        {features.map((feature) => (
          <div key={feature.key} className="flex items-center justify-between">
            <span className="text-xs text-gray-600">{feature.label}</span>
            <UsageLimitIndicator 
              feature={feature.key} 
              showPercentage={false}
              className="text-xs"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
