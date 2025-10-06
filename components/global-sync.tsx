'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'

export function GlobalSync() {
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      // Trigger sync on every page load/refresh
      const syncWithStripe = async () => {
        try {
          // Call reconcile to ensure Supabase is synced with Stripe
          await fetch('/api/subscriptions/reconcile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          })
          console.log('Subscription synced with Stripe')
        } catch (error) {
          console.error('Failed to sync subscription:', error)
        }
      }

      syncWithStripe()
    }
  }, [user])

  return null // This component doesn't render anything
}
