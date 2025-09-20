'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Link, UserPlus, AlertTriangle } from 'lucide-react'

interface EmailReconciliationProps {
  oauthEmail: string
  stripeEmail: string
  onChoice: (choice: 'link' | 'separate') => void
  isLoading?: boolean
}

export function EmailReconciliation({ 
  oauthEmail, 
  stripeEmail, 
  onChoice, 
  isLoading = false 
}: EmailReconciliationProps) {
  const [selectedChoice, setSelectedChoice] = useState<'link' | 'separate' | null>(null)

  const handleSubmit = () => {
    if (selectedChoice) {
      onChoice(selectedChoice)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
          </div>
          <CardTitle>Account Linking Required</CardTitle>
          <CardDescription>
            We found accounts with different email addresses. Please choose how to proceed.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              <strong>OAuth Account:</strong> {oauthEmail}
            </AlertDescription>
          </Alert>
          
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              <strong>Payment Account:</strong> {stripeEmail}
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="text-sm font-medium text-gray-700">
              Choose your preferred option:
            </div>
            
            <div className="space-y-3">
              <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="choice"
                  value="link"
                  checked={selectedChoice === 'link'}
                  onChange={() => setSelectedChoice('link')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Link className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Link Accounts</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Merge both accounts into one. You'll keep your subscription and OAuth access.
                  </p>
                </div>
              </label>
              
              <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="choice"
                  value="separate"
                  checked={selectedChoice === 'separate'}
                  onChange={() => setSelectedChoice('separate')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <UserPlus className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Keep Separate</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Create a new account for OAuth. Your subscription will remain on the payment email.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={!selectedChoice || isLoading}
            className="w-full"
          >
            {isLoading ? 'Processing...' : 'Continue'}
          </Button>
          
          <div className="text-xs text-gray-500 text-center">
            <p>This choice cannot be changed later. Choose carefully.</p>
            <p>Need help? Contact support at contact@learningly.ai</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
