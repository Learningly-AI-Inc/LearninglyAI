'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

export function DebugButtonTest() {
  const { user, loading } = useAuth()
  const [clickCount, setClickCount] = useState(0)

  const handleTestClick = () => {
    console.log('Debug button clicked!')
    setClickCount(prev => prev + 1)
  }

  return (
    <div className="p-4 border-2 border-red-500 bg-red-50">
      <h3 className="text-lg font-bold mb-2">Debug Button Test</h3>
      <p>User: {user ? 'Logged in' : 'Not logged in'}</p>
      <p>Loading: {loading ? 'Yes' : 'No'}</p>
      <p>Clicks: {clickCount}</p>
      
      <Button 
        onClick={handleTestClick}
        className="mt-2 bg-red-500 hover:bg-red-600"
      >
        Test Button ({clickCount})
      </Button>
    </div>
  )
}
