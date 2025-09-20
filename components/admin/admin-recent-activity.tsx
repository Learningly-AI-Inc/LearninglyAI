"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  UserPlus, 
  FileText, 
  Brain, 
  GraduationCap,
  BookOpen,
  MessageSquare,
  Search,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react"
import { useSupabase } from "@/hooks/use-supabase"
import { formatDistanceToNow } from "date-fns"

interface ActivityItem {
  id: string
  type: 'user_registration' | 'content_upload' | 'ai_request' | 'exam_session' | 'reading_activity' | 'chat_message' | 'search_query' | 'system_alert'
  title: string
  description: string
  user?: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  timestamp: string
  metadata?: any
}

export function AdminRecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useSupabase()

  useEffect(() => {
    fetchRecentActivity()
  }, [])

  const fetchRecentActivity = async () => {
    try {
      setLoading(true)
      
      // Fetch recent users
      const { data: recentUsers, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      // Fetch recent AI model logs
      const { data: recentAiLogs, error: aiError } = await supabase
        .from('ai_model_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      // Fetch recent content uploads
      const { data: recentContent, error: contentError } = await supabase
        .from('user_content')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      const activityItems: ActivityItem[] = []

      // Process user registrations
      if (recentUsers && !usersError) {
        recentUsers.forEach(user => {
          activityItems.push({
            id: `user-${user.id}`,
            type: 'user_registration',
            title: 'New User Registration',
            description: `${user.full_name || user.email} joined as ${user.role}`,
            user: {
              id: user.id,
              name: user.full_name || user.email,
              email: user.email
            },
            timestamp: user.created_at
          })
        })
      }

      // Process AI requests
      if (recentAiLogs && !aiError) {
        recentAiLogs.forEach(log => {
          activityItems.push({
            id: `ai-${log.id}`,
            type: 'ai_request',
            title: 'AI Model Request',
            description: `${log.model_name} request processed`,
            timestamp: log.created_at,
            metadata: { model: log.model_name }
          })
        })
      }

      // Process content uploads
      if (recentContent && !contentError) {
        recentContent.forEach(content => {
          activityItems.push({
            id: `content-${content.id}`,
            type: 'content_upload',
            title: 'Content Upload',
            description: `${content.content_type} file uploaded`,
            timestamp: content.created_at,
            metadata: { 
              type: content.content_type,
              status: content.status 
            }
          })
        })
      }

      // Sort by timestamp and take the most recent 10
      const sortedActivities = activityItems
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10)

      setActivities(sortedActivities)
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'user_registration':
        return <UserPlus className="h-4 w-4" />
      case 'content_upload':
        return <FileText className="h-4 w-4" />
      case 'ai_request':
        return <Brain className="h-4 w-4" />
      case 'exam_session':
        return <GraduationCap className="h-4 w-4" />
      case 'reading_activity':
        return <BookOpen className="h-4 w-4" />
      case 'chat_message':
        return <MessageSquare className="h-4 w-4" />
      case 'search_query':
        return <Search className="h-4 w-4" />
      case 'system_alert':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'user_registration':
        return 'text-green-600 bg-green-100'
      case 'content_upload':
        return 'text-blue-600 bg-blue-100'
      case 'ai_request':
        return 'text-purple-600 bg-purple-100'
      case 'exam_session':
        return 'text-orange-600 bg-orange-100'
      case 'reading_activity':
        return 'text-indigo-600 bg-indigo-100'
      case 'chat_message':
        return 'text-cyan-600 bg-cyan-100'
      case 'search_query':
        return 'text-pink-600 bg-pink-100'
      case 'system_alert':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusBadge = (metadata?: any) => {
    if (!metadata?.status) return null
    
    switch (metadata.status) {
      case 'completed':
        return <Badge variant="secondary" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>
      case 'processing':
        return <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" />Processing</Badge>
      case 'failed':
        return <Badge variant="destructive" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 animate-pulse">
            <div className="h-8 w-8 bg-muted rounded-full"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 w-3/4 bg-muted rounded"></div>
              <div className="h-3 w-1/2 bg-muted rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">No recent activity</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
              {getActivityIcon(activity.type)}
            </div>
            
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{activity.title}</p>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {activity.description}
              </p>
              
              {activity.user && (
                <div className="flex items-center space-x-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={activity.user.avatar} />
                    <AvatarFallback className="text-xs">
                      {activity.user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    {activity.user.name}
                  </span>
                </div>
              )}
              
              {getStatusBadge(activity.metadata)}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}



