'use client'

import React from 'react'
import { useSubscription } from '@/hooks/use-subscription'
import { PremiumBadge } from './premium-badge'

interface PremiumIndicatorProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Premium indicator component that shows a "PRO" or "ELITE" badge for premium users
 * Automatically checks subscription status and plan name
 */
export function PremiumIndicator({ className = '', size = 'sm' }: PremiumIndicatorProps) {
  const { subscription } = useSubscription()

  // Show premium badge if user has active/trialing subscription with Premium plan
  const isPremium = subscription &&
    (subscription.status === 'active' || subscription.status === 'trialing') &&
    subscription.plan &&
    subscription.plan.name.includes('Premium')

  if (!isPremium) {
    return null
  }

  return <PremiumBadge className={className} size={size} planName={subscription?.plan?.name} />
}

/**
 * Hook to check if current user is premium
 */
export function useIsPremium() {
  const { subscription } = useSubscription()
  
  return subscription &&
    (subscription.status === 'active' || subscription.status === 'trialing') &&
    subscription.plan &&
    subscription.plan.name.includes('Premium')
}
