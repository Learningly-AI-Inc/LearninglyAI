"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSupabase } from "@/hooks/use-supabase"
import { formatDistanceToNow } from "date-fns"
import { Shield, User, GraduationCap, BookOpen } from "lucide-react"

interface User {
  id: string
  email: string
  full_name: string | null
  username: string
  role: 'student' | 'self-learner' | 'educator' | 'admin'
  created_at: string
  last_login: string | null
  avatar_url?: string
}

interface AdminUserEditDialogProps {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserUpdated: () => void
}

export function AdminUserEditDialog({ 
  user, 
  open, 
  onOpenChange, 
  onUserUpdated 
}: AdminUserEditDialogProps) {
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    username: '',
    role: 'student' as 'student' | 'self-learner' | 'educator' | 'admin'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = useSupabase()

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        full_name: user.full_name || '',
        username: user.username,
        role: user.role
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase
        .from('users')
        .update({
          email: formData.email,
          full_name: formData.full_name || null,
          username: formData.username,
          role: formData.role
        })
        .eq('id', user.id)

      if (error) throw error

      onUserUpdated()
      onOpenChange(false)
    } catch (err) {
      console.error('Error updating user:', err)
      setError(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setLoading(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />
      case 'educator':
        return <Shield className="h-4 w-4" />
      case 'student':
        return <GraduationCap className="h-4 w-4" />
      case 'self-learner':
        return <BookOpen className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Full system access and administrative privileges'
      case 'educator':
        return 'Can create and manage educational content'
      case 'student':
        return 'Access to learning materials and exam prep'
      case 'self-learner':
        return 'Self-paced learning with content access'
      default:
        return ''
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information and permissions
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Info Display */}
          <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback>
                {user.full_name?.charAt(0) || user.email.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-medium">
                {user.full_name || user.email}
              </div>
              <div className="text-sm text-muted-foreground">
                Member since {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
              </div>
              <div className="text-sm text-muted-foreground">
                Last login: {user.last_login 
                  ? formatDistanceToNow(new Date(user.last_login), { addSuffix: true })
                  : 'Never'
                }
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Student</div>
                        <div className="text-xs text-muted-foreground">
                          Access to learning materials and exam prep
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="self-learner">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Self-Learner</div>
                        <div className="text-xs text-muted-foreground">
                          Self-paced learning with content access
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="educator">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Educator</div>
                        <div className="text-xs text-muted-foreground">
                          Can create and manage educational content
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Admin</div>
                        <div className="text-xs text-muted-foreground">
                          Full system access and administrative privileges
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground">
                {getRoleDescription(formData.role)}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
