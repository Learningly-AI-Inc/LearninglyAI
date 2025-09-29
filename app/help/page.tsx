'use client'

import { useMemo, useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { OnboardingTour } from '@/components/onboarding-tour'
import { Sparkles, ArrowRight } from 'lucide-react'

function isNewUser(user: any): boolean {
  try {
    const createdAt = (user?.user_metadata?.created_at as string) || (user?.created_at as string)
    if (!createdAt) return false
    const created = new Date(createdAt)
    const now = new Date()
    const daysSince = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    return daysSince <= 7
  } catch {
    return false
  }
}

export default function HelpQuickGuidePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [tourOpen, setTourOpen] = useState(false)

  const showQuickGuide = useMemo(() => {
    if (loading) return false
    if (!user) return true // treat signed-out visitors as new until they sign up
    return isNewUser(user)
  }, [user, loading])

  const handleStartTour = () => {
    // Start the tour by navigating to dashboard with a query param
    router.push('/dashboard?tour=1')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    )
  }

  if (!showQuickGuide) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Help & Tools</CardTitle>
            <CardDescription>Welcome back! This Quick Guide is shown to new users for their first week.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            You can still explore features from the sidebar or visit your dashboard to continue learning.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/30">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl">Welcome to Learningly AI! 🎉</CardTitle>
            <CardDescription className="text-base mt-2">
              Let's take a quick interactive tour to show you how to make the most of your all-in-one AI learning platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-3 text-gray-900">What you'll discover:</h3>
              <ul className="space-y-2.5 text-sm text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="text-blue-500 font-bold mt-0.5">📚</span>
                  <span><strong>Reading:</strong> Turn documents into summaries, flashcards, quizzes & mind maps</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-purple-500 font-bold mt-0.5">✍️</span>
                  <span><strong>Writing:</strong> Polish essays with AI-powered grammar checks & rewrites</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 font-bold mt-0.5">🔎</span>
                  <span><strong>Search:</strong> Ask any AI model and get instant answers</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-orange-500 font-bold mt-0.5">🧠</span>
                  <span><strong>Exam Prep:</strong> Generate professor-style practice exams</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-pink-500 font-bold mt-0.5">📅</span>
                  <span><strong>Calendar:</strong> Auto-organize your semester schedule</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                size="lg" 
                onClick={handleStartTour}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6 text-base shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Start Interactive Tour
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => router.push('/dashboard')}
                className="w-full"
              >
                Skip & Explore on My Own
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500">
              ⏱️ Tour takes about 2 minutes • You can skip anytime
            </p>
          </CardContent>
        </Card>
      </div>

      {/* The tour is mounted globally in the app layout; leaving this for graceful fallback */}
      <OnboardingTour isOpen={tourOpen} onClose={() => setTourOpen(false)} />
    </>
  )
}


