"use client"

import { useState, useEffect } from 'react'

interface AdminUser {
  email: string
  role: 'admin'
}

export function useAdminAuth() {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if admin is authenticated via localStorage
    const checkAuth = () => {
      try {
        const isAuthenticated = localStorage.getItem('admin_authenticated')
        const adminEmail = localStorage.getItem('admin_email')
        

        if (isAuthenticated === 'true' && adminEmail) {
          setAdmin({
            email: adminEmail,
            role: 'admin'
          })
        } else {
          setAdmin(null)
        }
      } catch (error) {
        console.error('Error checking admin auth:', error)
        setAdmin(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (response.ok) {
        localStorage.setItem('admin_authenticated', 'true')
        localStorage.setItem('admin_email', email)
        setAdmin({
          email,
          role: 'admin'
        })
        return { success: true, message: result.message }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  const logout = () => {
    localStorage.removeItem('admin_authenticated')
    localStorage.removeItem('admin_email')
    setAdmin(null)
  }

  const isAuthenticated = !!admin

  return {
    admin,
    isAuthenticated,
    loading,
    login,
    logout
  }
}
