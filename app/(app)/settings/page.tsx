"use client"

import * as React from "react"
import { Bell, Palette, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Header } from "@/components/ui/header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const SettingsPage = () => {
  // State for theme selection
  const [theme, setTheme] = React.useState<string>("system")
  
  // State for notification settings
  const [emailNotifications, setEmailNotifications] = React.useState<boolean>(false)
  const [pushNotifications, setPushNotifications] = React.useState<boolean>(false)

  // Load settings from localStorage on component mount
  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "system"
    const savedEmailNotifications = localStorage.getItem("emailNotifications") === "true"
    const savedPushNotifications = localStorage.getItem("pushNotifications") === "true"
    
    setTheme(savedTheme)
    setEmailNotifications(savedEmailNotifications)
    setPushNotifications(savedPushNotifications)
  }, [])

  // Handle theme change
  const handleThemeChange = (value: string) => {
    setTheme(value)
    localStorage.setItem("theme", value)
    // TODO: Implement actual theme switching logic
    console.log("Theme changed to:", value)
  }

  // Handle email notifications toggle
  const handleEmailNotificationsChange = (checked: boolean) => {
    setEmailNotifications(checked)
    localStorage.setItem("emailNotifications", checked.toString())
    console.log("Email notifications:", checked)
  }

  // Handle push notifications toggle
  const handlePushNotificationsChange = (checked: boolean) => {
    setPushNotifications(checked)
    localStorage.setItem("pushNotifications", checked.toString())
    console.log("Push notifications:", checked)
  }
  return (
    <div className="p-6 space-y-8">
      <Header 
        title="Settings" 
        subtitle="Manage your application preferences."
      />

      <div className="space-y-6 max-w-3xl mx-auto">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <Palette className="mr-2 h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Customize the look and feel of the application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="theme" className="text-foreground">Theme</Label>
              <Select value={theme} onValueChange={handleThemeChange}>
                <SelectTrigger className="w-[180px] border-border">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <Bell className="mr-2 h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Manage how you receive notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notifications" className="text-foreground">Email Notifications</Label>
              <Switch 
                id="email-notifications" 
                checked={emailNotifications}
                onCheckedChange={handleEmailNotificationsChange}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="push-notifications" className="text-foreground">Push Notifications</Label>
              <Switch 
                id="push-notifications" 
                checked={pushNotifications}
                onCheckedChange={handlePushNotificationsChange}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <Database className="mr-2 h-5 w-5" />
              Data Management
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Manage your personal data and history.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full border-border">
              Export My Data
            </Button>
            <Button variant="destructive" className="w-full">
              Delete My Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SettingsPage
