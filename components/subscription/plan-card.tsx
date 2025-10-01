'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Crown, Zap, Star, Loader2 } from 'lucide-react'
import { useSubscription } from '@/hooks/use-subscription'
import { useAuth } from '@/hooks/use-auth'
import { useState } from 'react'

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
  checkoutPlan?: string // 'freemium' | 'premium' | 'premium_yearly' | 'contact'
}

export function SubscriptionCard({ plan, isCurrentPlan = false, isPopular = false, checkoutPlan }: SubscriptionCardProps) {
  const { createCheckoutSession } = useSubscription()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const formatPrice = (amount: number, currency: string = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100)

  const getPlanIcon = () => {
    const n = plan.name.toLowerCase()
    if (n.includes('premium') && n.includes('year')) return <Crown className="h-6 w-6 text-yellow-500" />
    if (n.includes('premium') || n.includes('monthly') || n.includes('freemium')) return <Zap className="h-6 w-6 text-blue-500" />
    return <Star className="h-6 w-6 text-gray-500" />
  }

  const features = () => {
    const out: string[] = []
    const ai = plan.limits.ai_requests
    out.push(ai === -1 ? 'Unlimited AI requests' : `${ai} AI requests per month`)
    const uploads = plan.limits.document_uploads
    out.push(uploads === -1 ? 'Unlimited document uploads' : `${uploads} uploads per month`)
    const search = plan.limits.search_queries
    out.push(search === -1 ? 'Unlimited search' : `${search} searches per month`)
    if (plan.features?.priority_support) out.push('Priority support')
    return out
  }

  const handleClick = async () => {
    if (isCurrentPlan) return
    if (checkoutPlan === 'contact') {
      window.location.href = 'mailto:contact@learningly.ai'
      return
    }
    if (plan.price_cents === 0) {
      if (!user) window.location.href = '/account/signup'; else window.location.href = '/dashboard'
      return
    }
    if (!user) {
      window.location.href = '/account/signup'
      return
    }
    setIsLoading(true)
    try {
      const planId = checkoutPlan || plan.name.toLowerCase()
      const url = await createCheckoutSession(planId)
      if (url) window.location.href = url
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={`relative ${isPopular ? 'border-blue-500 shadow-lg' : ''} ${isCurrentPlan ? 'border-green-500' : ''}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-blue-500 text-white px-3 py-1">Most Popular</Badge>
        </div>
      )}
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-green-500 text-white px-3 py-1">Current Plan</Badge>
        </div>
      )}

      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">{getPlanIcon()}</div>
        <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
        <CardDescription className="text-gray-600">{plan.description}</CardDescription>
        <div className="mt-4">
          <span className="text-4xl font-bold">{plan.price_cents === 0 ? 'Free' : formatPrice(plan.price_cents, plan.currency)}</span>
          {plan.price_cents > 0 && <span className="text-gray-600">/{plan.interval}</span>}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        <ul className="space-y-2">
          {features().map((f, i) => (
            <li key={i} className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="text-sm text-gray-700">{f}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          onClick={handleClick}
          disabled={isCurrentPlan || isLoading}
          className={`w-full ${isPopular ? 'bg-blue-500 hover:bg-blue-600' : isCurrentPlan ? 'bg-green-500 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-800'}`}
          style={{ cursor: isCurrentPlan || isLoading ? 'not-allowed' : 'pointer' }}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : checkoutPlan === 'contact' ? (
            'Contact us'
          ) : isCurrentPlan ? (
            'Current Plan'
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


