"use client"

import * as React from "react"
import Link from "next/link"
import { Menu, LogOut, Settings, BrainCircuit, User, Bolt, ChevronRight, Clock, Crown, Zap, Shield, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuthContext } from "@/components/auth/auth-provider"
import { useRouter } from "next/navigation"

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  comingSoon?: boolean;
  dataTour?: string;
}

interface AppSidebarProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  navigationItems: NavigationItem[];
  workspaceItems: NavigationItem[];
  isMobile?: boolean;
}

function SidebarSection({ title, children, collapsed }: { title: string; children: React.ReactNode; collapsed: boolean }) {
  return (
    <div>
      {!collapsed && (
        <div className="px-4 pt-6 pb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">{title}</div>
      )}
      <div className={`px-2 ${collapsed ? "space-y-2" : "space-y-1"}`}>{children}</div>
    </div>
  );
}

function SidebarItem({ icon, label, active, collapsed, href, onClick, comingSoon, dataTour }: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  collapsed: boolean;
  href?: string;
  onClick?: () => void;
  comingSoon?: boolean;
  dataTour?: string;
}) {
  const baseClasses = `w-full ${collapsed ? "justify-center" : "justify-start"} flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
    active 
      ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm" 
      : "text-slate-700 hover:text-blue-700 hover:bg-slate-50 hover:shadow-sm"
  } ${comingSoon ? "opacity-75" : ""}`

  if (href) {
    return (
      <Link
        href={href}
        title={label}
        data-tour={dataTour}
        className={baseClasses}
      >
        {icon}
        {!collapsed && (
          <div className="flex items-center gap-2 flex-1">
            <span className="truncate">{label}</span>
            {comingSoon && (
              <Badge variant="outline" className="text-xs scale-75">
                <Clock className="w-3 h-3 mr-1" />
                Soon
              </Badge>
            )}
          </div>
        )}
      </Link>
    )
  }

  return (
    <button
      title={label}
      onClick={onClick}
      data-tour={dataTour}
      className={baseClasses}
    >
      {icon}
      {!collapsed && (
        <div className="flex items-center gap-2 flex-1">
          <span className="truncate">{label}</span>
          {comingSoon && (
            <Badge variant="outline" className="text-xs scale-75">
              <Clock className="w-3 h-3 mr-1" />
              Soon
            </Badge>
          )}
        </div>
      )}
    </button>
  )
}

