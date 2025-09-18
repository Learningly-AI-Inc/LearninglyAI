"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Brain, Zap, DollarSign, TrendingUp, Clock, Activity } from "lucide-react"

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

interface AdminAIAnalyticsProps {
  data: AnalyticsData | null
}

export function AdminAIAnalytics({ data }: AdminAIAnalyticsProps) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No AI Data Available</CardTitle>
          <CardDescription>AI analytics data is being loaded</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const totalRequests = data.aiUsage.reduce((sum, usage) => sum + usage.requests, 0)
  const totalTokens = data.aiUsage.reduce((sum, usage) => sum + usage.tokens, 0)
  const totalCost = data.aiUsage.reduce((sum, usage) => sum + usage.cost, 0)
  const avgCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0

  const getModelIcon = (model: string) => {
    switch (model.toLowerCase()) {
      case 'openai':
      case 'gpt-4':
      case 'gpt-3.5-turbo':
        return <Brain className="h-4 w-4 text-green-600" />
      case 'gemini':
      case 'gemini-pro':
        return <Zap className="h-4 w-4 text-blue-600" />
      default:
        return <Brain className="h-4 w-4 text-gray-600" />
    }
  }

  const getModelColor = (model: string) => {
    switch (model.toLowerCase()) {
      case 'openai':
      case 'gpt-4':
      case 'gpt-3.5-turbo':
        return 'text-green-600 bg-green-100'
      case 'gemini':
      case 'gemini-pro':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="space-y-6">
      {/* AI Usage Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              AI model calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Processed</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total tokens used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              AI service costs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost/Request</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgCostPerRequest.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">
              Per API call
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Model Usage Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Model Usage Breakdown</CardTitle>
          <CardDescription>
            AI model usage and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.aiUsage.map((usage, index) => {
              const percentage = totalRequests > 0 ? (usage.requests / totalRequests) * 100 : 0
              const costPercentage = totalCost > 0 ? (usage.cost / totalCost) * 100 : 0
              
              return (
                <div key={index} className="space-y-3 p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1 rounded ${getModelColor(usage.model)}`}>
                        {getModelIcon(usage.model)}
                      </div>
                      <span className="text-sm font-medium">{usage.model}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {usage.requests} requests
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        ${usage.cost.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Request Volume</span>
                      <span className="text-xs font-mono">{percentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Cost Distribution</span>
                      <span className="text-xs font-mono">{costPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={costPercentage} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <div className="text-muted-foreground">Tokens</div>
                      <div className="font-mono">{usage.tokens.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Avg Tokens/Request</div>
                      <div className="font-mono">
                        {usage.requests > 0 ? Math.round(usage.tokens / usage.requests) : 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Cost/Request</div>
                      <div className="font-mono">
                        ${usage.requests > 0 ? (usage.cost / usage.requests).toFixed(4) : '0.0000'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Usage Efficiency</CardTitle>
            <CardDescription>
              AI model efficiency and optimization metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Token Efficiency</span>
                <span className="text-sm font-mono">
                  {totalRequests > 0 ? Math.round(totalTokens / totalRequests) : 0} tokens/request
                </span>
              </div>
              <Progress 
                value={totalRequests > 0 ? Math.min((totalTokens / totalRequests) / 1000 * 100, 100) : 0} 
                className="h-2" 
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cost Efficiency</span>
                <span className="text-sm font-mono">${avgCostPerRequest.toFixed(4)}/request</span>
              </div>
              <Progress 
                value={Math.max(0, 100 - (avgCostPerRequest * 1000))} 
                className="h-2" 
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Model Diversity</span>
                <Badge variant={data.aiUsage.length > 2 ? "default" : "secondary"}>
                  {data.aiUsage.length} models
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost Analysis</CardTitle>
            <CardDescription>
              AI service cost breakdown and trends
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {data.aiUsage.map((usage, index) => {
                const costPercentage = totalCost > 0 ? (usage.cost / totalCost) * 100 : 0
                
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{usage.model}</span>
                      <span className="text-sm font-mono">${usage.cost.toFixed(2)}</span>
                    </div>
                    <Progress value={costPercentage} className="h-1" />
                  </div>
                )
              })}
            </div>
            
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Cost</span>
                <span className="text-sm font-mono font-bold">${totalCost.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle>AI Insights</CardTitle>
          <CardDescription>
            Analysis of AI usage patterns and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Most Used Model</h4>
              <div className="flex items-center gap-2">
                {getModelIcon(data.aiUsage[0]?.model || '')}
                <span className="text-sm">{data.aiUsage[0]?.model || 'N/A'}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {data.aiUsage[0]?.requests || 0} requests
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Cost Optimization</h4>
              <div className="flex items-center gap-2">
                <Badge variant={avgCostPerRequest < 0.01 ? "default" : avgCostPerRequest < 0.05 ? "secondary" : "outline"}>
                  {avgCostPerRequest < 0.01 ? "Excellent" : avgCostPerRequest < 0.05 ? "Good" : "Needs Review"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                ${avgCostPerRequest.toFixed(4)} per request
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Usage Trend</h4>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">Active</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {totalRequests} total requests
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
