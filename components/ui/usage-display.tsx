'use client'

import * as React from 'react'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle } from 'lucide-react'
import type { UsageData } from '@/hooks/use-usage-limits'

interface FeatureUsageBarProps {
  label: string
  used: number
  limit: number
  unit?: string
  showLabel?: boolean
}

/**
 * Inline usage progress bar for individual features
 * Use this on specific feature pages (Reading, Writing, Search, Exam)
 */
export function FeatureUsageBar({ label, used, limit, unit = '', showLabel = true }: FeatureUsageBarProps) {
  const isUnlimited = limit === -1 || limit === 0
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100)
  const isNearLimit = percentage >= 80
  const isAtLimit = percentage >= 100

  if (isUnlimited) {
    return null // Don't show anything for unlimited plans
  }

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <div className="flex items-center gap-1.5">
            {(isNearLimit || isAtLimit) && (
              <AlertTriangle className={`h-3 w-3 ${isAtLimit ? 'text-red-500' : 'text-yellow-500'}`} />
            )}
            <span>
              {used.toLocaleString()}{unit} / {limit.toLocaleString()}{unit}
            </span>
          </div>
        </div>
      )}
      <Progress
        value={percentage}
        className={`h-1.5 ${isAtLimit ? '[&>div]:bg-red-500' : isNearLimit ? '[&>div]:bg-yellow-500' : ''}`}
      />
    </div>
  )
}

interface UsageDisplayProps {
  usage: UsageData
  limits: {
    document_uploads_per_week?: number
    document_uploads_per_day?: number
    writing_words_per_month?: number
    writing_words_per_day?: number
    search_queries_per_week?: number
    search_queries_per_day?: number
    exam_sessions_per_month?: number
    exam_sessions_per_week?: number
  }
  planName: string
}

/**
 * @deprecated Use UsageIndicator in navbar and FeatureUsageBar on feature pages instead
 * This component is kept for backward compatibility
 */
export function UsageDisplay({}: UsageDisplayProps) {
  return (
    <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
      <div className="text-sm font-medium text-muted-foreground">
        Usage limits are now shown in the navbar and on individual feature pages
      </div>
    </div>
  )
}