'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { PremiumIndicator } from '@/components/ui/premium-indicator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthContext } from './auth-provider'
import { User, Settings, LogOut, Loader2, Mail, Github } from 'lucide-react'
import { toast } from 'sonner'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { SocialUserMetadata, AuthProvider } from '@/types/auth'
import { getUserMetadata, getAuthProviderFromUser } from '@/types/auth'
import { useSubscription } from '@/hooks/use-subscription'

export function UserMenu() {
  const { user, signOut, loading } = useAuthContext()
  const [signingOut, setSigningOut] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const router = useRouter()
  const { subscription, refresh } = useSubscription()


  // On mount, attempt reconciliation to ensure freshest status (covers guest->login flows)
  useEffect(() => {
    const reconcile = async () => {
      try {
        await fetch('/api/subscriptions/reconcile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
        await refresh()
      } catch {}
    }
    reconcile()
  }, [refresh])

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    )
  }

  if (!user) {
    return (
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push('/account')}>
          Sign In
        </Button>
        <Button size="sm" onClick={() => router.push('/account')}>
          Sign Up
        </Button>
      </div>
    )
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      const { error } = await signOut()
      if (error) {
        toast.error('Error signing out')
      } else {
        toast.success('Signed out successfully')
        router.push('/')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setSigningOut(false)
    }
  }

  // Utility functions for enhanced user display
  const getAuthProvider = (user: SupabaseUser): AuthProvider => {
    return getAuthProviderFromUser(user)
  }

  const getDisplayName = (user: SupabaseUser): string => {
    const userMetadata = getUserMetadata(user)
    
    // First try social provider full_name
    if (userMetadata?.full_name) {
      return userMetadata.full_name
    }
    
    // Try name field (some providers use this)
    if (userMetadata?.name) {
      return userMetadata.name
    }
    
    // Try preferred_username field
    if (userMetadata?.preferred_username) {
      return userMetadata.preferred_username
    }
    
    // Try GitHub username as display name
    if (userMetadata?.user_name) {
      return userMetadata.user_name
    }
    
    // Try login field (GitHub)
    if (userMetadata?.login) {
      return userMetadata.login
    }
    
    // Combine given_name and family_name if both exist
    if (userMetadata?.given_name && userMetadata?.family_name) {
      return `${userMetadata.given_name} ${userMetadata.family_name}`
    }
    
    // Try individual name fields
    if (userMetadata?.given_name) {
      return userMetadata.given_name
    }
    
    if (userMetadata?.family_name) {
      return userMetadata.family_name
    }
    
    // Generate name from email
    if (user.email) {
      const emailName = user.email.split('@')[0]
      // Capitalize first letter and replace dots/underscores with spaces
      return emailName
        .replace(/[._]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
    }
    
    // Fallback
    return 'User'
  }

  const getInitials = (displayName: string): string => {
    if (!displayName || displayName === 'User') return 'U'
    
    const parts = displayName.trim().split(' ')
    if (parts.length === 1) {
      // For single names, take first two characters if available
      return parts[0].substring(0, Math.min(2, parts[0].length)).toUpperCase()
    }
    
    // For multiple names, take first letter of first and last name
    const firstInitial = parts[0][0] || ''
    const lastInitial = parts[parts.length - 1][0] || ''
    
    return (firstInitial + lastInitial).toUpperCase()
  }

  const getProviderIcon = (provider: AuthProvider) => {
    switch (provider) {
      case 'github':
        return <Github className="h-3 w-3" />
      case 'email':
        return <Mail className="h-3 w-3" />
      case 'google':
        return <span className="text-xs font-bold">G</span>
      default:
        return <Mail className="h-3 w-3" />
    }
  }

  const getProviderLabel = (provider: AuthProvider) => {
    switch (provider) {
      case 'github':
        return 'GitHub'
      case 'google':
        return 'Google'
      case 'email':
        return 'Email'
      default:
        return 'Email'
    }
  }

  const authProvider = getAuthProvider(user)
  const displayName = getDisplayName(user)
  const initials = getInitials(displayName)
  const providerIcon = getProviderIcon(authProvider)
  const providerLabel = getProviderLabel(authProvider)

  // Compute avatarSrc with fallbacks
  const userMetadata = getUserMetadata(user)
  const avatarSrc = userMetadata?.avatar_url || userMetadata?.picture || userMetadata?.avatarUrl

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            {avatarSrc && (
              <AvatarImage 
                src={avatarSrc} 
                alt={displayName}
                onLoadingStatusChange={(status) => setAvatarLoading(status === 'loading')}
              />
            )}
            <AvatarFallback className="text-xs font-medium" delayMs={avatarLoading ? 0 : 600}>
              {avatarLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                initials
              )}
            </AvatarFallback>
          </Avatar>
          <PremiumIndicator />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-none">
                {displayName}
              </p>
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                <span className="mr-1">{providerIcon}</span>
                {providerLabel}
              </Badge>
            </div>
            {user.email && (
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            )}
            {authProvider === 'github' && (userMetadata?.user_name || userMetadata?.login) && (
              <p className="text-xs leading-none text-muted-foreground">
                @{userMetadata.user_name || userMetadata.login}
              </p>
            )}
            {authProvider === 'google' && userMetadata?.email && userMetadata.email !== user.email && (
              <p className="text-xs leading-none text-muted-foreground">
                {userMetadata.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/dashboard')}>
          <User className="mr-2 h-4 w-4" />
          <span>Dashboard</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} disabled={signingOut}>
          {signingOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          <span>{signingOut ? 'Signing out...' : 'Sign out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
