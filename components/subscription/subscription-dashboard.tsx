'use client'

import { SubscriptionStatus } from './subscription-status'
import { UsageDashboard } from './usage-meter'
import { useSubscription } from '@/hooks/use-subscription'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Zap, Crown, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function SubscriptionDashboard() {
  const { subscription, loading } = useSubscription()

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

  const getUpgradeRecommendation = () => {
    if (!subscription || subscription.plan.name === 'Premium') return null

    const usage = subscription.usage
    const limits = subscription.plan.limits

    // Check if any usage is near limits
    const aiRequestsPercentage = (usage.ai_requests / limits.ai_requests) * 100
    const documentUploadsPercentage = (usage.documents_uploaded / limits.document_uploads) * 100
    const searchQueriesPercentage = (usage.search_queries / limits.search_queries) * 100

    if (aiRequestsPercentage >= 80 || documentUploadsPercentage >= 80 || searchQueriesPercentage >= 80) {
      const nextPlan = subscription.plan.name === 'Free' ? 'Freemium' : 'Premium'
      return {
        plan: nextPlan,
        reason: 'You\'re approaching your usage limits',
        icon: subscription.plan.name === 'Free' ? Zap : Crown,
      }
    }

    return null
  }

  const recommendation = getUpgradeRecommendation()

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
                limit: subscription.plan.limits.document_uploads,
                percentage: (subscription.usage.documents_uploaded / subscription.plan.limits.document_uploads) * 100,
              },
              aiRequests: {
                used: subscription.usage.ai_requests,
                limit: subscription.plan.limits.ai_requests,
                percentage: (subscription.usage.ai_requests / subscription.plan.limits.ai_requests) * 100,
              },
              searchQueries: {
                used: subscription.usage.search_queries,
                limit: subscription.plan.limits.search_queries,
                percentage: (subscription.usage.search_queries / subscription.plan.limits.search_queries) * 100,
              },
              examSessions: {
                used: subscription.usage.exam_sessions,
                limit: subscription.plan.limits.exam_sessions || 5,
                percentage: (subscription.usage.exam_sessions / (subscription.plan.limits.exam_sessions || 5)) * 100,
              },
            }} />
          </CardContent>
        </Card>
      )}

      {/* Upgrade Recommendation */}
      {recommendation && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <span>Upgrade Recommendation</span>
            </CardTitle>
            <CardDescription>
              {recommendation.reason}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <recommendation.icon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-blue-900">
                    Upgrade to {recommendation.plan}
                  </p>
                  <p className="text-sm text-blue-700">
                    Get more usage and premium features
                  </p>
                </div>
              </div>
              <Link href="/pricing">
                <Button className="bg-blue-500 hover:bg-blue-600">
                  View Plans
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

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
