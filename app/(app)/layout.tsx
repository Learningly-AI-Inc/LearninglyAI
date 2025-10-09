"use client"

import * as React from "react"
import { Suspense } from "react"
import {
  Menu,
  Home,
  BookOpen,
  PencilRuler,
  ScanSearch,
  GraduationCap,
  User,
  Calendar,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import AppSidebar from "@/components/app-sidebar"
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { useDeviceSize } from "@/hooks/use-device-size"
import { AuthProvider } from "@/components/auth/auth-provider"
import { UserStatusProvider } from "@/contexts/user-status-context"
import { OnboardingTour } from "@/components/onboarding-tour"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [openTour, setOpenTour] = React.useState(false)
  const hasOpenedRef = React.useRef(false)
  const closingRef = React.useRef(false)
  const deviceSize = useDeviceSize()
  
  // Auto-collapse sidebar on smaller screens like laptops
  React.useEffect(() => {
    if (deviceSize === 'laptop') {
      setSidebarCollapsed(true)
    } else if (deviceSize === 'desktop') {
      setSidebarCollapsed(false)
    }
  }, [deviceSize])

  // Start tour when URL contains ?tour=1 or ?tour=start (guard against double-open)
  React.useEffect(() => {
    const tour = searchParams.get('tour')
    if (tour && !openTour && !hasOpenedRef.current && !closingRef.current) {
      // Small delay to ensure layout/sidebar are painted
      hasOpenedRef.current = true
      const id = setTimeout(() => setOpenTour(true), 150)
      return () => clearTimeout(id)
    }
  }, [searchParams, openTour])

  // Handle tour close - clean up URL parameter and stay on dashboard
  const handleTourClose = React.useCallback(() => {
    setOpenTour(false)
    closingRef.current = true
    // Remove the tour query parameter from URL
    const params = new URLSearchParams(searchParams.toString())
    params.delete('tour')
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.replace(newUrl)
    // release the lock shortly after the URL is cleaned
    setTimeout(() => {
      closingRef.current = false
      hasOpenedRef.current = false
    }, 0)
  }, [pathname, searchParams, router])

  // Expose a global helper to programmatically start the tour if needed
  React.useEffect(() => {
    ;(window as any).__startLearninglyTour = () => setOpenTour(true)
    return () => {
      delete (window as any).__startLearninglyTour
    }
  }, [])

  const navigationItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard", active: pathname === '/dashboard', dataTour: "dashboard" },
    { icon: BookOpen, label: "Reading", href: "/reading", active: pathname === '/reading', dataTour: "reading" },
    { icon: PencilRuler, label: "Writing", href: "/writing", active: pathname === '/writing', dataTour: "writing" },
    { icon: ScanSearch, label: "Search", href: "/search", active: pathname === '/search', dataTour: "search" },
    { icon: GraduationCap, label: "Exam Prep", href: "/exam-prep", active: pathname === '/exam-prep', dataTour: "exam-prep" },
  ]

  const workspaceItems = [
    { icon: User, label: "Profile", href: "/profile" },
    { icon: Calendar, label: "Calendar", href: "/calendar", dataTour: "calendar" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ]

  // Determine content padding based on screen size with adjustments for 80% zoom
  const getContentPadding = () => {
    switch(deviceSize) {
      case 'mobile':
        return 'p-2';
      case 'tablet':
        return 'p-2.5';
      case 'laptop':
        return 'p-3';
      case 'desktop':
        return 'p-4';
      default:
        return 'p-3';
    }
  }

  return (
    <AuthProvider>
      <UserStatusProvider>
        <Suspense fallback={null}>
          <div className="min-h-screen bg-white">
            <AppSidebar
              sidebarCollapsed={sidebarCollapsed}
              setSidebarCollapsed={setSidebarCollapsed}
              navigationItems={navigationItems}
              workspaceItems={workspaceItems}
            />

            <main
              className={`
                ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-[220px] lg:ml-[260px]'}
                px-3 md:px-4
                transition-all duration-300 ease-out
              `}
            >
              {children}
            </main>

            {/* Global interactive tour (available on all app pages) */}
            <OnboardingTour isOpen={openTour} onClose={handleTourClose} />

            {/* Mobile Sidebar */}
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 bg-white border border-border/50 hover:bg-slate-50 shadow-lg">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] bg-white/95 backdrop-blur-xl p-0 border-r border-border/50">
                  <AppSidebar
                    sidebarCollapsed={false}
                    setSidebarCollapsed={() => {}}
                    navigationItems={navigationItems}
                    workspaceItems={workspaceItems}
                    isMobile
                  />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </Suspense>
      </UserStatusProvider>
    </AuthProvider>
  )
}
