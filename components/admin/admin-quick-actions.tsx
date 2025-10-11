"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  FileText, 
  Brain, 
  Settings,
  Database,
  Shield,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react"
import { useRouter } from "next/navigation"

export function AdminQuickActions() {
  const router = useRouter()

  const quickActions = [
    {
      title: "User Management",
      description: "Manage users, roles, and permissions",
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
      action: () => router.push('/admin/users'),
      badge: null
    },
    {
      title: "Content Review",
      description: "Review and moderate uploaded content",
      icon: FileText,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/20",
      action: () => router.push('/admin/content'),
      badge: "3 pending"
    },
    {
      title: "AI Usage Monitor",
      description: "Monitor AI model usage and costs",
      icon: Brain,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
      action: () => router.push('/admin/ai-usage'),
      badge: null
    },
    {
      title: "System Settings",
      description: "Configure system parameters",
      icon: Settings,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      action: () => router.push('/admin/settings'),
      badge: null
    },
    {
      title: "Database Backup",
      description: "Create system backup",
      icon: Database,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
      action: () => {
        // Implement backup functionality
        console.log('Creating backup...')
      },
      badge: null
    },
    {
      title: "Security Audit",
      description: "Run security checks",
      icon: Shield,
      color: "text-red-600",
      bgColor: "bg-red-100",
      action: () => {
        // Implement security audit
        console.log('Running security audit...')
      },
      badge: "2 issues"
    }
  ]

  const systemActions = [
    {
      title: "Refresh Cache",
      description: "Clear system cache",
      icon: RefreshCw,
      action: () => {
        console.log('Refreshing cache...')
      }
    },
    {
      title: "Export Data",
      description: "Export user data",
      icon: Download,
      action: () => {
        console.log('Exporting data...')
      }
    },
    {
      title: "Import Data",
      description: "Import user data",
      icon: Upload,
      action: () => {
        console.log('Importing data...')
      }
    }
  ]

  return (
    <div className="space-y-6">
      {/* Quick Actions Grid */}
      <div className="grid gap-3">
        {quickActions.map((action, index) => (
          <Card 
            key={index} 
            className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
            onClick={action.action}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${action.bgColor}`}>
                  <action.icon className={`h-4 w-4 ${action.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{action.title}</h4>
                    {action.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {action.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Actions */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">System Actions</h4>
        <div className="grid gap-2">
          {systemActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="justify-start h-auto p-3"
              onClick={action.action}
            >
              <action.icon className="h-4 w-4 mr-2" />
              <div className="text-left">
                <div className="text-sm font-medium">{action.title}</div>
                <div className="text-xs text-muted-foreground">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">System Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Database</span>
            </div>
            <Badge variant="secondary" className="text-xs">Online</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">AI Services</span>
            </div>
            <Badge variant="secondary" className="text-xs">Operational</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm">File Storage</span>
            </div>
            <Badge variant="outline" className="text-xs">Syncing</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm">Backup</span>
            </div>
            <Badge variant="destructive" className="text-xs">Overdue</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}



