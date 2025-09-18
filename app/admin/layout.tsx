"use client"

import { useAdminAuth } from "@/hooks/use-admin-auth"
import { redirect, usePathname } from "next/navigation"
import { useEffect } from "react"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminHeader } from "@/components/admin/admin-header"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { admin, isAuthenticated, loading } = useAdminAuth()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated && pathname === '/admin/login') {
        // If authenticated but on login page, redirect to dashboard
        redirect('/admin')
      } else if (!isAuthenticated && pathname !== '/admin/login') {
        // If not authenticated and not on login page, redirect to login
        redirect('/admin/login')
      }
    }
  }, [isAuthenticated, loading, pathname])

  // If on login page, render children directly without layout
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect to login
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <AdminHeader />
        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
