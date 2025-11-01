'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Loader2, Eye, EyeOff, Mail, Lock, ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useAuthContext } from './auth-provider'
import { toast } from 'sonner'
import { AuthHelper } from '@/lib/auth-helper'
import { FadeContent } from '@/components/react-bits/fade-content'
import { ClickSpark } from '@/components/react-bits/click-spark'

type AuthMode = 'welcome' | 'signin' | 'signup'

export function UnifiedAuthCard() {
  const [mode, setMode] = useState<AuthMode>('welcome')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const { signInWithOAuth, signIn, signUp } = useAuthContext()

  const isPasswordValid = password.length >= 6
  const isPasswordMatch = password === confirmPassword && confirmPassword !== ''

  const handleGoogleAuth = async () => {
    setLoading(true)
    try {
      toast.info('Checking your account status...')

      // Always use 'signup' context for OAuth - it works for both new and existing users
      // Google will handle whether it's a new account or returning user
      const { error, redirect } = await signInWithOAuth('google', 'signup')

      if (redirect) {
        toast.success('Welcome! Redirecting to your dashboard...')
        return
      }

      if (error) {
        const errorInfo = AuthHelper.handleOAuthError(error, 'signup')
        AuthHelper.showUserFriendlyMessage(errorInfo)
      } else {
        toast.success('Redirecting to your dashboard...')
      }
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'signin') {
        const { data, error } = await signIn(email, password)
        
        if (error) {
          // Check if this is a "password not set" error for a paying customer
          if (error.message?.includes('Invalid login credentials') || error.message?.includes('Invalid email or password')) {
            // Try to verify if this email has a subscription
            try {
              const verifyResponse = await fetch('/api/auth/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
              })
              
              const verifyData = await verifyResponse.json()
              
              if (verifyResponse.ok && verifyData.hasSubscription && !verifyData.hasPassword) {
                // User has subscription but no password - redirect to password setup
                toast.info('Account found with subscription. Please set up your password.')
                window.location.href = `/account/setup-password?email=${encodeURIComponent(email)}`
                return
              }
            } catch (verifyError) {
              console.error('Error verifying payment:', verifyError)
            }
          }
          
          toast.error(error.message || 'Failed to sign in')
          return
        }

        if (data.user) {
          toast.success('Successfully signed in!')
          // The auth context will handle the redirect
        }
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          toast.error('Passwords do not match')
          return
        }

        if (password.length < 6) {
          toast.error('Password must be at least 6 characters long')
          return
        }

        const { data, error } = await signUp(email, password)
        
        if (error) {
          toast.error(error.message)
          return
        }

        if (data.user) {
          toast.success('Account created successfully! Please check your email to verify your account.')
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const handleModeChange = (newMode: AuthMode) => {
    resetForm()
    setMode(newMode)
  }

  if (mode === 'welcome') {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Welcome to Learningly AI
          </h1>
          <p className="text-gray-600">
            Continue with Google to get started
          </p>
        </div>

        <Button
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] group border-0"
        >
          {loading ? (
            <>
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <svg className="mr-3 h-5 w-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                <path
                  fill="white"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="white"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="white"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="white"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full bg-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-4 text-gray-500 font-medium">
              Or continue with email
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => handleModeChange('signin')}
            variant="outline"
            className="w-full h-12 border-gray-200 hover:bg-gray-50 text-gray-700 font-medium transition-all duration-200"
          >
            Sign In
          </Button>
          
          <Button
            onClick={() => handleModeChange('signup')}
            variant="outline"
            className="w-full h-12 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium transition-all duration-200"
          >
            Create Account
          </Button>
        </div>

        <div className="text-center pt-2">
          <p className="text-xs text-gray-500 leading-relaxed">
            By continuing, you agree to our{' '}
            <a href="/terms" className="text-blue-600 hover:text-blue-700">Terms</a>
            {' '}and{' '}
            <a href="/privacy" className="text-blue-600 hover:text-blue-700">Privacy Policy</a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Button
          onClick={() => handleModeChange('welcome')}
          variant="ghost"
          size="sm"
          className="p-2 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="text-center flex-1">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-gray-600 text-sm">
            {mode === 'signin' ? 'Sign in to your account' : 'Sign up to get started'}
          </p>
        </div>
      </div>

      <form onSubmit={handleEmailAuth} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-700 font-medium text-sm">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="pl-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-200 transition-all duration-200 text-sm"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password" className="text-gray-700 font-medium text-sm">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={mode === 'signin' ? 'Enter your password' : 'Create a password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className={`pl-10 pr-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-200 transition-all duration-200 text-sm ${
                password && mode === 'signup' && (isPasswordValid ? 'border-green-300' : 'border-red-300')
              }`}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </Button>
          </div>
          {password && mode === 'signup' && (
            <div className="text-xs">
              <div className={`flex items-center gap-2 ${isPasswordValid ? 'text-green-600' : 'text-red-600'}`}>
                <span>At least 6 characters</span>
              </div>
            </div>
          )}
        </div>
        
        {mode === 'signup' && (
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-gray-700 font-medium text-sm">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className={`pl-10 pr-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-200 transition-all duration-200 text-sm ${
                  confirmPassword && (isPasswordMatch ? 'border-green-300' : 'border-red-300')
                }`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
            {confirmPassword && (
              <div className="text-xs">
                <div className={`flex items-center gap-2 ${isPasswordMatch ? 'text-green-600' : 'text-red-600'}`}>
                  <span>Passwords match</span>
                </div>
              </div>
            )}
          </div>
        )}
        
        <ClickSpark>
          <Button
            type="submit"
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200 hover:scale-105 text-sm"
            disabled={loading || (mode === 'signup' && (!isPasswordValid || !isPasswordMatch))}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              mode === 'signin' ? 'Sign In' : 'Create Account'
            )}
          </Button>
        </ClickSpark>
      </form>
      
      <div className="text-center space-y-2">
        <p className="text-xs text-gray-600">
          {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => handleModeChange(mode === 'signin' ? 'signup' : 'signin')}
            className="text-blue-600 font-medium hover:text-blue-700 transition-colors"
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
        
        {mode === 'signin' && (
          <p className="text-xs text-gray-500">
            Paid but can't sign in?{' '}
            <button
              onClick={() => {
                if (email) {
                  window.location.href = `/account/setup-password?email=${encodeURIComponent(email)}`
                } else {
                  toast.info('Please enter your email address first')
                }
              }}
              className="text-blue-600 font-medium hover:text-blue-700 transition-colors"
            >
              Set up your password
            </button>
          </p>
        )}
      </div>
    </div>
  )
}