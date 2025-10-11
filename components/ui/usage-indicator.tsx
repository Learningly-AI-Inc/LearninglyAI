'use client'

import * as React from 'react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Zap, TrendingUp, FileText, PenTool, Search, GraduationCap, Crown } from 'lucide-react'
import { useUsageLimits } from '@/hooks/use-usage-limits'
import Link from 'next/link'

interface UsageItemProps {
  label: string
  icon: React.ReactNode
  used: number
  limit: number
  unit?: string
}

function UsageItem({ label, icon, used, limit, unit = '' }: UsageItemProps) {
  const isUnlimited = limit === -1 || limit === 0
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100)
  const isNearLimit = percentage >= 80
  const isAtLimit = percentage >= 100

  const getBarColor = () => {
    if (isAtLimit) return 'bg-red-500'
    if (isNearLimit) return 'bg-yellow-500'
    return 'bg-blue-500'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{icon}</span>
          <span className="font-medium">{label}</span>
        </div>
        {isUnlimited ? (
          <Badge variant="outline" className="h-5 text-xs bg-green-50 text-green-700 border-green-200">
            <Zap className="h-3 w-3 mr-1" />
            Unlimited
          </Badge>
        ) : (
          <span className="text-muted-foreground">
            {used.toLocaleString()}{unit} / {limit.toLocaleString()}{unit}
          </span>
        )}
      </div>
      {!isUnlimited && (
        <div className="relative h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 ${getBarColor()} rounded-full transition-all duration-300`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

export function UsageIndicator() {
  const { usage, limits, planName, isLoading, getCurrentLimit } = useUsageLimits()

  if (isLoading) {
    return null
  }

  // Get limits based on plan
  const documentLimit = getCurrentLimit('documents_uploaded')
  const writingLimit = getCurrentLimit('writing_words')
  const searchLimit = getCurrentLimit('search_queries')
  const examLimit = getCurrentLimit('exam_sessions')

  // Calculate overall usage percentage (average of all features)
  const calculateOverallPercentage = () => {
    const features = [
      { used: usage.documents_uploaded, limit: documentLimit },
      { used: usage.writing_words, limit: writingLimit },
      { used: usage.search_queries, limit: searchLimit },
      { used: usage.exam_sessions, limit: examLimit },
    ]

    const validFeatures = features.filter(f => f.limit > 0)
    if (validFeatures.length === 0) return 0

    const sum = validFeatures.reduce((acc, f) => acc + (f.used / f.limit) * 100, 0)
    return Math.min(sum / validFeatures.length, 100)
  }

  const overallPercentage = calculateOverallPercentage()
  const isNearLimit = overallPercentage >= 75
  const isPremium = planName.toLowerCase().includes('premium')

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative gap-2 hover:bg-secondary"
        >
          {isPremium ? (
            <Crown className="h-4 w-4 text-yellow-500" />
          ) : (
            <TrendingUp className="h-4 w-4" />
          )}
          <span className="hidden sm:inline text-xs font-medium">
            {planName}
          </span>
          {!isPremium && isNearLimit && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Usage Overview</h4>
              {isPremium ? (
                <Badge variant="outline" className="bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 border-yellow-200">
                  <Crown className="h-3 w-3 mr-1" />
                  {planName}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  {planName}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Track your feature usage and limits
            </p>
          </div>

          <div className="space-y-3">
            <UsageItem
              label="Documents"
              icon={<FileText className="h-3 w-3" />}
              used={usage.documents_uploaded}
              limit={documentLimit}
            />
            <UsageItem
              label="Writing"
              icon={<PenTool className="h-3 w-3" />}
              used={usage.writing_words}
              limit={writingLimit}
              unit=" words"
            />
            <UsageItem
              label="Searches"
              icon={<Search className="h-3 w-3" />}
              used={usage.search_queries}
              limit={searchLimit}
            />
            <UsageItem
              label="Exams"
              icon={<GraduationCap className="h-3 w-3" />}
              used={usage.exam_sessions}
              limit={examLimit}
            />
          </div>

          {!isPremium && (
            <div className="pt-3 border-t">
              <Link href="/settings/billing">
                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  size="sm"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Premium
                </Button>
              </Link>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}