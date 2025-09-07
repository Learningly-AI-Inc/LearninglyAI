"use client"

import * as React from "react"
import {
  Menu,
  Home,
  BookOpen,
  PencilRuler,
  Lightbulb,
  ScanSearch,
  GraduationCap,
  Calculator,
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
    { icon: Lightbulb, label: "Solver", href: "/solver", active: pathname === '/solver', comingSoon: true },
    { icon: ScanSearch, label: "Search", href: "/search", active: pathname === '/search' },
    { icon: GraduationCap, label: "Exam Prep", href: "/exam-prep", active: pathname === '/exam-prep' },
    { icon: Calculator, label: "Math Visualization", href: "/math-viz", active: pathname === '/math-viz', comingSoon: true },
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
        return 'p-3';
      case 'laptop':
        return 'p-4';
      case 'desktop':
        return 'p-5';
      default:
        return 'p-3';
    }
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
        <AppSidebar
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          navigationItems={navigationItems}
          workspaceItems={workspaceItems}
        />
        
        <main 
          className={`
            ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-[240px] lg:ml-[280px]'} 
            transition-all duration-300
            ${getContentPadding()}
          `}
        >
          {children}
        </main>

        {/* Mobile Sidebar */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 text-black">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] bg-white p-0">
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
