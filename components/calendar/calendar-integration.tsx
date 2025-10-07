"use client"

import * as React from "react"
import { Calendar, ExternalLink, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { CalendarIntegration } from "@/types/calendar"

interface CalendarIntegrationProps {
  onIntegrationChange?: () => void
}

const integrationProviders = [
  {
    id: 'google',
    name: 'Google Calendar',
    description: 'Sync with your Google Calendar',
    icon: '📅',
    color: 'bg-blue-500',
    enabled: true
  },
  {
    id: 'outlook',
    name: 'Microsoft Outlook',
    description: 'Connect to Outlook Calendar',
    icon: '📆',
    color: 'bg-blue-600',
    enabled: false // Not implemented yet
  },
  {
    id: 'apple',
    name: 'Apple Calendar',
    description: 'Sync with iCloud Calendar',
    icon: '🍎',
    color: 'bg-gray-600',
    enabled: false // Not implemented yet
  }
]

export function CalendarIntegrationComponent({ onIntegrationChange }: CalendarIntegrationProps) {
  const [integrations, setIntegrations] = React.useState<CalendarIntegration[]>([])
  const [loading, setLoading] = React.useState(true)
  const [syncing, setSyncing] = React.useState<string | null>(null)
  
  const supabase = createClientComponentClient()
  const { showSuccess, showError } = useToast()

  // Fetch existing integrations
  const fetchIntegrations = React.useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (error) throw error
      setIntegrations(data || [])
    } catch (error) {
      console.error('Error fetching integrations:', error)
      showError("Failed to load calendar integrations")
    } finally {
      setLoading(false)
    }
  }, [supabase, showError])

  React.useEffect(() => {
    fetchIntegrations()
  }, [fetchIntegrations])

  const connectGoogleCalendar = async () => {
    try {
      setSyncing('google')
      
      // Redirect to Google OAuth
      const response = await fetch('/api/calendar/google-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to initiate Google Calendar connection')
      }

      const { authUrl } = await response.json()
      window.location.href = authUrl
    } catch (error) {
      console.error('Error connecting Google Calendar:', error)
      showError("Failed to connect to Google Calendar")
    } finally {
      setSyncing(null)
    }
  }

  const disconnectIntegration = async (integrationId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_integrations')
        .update({ is_active: false })
        .eq('id', integrationId)

      if (error) throw error

      setIntegrations(prev => prev.filter(integration => integration.id !== integrationId))
      onIntegrationChange?.()
      
      showSuccess("Calendar integration has been disconnected")
    } catch (error) {
      console.error('Error disconnecting integration:', error)
      showError("Failed to disconnect calendar integration")
    }
  }

  const syncIntegration = async (integrationId: string) => {
    try {
      setSyncing(integrationId)
      
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ integration_id: integrationId }),
      })

      if (!response.ok) {
        throw new Error('Failed to sync calendar')
      }

      const result = await response.json()
      
      showSuccess(`Synced ${result.events_synced} events from ${result.calendar_name}`)
      
      onIntegrationChange?.()
    } catch (error) {
      console.error('Error syncing integration:', error)
      showError("Failed to sync calendar events")
    } finally {
      setSyncing(null)
    }
  }

  const toggleIntegration = async (integrationId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('calendar_integrations')
        .update({ is_active: enabled })
        .eq('id', integrationId)

      if (error) throw error

      setIntegrations(prev => 
        prev.map(integration => 
          integration.id === integrationId 
            ? { ...integration, is_active: enabled }
            : integration
        )
      )
      
      onIntegrationChange?.()
      
      showSuccess(`Calendar integration has been ${enabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      console.error('Error toggling integration:', error)
      showError("Failed to update integration settings")
    }
  }

  const getIntegrationStatus = (provider: string) => {
    const integration = integrations.find(i => i.provider === provider)
    if (!integration) return 'not_connected'
    if (!integration.is_active) return 'disabled'
    return 'connected'
  }

  const isIntegrationConnected = (provider: string) => {
    return integrations.some(i => i.provider === provider && i.is_active)
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Calendar Integration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Calendar Integration</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {integrationProviders.map((provider) => {
          const status = getIntegrationStatus(provider.id)
          const isConnected = isIntegrationConnected(provider.id)
          const integration = integrations.find(i => i.provider === provider.id)
          
          return (
            <div key={provider.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full ${provider.color} flex items-center justify-center text-white text-lg`}>
                  {provider.icon}
                </div>
                <div>
                  <h3 className="font-medium">{provider.name}</h3>
                  <p className="text-sm text-muted-foreground">{provider.description}</p>
                  {integration && (
                    <p className="text-xs text-muted-foreground">
                      Connected as: {integration.calendar_name}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {status === 'not_connected' ? (
                  <Button
                    onClick={() => provider.id === 'google' ? connectGoogleCalendar() : undefined}
                    disabled={!provider.enabled || syncing === provider.id}
                    size="sm"
                  >
                    {syncing === provider.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-2" />
                    )}
                    Connect
                  </Button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={integration?.is_active || false}
                      onCheckedChange={(checked) => 
                        integration ? toggleIntegration(integration.id, checked) : undefined
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => integration ? syncIntegration(integration.id) : undefined}
                      disabled={syncing === provider.id}
                    >
                      {syncing === provider.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => integration ? disconnectIntegration(integration.id) : undefined}
                    >
                      Disconnect
                    </Button>
                  </div>
                )}
                
                <div className="flex items-center">
                  {status === 'connected' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {status === 'disabled' && (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                  {!provider.enabled && (
                    <Badge variant="outline" className="text-xs">
                      Coming Soon
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        
        {integrations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No calendar integrations connected</p>
            <p className="text-sm">Connect your calendars to sync events automatically</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
