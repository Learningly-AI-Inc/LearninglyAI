'use client'

import { useEffect, useState } from 'react'
import { useAuth } from './use-auth'

export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price_cents: number
  currency: string
  interval: string
  features: Record<string, any>
  limits: Record<string, any>
}

export interface SubscriptionData {
  plan: SubscriptionPlan
  subscription_plans?: SubscriptionPlan
  status: string
  current_period_end?: string
  cancel_at_period_end?: boolean
  usage: {
    documents_uploaded: number
    writing_words: number
    storage_used_bytes: number
    search_queries: number
    exam_sessions: number
  }
}

export function useSubscription() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscription = async () => {
    if (!user) {
      setSubscription(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/subscriptions/status', {
        cache: 'no-store', // Ensure we get fresh data
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription status')
      }

      const data = await response.json()
      setSubscription(data)
    } catch (err) {
      console.error('Error fetching subscription:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscription()
  }, [user])

  // Always reconcile with Stripe on mount to ensure fresh data
  useEffect(() => {
    if (user) {
      const reconcile = async () => {
        try {
          await fetch('/api/subscriptions/reconcile', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          })
          await fetchSubscription() // Refresh after reconcile
        } catch (error) {
          console.error('Reconciliation failed:', error)
        }
      }
      reconcile()
    }
  }, [user])

  const checkUsageLimit = async (action: string, amount: number = 1): Promise<boolean> => {
    if (!user) return false

    try {
      const response = await fetch('/api/usage/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, amount }),
      })

      if (!response.ok) {
        console.error('Failed to check usage limit')
        return false
      }

      const data = await response.json()
      return data.canProceed
    } catch (err) {
      console.error('Error checking usage limit:', err)
      return false
    }
  }

  const incrementUsage = async (action: string, amount: number = 1): Promise<boolean> => {
    if (!user) return false

    try {
      const response = await fetch('/api/usage/increment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, amount }),
      })

      if (!response.ok) {
        console.error('Failed to increment usage')
        return false
      }

      const data = await response.json()
      if (data.success) {
        // Update local subscription state with new usage
        setSubscription(prev => prev ? {
          ...prev,
          usage: data.usage,
        } : null)
      }
      return data.success
    } catch (err) {
      console.error('Error incrementing usage:', err)
      return false
    }
  }

  const createCheckoutSession = async (plan: string): Promise<string | null> => {
    if (!user) return null

    try {
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan,
          successUrl: `${window.location.origin}/dashboard?success=true`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const data = await response.json()
      return data.checkoutUrl
    } catch (err) {
      console.error('Error creating checkout session:', err)
      // Show user-friendly error message
      alert(`Unable to create checkout session: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again later.`)
      return null
    }
  }

  const createPortalSession = async (): Promise<string | null> => {
    if (!user) return null

    try {
      const response = await fetch('/api/subscriptions/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/dashboard`,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create portal session')
      }

      const data = await response.json()
      return data.portalUrl
    } catch (err) {
      console.error('Error creating portal session:', err)
      return null
    }
  }

  const canUseFeature = (feature: keyof SubscriptionPlan['features'], requestedAmount: number = 1): boolean => {
    if (!subscription) return false

    const limit = subscription.plan.limits[feature]
    if (limit === -1) return true // Unlimited

    const currentUsage = (subscription.usage as any)[feature] || 0
    return (currentUsage + requestedAmount) <= limit
  }

  const getUsagePercentage = (feature: keyof SubscriptionPlan['features']): number => {
    if (!subscription) return 0

    const limit = subscription.plan.limits[feature]
    if (limit === -1) return 0 // Unlimited

    const currentUsage = (subscription.usage as any)[feature] || 0
    return Math.min((currentUsage / limit) * 100, 100)
  }

  const refreshSubscription = async () => {
    await fetchSubscription()
  }

  return {
    subscription,
    loading,
    error,
    refresh: refreshSubscription,
    checkUsageLimit,
    incrementUsage,
    createCheckoutSession,
    createPortalSession,
    canUseFeature,
    getUsagePercentage,
  }
}
