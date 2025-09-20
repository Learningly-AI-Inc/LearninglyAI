'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2, Mail, Key } from 'lucide-react'

export default function SuccessPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [userCreated, setUserCreated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check if this is a successful payment redirect
    const urlParams = new URLSearchParams(window.location.search)
    const sessionId = urlParams.get('session_id')
    const success = urlParams.get('success')

    if (success === 'true' && sessionId) {
      // Payment was successful, user account should be created by webhook
      checkUserStatus()
    } else {
      // Not a successful payment, redirect to home
      router.push('/')
    }
  }, [router])

  const checkUserStatus = async () => {
    try {
      // Give webhook time to process
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Check if user is now authenticated
      const response = await fetch('/api/auth/user')
      if (response.ok) {
        setUserCreated(true)
      } else {
        setError('Payment successful but account setup is still in progress. Please try signing in.')
      }
    } catch (err) {
      setError('Payment successful but account setup is still in progress. Please try signing in.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignIn = () => {
    router.push('/account')
  }

  const handleGoToDashboard = () => {
    router.push('/dashboard')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            </div>
            <CardTitle>Setting up your account...</CardTitle>
            <CardDescription>
              Your payment was successful! We're creating your account and activating your subscription.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600">
              This usually takes just a few seconds. Please wait...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-green-600">Payment Successful! 🎉</CardTitle>
            <CardDescription>
              Your subscription has been activated, but we need you to sign in to complete the setup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Next steps:</strong>
              </p>
              <ol className="text-sm text-yellow-700 mt-2 space-y-1">
                <li>1. Click "Sign In" below</li>
                <li>2. Use the same email address you used for payment</li>
                <li>3. If you don't have a password, use "Forgot Password" to set one</li>
                <li>4. Your subscription will be automatically linked</li>
              </ol>
            </div>
            
            <Button onClick={handleSignIn} className="w-full">
              <Key className="h-4 w-4 mr-2" />
              Sign In to Complete Setup
            </Button>
            
            <p className="text-xs text-gray-500 text-center">
              Need help? Contact support at contact@learningly.ai
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (userCreated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Welcome to Learningly AI! 🎉</CardTitle>
            <CardDescription>
              Your account has been created and your subscription is active!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                <strong>Your subscription includes:</strong>
              </p>
              <ul className="text-sm text-green-700 mt-2 space-y-1">
                <li>• AI-powered learning tools</li>
                <li>• Document analysis and summaries</li>
                <li>• Personalized learning paths</li>
                <li>• Priority support</li>
              </ul>
            </div>
            
            <Button onClick={handleGoToDashboard} className="w-full">
              Go to Dashboard
            </Button>
            
            <p className="text-xs text-gray-500 text-center">
              You can manage your subscription anytime in your account settings.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
