'use client'

import { SubscriptionStatus } from './subscription-status'
import { UsageDashboard } from './usage-meter'
import { DynamicUpgradePrompt } from './dynamic-upgrade-prompt'
import { useSubscription } from '@/hooks/use-subscription'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Zap, Crown, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function SubscriptionDashboard() {
  const { subscription, loading, createCheckoutSession } = useSubscription()

  const handleUpgrade = async (plan: string) => {
    try {
      const checkoutUrl = await createCheckoutSession(plan)
      if (checkoutUrl) {
        window.location.href = checkoutUrl
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }


  return (
    <div className="space-y-6">
      {/* Subscription Status */}
      <SubscriptionStatus />

      {/* Usage Dashboard */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Usage Overview</CardTitle>
            <CardDescription>
              Track your daily usage across all features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsageDashboard usage={{
              documents: {
                used: subscription.usage.documents_uploaded,
                limit: subscription.plan.limits.document_uploads === -1 ? 'Unlimited' : subscription.plan.limits.document_uploads,
                percentage: subscription.plan.limits.document_uploads === -1 ? 0 : (subscription.usage.documents_uploaded / subscription.plan.limits.document_uploads) * 100,
              },
              aiRequests: {
                used: subscription.usage.ai_requests,
                limit: subscription.plan.limits.ai_requests === -1 ? 'Unlimited' : subscription.plan.limits.ai_requests,
                percentage: subscription.plan.limits.ai_requests === -1 ? 0 : (subscription.usage.ai_requests / subscription.plan.limits.ai_requests) * 100,
              },
              searchQueries: {
                used: subscription.usage.search_queries,
                limit: subscription.plan.limits.search_queries === -1 ? 'Unlimited' : subscription.plan.limits.search_queries,
                percentage: subscription.plan.limits.search_queries === -1 ? 0 : (subscription.usage.search_queries / subscription.plan.limits.search_queries) * 100,
              },
              examSessions: {
                used: subscription.usage.exam_sessions,
                limit: (subscription.plan.limits.exam_sessions || 5) === -1 ? 'Unlimited' : (subscription.plan.limits.exam_sessions || 5),
                percentage: (subscription.plan.limits.exam_sessions || 5) === -1 ? 0 : (subscription.usage.exam_sessions / (subscription.plan.limits.exam_sessions || 5)) * 100,
              },
            }} />
          </CardContent>
        </Card>
      )}

      {/* Dynamic Upgrade Prompt */}
      <DynamicUpgradePrompt 
        onUpgrade={handleUpgrade}
        variant="card"
      />

      {/* Feature Highlights */}
      <Card>
        <CardHeader>
          <CardTitle>Your Plan Benefits</CardTitle>
          <CardDescription>
            Features included with your current subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscription ? (
              Object.entries(subscription.plan.features).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <div className="bg-green-100 p-1 rounded-full">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  </div>
                  <span className="text-sm text-gray-700">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: {
                      value === true ? 'Included' : 
                      value === -1 ? 'Unlimited' : 
                      value
                    }
                  </span>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-600">
                You're currently using the free plan. Upgrade to unlock more features!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
