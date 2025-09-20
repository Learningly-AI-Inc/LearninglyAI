import { AutoSyncService } from '@/lib/auto-sync-service'

export async function ServerAutoSync() {
  try {
    // Check if auto-sync should run
    if (AutoSyncService.shouldAutoSync()) {
      const result = await AutoSyncService.performAutoSync()
      
      if (result.performed) {
        console.log('✅ Server auto-sync completed:', result.result?.message)
      } else {
        console.log('ℹ️ Server auto-sync skipped:', result.reason)
      }
    }
  } catch (error) {
    console.error('❌ Server auto-sync failed:', error)
  }

  return null // This component doesn't render anything
}
