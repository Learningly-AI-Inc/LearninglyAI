"use client"

import * as React from "react"
import { Search, Bell, Settings, User, LogOut, Moon, Sun, Shield } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function Header() {
  const [isDark, setIsDark] = React.useState(true)

  React.useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-background/80 px-4 backdrop-blur-md">
      <div className="flex items-center space-x-4">
        <SidebarTrigger />
        <h1 className="text-xl font-semibold hidden sm:block">
          Legal Dashboard
        </h1>
      </div>

      <div className="flex flex-1 items-center justify-center px-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search cases, documents, clients..."
            className="pl-10 bg-secondary border-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="hover:bg-secondary">
          {isDark ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
        
        <Button variant="ghost" size="icon" className="relative hover:bg-secondary">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
        </Button>

        <Link href="/admin">
          <Button variant="ghost" size="icon" className="hover:bg-secondary" title="Admin Panel">
            <Shield className="h-4 w-4" />
          </Button>
        </Link>

        <div className="flex items-center space-x-3 border-l border-white/10 pl-4">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-green-400 flex items-center justify-center">
              <User className="h-5 w-5 text-black" />
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium">John Doe</p>
              <p className="text-xs text-muted-foreground">Senior Partner</p>
            </div>
          </div>
          
          <Button variant="ghost" size="icon" className="hover:bg-secondary">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
} 