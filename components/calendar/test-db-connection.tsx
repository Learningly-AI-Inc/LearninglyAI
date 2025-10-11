"use client"

import { useSupabase } from '@/hooks/use-supabase'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function TestDbConnection() {
  const supabase = useSupabase()
  const [result, setResult] = useState<string>('')

  const testConnection = async () => {
    try {
      console.log('Testing database connection...')
      
      // Test 1: Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('User check:', { user: !!user, userError })
      
      if (userError) {
        setResult(`User error: ${userError.message}`)
        return
      }
      
      if (!user) {
        setResult('No user found')
        return
      }
      
      // Test 2: Check if calendar_events table exists
      const { data, error } = await supabase
        .from('calendar_events')
        .select('count')
        .limit(1)
      
      if (error) {
        setResult(`Table error: ${error.message}`)
        return
      }
      
      // Test 3: Try to insert a test event
      const testEvent = {
        user_id: user.id,
        title: 'Test Event',
        description: 'This is a test event',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour later
        all_day: false,
        color: '#3B82F6',
        location: 'Test Location',
        event_type: 'general'
      }
      
      console.log('Test event data:', testEvent)
      
      const { data: insertData, error: insertError } = await supabase
        .from('calendar_events')
        .insert([testEvent])
        .select()
        .single()
      
      if (insertError) {
        setResult(`Insert error: ${insertError.message}`)
        return
      }
      
      setResult(`Success! Event created with ID: ${insertData.id}`)
      
      // Clean up test event
      await supabase
        .from('calendar_events')
        .delete()
        .eq('id', insertData.id)
      
    } catch (err) {
      console.error('Test error:', err)
      setResult(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Database Connection Test</h3>
      <Button onClick={testConnection} className="mb-2">
        Test Database Connection
      </Button>
      {result && (
        <div className="p-2 bg-gray-100 rounded text-sm">
          <strong>Result:</strong> {result}
        </div>
      )}
    </div>
  )
}
