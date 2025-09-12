"use client"

import * as React from "react"
import Link from "next/link"
import { Menu, LogOut, Settings, BrainCircuit, User, Bolt, ChevronRight, Clock, Crown, Zap } from "lucide-react"
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
        <div className="px-4 pt-6 pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">{title}</div>
      )}
      <div className={`px-2 ${collapsed ? "space-y-2" : "space-y-1"}`}>{children}</div>
    </div>
  );
}

function SidebarItem({ icon, label, active, collapsed, href, onClick, comingSoon }: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  collapsed: boolean;
  href?: string;
  onClick?: () => void;
  comingSoon?: boolean;
}) {
  const content = (
    <button
      title={label}
      onClick={onClick}
      className={`w-full ${collapsed ? "justify-center" : "justify-start"} flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
        active 
          ? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary border border-primary/20 shadow-sm" 
          : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
      } ${comingSoon ? "opacity-75" : ""}`}
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
  );

  if (href) {
    return (
      <Link href={href}>
        {content}
      </Link>
    );
  }

  return content;
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

  return (
    <aside
      className={`${sidebarCollapsed ? "w-16" : "w-[240px] lg:w-[280px]"} ${isMobile ? 'flex' : 'hidden md:flex'} flex-col border-r border-border/50 bg-white/95 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80 transition-[width] duration-300 z-40 h-screen fixed modern-shadow-lg`}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border/50">
        <div className="h-10 w-10 rounded-2xl grid place-content-center bg-gradient-to-br from-primary to-primary/80 text-white font-bold shadow-lg">
          <BrainCircuit className="h-5 w-5" />
        </div>
        {!sidebarCollapsed && (
          <div className="flex-1">
            <div className="font-bold text-lg gradient-text">Learningly</div>
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
            />
          ))}
        </SidebarSection>

        <SidebarSection title="Spaces" collapsed={sidebarCollapsed}>
          <SidebarItem 
            collapsed={sidebarCollapsed} 
            icon={<User className="h-4 w-4"/>} 
            label={`${user?.email?.split('@')[0] || 'Your'} Space`}
            href="/profile"
          />
        </SidebarSection>

        <SidebarSection title="Help & Tools" collapsed={sidebarCollapsed}>
          <SidebarItem collapsed={sidebarCollapsed} icon={<Bolt className="h-4 w-4"/>} label="Quick Guide" href="/help"/>
          <SidebarItem collapsed={sidebarCollapsed} icon={<Settings className="h-4 w-4"/>} label="Feedback" href="/feedback"/>
        </SidebarSection>
      </div>

      <div className="p-4 border-t border-border/50 space-y-4">
        <div className={`rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white ${sidebarCollapsed ? "p-3 text-center" : "p-4"} modern-shadow`}>
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
          <button className={`${sidebarCollapsed ? "w-8 h-8 grid place-content-center bg-white/20 rounded-lg" : "w-full px-3 py-2"} text-xs font-medium bg-white text-primary rounded-full hover:bg-white/90 transition-colors duration-200 shadow-sm`}>
            {sidebarCollapsed ? <Zap className="h-4 w-4" /> : (
              <div className="flex items-center justify-center gap-1">
                <Zap className="h-3 w-3" />
                Upgrade
              </div>
            )}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
            <Settings className="h-4 w-4"/>
            {!sidebarCollapsed && "Settings"}
          </Link>
          <button onClick={handleLogout} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors duration-200">
            <LogOut className="h-4 w-4"/>
            {!sidebarCollapsed && "Logout"}
          </button>
        </div>
      </div>
    </aside>
  )
}