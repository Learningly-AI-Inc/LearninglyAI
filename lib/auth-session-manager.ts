'use client'

import { getSupabaseClient } from '@/lib/supabase-client'
import type { OAuthProvider } from '@/types/auth'

/**
 * Industrial-grade authentication session manager
 * Handles user state detection and smart authentication flow
 */
export class AuthSessionManager {
  private static supabase = getSupabaseClient()

  /**
   * Check if user is already authenticated
   * Returns user session if exists, null otherwise
   */
  static async checkExistingSession() {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession()
      
      if (error) {
        console.error('Session check error:', error)
        return null
      }
      
      return session
    } catch (error) {
      console.error('Unexpected session check error:', error)
      return null
    }
  }

  /**
   * Check if user exists in the system without signing them in
   * This is useful for determining if we should show sign-in vs sign-up flow
   */
  static async checkUserExists(email?: string): Promise<boolean> {
    if (!email) return false
    
    try {
      // This is a simplified check - in production you might want to use a dedicated API endpoint
      // For now, we'll rely on OAuth flow error handling
      return false
    } catch (error) {
      console.error('User existence check error:', error)
      return false
    }
  }

  /**
   * Enhanced OAuth flow with pre-authentication checks
   */
  static async initiateOAuth(provider: OAuthProvider, context: 'signin' | 'signup') {
    console.log(`Starting enhanced OAuth flow for ${context} with ${provider}`)
    
    // Step 1: Check if user is already authenticated
    const existingSession = await this.checkExistingSession()
    
    if (existingSession?.user) {
      console.log('User already authenticated, redirecting to dashboard')
      return {
        type: 'already_authenticated' as const,
        user: existingSession.user,
        redirectTo: '/dashboard' as const
      }
    }

    // Step 2: Check for existing auth tokens in localStorage (additional safety)
    const hasLocalAuth = this.checkLocalAuthState()
    
    if (hasLocalAuth) {
      console.log('Found local auth state, attempting refresh')
      // Attempt to refresh the session
      try {
        await this.supabase.auth.refreshSession()
        const { data: { session } } = await this.supabase.auth.getSession()
        
        if (session?.user) {
          return {
            type: 'session_refreshed' as const,
            user: session.user,
            redirectTo: '/dashboard' as const
          }
        }
      } catch (error) {
        console.log('Session refresh failed, proceeding with OAuth')
      }
    }

    // Step 3: Proceed with OAuth flow
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider,
        options: { 
          redirectTo: `${window.location.origin}/api/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: context === 'signup' ? 'consent' : 'select_account',
          }
        },
      })

      if (error) {
        return {
          type: 'oauth_error' as const,
          error: error,
          context
        }
      }

      return {
        type: 'oauth_initiated' as const,
        data,
        context
      }
    } catch (error) {
      return {
        type: 'unexpected_error' as const,
        error,
        context
      }
    }
  }

  /**
   * Check for local authentication state
   * This helps detect if user has existing auth tokens
   */
  private static checkLocalAuthState(): boolean {
    try {
      // Check for Supabase auth tokens in localStorage
      const authToken = localStorage.getItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token')
      return !!authToken
    } catch (error) {
      console.warn('Unable to check local auth state:', error)
      return false
    }
  }

  /**
   * Clear any existing auth state
   * Useful for force logout scenarios
   */
  static async clearAuthState() {
    try {
      await this.supabase.auth.signOut()
      // Clear any additional local state if needed
      return { success: true }
    } catch (error) {
      console.error('Error clearing auth state:', error)
      return { success: false, error }
    }
  }

  /**
   * Get user profile information
   */
  static async getUserProfile() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser()
      
      if (error) {
        console.error('Error getting user profile:', error)
        return null
      }
      
      return user
    } catch (error) {
      console.error('Unexpected error getting user profile:', error)
      return null
    }
  }
}