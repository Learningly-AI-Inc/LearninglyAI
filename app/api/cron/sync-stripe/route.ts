import { NextRequest, NextResponse } from 'next/server'
import { StripeSyncService } from '@/lib/stripe-sync-service'

// Ensure this runs on the server
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (you can add additional security checks)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🕐 Starting scheduled Stripe sync...')
    
    const result = await StripeSyncService.syncAllSubscriptions()
    
    // Log the result for monitoring
    console.log('📊 Scheduled sync completed:', {
      success: result.success,
      usersSynced: result.stats.usersSynced,
      errors: result.stats.errors.length,
      message: result.message
    })
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      stats: result.stats,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('❌ Scheduled sync error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Scheduled sync failed', 
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
