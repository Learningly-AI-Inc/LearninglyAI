import { UserSyncService } from './user-sync-service'

export class AutoSyncService {
  private static lastSyncTime: number | null = null
  private static readonly SYNC_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours
  private static readonly MIN_SYNC_INTERVAL = 60 * 60 * 1000 // 1 hour minimum

  /**
   * Check if automatic sync should be performed
   */
  static shouldAutoSync(): boolean {
    if (!this.lastSyncTime) {
      return true // First time
    }

    const timeSinceLastSync = Date.now() - this.lastSyncTime
    return timeSinceLastSync >= this.SYNC_INTERVAL
  }

  /**
   * Perform automatic sync if conditions are met
   */
  static async performAutoSync(): Promise<{
    performed: boolean
    result?: any
    reason?: string
  }> {
    try {
      // Check if we should sync
      if (!this.shouldAutoSync()) {
        const timeSinceLastSync = Date.now() - (this.lastSyncTime || 0)
        const hoursSinceLastSync = Math.floor(timeSinceLastSync / (60 * 60 * 1000))
        
        return {
          performed: false,
          reason: `Last sync was ${hoursSinceLastSync} hours ago. Next sync in ${24 - hoursSinceLastSync} hours.`
        }
      }

      // Check minimum interval to prevent too frequent syncing
      if (this.lastSyncTime && (Date.now() - this.lastSyncTime) < this.MIN_SYNC_INTERVAL) {
        return {
          performed: false,
          reason: 'Minimum sync interval not reached (1 hour)'
        }
      }

      console.log('🔄 Performing automatic user sync...')
      
      // Perform the sync
      const result = await UserSyncService.syncUsers()
      
      // Update last sync time
      this.lastSyncTime = Date.now()
      
      console.log('✅ Automatic user sync completed:', result.message)
      
      return {
        performed: true,
        result
      }

    } catch (error: any) {
      console.error('❌ Automatic user sync failed:', error)
      return {
        performed: false,
        reason: `Sync failed: ${error.message}`
      }
    }
  }

  /**
   * Force sync (bypasses time checks)
   */
  static async forceSync() {
    try {
      console.log('🔄 Performing forced user sync...')
      
      const result = await UserSyncService.syncUsers()
      this.lastSyncTime = Date.now()
      
      console.log('✅ Forced user sync completed:', result.message)
      
      return {
        performed: true,
        result
      }
    } catch (error: any) {
      console.error('❌ Forced user sync failed:', error)
      return {
        performed: false,
        reason: `Sync failed: ${error.message}`
      }
    }
  }

  /**
   * Get sync status information
   */
  static getSyncStatus() {
    if (!this.lastSyncTime) {
      return {
        lastSync: null,
        nextSync: 'Immediate',
        status: 'never_synced'
      }
    }

    const timeSinceLastSync = Date.now() - this.lastSyncTime
    const hoursSinceLastSync = Math.floor(timeSinceLastSync / (60 * 60 * 1000))
    const nextSyncIn = this.SYNC_INTERVAL - timeSinceLastSync
    const nextSyncHours = Math.floor(nextSyncIn / (60 * 60 * 1000))

    return {
      lastSync: new Date(this.lastSyncTime),
      nextSync: nextSyncIn > 0 ? `${nextSyncHours} hours` : 'Immediate',
      status: this.shouldAutoSync() ? 'ready' : 'waiting',
      hoursSinceLastSync
    }
  }

  /**
   * Reset sync timer (for testing or manual reset)
   */
  static resetSyncTimer() {
    this.lastSyncTime = null
    console.log('🔄 Sync timer reset')
  }
}
