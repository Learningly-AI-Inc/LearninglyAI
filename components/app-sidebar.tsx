"use client"

import * as React from "react"
import Link from "next/link"
import { Menu, LogOut, Settings, BrainCircuit, User, Bolt, ChevronRight, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
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
        <div className="px-4 pt-6 pb-2 text-xs uppercase tracking-wider text-slate-500">{title}</div>
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
      className={`w-full ${collapsed ? "justify-center" : "justify-start"} flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition hover:bg-slate-100 ${active ? "bg-slate-100 font-medium" : "text-slate-700"} ${comingSoon ? "opacity-75" : ""}`}
    >
      {icon}
      {!collapsed && (
        <div className="flex items-center gap-2 flex-1">
          <span className="truncate">{label}</span>
          {comingSoon && (
            <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
              <Clock className="w-3 h-3" />
              <span>Soon</span>
            </div>
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
      className={`${sidebarCollapsed ? "w-16" : "w-[240px] lg:w-[280px]"} ${isMobile ? 'flex' : 'hidden md:flex'} flex-col border-r bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 transition-[width] duration-200 z-40 h-screen fixed`}
    >
      <div className="flex items-center gap-2 px-3 h-14 border-b">
        <div className="h-9 w-9 rounded-2xl grid place-content-center bg-slate-900 text-white font-bold">
          <BrainCircuit className="h-5 w-5" />
        </div>
        {!sidebarCollapsed && <div className="font-semibold">Learningly</div>}
        {!isMobile && (
          <button
            aria-label="Collapse sidebar"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="ml-auto rounded-xl p-2 hover:bg-slate-100"
          >
            <ChevronRight className={`h-4 w-4 ${sidebarCollapsed ? "rotate-180" : ""}`} />
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

      <div className="p-3 border-t space-y-3">
        <div className={`rounded-2xl bg-slate-900 text-white ${sidebarCollapsed ? "p-2 text-[10px]" : "p-3"}`}>
          {!sidebarCollapsed && (
            <>
              <div className="text-sm font-medium">Team Plan</div>
              <div className="text-xs opacity-80">Invite teammates, manage workspaces.</div>
            </>
          )}
          <button className={`${sidebarCollapsed ? "w-9 h-7 grid place-content-center bg-white/10" : "mt-2 px-3 py-1.5"} text-xs bg-white text-slate-900 rounded-full`}>
            {sidebarCollapsed ? "+" : "Upgrade"}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <Link href="/settings" className="inline-flex items-center gap-2 text-sm">
            <Settings className="h-4 w-4"/>
            {!sidebarCollapsed && "Settings"}
          </Link>
          <button onClick={handleLogout} className="inline-flex items-center gap-2 text-sm text-rose-600">
            <LogOut className="h-4 w-4"/>
            {!sidebarCollapsed && "Logout"}
          </button>
        </div>
      </div>
    </aside>
  )
}