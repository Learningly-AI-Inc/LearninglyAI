"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { useSupabase } from "@/hooks/use-supabase"
import { CheckCircle, XCircle, AlertCircle, User, Shield } from "lucide-react"

export default function AdminDebugPage() {
  const { user: authUser, loading: authLoading } = useAuth()
  const [dbUser, setDbUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useSupabase()

  useEffect(() => {
    const fetchUserData = async () => {
      if (authLoading || !authUser) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Fetch user from database
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (error) {
          setError(error.message)
        } else {
          setDbUser(data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [authUser, authLoading, supabase])

  const makeAdmin = async () => {
    if (!authUser || !dbUser) return

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('id', authUser.id)

      if (error) {
        setError(error.message)
      } else {
        // Refresh user data
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        
        setDbUser(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Debug Page</h1>
        <p className="text-muted-foreground">
          Debug your user status and admin access
        </p>
      </div>

      {/* Auth User Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Authentication Status
          </CardTitle>
          <CardDescription>
            Your Supabase authentication status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {authUser ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Authenticated</span>
              </div>
              <div className="text-sm text-muted-foreground">
                <div>ID: {authUser.id}</div>
                <div>Email: {authUser.email}</div>
                <div>Created: {new Date(authUser.created_at).toLocaleString()}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Not Authenticated</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Database User Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Database User Status
          </CardTitle>
          <CardDescription>
            Your user record in the database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          {dbUser ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">User Found in Database</span>
              </div>
              
              <div className="grid gap-2 text-sm">
                <div><strong>ID:</strong> {dbUser.id}</div>
                <div><strong>Email:</strong> {dbUser.email}</div>
                <div><strong>Full Name:</strong> {dbUser.full_name || 'Not set'}</div>
                <div><strong>Username:</strong> {dbUser.username}</div>
                <div><strong>Role:</strong> 
                  <Badge variant={dbUser.role === 'admin' ? 'default' : 'secondary'} className="ml-2">
                    {dbUser.role}
                  </Badge>
                </div>
                <div><strong>Created:</strong> {new Date(dbUser.created_at).toLocaleString()}</div>
                <div><strong>Last Login:</strong> {dbUser.last_login ? new Date(dbUser.last_login).toLocaleString() : 'Never'}</div>
              </div>

              {dbUser.role !== 'admin' && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Not an Admin</span>
                  </div>
                  <p className="text-sm text-yellow-700 mb-3">
                    You need admin privileges to access the admin panel.
                  </p>
                  <Button onClick={makeAdmin} size="sm">
                    Make Me Admin
                  </Button>
                </div>
              )}

              {dbUser.role === 'admin' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Admin Access Granted</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    You can now access the admin panel.
                  </p>
                </div>
              )}
            </div>
          ) : !error && (
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">User Not Found in Database</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common debugging actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/admin'}
            disabled={!dbUser || dbUser.role !== 'admin'}
          >
            Go to Admin Panel
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
