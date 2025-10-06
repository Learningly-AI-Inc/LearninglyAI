import React from 'react'

interface PremiumBadgeProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function PremiumBadge({ className = '', size = 'sm' }: PremiumBadgeProps) {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-xs',
    lg: 'px-2.5 py-1.5 text-sm'
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
