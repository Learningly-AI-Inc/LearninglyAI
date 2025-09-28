'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Crown, Zap, Star, Loader2 } from 'lucide-react'
import { useSubscription } from '@/hooks/use-subscription'
import { useAuth } from '@/hooks/use-auth'
import { useState } from 'react'
import Link from 'next/link'

interface SubscriptionCardProps {
  plan: {
    name: string
    description: string
    price_cents: number
    currency: string
    interval: string
    features: Record<string, any>
    limits: Record<string, any>
  }
  isCurrentPlan?: boolean
  isPopular?: boolean
}

export function SubscriptionCard({ plan, isCurrentPlan = false, isPopular = false }: SubscriptionCardProps) {
  const { createCheckoutSession, loading } = useSubscription()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const formatPrice = (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount / 100)
  }

  const handleUpgrade = async () => {
    console.log('Button clicked!', { plan: plan.name, user: !!user, isCurrentPlan })
    
    if (isCurrentPlan) {
      console.log('Current plan, not upgrading')
      return
    }
    
    // If user is not logged in, redirect to signup
    if (!user) {
      console.log('No user, redirecting to signup')
      window.location.href = '/account/signup'
      return
    }
    
    // If it's the free plan, redirect to dashboard
    if (plan.name.toLowerCase() === 'free') {
      console.log('Free plan, redirecting to dashboard')
      window.location.href = '/dashboard'
      return
    }
    
    console.log('Creating checkout session for:', plan.name.toLowerCase())
    setIsLoading(true)
    try {
      const checkoutUrl = await createCheckoutSession(plan.name.toLowerCase())
      console.log('Checkout URL:', checkoutUrl)
      if (checkoutUrl) {
        window.location.href = checkoutUrl
      } else {
        console.error('No checkout URL returned')
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getPlanIcon = () => {
    switch (plan.name.toLowerCase()) {
      case 'free':
        return <Star className="h-6 w-6 text-gray-500" />
      case 'freemium':
        return <Zap className="h-6 w-6 text-blue-500" />
      case 'premium':
        return <Crown className="h-6 w-6 text-yellow-500" />
      default:
        return <Star className="h-6 w-6 text-gray-500" />
    }
  }

  const getFeatureList = () => {
    const features = []
    
    // AI Requests
    const aiRequests = plan.limits.ai_requests
    if (aiRequests === -1) {
      features.push('Unlimited AI requests')
    } else {
      features.push(`${aiRequests} AI requests per day`)
    }
    
    // Document Uploads
    const documentUploads = plan.limits.document_uploads
    if (documentUploads === -1) {
      features.push('Unlimited document uploads')
    } else {
      features.push(`${documentUploads} document uploads per day`)
    }
    
    // Search Queries
    const searchQueries = plan.limits.search_queries
    if (searchQueries === -1) {
      features.push('Unlimited search queries')
    } else {
      features.push(`${searchQueries} search queries per day`)
    }
    
    // Storage
    const storage = plan.limits.storage_mb
    if (storage === -1) {
      features.push('Unlimited storage')
    } else {
      features.push(`${storage}MB storage`)
    }
    
    // Additional features
    if (plan.features.priority_support) {
      features.push('Priority support')
    }
    
    if (plan.features.custom_models) {
      features.push('Custom AI models')
    }
    
    if (plan.features.bulk_processing) {
      features.push('Bulk processing')
    }
    
    return features
  }

  return (
    <Card className={`relative ${isPopular ? 'border-blue-500 shadow-lg' : ''} ${isCurrentPlan ? 'border-green-500' : ''}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-blue-500 text-white px-3 py-1">
            Most Popular
          </Badge>
        </div>
      )}
      
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-green-500 text-white px-3 py-1">
            Current Plan
          </Badge>
        </div>
      )}

      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          {getPlanIcon()}
        </div>
        <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
        <CardDescription className="text-gray-600">
          {plan.description}
        </CardDescription>
        <div className="mt-4">
          <span className="text-4xl font-bold">
            {plan.price_cents === 0 ? 'Free' : formatPrice(plan.price_cents, plan.currency)}
          </span>
          {plan.price_cents > 0 && (
            <span className="text-gray-600">/{plan.interval}</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {getFeatureList().map((feature, index) => (
            <li key={index} className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="text-sm text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          onClick={(e) => {
            console.log('Button click event fired!', e)
            handleUpgrade()
          }}
          disabled={isCurrentPlan || isLoading}
          className={`w-full ${
            isPopular 
              ? 'bg-blue-500 hover:bg-blue-600' 
              : isCurrentPlan 
                ? 'bg-green-500 cursor-not-allowed' 
                : 'bg-gray-900 hover:bg-gray-800'
          }`}
          style={{ cursor: isCurrentPlan || isLoading ? 'not-allowed' : 'pointer' }}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : isCurrentPlan ? (
            'Current Plan'
          ) : !user ? (
            plan.price_cents === 0 ? 'Sign Up Free' : 'Sign Up & Start'
          ) : plan.price_cents === 0 ? (
            'Get Started'
          ) : (
            `Upgrade to ${plan.name}`
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
