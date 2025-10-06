import { NextRequest, NextResponse } from 'next/server'
import { StripeSyncService } from '@/lib/stripe-sync-service'
import { SyncMonitor } from '@/lib/sync-monitor'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing sync functionality...')
    
    // Test 1: Check sync health
    const health = await SyncMonitor.checkSyncHealth()
    console.log('Health check result:', health)
    
    // Test 2: Get sync stats
    const stats = await SyncMonitor.getSyncStats()
    console.log('Sync stats:', stats)
    
    // Test 3: Verify integrity (without running full sync)
    const integrity = await StripeSyncService.verifySyncIntegrity()
    console.log('Integrity check:', integrity)
    
    return NextResponse.json({
      success: true,
      message: 'Sync functionality test completed',
      results: {
        health,
        stats,
        integrity
      }
    })
    
  } catch (error: any) {
    console.error('❌ Sync test failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Sync test failed', 
        message: error.message 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Running full sync test...')
    
    // Run a full sync
    const result = await StripeSyncService.syncAllSubscriptions()
    
    // Log the activity
    await SyncMonitor.logSyncActivity('manual', result.success, {
      usersProcessed: result.stats.usersSynced,
      errors: result.stats.errors,
      duration: 0 // Could add timing if needed
    })
    
    return NextResponse.json({
      success: result.success,
      message: 'Full sync test completed',
      result
    })
    
  } catch (error: any) {
    console.error('❌ Full sync test failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Full sync test failed', 
        message: error.message 
      },
      { status: 500 }
    )
  }
}
