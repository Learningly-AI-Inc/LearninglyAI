"use client"

import * as React from "react"
import { Bell, Palette, Database, AlertTriangle, Download } from "lucide-react"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { useAuthContext } from "@/components/auth/auth-provider"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { useTheme } from "@/components/theme-provider"

const SettingsPage = () => {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [isExporting, setIsExporting] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const { showSuccess, showError } = useToast()
  const { user, signOut } = useAuthContext()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  
  // State for notification settings
  const [emailNotifications, setEmailNotifications] = React.useState<boolean>(false)
  const [pushNotifications, setPushNotifications] = React.useState<boolean>(false)

  // Load notification settings from localStorage on component mount
  React.useEffect(() => {
    const savedEmailNotifications = localStorage.getItem("emailNotifications") === "true"
    const savedPushNotifications = localStorage.getItem("pushNotifications") === "true"
    
    setEmailNotifications(savedEmailNotifications)
    setPushNotifications(savedPushNotifications)
  }, [])

  // Handle email notifications toggle
  const handleEmailNotificationsChange = (checked: boolean) => {
    setEmailNotifications(checked)
    localStorage.setItem("emailNotifications", checked.toString())
  }

  // Handle push notifications toggle
  const handlePushNotificationsChange = (checked: boolean) => {
    setPushNotifications(checked)
    localStorage.setItem("pushNotifications", checked.toString())
  }

  const handleExportData = async () => {
    if (!user) {
      showError("You must be logged in to export data")
      return
    }

    try {
      setIsExporting(true)
      const supabase = createClient()

      // Fetch all user data from various tables
      const [
        { data: userData },
        { data: documents },
        { data: conversations },
        { data: subscriptions }
      ] = await Promise.all([
        supabase.from('user_data').select('*').eq('user_id', user.id).single(),
        supabase.from('documents').select('*').eq('user_id', user.id),
        supabase.from('conversations').select('*').eq('user_id', user.id),
        supabase.from('subscriptions').select('*').eq('user_id', user.id)
      ])

      const exportData = {
        exportDate: new Date().toISOString(),
        user: userData,
        documents: documents || [],
        conversations: conversations || [],
        subscriptions: subscriptions || []
      }

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `learningly-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showSuccess("Your data has been exported successfully")
    } catch (error) {
      console.error('Error exporting data:', error)
      showError("Failed to export data. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) {
      showError("You must be logged in to delete your account")
      return
    }

    try {
      setIsDeleting(true)
      const supabase = createClient()

      // Delete user data from all tables
      await Promise.all([
        supabase.from('documents').delete().eq('user_id', user.id),
        supabase.from('conversations').delete().eq('user_id', user.id),
        supabase.from('subscriptions').delete().eq('user_id', user.id),
        supabase.from('usage').delete().eq('user_id', user.id),
        supabase.from('user_data').delete().eq('user_id', user.id)
      ])

      // Delete auth user (this will cascade delete related data)
      const { error } = await supabase.auth.admin.deleteUser(user.id)

      if (error) {
        throw error
      }

      showSuccess("Your account has been permanently deleted")

      // Sign out and redirect
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Error deleting account:', error)
      showError("Failed to delete account. Please contact support.")
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <div className="p-6 space-y-8 dark:bg-gray-900 min-h-screen">
      <Header
        title="Settings"
        subtitle="Manage your application preferences."
      />

      <div className="space-y-6 max-w-3xl mx-auto">
        <Card className="border-border dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground dark:text-gray-100">
              <Palette className="mr-2 h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription className="text-muted-foreground dark:text-gray-400">
              Customize the look and feel of the application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="theme" className="text-foreground">Theme</Label>
              <Select value={theme} onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}>
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

        <Card className="border-border dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground dark:text-gray-100">
              <Bell className="mr-2 h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription className="text-muted-foreground dark:text-gray-400">
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

        <Card className="border-border dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground dark:text-gray-100">
              <Database className="mr-2 h-5 w-5" />
              Data Management
            </CardTitle>
            <CardDescription className="text-muted-foreground dark:text-gray-400">
              Manage your personal data and history.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full border-border dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              onClick={handleExportData}
              disabled={isExporting}
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Exporting..." : "Export My Data"}
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Delete My Account
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-300">
              This action cannot be undone. This will permanently delete your account
              and remove all your data from our servers, including:
              <ul className="list-disc list-inside mt-2 space-y-1 dark:text-gray-400">
                <li>All your documents and study materials</li>
                <li>All your conversations and chat history</li>
                <li>Your subscription and usage data</li>
                <li>Your profile and account information</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:border-gray-600">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            >
              {isDeleting ? "Deleting..." : "Yes, delete my account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default SettingsPage