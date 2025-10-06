'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap, Crown, ArrowRight, TrendingUp, AlertTriangle } from 'lucide-react'
import { useSubscription } from '@/hooks/use-subscription'
import { useState } from 'react'

interface DynamicUpgradePromptProps {
  onUpgrade: (plan: string) => void
  variant?: 'banner' | 'card' | 'inline'
}

export function DynamicUpgradePrompt({ onUpgrade, variant = 'card' }: DynamicUpgradePromptProps) {
  const { subscription, loading } = useSubscription()
  const [isUpgrading, setIsUpgrading] = useState(false)

  if (loading || !subscription || subscription.plan.name === 'Premium') {
    return null
  }

  const getUpgradeAnalysis = () => {
    const usage = subscription.usage
    const limits = subscription.plan.limits
    const currentPlan = subscription.plan.name

    // Calculate usage percentages for each feature
    const getUsagePercentage = (used: number, limit: number) => {
      if (limit === -1) return 0 // Unlimited
      return Math.round((used / limit) * 100)
    }

    const usageStats = {
      documents: {
        used: usage.documents_uploaded,
        limit: limits.document_uploads,
        percentage: getUsagePercentage(usage.documents_uploaded, limits.document_uploads),
        nearLimit: getUsagePercentage(usage.documents_uploaded, limits.document_uploads) >= 80,
        atLimit: getUsagePercentage(usage.documents_uploaded, limits.document_uploads) >= 100,
      },
      writingWords: {
        used: usage.writing_words,
        limit: limits.writing_words,
        percentage: getUsagePercentage(usage.writing_words, limits.writing_words),
        nearLimit: getUsagePercentage(usage.writing_words, limits.writing_words) >= 80,
        atLimit: getUsagePercentage(usage.writing_words, limits.writing_words) >= 100,
      },
      searchQueries: {
        used: usage.search_queries,
        limit: limits.search_queries,
        percentage: getUsagePercentage(usage.search_queries, limits.search_queries),
        nearLimit: getUsagePercentage(usage.search_queries, limits.search_queries) >= 80,
        atLimit: getUsagePercentage(usage.search_queries, limits.search_queries) >= 100,
      },
      examSessions: {
        used: usage.exam_sessions,
        limit: limits.exam_sessions || 5,
        percentage: getUsagePercentage(usage.exam_sessions, limits.exam_sessions || 5),
        nearLimit: getUsagePercentage(usage.exam_sessions, limits.exam_sessions || 5) >= 80,
        atLimit: getUsagePercentage(usage.exam_sessions, limits.exam_sessions || 5) >= 100,
      },
    }

    // Determine if user needs upgrade
    const hasLimitsReached = Object.values(usageStats).some(stat => stat.atLimit)
    const hasLimitsNear = Object.values(usageStats).some(stat => stat.nearLimit)

    if (!hasLimitsReached && !hasLimitsNear) {
      return null // No upgrade needed
    }

    // Determine next plan
    const nextPlan = currentPlan === 'Free' ? 'Freemium' : 'Premium'
    const nextPlanIcon = currentPlan === 'Free' ? Zap : Crown

    // Get the most critical usage issue
    const criticalIssues = Object.entries(usageStats)
      .filter(([_, stat]) => stat.atLimit || stat.nearLimit)
      .sort(([_, a], [__, b]) => {
        if (a.atLimit && !b.atLimit) return -1
        if (!a.atLimit && b.atLimit) return 1
        return b.percentage - a.percentage
      })

    const primaryIssue = criticalIssues[0]
    const issueName = primaryIssue[0].replace(/([A-Z])/g, ' $1').toLowerCase()
    const issueStats = primaryIssue[1]

    return {
      nextPlan,
      nextPlanIcon,
      primaryIssue: issueName,
      issueStats,
      hasLimitsReached,
      hasLimitsNear,
      usageStats,
      criticalIssues: criticalIssues.length,
    }
  }

  const analysis = getUpgradeAnalysis()
  if (!analysis) return null

  const handleUpgrade = async () => {
    setIsUpgrading(true)
    try {
      await onUpgrade(analysis.nextPlan.toLowerCase())
    } finally {
      setIsUpgrading(false)
    }
  }

  const getUrgencyLevel = () => {
    if (analysis.hasLimitsReached) return 'critical'
    if (analysis.hasLimitsNear) return 'warning'
    return 'info'
  }

  const urgency = getUrgencyLevel()

  if (variant === 'banner') {
    return (
      <Alert className={`border-${urgency === 'critical' ? 'red' : urgency === 'warning' ? 'yellow' : 'blue'}-200 bg-${urgency === 'critical' ? 'red' : urgency === 'warning' ? 'yellow' : 'blue'}-50`}>
        <AlertTriangle className={`h-4 w-4 text-${urgency === 'critical' ? 'red' : urgency === 'warning' ? 'yellow' : 'blue'}-500`} />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium text-${urgency === 'critical' ? 'red' : urgency === 'warning' ? 'yellow' : 'blue'}-900`}>
                {urgency === 'critical' ? 'Usage Limit Reached' : 'Approaching Usage Limit'}
              </p>
              <p className={`text-sm text-${urgency === 'critical' ? 'red' : urgency === 'warning' ? 'yellow' : 'blue'}-700`}>
                {analysis.primaryIssue}: {analysis.issueStats.used} of {analysis.issueStats.limit} used ({analysis.issueStats.percentage}%)
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className={`bg-${urgency === 'critical' ? 'red' : urgency === 'warning' ? 'yellow' : 'blue'}-500 hover:bg-${urgency === 'critical' ? 'red' : urgency === 'warning' ? 'yellow' : 'blue'}-600`}
            >
              {isUpgrading ? 'Upgrading...' : `Upgrade to ${analysis.nextPlan}`}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  if (variant === 'inline') {
    return (
      <div className={`border border-${urgency === 'critical' ? 'red' : urgency === 'warning' ? 'yellow' : 'blue'}-200 bg-${urgency === 'critical' ? 'red' : urgency === 'warning' ? 'yellow' : 'blue'}-50 p-4 rounded-lg`}>
        <div className="flex items-center space-x-3">
          <AlertTriangle className={`h-5 w-5 text-${urgency === 'critical' ? 'red' : urgency === 'warning' ? 'yellow' : 'blue'}-500`} />
          <div className="flex-1">
            <p className={`font-medium text-${urgency === 'critical' ? 'red' : urgency === 'warning' ? 'yellow' : 'blue'}-900`}>
              {urgency === 'critical' ? 'Limit Reached' : 'Approaching Limit'}
            </p>
            <p className={`text-sm text-${urgency === 'critical' ? 'red' : urgency === 'warning' ? 'yellow' : 'blue'}-700`}>
              {analysis.primaryIssue}: {analysis.issueStats.used} of {analysis.issueStats.limit} used
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleUpgrade}
            disabled={isUpgrading}
            className={`bg-${urgency === 'critical' ? 'red' : urgency === 'warning' ? 'yellow' : 'blue'}-500 hover:bg-${urgency === 'critical' ? 'red' : urgency === 'warning' ? 'yellow' : 'blue'}-600`}
          >
            Upgrade
          </Button>
        </div>
      </div>
    )
  }

  // Default card variant
  return (
    <Card className={`border-${urgency === 'critical' ? 'red' : urgency === 'warning' ? 'yellow' : 'blue'}-200 bg-${urgency === 'critical' ? 'red' : urgency === 'warning' ? 'yellow' : 'blue'}-50`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className={`h-5 w-5 text-${urgency === 'critical' ? 'red' : urgency === 'warning' ? 'yellow' : 'blue'}-500`} />
          <span>
            {urgency === 'critical' ? 'Upgrade Required' : 'Upgrade Recommended'}
          </span>
        </CardTitle>
        <CardDescription>
          {urgency === 'critical' 
            ? `You've reached your limit for ${analysis.primaryIssue}. Upgrade to continue.`
            : `You're approaching your limit for ${analysis.primaryIssue}. Upgrade for more capacity.`
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className={`bg-white p-3 rounded-lg border border-${urgency === 'critical' ? 'red' : urgency === 'warning' ? 'yellow' : 'blue'}-200`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Current Plan</span>
              <Badge variant="outline">{subscription.plan.name}</Badge>
            </div>
            <p className="text-sm text-gray-600">
              {analysis.issueStats.used} of {analysis.issueStats.limit} {analysis.primaryIssue} used
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className={`bg-${urgency === 'critical' ? 'red' : urgency === 'warning' ? 'yellow' : 'blue'}-500 h-2 rounded-full`}
                style={{ width: `${Math.min(analysis.issueStats.percentage, 100)}%` }}
              ></div>
            </div>
          </div>
          
          <div className="bg-white p-3 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">With {analysis.nextPlan}</span>
              <Badge className="bg-green-500 text-white">
                {analysis.nextPlan}
              </Badge>
            </div>
            <p className="text-sm text-green-700">
              {analysis.nextPlan === 'Premium' ? 'Unlimited' : '10x more'} {analysis.primaryIssue}
            </p>
            <div className="flex items-center mt-2">
              <analysis.nextPlanIcon className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-xs text-green-600">Premium features included</span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button
            onClick={handleUpgrade}
            disabled={isUpgrading}
            className={`flex-1 bg-${urgency === 'critical' ? 'red' : urgency === 'warning' ? 'yellow' : 'blue'}-500 hover:bg-${urgency === 'critical' ? 'red' : urgency === 'warning' ? 'yellow' : 'blue'}-600`}
          >
            {isUpgrading ? 'Upgrading...' : `Upgrade to ${analysis.nextPlan}`}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
