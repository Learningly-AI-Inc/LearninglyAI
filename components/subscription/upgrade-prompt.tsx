'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Zap, Crown, ArrowRight, X } from 'lucide-react'
import { useState } from 'react'

interface UpgradePromptProps {
  feature: string
  currentLimit: number
  upgradeLimit: number | string
  planName: string
  onUpgrade: () => void
  onDismiss?: () => void
  variant?: 'banner' | 'dialog' | 'inline'
  showDialog?: boolean
}

export function UpgradePrompt({
  feature,
  currentLimit,
  upgradeLimit,
  planName,
  onUpgrade,
  onDismiss,
  variant = 'banner',
  showDialog = false,
}: UpgradePromptProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(showDialog)

  const getIcon = () => {
    switch (planName.toLowerCase()) {
      case 'freemium':
        return <Zap className="h-5 w-5 text-blue-500" />
      case 'premium':
        return <Crown className="h-5 w-5 text-yellow-500" />
      default:
        return <Zap className="h-5 w-5 text-blue-500" />
    }
  }

  const getPlanColor = () => {
    switch (planName.toLowerCase()) {
      case 'freemium':
        return 'bg-blue-500 hover:bg-blue-600'
      case 'premium':
        return 'bg-yellow-500 hover:bg-yellow-600'
      default:
        return 'bg-blue-500 hover:bg-blue-600'
    }
  }

  if (variant === 'banner') {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <div className="flex items-center space-x-2">
          {getIcon()}
          <AlertDescription className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-900">
                  You've reached your limit for {feature}
                </p>
                <p className="text-sm text-blue-700">
                  Upgrade to {planName} to get {upgradeLimit === 'unlimited' ? 'unlimited' : upgradeLimit} {feature} per day
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  onClick={onUpgrade}
                  className={getPlanColor()}
                >
                  Upgrade Now
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
                {onDismiss && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onDismiss}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </AlertDescription>
        </div>
      </Alert>
    )
  }

  if (variant === 'dialog') {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {getIcon()}
              <span>Upgrade Required</span>
            </DialogTitle>
            <DialogDescription>
              You've reached your daily limit for {feature}. Upgrade to continue using this feature.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Current Plan</span>
                <Badge variant="outline">Free</Badge>
              </div>
              <p className="text-sm text-gray-600">
                {currentLimit} {feature} per day
              </p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">With {planName}</span>
                <Badge className={getPlanColor()}>
                  {planName}
                </Badge>
              </div>
              <p className="text-sm text-blue-700">
                {upgradeLimit === 'unlimited' ? 'Unlimited' : upgradeLimit} {feature} per day
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button
                onClick={onUpgrade}
                className={`flex-1 ${getPlanColor()}`}
              >
                Upgrade to {planName}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (variant === 'inline') {
    return (
      <div className="border border-blue-200 bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center space-x-3">
          {getIcon()}
          <div className="flex-1">
            <p className="font-medium text-blue-900">
              Upgrade to {planName} for more {feature}
            </p>
            <p className="text-sm text-blue-700">
              Get {upgradeLimit === 'unlimited' ? 'unlimited' : upgradeLimit} {feature} per day
            </p>
          </div>
          <Button
            size="sm"
            onClick={onUpgrade}
            className={getPlanColor()}
          >
            Upgrade
          </Button>
        </div>
      </div>
    )
  }

  return null
}

interface UsageLimitAlertProps {
  feature: string
  currentUsage: number
  limit: number
  onUpgrade: () => void
  threshold?: number
}

export function UsageLimitAlert({
  feature,
  currentUsage,
  limit,
  onUpgrade,
  threshold = 80,
}: UsageLimitAlertProps) {
  const percentage = (currentUsage / limit) * 100
  const isNearLimit = percentage >= threshold
  const isAtLimit = percentage >= 100

  if (!isNearLimit) return null

  return (
    <Alert className={isAtLimit ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}>
      <AlertDescription>
        <div className="flex items-center justify-between">
          <div>
            <p className={`font-medium ${isAtLimit ? 'text-red-900' : 'text-yellow-900'}`}>
              {isAtLimit ? 'Limit Reached' : 'Approaching Limit'}
            </p>
            <p className={`text-sm ${isAtLimit ? 'text-red-700' : 'text-yellow-700'}`}>
              {currentUsage} of {limit} {feature} used today ({Math.round(percentage)}%)
            </p>
          </div>
          <Button
            size="sm"
            onClick={onUpgrade}
            variant={isAtLimit ? 'destructive' : 'default'}
          >
            Upgrade Plan
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