export default function AppSidebar({
  sidebarCollapsed,
  setSidebarCollapsed,
  navigationItems,
  workspaceItems,
  isMobile = false,
}: AppSidebarProps) {
  const { signOut, user } = useAuthContext()
  const router = useRouter()

  // Show/hide Upgrade card (dismiss for current page only; resets on refresh)
  const [showUpgradeCard, setShowUpgradeCard] = React.useState(true)
  const handleCloseUpgrade = () => {
    setShowUpgradeCard(false)
  }

  const handleLogout = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        console.error('Error signing out:', error)
      } else {
        router.push('/account')
      }
    } catch (error) {
      console.error('Unexpected error during sign out:', error)
    }
  }

  // Start interactive tour immediately when user clicks Quick Guide
  const handleQuickGuide = () => {
    try {
      const start = (window as any)?.__startLearninglyTour
      // If we're not on dashboard, navigate with query to auto-start
      if (typeof window !== 'undefined' && window.location.pathname !== '/dashboard') {
        router.push('/dashboard?tour=1')
        return
      }
      // If global starter exists, call it; otherwise fallback to URL param
      if (typeof start === 'function') {
        start()
      } else {
        router.replace('/dashboard?tour=1')
      }
    } catch {
      router.push('/dashboard?tour=1')
    }
  }

  // Determine if user is "new" (first 7 days since account creation)
  const isNewUser = (() => {
    try {
      const createdAt = (user as any)?.user_metadata?.created_at || (user as any)?.created_at
      if (!createdAt) return false
      const created = new Date(createdAt)
      const now = new Date()
      const days = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
      return days <= 7
    } catch {
      return false
    }
  })()

  return (
      <aside
       className={`${sidebarCollapsed ? "w-16" : "w-[240px] lg:w-[280px]"} ${isMobile ? 'flex' : 'hidden md:flex'} flex-col border-r border-border/50 bg-white transition-[width] duration-300 z-40 h-screen fixed modern-shadow-lg`}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border/50">
        <div className="h-10 w-10 rounded-2xl grid place-content-center bg-blue-600 text-white font-bold shadow-lg">
          <BrainCircuit className="h-5 w-5" />
        </div>
        {!sidebarCollapsed && (
          <div className="flex-1">
            <div className="font-bold text-lg text-blue-700">Learningly</div>
            <div className="text-xs text-muted-foreground">AI Learning Platform</div>
          </div>
        )}
        {!isMobile && (
          <button
            aria-label="Collapse sidebar"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="rounded-xl p-2 hover:bg-accent/60 transition-colors duration-200"
          >
            <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <SidebarSection title="Primary" collapsed={sidebarCollapsed}>
          {navigationItems.map((item) => (
            <SidebarItem
              key={item.href}
              collapsed={sidebarCollapsed}
              icon={<item.icon className="h-4 w-4"/>}
              label={item.label}
              active={item.active}
              href={item.href}
              comingSoon={item.comingSoon}
              dataTour={item.dataTour}
            />
          ))}
        </SidebarSection>

        <SidebarSection title="Workspace" collapsed={sidebarCollapsed}>
          {workspaceItems.map((item) => (
            <SidebarItem
              key={item.href}
              collapsed={sidebarCollapsed}
              icon={<item.icon className="h-4 w-4"/>}
              label={item.label}
              href={item.href}
              dataTour={item.dataTour}
            />
          ))}
        </SidebarSection>


        <SidebarSection title="Help & Tools" collapsed={sidebarCollapsed}>
          {(isNewUser || !user) && (
            <SidebarItem collapsed={sidebarCollapsed} icon={<Bolt className="h-4 w-4"/>} label="Quick Guide" onClick={handleQuickGuide}/>
          )}
          <SidebarItem collapsed={sidebarCollapsed} icon={<Settings className="h-4 w-4"/>} label="Feedback" href="/feedback"/>
          <SidebarItem collapsed={sidebarCollapsed} icon={<Shield className="h-4 w-4"/>} label="Admin Panel" href="/admin"/>
        </SidebarSection>
      </div>

      <div className="p-4 border-t border-border/50 space-y-4">
        {showUpgradeCard && (
        <div className={`relative rounded-2xl bg-blue-600 text-white ${sidebarCollapsed ? "p-2 flex justify-center" : "p-4"} modern-shadow`}>
          {!sidebarCollapsed && (
            <button
              aria-label="Close upgrade card"
              onClick={handleCloseUpgrade}
              className="absolute top-2 right-2 rounded-md bg-white/20 hover:bg-white/30 p-1 transition-colors"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          )}
          {!sidebarCollapsed && (
            <>
              <div className="flex items-center gap-2 text-sm font-semibold mb-1">
                <Crown className="h-4 w-4" />
                Pro Plan
              </div>
              <div className="text-xs opacity-90 mb-3 leading-relaxed">
                Unlock unlimited AI features and advanced tools.
              </div>
            </>
          )}
          <button 
            onClick={() => router.push('/pricing')}
            className={`${sidebarCollapsed ? "w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200" : "w-full px-3 py-2"} text-xs font-medium bg-white text-blue-700 rounded-full hover:bg-white/90 transition-colors duration-200 shadow-sm`}
          >
            {sidebarCollapsed ? <Crown className="h-5 w-5 text-white" /> : (
              <div className="flex items-center justify-center gap-1">
                <Zap className="h-3 w-3" />
                Upgrade
              </div>
            )}
          </button>
        </div>
        )}
        <div className="flex items-center justify-between">
          <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-primary transition-colors duration-200">
            <Settings className="h-4 w-4"/>
            {!sidebarCollapsed && "Settings"}
          </Link>
          <button onClick={handleLogout} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-red-600 transition-colors duration-200">
            <LogOut className="h-4 w-4"/>
            {!sidebarCollapsed && "Logout"}
          </button>
        </div>
      </div>
    </aside>
  )
}