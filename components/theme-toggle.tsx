"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark")
    } else if (theme === "dark") {
      setTheme("system")
    } else {
      setTheme("light")
    }
  }

  const SystemIcon = () => (
    <div className="relative h-[1.2rem] w-[1.2rem]">
      {/* Left half - Sun (Light) */}
      <div className="absolute left-0 top-0 h-full w-1/2 overflow-hidden">
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      </div>
      {/* Right half - Moon (Dark) */}
      <div className="absolute right-0 top-0 h-full w-1/2 overflow-hidden">
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      </div>
    </div>
  )

  const getIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-[1.2rem] w-[1.2rem]" />
      case "dark":
        return <Moon className="h-[1.2rem] w-[1.2rem]" />
      case "system":
        return <SystemIcon />
      default:
        return <Sun className="h-[1.2rem] w-[1.2rem]" />
    }
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="h-9 w-9"
      onClick={cycleTheme}
      title={`Current theme: ${theme}. Click to cycle through themes.`}
    >
      {getIcon()}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
