import React from 'react'
import { Crown } from 'lucide-react'

interface PremiumBadgeProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  planName?: string
}

export function PremiumBadge({ className = '', size = 'sm', planName = '' }: PremiumBadgeProps) {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-xs',
    lg: 'px-2.5 py-1.5 text-sm'
  }

  const iconSizes = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-3.5 w-3.5'
  }

  // Check if user is Premium Elite (yearly/elite)
  const normalizedPlanName = (planName || '').toLowerCase()
  const isElite = normalizedPlanName.includes('elite') || normalizedPlanName.includes('yearly')

  if (isElite) {
    return (
      <span
        title="Premium Elite User"
        className={`absolute -bottom-1 -right-1 rounded-full font-semibold bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 text-white shadow-lg border-2 border-purple-300 flex items-center gap-0.5 ${sizeClasses[size]} ${className}`}
      >
        <Crown className={iconSizes[size]} />
        ELITE
      </span>
    )
  }

  return (
    <span
      title="Premium User"
      className={`absolute -bottom-1 -right-1 rounded-full font-semibold bg-gradient-to-r from-yellow-400 to-yellow-500 text-black shadow-lg border border-yellow-300 ${sizeClasses[size]} ${className}`}
    >
      PRO
    </span>
  )
}
