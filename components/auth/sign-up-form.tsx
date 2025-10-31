'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAuthContext } from './auth-provider'
import SocialLoginButtons from './social-login-buttons'
import { Eye, EyeOff, Loader2, Mail, Lock, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { FadeContent } from '@/components/react-bits/fade-content'
import { ClickSpark } from '@/components/react-bits/click-spark'

export function SignUpForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuthContext()
  const router = useRouter()

  const isPasswordValid = password.length >= 6
  const isPasswordMatch = password === confirmPassword && confirmPassword !== ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await signUp(email, password)
      
      if (error) {
        toast.error(error.message)
        return
      }

      if (data.user) {
        toast.success('Account created successfully! Please check your email to verify your account.')
        router.push('/account/verify-email')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // TODO: Add a loading state for the form
  console.log('loading', loading)
  return (
    <Card className="w-full border-gray-200 bg-white/95 backdrop-blur-sm shadow-xl">
      <CardContent className="p-8">
        <FadeContent delay={0.1}>
          <SocialLoginButtons />
        </FadeContent>
        
        <FadeContent delay={0.2}>
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full bg-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-500 font-medium">
                Or create account with email
              </span>
            </div>
          </div>
        </FadeContent>

        <FadeContent delay={0.3}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-11 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-200 transition-all duration-200"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className={`pl-11 pr-11 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-200 transition-all duration-200 ${
                    password && (isPasswordValid ? 'border-green-300' : 'border-red-300')
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
              {password && (
                <div className="text-sm">
                  <div className={`flex items-center gap-2 ${isPasswordValid ? 'text-green-600' : 'text-red-600'}`}>
                    <CheckCircle className={`h-4 w-4 ${isPasswordValid ? 'text-green-600' : 'text-gray-300'}`} />
                    <span>At least 6 characters</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className={`pl-11 pr-11 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-200 transition-all duration-200 ${
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
                <div className="text-sm">
                  <div className={`flex items-center gap-2 ${isPasswordMatch ? 'text-green-600' : 'text-red-600'}`}>
                    <CheckCircle className={`h-4 w-4 ${isPasswordMatch ? 'text-green-600' : 'text-gray-300'}`} />
                    <span>Passwords match</span>
                  </div>
                </div>
              )}
            </div>
            
            <ClickSpark>
              <Button
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200 hover:scale-105"
                disabled={loading || !isPasswordValid || !isPasswordMatch}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </ClickSpark>
          </form>
        </FadeContent>
        
        <FadeContent delay={0.4}>
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <span className="text-blue-600 font-medium cursor-pointer hover:text-blue-700 transition-colors">
                Sign in here
              </span>
            </p>
          </div>
        </FadeContent>
        
        <FadeContent delay={0.5}>
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 leading-relaxed">
              By creating an account, you agree to our{' '}
              <a href="/terms" className="text-blue-600 hover:text-blue-700">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" className="text-blue-600 hover:text-blue-700">Privacy Policy</a>
            </p>
          </div>
        </FadeContent>
      </CardContent>
    </Card>
  )
}
