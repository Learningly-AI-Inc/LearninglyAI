'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, RefreshCw, Users, UserPlus, UserMinus, UserCheck, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface SyncStats {
  totalAuthUsers: number
  totalDbUsers: number
  usersToAdd: number
  usersToRemove: number
  usersToUpdate: number
  isInSync: boolean
}

interface SyncResult {
  success: boolean
  message: string
  stats: {
    totalAuthUsers: number
    totalDbUsers: number
    usersAdded: number
    usersUpdated: number
    usersRemoved: number
    errors: string[]
  }
}

export function UserSyncPanel() {
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [stats, setStats] = useState<SyncStats | null>(null)
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/sync-users')
      const data = await response.json()

      if (data.success) {
        setStats(data.stats)
        toast.success('Sync statistics updated')
      } else {
        toast.error(data.error || 'Failed to fetch sync statistics')
      }
    } catch (error: any) {
      console.error('Error fetching stats:', error)
      toast.error('Failed to fetch sync statistics')
    } finally {
      setLoading(false)
    }
  }

  const performSync = async (dryRun = false) => {
    setSyncing(true)
    try {
      const response = await fetch('/api/admin/sync-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun }),
      })

      const data = await response.json()

      if (data.success) {
        if (dryRun) {
          setStats(data.stats)
          toast.success('Dry run completed - no changes made')
        } else {
          setLastSyncResult(data)
          setStats(data.stats)
          toast.success(data.message || 'User sync completed successfully')
        }
      } else {
        toast.error(data.error || 'Failed to sync users')
      }
    } catch (error: any) {
      console.error('Error syncing users:', error)
      toast.error('Failed to sync users')
    } finally {
      setSyncing(false)
    }
  }

  const getSyncStatusBadge = () => {
    if (!stats) return null

    if (stats.isInSync) {
      return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />In Sync</Badge>
    }

    const totalChanges = stats.usersToAdd + stats.usersToRemove + stats.usersToUpdate
    if (totalChanges > 0) {
      return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Needs Sync ({totalChanges} changes)</Badge>
    }

    return <Badge variant="secondary">Unknown</Badge>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Synchronization
          </CardTitle>
          <CardDescription>
            Keep your database users table in sync with Supabase Auth users. 
            This will automatically add new users, update existing ones, and remove deleted users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={fetchStats} 
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh Stats
            </Button>
            
            <Button 
              onClick={() => performSync(true)} 
              disabled={syncing}
              variant="outline"
              size="sm"
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserCheck className="w-4 h-4 mr-2" />
              )}
              Dry Run
            </Button>
            
            <Button 
              onClick={() => performSync(false)} 
              disabled={syncing || !stats || stats.isInSync}
              variant="default"
              size="sm"
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sync Users
            </Button>
          </div>

          {/* Current Status */}
          {stats && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              {getSyncStatusBadge()}
            </div>
          )}

          {/* Statistics */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.totalAuthUsers}</div>
                <div className="text-sm text-blue-600">Auth Users</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.totalDbUsers}</div>
                <div className="text-sm text-green-600">DB Users</div>
              </div>
              
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stats.usersToAdd}</div>
                <div className="text-sm text-yellow-600">To Add</div>
              </div>
              
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.usersToRemove}</div>
                <div className="text-sm text-red-600">To Remove</div>
              </div>
            </div>
          )}

          {/* Detailed Changes */}
          {stats && !stats.isInSync && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Pending Changes:</h4>
              <div className="space-y-1 text-sm">
                {stats.usersToAdd > 0 && (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <UserPlus className="w-4 h-4" />
                    {stats.usersToAdd} user(s) will be added
                  </div>
                )}
                {stats.usersToUpdate > 0 && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <UserCheck className="w-4 h-4" />
                    {stats.usersToUpdate} user(s) will be updated
                  </div>
                )}
                {stats.usersToRemove > 0 && (
                  <div className="flex items-center gap-2 text-red-600">
                    <UserMinus className="w-4 h-4" />
                    {stats.usersToRemove} user(s) will be removed
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Last Sync Result */}
          {lastSyncResult && (
            <Alert className={lastSyncResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <div className="flex items-center gap-2">
                {lastSyncResult.success ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <AlertDescription className={lastSyncResult.success ? "text-green-800" : "text-red-800"}>
                  <strong>Last Sync:</strong> {lastSyncResult.message}
                </AlertDescription>
              </div>
              
              {lastSyncResult.stats && (
                <div className="mt-2 text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <div>Added: {lastSyncResult.stats.usersAdded}</div>
                    <div>Updated: {lastSyncResult.stats.usersUpdated}</div>
                    <div>Removed: {lastSyncResult.stats.usersRemoved}</div>
                  </div>
                  
                  {lastSyncResult.stats.errors.length > 0 && (
                    <div className="mt-2">
                      <strong>Errors:</strong>
                      <ul className="list-disc list-inside text-xs">
                        {lastSyncResult.stats.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </Alert>
          )}

          {/* Warning */}
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <strong>Warning:</strong> This operation will permanently remove users from the database 
              if they no longer exist in Supabase Auth. Make sure you have backups if needed.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
