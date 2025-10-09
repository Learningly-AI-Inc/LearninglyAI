"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from '@/hooks/use-auth'

export interface UsageData {
  documents_uploaded: number
  writing_words: number
  search_queries: number
  exam_sessions: number
  storage_used_bytes: number
}

export interface PlanData {
  name: string
  description: string
  price_cents: number
  currency: string
  interval: string
  features: Record<string, any>
  limits: {
    documents_uploaded: number
    writing_words: number
    search_queries: number
    exam_sessions: number
    storage_used_bytes: number
  }
}

export interface UserStatus {
  plan: PlanData
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  usage: UsageData
}

interface UserStatusContextValue {
  status: UserStatus | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  getCurrentUsage: (action: keyof UsageData) => number
  getCurrentLimit: (action: keyof UsageData) => number
  isNearLimit: (action: keyof UsageData) => boolean
  isAtLimit: (action: keyof UsageData) => boolean
  isFreePlan: boolean
}

const UserStatusContext = createContext<UserStatusContextValue | undefined>(undefined)

export function UserStatusProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [status, setStatus] = useState<UserStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUserStatus = async () => {
    if (!user) {
      setStatus(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/user/status', {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch user status')
      }

      const data = await response.json()
      setStatus(data)

      // Log detailed user limits for debugging
      console.group('🔒 USER STATUS LOADED')
      console.log('Plan:', data.plan?.name || 'Free')
      console.log('Status:', data.status)
      console.log('')
      console.log('📝 WRITING:', `${data.usage?.writing_words || 0}/${data.plan?.limits?.writing_words || 0} words`)
      console.log('📄 DOCUMENTS:', `${data.usage?.documents_uploaded || 0}/${data.plan?.limits?.documents_uploaded || 0} docs`)
      console.log('🔍 SEARCHES:', `${data.usage?.search_queries || 0}/${data.plan?.limits?.search_queries || 0} queries`)
      console.log('📚 EXAMS:', `${data.usage?.exam_sessions || 0}/${data.plan?.limits?.exam_sessions || 0} sessions`)
      console.log('💾 STORAGE:', `${((data.usage?.storage_used_bytes || 0) / (1024 * 1024)).toFixed(2)}MB/${((data.plan?.limits?.storage_used_bytes || 0) / (1024 * 1024)).toFixed(2)}MB`)
      console.groupEnd()
    } catch (err) {
      console.error('Error fetching user status:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserStatus()
  }, [user])

  const getCurrentUsage = (action: keyof UsageData): number => {
    return status?.usage[action] || 0
  }

  const getCurrentLimit = (action: keyof UsageData): number => {
    return status?.plan?.limits[action] || 0
  }

  const isNearLimit = (action: keyof UsageData): boolean => {
    const usage = getCurrentUsage(action)
    const limit = getCurrentLimit(action)
    if (limit === 0) return false
    return (usage / limit) >= 0.75
  }

  const isAtLimit = (action: keyof UsageData): boolean => {
    const usage = getCurrentUsage(action)
    const limit = getCurrentLimit(action)
    if (limit === 0) return false
    return usage >= limit
  }

  const isFreePlan = status?.plan?.name?.toLowerCase().includes('free') ||
                     status?.plan?.price_cents === 0 ||
                     false

  const value: UserStatusContextValue = {
    status,
    loading,
    error,
    refresh: fetchUserStatus,
    getCurrentUsage,
    getCurrentLimit,
    isNearLimit,
    isAtLimit,
    isFreePlan,
  }

  return (
    <UserStatusContext.Provider value={value}>
      {children}
    </UserStatusContext.Provider>
  )
}

export function useUserStatus() {
  const context = useContext(UserStatusContext)
  if (context === undefined) {
    throw new Error('useUserStatus must be used within a UserStatusProvider')
  }
  return context
}
