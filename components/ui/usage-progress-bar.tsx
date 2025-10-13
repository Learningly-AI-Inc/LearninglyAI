"use client"

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

interface UsageProgressBarProps {
  current: number;
  limit: number;
  label: string;
  unit?: string;
  className?: string;
  showValues?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function UsageProgressBar({
  current,
  limit,
  label,
  unit = '',
  className = '',
  showValues = true,
  size = 'md'
}: UsageProgressBarProps) {
  // Handle unlimited plans (-1 means unlimited)
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : (limit > 0 ? Math.min((current / limit) * 100, 100) : 0);

  // Determine color based on usage percentage
  const getStatusColor = () => {
    if (isUnlimited) return {
      bg: 'bg-blue-500',
      text: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: CheckCircle
    };
    if (percentage >= 90) return {
      bg: 'bg-red-500',
      text: 'text-red-700',
      badge: 'bg-red-100 text-red-700 border-red-200',
      icon: AlertTriangle
    };
    if (percentage >= 75) return {
      bg: 'bg-yellow-500',
      text: 'text-yellow-700',
      badge: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      icon: AlertCircle
    };
    return {
      bg: 'bg-green-500',
      text: 'text-green-700',
      badge: 'bg-green-100 text-green-700 border-green-200',
      icon: CheckCircle
    };
  };

  const status = getStatusColor();
  const IconComponent = status.icon;

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className={`font-medium ${status.text} ${textSizeClasses[size]}`}>
          {label}
        </span>
        {showValues && (
          <div className="flex items-center gap-2">
            <span className={`${textSizeClasses[size]} text-gray-600`}>
              {isUnlimited
                ? `${current.toLocaleString()} ${unit} (Unlimited)`
                : `${current.toLocaleString()} / ${limit.toLocaleString()} ${unit}`
              }
            </span>
            {!isUnlimited && (
              <Badge className={`${status.badge} text-xs px-2 py-0.5`}>
                <IconComponent className="h-3 w-3 mr-1" />
                {percentage.toFixed(0)}%
              </Badge>
            )}
            {isUnlimited && (
              <Badge className={`${status.badge} text-xs px-2 py-0.5`}>
                <IconComponent className="h-3 w-3 mr-1" />
                ∞
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {!isUnlimited && (
        <div className="relative w-full bg-gray-200 rounded-full overflow-hidden" style={{ height: sizeClasses[size] === 'h-1.5' ? '6px' : sizeClasses[size] === 'h-2' ? '8px' : '12px' }}>
          <div
            className={`${status.bg} h-full rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface UsageProgressCardProps {
  current: number;
  limit: number;
  label: string;
  unit?: string;
  description?: string;
  className?: string;
}

export function UsageProgressCard({
  current,
  limit,
  label,
  unit = '',
  description,
  className = ''
}: UsageProgressCardProps) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : (limit > 0 ? Math.min((current / limit) * 100, 100) : 0);
  const remaining = isUnlimited ? Infinity : Math.max(limit - current, 0);

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 shadow-sm ${className}`}>
      <UsageProgressBar
        current={current}
        limit={limit}
        label={label}
        unit={unit}
        showValues={true}
        size="md"
      />
      {description && (
        <p className="text-xs text-gray-500 mt-2">{description}</p>
      )}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-600">Remaining</span>
        <span className="text-sm font-semibold text-gray-900">
          {isUnlimited ? '∞' : `${remaining.toLocaleString()} ${unit}`}
        </span>
      </div>
    </div>
  );
}
