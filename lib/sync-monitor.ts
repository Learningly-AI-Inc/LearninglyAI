import { createAdminClient } from './supabase-server'
import { StripeSyncService } from './stripe-sync-service'

export interface SyncHealthReport {
  status: 'healthy' | 'warning' | 'critical'
  lastSync: Date | null
  syncFrequency: number // hours
  errors: string[]
  warnings: string[]
  recommendations: string[]
}

export class SyncMonitor {
  /**
   * Check the health of the Stripe-Supabase sync system
   */
  static async checkSyncHealth(): Promise<SyncHealthReport> {
    const report: SyncHealthReport = {
      status: 'healthy',
      lastSync: null,
      syncFrequency: 24, // Default to 24 hours
      errors: [],
      warnings: [],
      recommendations: []
    }

    try {
      const admin = await createAdminClient()
      
      // Check for recent sync activity
      const { data: recentActivity } = await admin
        .from('user_data')
        .select('updated_at')
        .not('updated_at', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)

      if (recentActivity && recentActivity.length > 0) {
        report.lastSync = new Date(recentActivity[0].updated_at)
        
        const hoursSinceLastSync = (Date.now() - report.lastSync.getTime()) / (1000 * 60 * 60)
        
        if (hoursSinceLastSync > 48) {
          report.status = 'critical'
          report.errors.push(`Last sync was ${Math.round(hoursSinceLastSync)} hours ago`)
        } else if (hoursSinceLastSync > 24) {
          report.status = 'warning'
          report.warnings.push(`Last sync was ${Math.round(hoursSinceLastSync)} hours ago`)
        }
      } else {
        report.status = 'critical'
        report.errors.push('No recent sync activity found')
      }

      // Check for data integrity issues
      const integrity = await StripeSyncService.verifySyncIntegrity()
      
      if (integrity.mismatches.length > 0) {
        if (integrity.mismatches.length > 10) {
          report.status = 'critical'
          report.errors.push(`${integrity.mismatches.length} subscription mismatches found`)
        } else {
          report.status = report.status === 'healthy' ? 'warning' : report.status
          report.warnings.push(`${integrity.mismatches.length} subscription mismatches found`)
        }
      }

      // Check for users without proper subscription records
      const { data: usersWithoutSubscriptions } = await admin
        .from('user_data')
        .select('user_id')
        .or('subscription_status.is.null,subscription_status.eq.canceled')
        .is('stripe_subscription_id', null)

      if (usersWithoutSubscriptions && usersWithoutSubscriptions.length > 0) {
        report.warnings.push(`${usersWithoutSubscriptions.length} users without active subscriptions`)
      }

      // Generate recommendations
      if (report.status === 'critical') {
        report.recommendations.push('Run manual sync immediately')
        report.recommendations.push('Check webhook endpoint configuration')
        report.recommendations.push('Verify Stripe API credentials')
      } else if (report.status === 'warning') {
        report.recommendations.push('Schedule more frequent syncs')
        report.recommendations.push('Monitor webhook delivery')
      }

      if (integrity.mismatches.length > 0) {
        report.recommendations.push('Run integrity check and fix mismatches')
      }

    } catch (error: any) {
      report.status = 'critical'
      report.errors.push(`Health check failed: ${error.message}`)
      report.recommendations.push('Check system connectivity and credentials')
    }

    return report
  }

  /**
   * Log sync activity for monitoring
   */
  static async logSyncActivity(
    type: 'manual' | 'automatic' | 'webhook',
    success: boolean,
    details: {
      usersProcessed?: number
      errors?: string[]
      duration?: number
    }
  ): Promise<void> {
    try {
      const admin = await createAdminClient()
      
      // You could create a sync_logs table for detailed monitoring
      // For now, we'll just log to console
      console.log(`[SYNC_LOG] ${type.toUpperCase()} sync ${success ? 'SUCCESS' : 'FAILED'}:`, {
        timestamp: new Date().toISOString(),
        type,
        success,
        ...details
      })

    } catch (error) {
      console.error('Failed to log sync activity:', error)
    }
  }

  /**
   * Get sync statistics
   */
  static async getSyncStats(): Promise<{
    totalUsers: number
    activeSubscriptions: number
    freeUsers: number
    lastSync: Date | null
    syncHealth: SyncHealthReport
  }> {
    try {
      const admin = await createAdminClient()
      
      // Get user counts
      const { data: userStats } = await admin
        .from('user_data')
        .select('subscription_status, plan_name, updated_at')

      const totalUsers = userStats?.length || 0
      const activeSubscriptions = userStats?.filter(u => 
        u.subscription_status === 'active' || u.subscription_status === 'trialing'
      ).length || 0
      const freeUsers = userStats?.filter(u => 
        u.plan_name === 'Free' || u.subscription_status === 'canceled'
      ).length || 0

      // Find last sync time
      const lastSync = userStats?.reduce((latest, user) => {
        const userTime = new Date(user.updated_at || 0)
        return userTime > latest ? userTime : latest
      }, new Date(0))

      // Get health report
      const syncHealth = await this.checkSyncHealth()

      return {
        totalUsers,
        activeSubscriptions,
        freeUsers,
        lastSync: lastSync && lastSync.getTime() > 0 ? lastSync : null,
        syncHealth
      }

    } catch (error: any) {
      console.error('Failed to get sync stats:', error)
      throw error
    }
  }

  /**
   * Alert on critical sync issues
   */
  static async checkAndAlert(): Promise<boolean> {
    try {
      const health = await this.checkSyncHealth()
      
      if (health.status === 'critical') {
        // You can implement actual alerting here (email, Slack, etc.)
        console.error('🚨 CRITICAL SYNC ISSUES DETECTED:', {
          errors: health.errors,
          recommendations: health.recommendations
        })
        return true
      }
      
      return false
    } catch (error) {
      console.error('Failed to check and alert:', error)
      return false
    }
  }
}
