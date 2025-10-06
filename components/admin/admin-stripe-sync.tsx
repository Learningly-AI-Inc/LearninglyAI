'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface SyncStats {
  totalUsers: number
  activeSubscriptions: number
  freeUsers: number
  lastSync: string | null
  syncHealth: {
    status: 'healthy' | 'warning' | 'critical'
    errors: string[]
    warnings: string[]
    recommendations: string[]
  }
}

interface SyncResult {
  success: boolean
  message: string
  stats: {
    totalUsers: number
    usersSynced: number
    subscriptionsUpdated: number
    errors: string[]
  }
}

export function AdminStripeSync() {
  const [stats, setStats] = useState<SyncStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/sync-stripe')
      const data = await response.json()
      
      if (data.success) {
        setStats(data)
      } else {
        toast.error('Failed to fetch sync stats')
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      toast.error('Failed to fetch sync stats')
    } finally {
      setLoading(false)
    }
  }

  const runSync = async () => {
    try {
      setSyncing(true)
      const response = await fetch('/api/admin/sync-stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const result: SyncResult = await response.json()
      setLastSyncResult(result)
      
      if (result.success) {
        toast.success('Sync completed successfully')
        await fetchStats() // Refresh stats
      } else {
        toast.error(`Sync failed: ${result.message}`)
      }
    } catch (error) {
      console.error('Error running sync:', error)
      toast.error('Failed to run sync')
    } finally {
      setSyncing(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-100 text-green-800">Healthy</Badge>
      case 'warning':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Warning</Badge>
      case 'critical':
        return <Badge variant="default" className="bg-red-100 text-red-800">Critical</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  useEffect(() => {
    fetchStats()
    
    // Refresh stats every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stripe Sync Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading sync status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(stats?.syncHealth.status || 'unknown')}
              Stripe Sync Status
            </CardTitle>
            <div className="flex items-center gap-2">
              {getStatusBadge(stats?.syncHealth.status || 'unknown')}
              <Button
                onClick={runSync}
                disabled={syncing}
                size="sm"
                variant="outline"
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {syncing ? 'Syncing...' : 'Run Sync'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <div className="text-sm text-gray-500">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats?.activeSubscriptions || 0}</div>
              <div className="text-sm text-gray-500">Active Subscriptions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{stats?.freeUsers || 0}</div>
              <div className="text-sm text-gray-500">Free Users</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium">
                {stats?.lastSync ? new Date(stats.lastSync).toLocaleString() : 'Never'}
              </div>
              <div className="text-sm text-gray-500">Last Sync</div>
            </div>
          </div>

          {/* Health Issues */}
          {stats?.syncHealth.errors.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">Critical Issues:</div>
                <ul className="list-disc list-inside space-y-1">
                  {stats.syncHealth.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {stats?.syncHealth.warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">Warnings:</div>
                <ul className="list-disc list-inside space-y-1">
                  {stats.syncHealth.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Recommendations */}
          {stats?.syncHealth.recommendations.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">Recommendations:</div>
                <ul className="list-disc list-inside space-y-1">
                  {stats.syncHealth.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Last Sync Result */}
      {lastSyncResult && (
        <Card>
          <CardHeader>
            <CardTitle>Last Sync Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {lastSyncResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="font-medium">{lastSyncResult.message}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium">{lastSyncResult.stats.usersSynced}</div>
                  <div className="text-gray-500">Users Synced</div>
                </div>
                <div>
                  <div className="font-medium">{lastSyncResult.stats.subscriptionsUpdated}</div>
                  <div className="text-gray-500">Subscriptions Updated</div>
                </div>
                <div>
                  <div className="font-medium">{lastSyncResult.stats.errors.length}</div>
                  <div className="text-gray-500">Errors</div>
                </div>
              </div>

              {lastSyncResult.stats.errors.length > 0 && (
                <div className="mt-4">
                  <div className="font-medium text-red-600 mb-2">Errors:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
                    {lastSyncResult.stats.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
