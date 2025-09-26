"use client"

import * as React from "react"
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
import { usePathname } from 'next/navigation'
import { useDeviceSize } from "@/hooks/use-device-size"
import { AuthProvider } from "@/components/auth/auth-provider"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const pathname = usePathname()
  const deviceSize = useDeviceSize()
  
  // Auto-collapse sidebar on smaller screens like laptops
  React.useEffect(() => {
    if (deviceSize === 'laptop') {
      setSidebarCollapsed(true)
    } else if (deviceSize === 'desktop') {
      setSidebarCollapsed(false)
    }
  }, [deviceSize])

  const navigationItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard", active: pathname === '/dashboard' },
    { icon: BookOpen, label: "Reading", href: "/reading", active: pathname === '/reading' },
    { icon: PencilRuler, label: "Writing", href: "/writing", active: pathname === '/writing' },
    { icon: ScanSearch, label: "Search", href: "/search", active: pathname === '/search' },
    { icon: GraduationCap, label: "Exam Prep", href: "/exam-prep", active: pathname === '/exam-prep' },
  ]

  const workspaceItems = [
    { icon: User, label: "Profile", href: "/profile" },
    { icon: Calendar, label: "Calendar", href: "/calendar" },
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100/50">
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

        {/* Mobile Sidebar */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 bg-white/80 backdrop-blur-sm border border-border/50 hover:bg-white/90 shadow-lg">
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
    </AuthProvider>
  )
}
