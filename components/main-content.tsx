"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Search, Bell, BookOpen, PencilRuler, ScanSearch, GraduationCap, TrendingUp,
  ArrowRight, Sparkles, Star, ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { PremiumIndicator } from "@/components/ui/premium-indicator"
import { Header } from "@/components/ui/header"
import { motion } from "framer-motion"
import { useAuthContext } from "@/components/auth/auth-provider"
import { useSubscription } from "@/hooks/use-subscription"
import { getUserMetadata } from "@/types/auth"
import { useUsageLimits } from "@/hooks/use-usage-limits"
import { UsageDisplay } from "@/components/ui/usage-display"

const featureCards = [
  {
    icon: BookOpen,
    title: "Reading",
    description: "Summarize documents, generate notes, and create interactive quizzes from any text.",
    href: "/reading",
    cta: "Start Reading",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconBg: "bg-gradient-to-br from-blue-500 to-cyan-500",
    badge: "Popular",
    badgeVariant: "secondary" as const,
  },
  {
    icon: PencilRuler,
    title: "Writing",
    description: "Enhance your essays with AI-powered grammar checks, style improvements, and paraphrasing.",
    href: "/writing",
    cta: "Start Writing",
    gradient: "from-purple-500/20 to-pink-500/20",
    iconBg: "bg-gradient-to-br from-purple-500 to-pink-500",
    badge: "Enhanced",
    badgeVariant: "outline" as const,
  },
  {
    icon: ScanSearch,
    title: "Search",
    description: "Discover AI-powered insights and answers from your personal document library.",
    href: "/search",
    cta: "Start Searching",
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500",
    badge: "New",
    badgeVariant: "default" as const,
  },
  {
    icon: GraduationCap,
    title: "Exam Prep",
    description: "Generate comprehensive practice exams, track study progress, and ace your tests with confidence.",
    href: "/exam-prep",
    cta: "Start Preparing",
    gradient: "from-indigo-500/20 to-violet-500/20",
    iconBg: "bg-gradient-to-br from-indigo-500 to-violet-500",
    badge: "AI-Powered",
    badgeVariant: "default" as const,
  },
];

interface MainContentProps {
  sidebarCollapsed: boolean;
}

export default function MainContent({ sidebarCollapsed }: MainContentProps) {
  const { user } = useAuthContext()
  const { subscription } = useSubscription()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState("")

  // Extract user information
  const userMetadata = user ? getUserMetadata(user) : null
  const displayName = userMetadata?.full_name || userMetadata?.name || user?.email?.split('@')[0] || 'User'
  const firstName = userMetadata?.given_name || displayName.split(' ')[0] || 'User'

  // Generate initials from display name
  const getInitials = (name: string) => {
    const nameParts = name.split(' ')
    if (nameParts.length >= 2) {
      return nameParts[0][0] + nameParts[1][0]
    }
    return name.substring(0, 2)
  }

  const initials = getInitials(displayName).toUpperCase()

  // Get usage limits data
  const { usage, limits, planName, isFreePlan, isLoading: usageLoading } = useUsageLimits()

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  // Handle search input key down
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (searchQuery.trim()) {
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      }
    }
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-[70px] border-b border-border/50 bg-background/80 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-30 modern-shadow">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <Badge variant="outline" className="hidden sm:flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            AI-Powered
          </Badge>
        </div>
        <div className="flex items-center space-x-4">
          <form onSubmit={handleSearch} className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search anything..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="pl-10 w-[300px] bg-white border-border/50 text-foreground focus:border-primary focus:ring-primary/30 rounded-full backdrop-blur-sm"
            />
          </form>
          <Button variant="ghost" size="icon" className="relative text-foreground hover:bg-white/70">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-gradient-to-br from-red-400 to-red-600 rounded-full border-2 border-background animate-pulse"></span>
          </Button>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                <AvatarImage src={userMetadata?.avatar_url || userMetadata?.picture} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <PremiumIndicator />
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="p-6 space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-primary">
            Welcome back, {firstName}
          </h1>
          <p className="text-lg text-muted-foreground">
            Let's make learning easier and faster today. ✨
          </p>
        </div>

        {/* Usage Overview */}
       

        {/* Modern Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {featureCards.map((card, index) => (
            <motion.div
              key={card.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
              // className={card?.className || ""}
            >
              <Card className={`h-full group card-hover bg-card border border-border/50 modern-shadow-lg overflow-hidden relative`}>
                <Link href={card.href} className="block h-full p-6">
                  <div className="absolute top-4 right-4">
                    <Badge variant={card.badgeVariant} className="text-xs">
                      {card.badge}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-col h-full">
                    <div className="flex items-start mb-4">
                      <div className={`p-3 bg-primary rounded-xl mr-4 text-primary-foreground shadow-lg`}>
                        <card.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-xl text-card-foreground mb-2">
                          {card.title}
                        </h4>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                      {card.description}
                    </p>
                    
                    <div className="mt-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-primary group-hover:text-primary/80 transition-colors">
                          {card.cta}
                        </span>
                        <ChevronRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform duration-300" />
                      </div>
                    </div>
                  </div>
                  
                  
                </Link>
              </Card>
            </motion.div>
          ))}
        </div>

      </main>
    </div>
  )
}
