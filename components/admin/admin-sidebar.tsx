"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  BarChart3,
  Users,
  FileText,
  Brain,
  Settings,
  Shield,
  Activity,
  Database,
  MessageSquare,
  BookOpen,
  GraduationCap,
  Search,
  LogOut,
  Home,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAdminAuth } from "@/hooks/use-admin-auth"

const adminNavItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: Home,
  },
  {
    title: "Analytics",
    url: "/admin/analytics",
    icon: BarChart3,
  },
  {
    title: "User Management",
    url: "/admin/users",
    icon: Users,
  },
  {
    title: "Content Management",
    url: "/admin/content",
    icon: FileText,
  },
  {
    title: "AI Usage",
    url: "/admin/ai-usage",
    icon: Brain,
  },
  {
    title: "Exam Prep",
    url: "/admin/exam-prep",
    icon: GraduationCap,
  },
  {
    title: "Reading Tools",
    url: "/admin/reading",
    icon: BookOpen,
  },
  {
    title: "Search & Chat",
    url: "/admin/chat",
    icon: MessageSquare,
  },
  {
    title: "System Health",
    url: "/admin/system",
    icon: Activity,
  },
  {
    title: "Database",
    url: "/admin/database",
    icon: Database,
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings,
  },
  {
    title: "Debug",
    url: "/admin/debug",
    icon: Database,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { admin, logout } = useAdminAuth()
  
  const signOut = async () => {
    logout()
    window.location.href = '/admin/login'
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-2">
          <Shield className="h-6 w-6 text-primary" />
          <div className="flex flex-col">
            <span className="font-semibold text-sm">Admin Panel</span>
            <span className="text-xs text-muted-foreground">Learningly AI</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  )
}
