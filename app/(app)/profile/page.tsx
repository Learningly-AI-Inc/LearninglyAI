"use client"

import * as React from "react"
import { User, Edit, Save, Mail, Calendar, MapPin, Building, Github, Twitter, Globe, Shield, Key } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Header } from "@/components/ui/header"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAuthContext } from "@/components/auth/auth-provider"
import { getUserMetadata, getAuthProviderFromUser } from "@/types/auth"
import { getSupabaseClient } from "@/lib/supabase-client"
import { toast } from "sonner"

const ProfilePage = () => {
  // ALL HOOKS MUST BE CALLED FIRST - NO EXCEPTIONS
  const [isEditing, setIsEditing] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [displayName, setDisplayName] = React.useState('')
  const { user } = useAuthContext()
  // Using Sonner toast directly
  const supabase = getSupabaseClient()
  
  // Derived values that handle null user safely
  const userMetadata = user ? getUserMetadata(user) : null
  const authProvider = user ? getAuthProviderFromUser(user) : 'email'
  const initialDisplayName = user ? (userMetadata?.full_name || userMetadata?.name || user.email?.split('@')[0] || 'User') : 'User'
  
  // useEffect hook - MUST be called every render
  React.useEffect(() => {
    if (user && initialDisplayName) {
      setDisplayName(initialDisplayName)
    }
  }, [user, initialDisplayName])
  
  // Early return AFTER all hooks are called
  if (!user) {
    return (
      <div className="p-6 space-y-6">
        <Header 
          title="Profile" 
          subtitle="Please sign in to view your profile."
        />
      </div>
    )
  }

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("Name cannot be empty")
      return
    }
    
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: displayName.trim()
        }
      })
      
      if (error) {
        throw error
      }
      
      toast.success("Profile updated successfully")
      setIsEditing(false)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update profile"
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="p-6 space-y-6 dark:bg-gray-900 h-screen">
      <Header
        title="My Profile"
        subtitle="View and manage your profile information."
      />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Main Profile Card */}
        <Card className="border-border dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center text-foreground dark:text-gray-100">
              <User className="mr-2 h-5 w-5" />
              Profile Information
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={isEditing ? handleSave : () => setIsEditing(true)}
              disabled={loading}
              className="border-border dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {isEditing ? (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Saving..." : "Save"}
                </>
              ) : (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-6">
              <Avatar className="h-24 w-24 border-2 border-border dark:border-gray-600">
                <AvatarImage src={userMetadata?.avatar_url || userMetadata?.picture} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                  {displayName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground dark:text-gray-200">Display Name</Label>
                  <Input
                    id="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={!isEditing || loading}
                    className="border-border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground dark:text-gray-200">Email</Label>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={user.email || ''}
                      disabled
                      className="border-border dark:border-gray-600 bg-muted dark:bg-gray-700 dark:text-gray-300"
                    />
                    {user.email_confirmed_at && (
                      <Badge variant="secondary" className="shrink-0 dark:bg-gray-700 dark:text-gray-300">
                        <Shield className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Details Card */}
        <Card className="border-border dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground dark:text-gray-100">
              <Key className="mr-2 h-5 w-5" />
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground dark:text-gray-200">Sign-in Method</Label>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300">
                    {authProvider?.charAt(0).toUpperCase() + authProvider?.slice(1) || 'Unknown'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground dark:text-gray-200">Account Created</Label>
                <p className="text-sm text-muted-foreground dark:text-gray-400 flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {user.created_at ? formatDate(user.created_at) : 'Unknown'}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground dark:text-gray-200">Last Sign In</Label>
                <p className="text-sm text-muted-foreground dark:text-gray-400 flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Unknown'}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground dark:text-gray-200">User ID</Label>
                <p className="text-sm text-muted-foreground dark:text-gray-400 font-mono">
                  {user.id.substring(0, 8)}...{user.id.substring(user.id.length - 8)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* OAuth Profile Information */}
        {authProvider && authProvider !== 'email' && (
          <Card className="border-border dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center text-foreground dark:text-gray-100">
                {authProvider === 'github' ? <Github className="mr-2 h-5 w-5" /> : <Globe className="mr-2 h-5 w-5" />}
                {authProvider?.charAt(0).toUpperCase() + authProvider?.slice(1) || 'OAuth'} Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userMetadata?.user_name && (
                  <div className="space-y-2">
                    <Label className="text-foreground dark:text-gray-200">Username</Label>
                    <p className="text-sm text-muted-foreground dark:text-gray-400 flex items-center">
                      <Github className="h-4 w-4 mr-2" />
                      @{userMetadata.user_name}
                    </p>
                  </div>
                )}

                {userMetadata?.company && (
                  <div className="space-y-2">
                    <Label className="text-foreground dark:text-gray-200">Company</Label>
                    <p className="text-sm text-muted-foreground dark:text-gray-400 flex items-center">
                      <Building className="h-4 w-4 mr-2" />
                      {userMetadata.company}
                    </p>
                  </div>
                )}

                {userMetadata?.location && (
                  <div className="space-y-2">
                    <Label className="text-foreground dark:text-gray-200">Location</Label>
                    <p className="text-sm text-muted-foreground dark:text-gray-400 flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      {userMetadata.location}
                    </p>
                  </div>
                )}

                {userMetadata?.twitter_username && (
                  <div className="space-y-2">
                    <Label className="text-foreground dark:text-gray-200">Twitter</Label>
                    <p className="text-sm text-muted-foreground dark:text-gray-400 flex items-center">
                      <Twitter className="h-4 w-4 mr-2" />
                      @{userMetadata.twitter_username}
                    </p>
                  </div>
                )}

                {userMetadata?.blog && (
                  <div className="space-y-2">
                    <Label className="text-foreground dark:text-gray-200">Website</Label>
                    <p className="text-sm text-muted-foreground dark:text-gray-400 flex items-center">
                      <Globe className="h-4 w-4 mr-2" />
                      <a href={userMetadata.blog} target="_blank" rel="noopener noreferrer" className="hover:underline dark:text-blue-400">
                        {userMetadata.blog}
                      </a>
                    </p>
                  </div>
                )}
              </div>

              {userMetadata?.bio && (
                <>
                  <Separator className="dark:bg-gray-700" />
                  <div className="space-y-2">
                    <Label className="text-foreground dark:text-gray-200">Bio</Label>
                    <p className="text-sm text-muted-foreground dark:text-gray-400">{userMetadata.bio}</p>
                  </div>
                </>
              )}

              {authProvider === 'github' && (
                <>
                  <Separator className="dark:bg-gray-700" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    {userMetadata?.public_repos !== undefined && (
                      <div className="space-y-1">
                        <p className="text-2xl font-bold text-foreground dark:text-gray-100">{userMetadata.public_repos}</p>
                        <p className="text-xs text-muted-foreground dark:text-gray-400">Repositories</p>
                      </div>
                    )}
                    {userMetadata?.followers !== undefined && (
                      <div className="space-y-1">
                        <p className="text-2xl font-bold text-foreground dark:text-gray-100">{userMetadata.followers}</p>
                        <p className="text-xs text-muted-foreground dark:text-gray-400">Followers</p>
                      </div>
                    )}
                    {userMetadata?.following !== undefined && (
                      <div className="space-y-1">
                        <p className="text-2xl font-bold text-foreground dark:text-gray-100">{userMetadata.following}</p>
                        <p className="text-xs text-muted-foreground dark:text-gray-400">Following</p>
                      </div>
                    )}
                    {userMetadata?.public_gists !== undefined && (
                      <div className="space-y-1">
                        <p className="text-2xl font-bold text-foreground dark:text-gray-100">{userMetadata.public_gists}</p>
                        <p className="text-xs text-muted-foreground dark:text-gray-400">Gists</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default ProfilePage
