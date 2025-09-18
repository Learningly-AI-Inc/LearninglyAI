"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useSupabase } from "@/hooks/use-supabase"

interface AdminUser {
  id: string
  email: string
  full_name: string | null
  username: string
  role: 'student' | 'self-learner' | 'educator' | 'admin'
  created_at: string
  last_login: string | null
}

export function useAdmin() {
  const { user, loading: authLoading } = useAuth()
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = useSupabase()

  useEffect(() => {
    const fetchUserRole = async () => {
      if (authLoading) return
      
      if (!user) {
        setAdminUser(null)
        setIsAdmin(false)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        // Fetch user data from the users table
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error fetching user role:', error)
          setAdminUser(null)
          setIsAdmin(false)
        } else {
          setAdminUser(data)
          setIsAdmin(data?.role === 'admin')
        }
      } catch (err) {
        console.error('Unexpected error fetching user role:', err)
        setAdminUser(null)
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    fetchUserRole()
  }, [user, authLoading, supabase])

  return {
    user: adminUser,
    isAdmin,
    loading: loading || authLoading,
    isAuthenticated: !!user
  }
}
