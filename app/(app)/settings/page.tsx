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

const SettingsPage = () => {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [isExporting, setIsExporting] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const { showSuccess, showError } = useToast()
  const { user, signOut } = useAuthContext()
  const router = useRouter()

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
              <Select defaultValue="system">
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
              <Switch id="email-notifications" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="push-notifications" className="text-foreground">Push Notifications</Label>
              <Switch id="push-notifications" />
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
            <Button
              variant="outline"
              className="w-full border-border"
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove all your data from our servers, including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All your documents and study materials</li>
                <li>All your conversations and chat history</li>
                <li>Your subscription and usage data</li>
                <li>Your profile and account information</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
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
