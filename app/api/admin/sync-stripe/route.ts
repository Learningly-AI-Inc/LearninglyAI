import { NextRequest, NextResponse } from 'next/server'
import { StripeSyncService } from '@/lib/stripe-sync-service'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting manual Stripe sync...')
    
    const result = await StripeSyncService.syncAllSubscriptions()
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      stats: result.stats
    })
    
  } catch (error: any) {
    console.error('Manual sync error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Sync failed', 
        message: error.message 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (userId) {
      // Sync specific user
      const result = await StripeSyncService.syncUserById(userId)
      return NextResponse.json(result)
    } else {
      // Verify integrity
      const integrity = await StripeSyncService.verifySyncIntegrity()
      return NextResponse.json({
        success: true,
        message: 'Integrity check completed',
        mismatches: integrity.mismatches,
        hasIssues: integrity.mismatches.length > 0
      })
    }
    
  } catch (error: any) {
    console.error('Sync check error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Check failed', 
        message: error.message 
      },
      { status: 500 }
    )
  }
}
