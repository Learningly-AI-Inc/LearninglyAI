'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, CreditCard, Settings, AlertCircle } from 'lucide-react'
import { useSubscription } from '@/hooks/use-subscription'
import { useState } from 'react'

export function SubscriptionStatus() {
  const { subscription, loading, createPortalSession } = useSubscription()
  const [isLoading, setIsLoading] = useState(false)

  const handleManageSubscription = async () => {
    setIsLoading(true)
    try {
      const portalUrl = await createPortalSession()
      if (portalUrl) {
        window.location.href = portalUrl
      }
    } catch (error) {
      console.error('Error opening customer portal:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-500 text-white">Active</Badge>
      case 'trialing':
        return <Badge className="bg-blue-500 text-white">Trial</Badge>
      case 'past_due':
        return <Badge className="bg-yellow-500 text-white">Past Due</Badge>
      case 'canceled':
        return <Badge className="bg-red-500 text-white">Canceled</Badge>
      case 'unpaid':
        return <Badge className="bg-red-500 text-white">Unpaid</Badge>
      default:
        return <Badge className="bg-gray-500 text-white">{status}</Badge>
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <span>No Active Subscription</span>
          </CardTitle>
          <CardDescription>
            You're currently using the free plan. Upgrade to unlock more features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <a href="/pricing">View Plans</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Subscription Status</span>
          {getStatusBadge(subscription.status)}
        </CardTitle>
        <CardDescription>
          Manage your subscription and billing preferences
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CreditCard className="h-4 w-4" />
              <span>Plan</span>
            </div>
            <p className="font-semibold">{subscription.plan.name}</p>
            <p className="text-sm text-gray-600">{subscription.plan.description}</p>
          </div>
          
          {subscription.current_period_end && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Next Billing</span>
              </div>
              <p className="font-semibold">
                {formatDate(subscription.current_period_end)}
              </p>
              {subscription.cancel_at_period_end && (
                <p className="text-sm text-red-600">
                  Subscription will cancel at period end
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className="pt-4 border-t">
          <Button
            onClick={handleManageSubscription}
            disabled={isLoading}
            className="w-full"
            variant="outline"
          >
            <Settings className="h-4 w-4 mr-2" />
            {isLoading ? 'Loading...' : 'Manage Subscription'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
