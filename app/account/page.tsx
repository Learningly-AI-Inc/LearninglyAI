'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuthContext } from '@/components/auth/auth-provider'
import { Toaster } from 'sonner'
import { FadeContent } from '@/components/react-bits/fade-content'
import { SlideIn } from '@/components/react-bits/slide-in'
import ShinyText from '@/components/react-bits/shiny-text'
import { BookOpen, Target, Search } from 'lucide-react'
import { UnifiedAuthCard } from '@/components/auth'

function AccountContent() {
  const { user, loading } = useAuthContext()
  const router = useRouter()

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      console.log('User is authenticated, redirecting to dashboard')
      router.replace('/dashboard')
      return
    }
    // One-shot check: if OAuth just set cookies but context hasn't hydrated yet,
    // ask the server for the user and redirect immediately if present.
    const controller = new AbortController()
    const checkServerSession = async () => {
      try {
        const res = await fetch('/api/auth/user', { cache: 'no-store', signal: controller.signal })
        if (res.ok) {
          const data = await res.json()
          if (data?.user?.id) {
            router.replace('/dashboard')
          }
        }
      } catch {}
    }
    // Only run for a short window on first mount to avoid loops
    if (!user && !loading) {
      checkServerSession()
    }
    return () => controller.abort()
  }, [user, loading, router])

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render the form if user is authenticated (prevents flash)
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  const features = [
    {
      icon: BookOpen,
      title: "📚 Smart Reading & Writing Hub",
      description: "Upload textbooks and notes for instant summaries, flashcards, quizzes, mind maps, and memes. Refine your writing with grammar checking, paraphrasing, AI detection, and humanizing tools."
    },
    {
      icon: Target,
      title: "🎯 Exam Prep & Auto-Calendar",
      description: "Adaptive quizzes mirror your professor's style. Upload your syllabus—Auto-Calendar generates study schedules and deadlines. Track mastery levels over time."
    },
    {
      icon: Search,
      title: "🔍 Multi-LLM AI Search",
      description: "Research-grade AI search with GPT, Claude, Gemini, DeepSeek, Llama, or Grok. Fast, accurate, multi-perspective insights for every query."
    }
  ]


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-x-hidden">
      <div className="w-full max-w-[85vw] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-20 items-center min-h-[calc(100vh-8rem)]">
          
          {/* Left Panel - Brand & Features */}
          <div className="order-2 lg:order-1 space-y-6 lg:space-y-8 xl:space-y-12">
            <FadeContent delay={0.1}>
              <div className="space-y-4 lg:space-y-6">
                <div className="flex items-center gap-3">
                  <img
                    src="/learningly_logo.jpg"
                    alt="Learningly"
                    className="h-10 w-10 lg:h-12 lg:w-12 rounded-lg"
                  />
                  <ShinyText
                    text="Learningly"
                    className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900"
                    speed={4}
                  />
                </div>
                
                <div className="space-y-3 lg:space-y-4">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 leading-tight">
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      Your Complete AI
                    </span>
                    <br />
                    Study Companion
                  </h1>

                  <p className="text-base sm:text-lg lg:text-xl text-gray-600 leading-relaxed max-w-none lg:max-w-lg">
                    Sign up or sign in to get instant help with reading, writing, exam prep, and auto-calendar —everything you need to ace your studies!
                  </p>
                </div>
              </div>
            </FadeContent>

            {/* Features */}
            <div className="space-y-4 lg:space-y-6">
              {features.map((feature, index) => (
                <SlideIn key={index} direction="left" delay={0.2 + index * 0.1}>
                  <div className="flex items-start gap-3 lg:gap-4 group">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow flex-shrink-0">
                      <feature.icon className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 text-base lg:text-lg">{feature.title}</h3>
                      <p className="text-gray-600 leading-relaxed text-sm lg:text-base">{feature.description}</p>
                    </div>
                  </div>
                </SlideIn>
              ))}
            </div>

          </div>

          {/* Right Panel - Auth Form */}
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
            <div className="w-full max-w-sm lg:max-w-md">
              <SlideIn direction="right" delay={0.1}>
                <div className="bg-white rounded-3xl shadow-2xl shadow-blue-100 p-6 lg:p-8">
                  <FadeContent delay={0.1}>
                    <UnifiedAuthCard />
                  </FadeContent>
                </div>
              </SlideIn>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  )
}

export default function AccountPage() {
  return (
    <AuthProvider>
      <AccountContent />
    </AuthProvider>
  )
}
