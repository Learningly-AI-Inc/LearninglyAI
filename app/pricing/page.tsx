'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { SubscriptionCard } from '@/components/subscription/plan-card'
import { Container } from '@/components/ui/container'
import { Badge } from '@/components/ui/badge'
import { Check, Zap, Crown, Star, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price_cents: number
  currency: string
  interval: string
  features: Record<string, any>
  limits: Record<string, any>
}

export default function PricingPage() {
  const { user } = useAuth()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPlan, setCurrentPlan] = useState<string>('Free')

  useEffect(() => {
    fetchPlans()
    if (user) {
      fetchCurrentSubscription()
    }
  }, [user])

  const fetchPlans = async () => {
    try {
      // For now, we'll use hardcoded plans since the database isn't set up yet
      // New structure per request
      const mockPlans: SubscriptionPlan[] = [
        {
          id: 'free',
          name: 'Freemium',
          description: 'Extremely limited access per month',
          price_cents: 0,
          currency: 'USD',
          interval: 'month',
          features: { ai_requests: 10, document_uploads: 1, search_queries: 20 },
          limits: { storage_mb: 50, max_file_size_mb: 10, ai_requests: 10, document_uploads: 1, search_queries: 20, exam_sessions: 2 },
        },
        {
          id: 'premium-monthly',
          name: 'Premium (Monthly)',
          description: 'Unlimited use per month',
          price_cents: 1500,
          currency: 'USD',
          interval: 'month',
          features: { ai_requests: -1, document_uploads: -1, search_queries: -1, priority_support: true },
          limits: { storage_mb: 5000, max_file_size_mb: 200, ai_requests: -1, document_uploads: -1, search_queries: -1, exam_sessions: -1 },
        },
        {
          id: 'premium-yearly',
          name: 'Premium (Yearly)',
          description: 'Best value – limited to the first few weeks',
          price_cents: 10000,
          currency: 'USD',
          interval: 'year',
          features: { ai_requests: -1, document_uploads: -1, search_queries: -1, priority_support: true },
          limits: { storage_mb: 10000, max_file_size_mb: 500, ai_requests: -1, document_uploads: -1, search_queries: -1, exam_sessions: -1 },
        },
        {
          id: 'custom',
          name: 'Custom Model',
          description: 'Tailored models and enterprise setup – contact us',
          price_cents: 0,
          currency: 'USD',
          interval: 'month',
          features: {},
          limits: { storage_mb: 0, max_file_size_mb: 0, ai_requests: 0, document_uploads: 0, search_queries: 0, exam_sessions: 0 },
        },
      ]
      setPlans(mockPlans)
    } catch (error) {
      console.error('Error fetching plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrentSubscription = async () => {
    if (!user) return

    try {
      const response = await fetch('/api/subscriptions/status')
      if (response.ok) {
        const data = await response.json()
        setCurrentPlan(data.plan.name)
      }
    } catch (error) {
      console.error('Error fetching current subscription:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <Container>
          <div className="text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <Container>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Learning Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Unlock the full potential of AI-powered learning with our flexible subscription plans
          </p>
          
          {/* Debug component removed */}
          
          {!user && (
            <div className="flex justify-center mt-4">
              <Link href="/account">
                <Badge className="bg-blue-500 text-white px-4 py-2 text-sm">
                  Sign in to see your current plan
                </Badge>
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {/* Freemium (free) */}
          <SubscriptionCard
            plan={plans.find(p => p.id === 'free')!}
            isCurrentPlan={currentPlan.toLowerCase().includes('free')}
            isPopular={false}
            checkoutPlan={'freemium'}
          />
          {/* Premium Monthly – maps to previous freemium price per instruction */}
          <SubscriptionCard
            plan={plans.find(p => p.id === 'premium-monthly')!}
            isCurrentPlan={currentPlan.toLowerCase().includes('freemium')}
            isPopular={true}
            checkoutPlan={'freemium'}
          />
          {/* Premium Yearly – maps to previous premium price */}
          <SubscriptionCard
            plan={plans.find(p => p.id === 'premium-yearly')!}
            isCurrentPlan={currentPlan.toLowerCase().includes('premium')}
            isPopular={false}
            checkoutPlan={'premium_yearly'}
          />
          {/* Custom Model – contact */}
          <SubscriptionCard
            plan={plans.find(p => p.id === 'custom')!}
            isCurrentPlan={false}
            isPopular={false}
            checkoutPlan={'contact'}
          />
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            All Plans Include
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex items-start space-x-3">
              <div className="bg-green-100 p-2 rounded-full">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">PDF Processing</h3>
                <p className="text-gray-600 text-sm">
                  Extract and analyze content from PDF documents
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-green-100 p-2 rounded-full">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">AI Summaries</h3>
                <p className="text-gray-600 text-sm">
                  Generate intelligent summaries and key points
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-green-100 p-2 rounded-full">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">Exam Preparation</h3>
                <p className="text-gray-600 text-sm">
                  Create practice questions and flashcards
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-green-100 p-2 rounded-full">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">Smart Search</h3>
                <p className="text-gray-600 text-sm">
                  Find relevant content across your documents
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-green-100 p-2 rounded-full">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">Export Options</h3>
                <p className="text-gray-600 text-sm">
                  Download summaries in multiple formats
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-green-100 p-2 rounded-full">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">Mobile Access</h3>
                <p className="text-gray-600 text-sm">
                  Access your content from any device
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 bg-white rounded-lg shadow-sm p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-gray-600 mb-6">
            Join thousands of students and professionals who are already using Learningly AI to enhance their learning experience.
          </p>
          
          {!user ? (
            <div className="flex justify-center space-x-4">
              <Link href="/account/signup">
                <button className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors">
                  Start Free Trial
                </button>
              </Link>
              <Link href="/account">
                <button className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                  Sign In
                </button>
              </Link>
            </div>
          ) : (
            <Link href="/dashboard">
              <button className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors">
                Go to Dashboard
                <ArrowRight className="h-4 w-4 ml-2 inline" />
              </button>
            </Link>
          )}
        </div>

        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            All plans include a 30-day money-back guarantee. Cancel anytime.
          </p>
          <p className="mt-2">
            Questions? Contact us at{' '}
            <a href="mailto:support@learningly.ai" className="text-blue-500 hover:underline">
              support@learningly.ai
            </a>
          </p>
        </div>
      </Container>
    </div>
  )
}
