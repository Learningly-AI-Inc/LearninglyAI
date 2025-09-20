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
  MessageSquare,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Brain,
  TrendingUp,
  BarChart3,
  MessageCircle,
  Trash2
} from "lucide-react"
import { useSupabase } from "@/hooks/use-supabase"
import { formatDistanceToNow } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Conversation {
  id: string
  user_id: string
  title: string
  model_used: string
  created_at: string
  updated_at: string
  user?: {
    email: string
    full_name: string | null
  }
  messageCount?: number
}

interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  sources: any
  model_used: string | null
  tokens_used: number | null
  created_at: string
}

interface ChatStats {
  totalConversations: number
  totalMessages: number
  avgMessagesPerConversation: number
  geminiConversations: number
  openaiConversations: number
  avgTokensPerMessage: number
  activeUsers: number
}

interface ModelUsage {
  model: string
  conversations: number
  messages: number
  avgTokensPerMessage: number
  lastUsed: string
}

export default function AdminChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([])
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [modelFilter, setModelFilter] = useState<string>("all")
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [conversationMessages, setConversationMessages] = useState<Message[]>([])
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [stats, setStats] = useState<ChatStats>({
    totalConversations: 0,
    totalMessages: 0,
    avgMessagesPerConversation: 0,
    geminiConversations: 0,
    openaiConversations: 0,
    avgTokensPerMessage: 0,
    activeUsers: 0
  })
  const [modelUsage, setModelUsage] = useState<ModelUsage[]>([])
  const supabase = useSupabase()

  useEffect(() => {
    fetchChatData()
  }, [])

  useEffect(() => {
    filterConversations()
    filterMessages()
  }, [conversations, messages, searchTerm, modelFilter])

  const fetchChatData = async () => {
    try {
      setLoading(true)

      // Fetch conversations
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('search_conversations')
        .select(`
          *,
          user:users(email, full_name)
        `)
        .order('created_at', { ascending: false })

      if (conversationsError) throw conversationsError

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('search_messages')
        .select('*')
        .order('created_at', { ascending: false })

      if (messagesError) throw messagesError

      // Add message count to conversations
      const conversationsWithCount = conversationsData?.map(conv => ({
        ...conv,
        messageCount: messagesData?.filter(msg => msg.conversation_id === conv.id).length || 0
      })) || []

      setConversations(conversationsWithCount)
      setMessages(messagesData || [])

      // Calculate statistics
      const totalConversations = conversationsWithCount.length
      const totalMessages = messagesData?.length || 0
      const avgMessagesPerConversation = totalConversations > 0 ? totalMessages / totalConversations : 0
      const geminiConversations = conversationsWithCount.filter(conv => conv.model_used === 'gemini').length
      const openaiConversations = conversationsWithCount.filter(conv => conv.model_used === 'openai').length
      const avgTokensPerMessage = messagesData?.length ? 
        (messagesData.reduce((sum, msg) => sum + (msg.tokens_used || 0), 0) / messagesData.length) : 0
      const uniqueUsers = new Set(conversationsWithCount.map(conv => conv.user_id)).size

      setStats({
        totalConversations,
        totalMessages,
        avgMessagesPerConversation,
        geminiConversations,
        openaiConversations,
        avgTokensPerMessage,
        activeUsers: uniqueUsers
      })

      // Calculate model usage
      const modelUsageMap = new Map<string, ModelUsage>()
      conversationsWithCount.forEach(conv => {
        const existing = modelUsageMap.get(conv.model_used) || {
          model: conv.model_used,
          conversations: 0,
          messages: 0,
          avgTokensPerMessage: 0,
          lastUsed: conv.created_at
        }
        
        existing.conversations += 1
        existing.messages += conv.messageCount || 0
        existing.lastUsed = conv.created_at
        
        modelUsageMap.set(conv.model_used, existing)
      })

      const modelUsageArray = Array.from(modelUsageMap.values()).map(usage => ({
        ...usage,
        avgTokensPerMessage: usage.messages > 0 ? 
          (messagesData?.filter(msg => msg.model_used === usage.model).reduce((sum, msg) => sum + (msg.tokens_used || 0), 0) || 0) / usage.messages : 0
      }))

      setModelUsage(modelUsageArray)
    } catch (error) {
      console.error('Error fetching chat data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterConversations = () => {
    let filtered = conversations

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(conv =>
        conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by model
    if (modelFilter !== "all") {
      filtered = filtered.filter(conv => conv.model_used === modelFilter)
    }

    setFilteredConversations(filtered)
  }

  const filterMessages = () => {
    let filtered = messages

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(msg =>
        msg.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.model_used?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by model
    if (modelFilter !== "all") {
      filtered = filtered.filter(msg => msg.model_used === modelFilter)
    }

    setFilteredMessages(filtered)
  }

  const viewConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation)
    
    // Fetch messages for this conversation
    const { data: convMessages, error } = await supabase
      .from('search_messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })

    if (!error && convMessages) {
      setConversationMessages(convMessages)
      setViewDialogOpen(true)
    }
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
        return <MessageCircle className="h-3 w-3" />
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Chat & Conversation Management</h1>
            <p className="text-muted-foreground">
              Monitor chat conversations and messages
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
          <h1 className="text-3xl font-bold tracking-tight">Chat & Conversation Management</h1>
          <p className="text-muted-foreground">
            Monitor {stats.totalConversations} conversations with {stats.totalMessages} messages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchChatData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConversations}</div>
            <p className="text-xs text-muted-foreground">
              Chat conversations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMessages}</div>
            <p className="text-xs text-muted-foreground">
              Chat messages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Users with conversations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Messages</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgMessagesPerConversation.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Per conversation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Model Usage Breakdown */}
      {modelUsage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Model Usage</CardTitle>
            <CardDescription>
              AI model usage across conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {modelUsage.map((usage) => (
                <div key={usage.model} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getModelIcon(usage.model)}
                    <div>
                      <div className="font-medium">{usage.model.toUpperCase()}</div>
                      <div className="text-sm text-muted-foreground">
                        {usage.conversations} conversations
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {usage.messages} messages
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTokens(usage.avgTokensPerMessage)} avg tokens
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations, messages, or users..."
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

      {/* Tabs for Conversations and Messages */}
      <Tabs defaultValue="conversations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="conversations">Conversations ({filteredConversations.length})</TabsTrigger>
          <TabsTrigger value="messages">Messages ({filteredMessages.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="conversations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chat Conversations</CardTitle>
              <CardDescription>
                Manage chat conversations and view details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conversation</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConversations.map((conv) => (
                    <TableRow key={conv.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{conv.title}</div>
                          <div className="text-sm text-muted-foreground">
                            ID: {conv.id.slice(0, 8)}...
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {conv.user?.full_name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {conv.user?.email || 'No email'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          {getModelIcon(conv.model_used)}
                          {conv.model_used.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {conv.messageCount || 0} messages
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(conv.created_at), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                        </div>
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
                            <DropdownMenuItem onClick={() => viewConversation(conv)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Messages
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Export
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
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
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chat Messages</CardTitle>
              <CardDescription>
                Individual chat messages across all conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMessages.slice(0, 50).map((msg) => (
                    <TableRow key={msg.id}>
                      <TableCell>
                        <Badge variant={msg.role === 'user' ? 'default' : 'secondary'}>
                          {msg.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md truncate">
                          {msg.content}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {msg.model_used || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {msg.tokens_used ? formatTokens(msg.tokens_used) : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Conversation Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Conversation: {selectedConversation?.title}
            </DialogTitle>
            <DialogDescription>
              Messages from {selectedConversation?.user?.full_name || selectedConversation?.user?.email}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {conversationMessages.map((msg) => (
                <div key={msg.id} className={`p-4 rounded-lg ${
                  msg.role === 'user' ? 'bg-muted ml-8' : 'bg-background mr-8'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={msg.role === 'user' ? 'default' : 'secondary'}>
                      {msg.role}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.tokens_used && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Tokens: {formatTokens(msg.tokens_used)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
