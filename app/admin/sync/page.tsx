'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Users, CheckCircle, AlertCircle } from 'lucide-react'

export default function SyncPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastSync, setLastSync] = useState<any>(null)

  const handleSync = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      setLastSync(data)
    } catch (error) {
      console.error('Sync error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscription Sync</h1>
          <p className="text-muted-foreground">
            Sync user subscriptions between Supabase and Stripe
          </p>
        </div>
        <Button 
          onClick={handleSync} 
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Syncing...' : 'Sync Now'}
        </Button>
      </div>

      {lastSync && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lastSync.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Synced</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{lastSync.syncedCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Errors</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{lastSync.errorCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {lastSync?.results && (
        <Card>
          <CardHeader>
            <CardTitle>Sync Results</CardTitle>
            <CardDescription>
              Detailed results from the last sync operation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {lastSync.results.map((result: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{result.email}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.stripeCustomerId && `Customer: ${result.stripeCustomerId}`}
                      {result.stripeSubscriptionId && ` • Subscription: ${result.stripeSubscriptionId}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={result.status === 'synced' ? 'default' : 'secondary'}>
                      {result.planName}
                    </Badge>
                    <Badge variant={result.subscriptionStatus === 'active' ? 'default' : 'outline'}>
                      {result.subscriptionStatus}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
