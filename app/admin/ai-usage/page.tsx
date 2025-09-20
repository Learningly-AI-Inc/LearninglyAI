"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Download,
  RefreshCw,
  Brain,
  Zap,
  DollarSign,
  TrendingUp,
  Clock,
  Activity,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import { useSupabase } from "@/hooks/use-supabase"
import { formatDistanceToNow } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AILog {
  id: string
  user_id: string
  model_name: string
  request_payload: any
  response_payload: any
  created_at: string
  user?: {
    email: string
    full_name: string | null
  }
}

interface AIUsageStats {
  totalRequests: number
  totalTokens: number
  estimatedCost: number
  geminiRequests: number
  openaiRequests: number
  avgResponseTime: number
  errorRate: number
}

interface ModelUsage {
  model: string
  requests: number
  tokens: number
  cost: number
  avgTokensPerRequest: number
  lastUsed: string
}

export default function AdminAIUsagePage() {
  const [aiLogs, setAiLogs] = useState<AILog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AILog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [modelFilter, setModelFilter] = useState<string>("all")
  const [stats, setStats] = useState<AIUsageStats>({
    totalRequests: 0,
    totalTokens: 0,
    estimatedCost: 0,
    geminiRequests: 0,
    openaiRequests: 0,
    avgResponseTime: 0,
    errorRate: 0
  })
  const [modelUsage, setModelUsage] = useState<ModelUsage[]>([])
  const supabase = useSupabase()

  useEffect(() => {
    fetchAIUsageData()
  }, [])

  useEffect(() => {
    filterLogs()
  }, [aiLogs, searchTerm, modelFilter])

  const fetchAIUsageData = async () => {
    try {
      setLoading(true)

      // Fetch AI model logs
      const { data: logsData, error: logsError } = await supabase
        .from('ai_model_logs')
        .select(`
          *,
          user:users(email, full_name)
        `)
        .order('created_at', { ascending: false })

      if (logsError) throw logsError

      setAiLogs(logsData || [])

      // Calculate statistics
      const totalRequests = logsData?.length || 0
      const geminiRequests = logsData?.filter(log => log.model_name === 'gemini').length || 0
      const openaiRequests = logsData?.filter(log => log.model_name === 'openai').length || 0
      
      // Calculate real tokens from logs (if available)
      const totalTokens = logsData?.reduce((sum, log) => {
        // Try to extract tokens from response_payload if available
        const tokens = log.response_payload?.usage?.total_tokens || 
                      log.response_payload?.usage?.completion_tokens || 0
        return sum + tokens
      }, 0) || 0
      
      // Calculate estimated cost based on actual tokens
      const geminiTokens = logsData?.filter(log => log.model_name === 'gemini').reduce((sum, log) => {
        const tokens = log.response_payload?.usage?.total_tokens || 0
        return sum + tokens
      }, 0) || 0
      
      const openaiTokens = logsData?.filter(log => log.model_name === 'openai').reduce((sum, log) => {
        const tokens = log.response_payload?.usage?.total_tokens || 0
        return sum + tokens
      }, 0) || 0
      
      const estimatedCost = (geminiTokens * 0.0005 / 1000) + (openaiTokens * 0.002 / 1000) // Real pricing estimates
      
      // Calculate model usage breakdown
      const modelUsageMap = new Map<string, ModelUsage>()
      logsData?.forEach(log => {
        const existing = modelUsageMap.get(log.model_name) || {
          model: log.model_name,
          requests: 0,
          tokens: 0,
          cost: 0,
          avgTokensPerRequest: 0,
          lastUsed: log.created_at
        }
        
        existing.requests += 1
        const tokens = log.response_payload?.usage?.total_tokens || 0
        existing.tokens += tokens
        existing.cost += log.model_name === 'gemini' ? (tokens * 0.0005 / 1000) : (tokens * 0.002 / 1000)
        existing.lastUsed = log.created_at
        
        modelUsageMap.set(log.model_name, existing)
      })

      const modelUsageArray = Array.from(modelUsageMap.values()).map(usage => ({
        ...usage,
        avgTokensPerRequest: usage.tokens / usage.requests
      }))

      setStats({
        totalRequests,
        totalTokens,
        estimatedCost,
        geminiRequests,
        openaiRequests,
        avgResponseTime: 0, // Will be calculated from real response times if available
        errorRate: 0 // Will be calculated from actual error logs if available
      })
      
      setModelUsage(modelUsageArray)
    } catch (error) {
      console.error('Error fetching AI usage data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterLogs = () => {
    let filtered = aiLogs

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.model_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by model
    if (modelFilter !== "all") {
      filtered = filtered.filter(log => log.model_name === modelFilter)
    }

    setFilteredLogs(filtered)
  }

  const getModelBadge = (model: string) => {
    const variants = {
      gemini: "default",
      openai: "secondary",
      'gpt-4': "default",
      'gpt-3.5-turbo': "outline"
    } as const

    return (
      <Badge variant={variants[model as keyof typeof variants] || "outline"}>
        {model.toUpperCase()}
      </Badge>
    )
  }

  const getModelIcon = (model: string) => {
    switch (model.toLowerCase()) {
      case 'gemini':
        return <Brain className="h-3 w-3" />
      case 'openai':
      case 'gpt-4':
      case 'gpt-3.5-turbo':
        return <Zap className="h-3 w-3" />
      default:
        return <Brain className="h-3 w-3" />
    }
  }

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`
    }
    return tokens.toString()
  }

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Usage & Analytics</h1>
            <p className="text-muted-foreground">
              Monitor AI model usage and performance
            </p>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-20 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded mb-2"></div>
                <div className="h-3 w-24 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Usage & Analytics</h1>
          <p className="text-muted-foreground">
            Monitor {stats.totalRequests} AI requests across {modelUsage.length} models
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAIUsageData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests}</div>
            <p className="text-xs text-muted-foreground">
              AI model requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTokens(stats.totalTokens)}</div>
            <p className="text-xs text-muted-foreground">
              Total tokens processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(stats.estimatedCost)}</div>
            <p className="text-xs text-muted-foreground">
              Total estimated cost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseTime}s</div>
            <p className="text-xs text-muted-foreground">
              Average response time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Model Usage Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        {modelUsage.map((usage) => (
          <Card key={usage.model}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {getModelIcon(usage.model)}
                {usage.model.toUpperCase()}
              </CardTitle>
              <Badge variant="outline">
                {usage.requests} requests
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tokens:</span>
                  <span>{formatTokens(usage.tokens)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cost:</span>
                  <span>{formatCost(usage.cost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg Tokens/Request:</span>
                  <span>{formatTokens(usage.avgTokensPerRequest)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Used:</span>
                  <span>{formatDistanceToNow(new Date(usage.lastUsed), { addSuffix: true })}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs by model, user email, or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={modelFilter} onValueChange={setModelFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Models</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="gpt-4">GPT-4</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* AI Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>AI Model Logs ({filteredLogs.length})</CardTitle>
          <CardDescription>
            Recent AI model requests and responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Request Type</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      {getModelIcon(log.model_name)}
                      {log.model_name.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {log.user?.full_name || 'Unknown User'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {log.user?.email || 'No email'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {log.request_payload?.messages ? 'Chat' : 'Other'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatTokens(1000)} {/* Mock tokens */}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatCost(log.model_name === 'gemini' ? 0.001 : 0.002)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Success
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View Request/Response
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Export Log
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  )
}
