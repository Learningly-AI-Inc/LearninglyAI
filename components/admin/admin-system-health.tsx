"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Activity, 
  Database, 
  Server, 
  HardDrive,
  Cpu,
  MemoryStick,
  Wifi,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw
} from "lucide-react"
import { useSupabase } from "@/hooks/use-supabase"

interface SystemMetric {
  name: string
  value: number
  max: number
  unit: string
  status: 'healthy' | 'warning' | 'critical'
  trend: 'up' | 'down' | 'stable'
}

interface SystemHealth {
  database: {
    status: 'online' | 'offline' | 'degraded'
    responseTime: number
    connections: number
    maxConnections: number
  }
  storage: {
    used: number
    total: number
    unit: string
  }
  performance: {
    cpu: number
    memory: number
    disk: number
  }
  services: {
    name: string
    status: 'healthy' | 'warning' | 'critical'
    uptime: string
  }[]
}

export function AdminSystemHealth() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const supabase = useSupabase()

  useEffect(() => {
    fetchSystemHealth()
    const interval = setInterval(fetchSystemHealth, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchSystemHealth = async () => {
    try {
      setLoading(true)
      
      // Test database connection
      const startTime = Date.now()
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1)
      const responseTime = Date.now() - startTime

      // Simulate system metrics (in a real app, these would come from monitoring services)
      const mockSystemHealth: SystemHealth = {
        database: {
          status: error ? 'offline' : responseTime < 100 ? 'online' : 'degraded',
          responseTime,
          connections: Math.floor(Math.random() * 50) + 10,
          maxConnections: 100
        },
        storage: {
          used: 75.2,
          total: 100,
          unit: 'GB'
        },
        performance: {
          cpu: Math.floor(Math.random() * 30) + 20,
          memory: Math.floor(Math.random() * 40) + 30,
          disk: Math.floor(Math.random() * 20) + 15
        },
        services: [
          {
            name: 'Authentication Service',
            status: 'healthy',
            uptime: '99.9%'
          },
          {
            name: 'AI Processing',
            status: 'healthy',
            uptime: '99.7%'
          },
          {
            name: 'File Storage',
            status: 'warning',
            uptime: '98.2%'
          },
          {
            name: 'Email Service',
            status: 'critical',
            uptime: '95.1%'
          }
        ]
      }

      setSystemHealth(mockSystemHealth)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching system health:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'text-green-600 bg-green-100'
      case 'warning':
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100'
      case 'critical':
      case 'offline':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return <CheckCircle className="h-4 w-4" />
      case 'warning':
      case 'degraded':
        return <Clock className="h-4 w-4" />
      case 'critical':
      case 'offline':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  if (loading && !systemHealth) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">System Health</h2>
            <p className="text-muted-foreground">
              Monitor system performance and status
            </p>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

  if (!systemHealth) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            System Health Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Unable to fetch system health data. Please check your connection and try again.
          </p>
          <Button onClick={fetchSystemHealth} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Health</h2>
          <p className="text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <Button onClick={fetchSystemHealth} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Database Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <Badge className={getStatusColor(systemHealth.database.status)}>
                  {getStatusIcon(systemHealth.database.status)}
                  <span className="ml-1 capitalize">{systemHealth.database.status}</span>
                </Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Response Time</span>
                <span className="text-sm font-mono">{systemHealth.database.responseTime}ms</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Connections</span>
                <span className="text-sm font-mono">
                  {systemHealth.database.connections}/{systemHealth.database.maxConnections}
                </span>
              </div>
              <Progress 
                value={(systemHealth.database.connections / systemHealth.database.maxConnections) * 100} 
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.performance.cpu}%</div>
            <Progress value={systemHealth.performance.cpu} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.performance.memory}%</div>
            <Progress value={systemHealth.performance.memory} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.performance.disk}%</div>
            <Progress value={systemHealth.performance.disk} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Storage Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Used Space</span>
              <span className="text-sm font-mono">
                {systemHealth.storage.used} / {systemHealth.storage.total} {systemHealth.storage.unit}
              </span>
            </div>
            <Progress 
              value={(systemHealth.storage.used / systemHealth.storage.total) * 100} 
              className="h-3"
            />
            <div className="text-xs text-muted-foreground">
              {((systemHealth.storage.total - systemHealth.storage.used) / systemHealth.storage.total * 100).toFixed(1)}% free space remaining
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Services Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {systemHealth.services.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${getStatusColor(service.status)}`}>
                    {getStatusIcon(service.status)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{service.name}</p>
                    <p className="text-xs text-muted-foreground">Uptime: {service.uptime}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(service.status)}>
                  {service.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}



