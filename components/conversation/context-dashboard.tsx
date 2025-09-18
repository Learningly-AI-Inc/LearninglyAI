"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  Brain, 
  MessageSquare, 
  Zap, 
  DollarSign, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react'
import { ConversationStats } from '@/hooks/use-enhanced-conversation'

interface ContextDashboardProps {
  stats: ConversationStats | null
  totalTokens: number
  estimatedCost: number
  messageCount: number
  isLoading?: boolean
}

export function ContextDashboard({ 
  stats, 
  totalTokens, 
  estimatedCost, 
  messageCount,
  isLoading = false 
}: ContextDashboardProps) {
  const tokenLimit = 4000 // Default token limit
  const tokenUsagePercentage = (totalTokens / tokenLimit) * 100
  const isNearLimit = tokenUsagePercentage > 80
  const isOverLimit = tokenUsagePercentage > 100

  const getTokenStatusColor = () => {
    if (isOverLimit) return 'text-red-500'
    if (isNearLimit) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getTokenStatusIcon = () => {
    if (isOverLimit) return <AlertTriangle className="h-4 w-4" />
    if (isNearLimit) return <AlertTriangle className="h-4 w-4" />
    return <CheckCircle className="h-4 w-4" />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Token Usage Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Token Usage</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{totalTokens.toLocaleString()}</span>
              <Badge variant={isOverLimit ? "destructive" : isNearLimit ? "secondary" : "default"}>
                {getTokenStatusIcon()}
                {isOverLimit ? "Over Limit" : isNearLimit ? "Near Limit" : "Good"}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Usage</span>
                <span>{tokenUsagePercentage.toFixed(1)}%</span>
              </div>
              <Progress 
                value={Math.min(tokenUsagePercentage, 100)} 
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                Limit: {tokenLimit.toLocaleString()} tokens
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Estimation Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold">
              ${estimatedCost.toFixed(4)}
            </div>
            <div className="text-xs text-muted-foreground">
              Current conversation
            </div>
            {stats && (
              <div className="text-xs text-muted-foreground">
                Total: ${(stats.estimatedCost || 0).toFixed(4)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Message Count Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Messages</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold">{messageCount}</div>
            <div className="text-xs text-muted-foreground">
              Current conversation
            </div>
            {stats && (
              <div className="text-xs text-muted-foreground">
                Total: {stats.messageCount.toLocaleString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Performance</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold">
              {stats?.averageTokensPerMessage ? 
                Math.round(stats.averageTokensPerMessage) : 
                totalTokens > 0 ? Math.round(totalTokens / messageCount) : 0
              }
            </div>
            <div className="text-xs text-muted-foreground">
              Avg tokens/message
            </div>
            {isLoading && (
              <div className="flex items-center gap-1 text-xs text-blue-500">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                Processing...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface ContextOptimizationTipsProps {
  tokenUsagePercentage: number
  messageCount: number
  onOptimize?: () => void
}

export function ContextOptimizationTips({ 
  tokenUsagePercentage, 
  messageCount,
  onOptimize 
}: ContextOptimizationTipsProps) {
  const isNearLimit = tokenUsagePercentage > 80
  const isOverLimit = tokenUsagePercentage > 100
  const hasManyMessages = messageCount > 20

  if (!isNearLimit && !hasManyMessages) {
    return null
  }

  const tips = []
  
  if (isOverLimit) {
    tips.push({
      type: 'error',
      title: 'Token limit exceeded',
      description: 'Consider starting a new conversation or summarizing previous messages.',
      action: 'Start New Conversation'
    })
  } else if (isNearLimit) {
    tips.push({
      type: 'warning',
      title: 'Approaching token limit',
      description: 'Your conversation is getting long. Consider summarizing or starting fresh.',
      action: 'Optimize Context'
    })
  }

  if (hasManyMessages) {
    tips.push({
      type: 'info',
      title: 'Long conversation',
      description: 'You have many messages. Context management will help maintain performance.',
      action: 'View Summary'
    })
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Context Optimization
        </CardTitle>
        <CardDescription>
          Tips to optimize your conversation context and performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tips.map((tip, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
              <div className={`mt-0.5 ${
                tip.type === 'error' ? 'text-red-500' :
                tip.type === 'warning' ? 'text-yellow-500' :
                'text-blue-500'
              }`}>
                {tip.type === 'error' ? <AlertTriangle className="h-4 w-4" /> :
                 tip.type === 'warning' ? <AlertTriangle className="h-4 w-4" /> :
                 <Info className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{tip.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {tip.description}
                </p>
              </div>
              {onOptimize && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onOptimize}
                >
                  {tip.action}
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface ConversationSummaryProps {
  conversationId: string | null
  messageCount: number
  totalTokens: number
  onSummarize?: () => void
}

export function ConversationSummary({ 
  conversationId, 
  messageCount, 
  totalTokens,
  onSummarize 
}: ConversationSummaryProps) {
  if (!conversationId || messageCount < 5) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Conversation Summary
        </CardTitle>
        <CardDescription>
          Overview of your current conversation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold">{messageCount}</div>
            <div className="text-sm text-muted-foreground">Messages</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{totalTokens.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Tokens Used</div>
          </div>
        </div>
        {onSummarize && (
          <Button 
            variant="outline" 
            className="w-full mt-4"
            onClick={onSummarize}
          >
            Generate Summary
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
