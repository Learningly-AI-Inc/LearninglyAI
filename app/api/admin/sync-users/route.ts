import { NextRequest, NextResponse } from 'next/server'
import { UserSyncService } from '@/lib/user-sync-service'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('user_data')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !userProfile || userProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get sync statistics
    const stats = await UserSyncService.getSyncStats()
    
    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error: any) {
    console.error('Error getting sync stats:', error)
    return NextResponse.json(
      { error: 'Failed to get sync statistics', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('user_data')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !userProfile || userProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Parse request body for options
    const body = await request.json().catch(() => ({}))
    const { dryRun = false } = body

    if (dryRun) {
      // Return what would be synced without making changes
      const stats = await UserSyncService.getSyncStats()
      return NextResponse.json({
        success: true,
        message: 'Dry run completed',
        stats,
        dryRun: true
      })
    }

    // Perform the actual sync
    const result = await UserSyncService.syncUsers()
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      stats: result.stats
    })

  } catch (error: any) {
    console.error('Error syncing users:', error)
    return NextResponse.json(
      { error: 'Failed to sync users', details: error.message },
      { status: 500 }
    )
  }
}
