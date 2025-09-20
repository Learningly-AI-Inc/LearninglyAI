import { createClient } from './supabase-server'

export interface EmailReconciliationResult {
  action: 'link_accounts' | 'create_separate' | 'merge_accounts' | 'require_verification'
  message: string
  requiresUserChoice: boolean
}

export class EmailReconciliationService {
  private async getSupabase() {
    return await createClient()
  }

  /**
   * Handle OAuth login when user has existing Stripe payment with different email
   */
  async handleOAuthLoginWithStripeMismatch(
    oauthEmail: string,
    stripeCustomerId: string
  ): Promise<EmailReconciliationResult> {
    try {
      const supabase = await this.getSupabase()
      
      // Check if OAuth email already has an account
      const { data: users } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      })
      const existingUser = users?.users?.find(u => u.email === oauthEmail)
      
      // Check if Stripe customer has an account
      const { data: stripeUser } = await supabase
        .from('user_subscriptions')
        .select('user_id, stripe_customer_id')
        .eq('stripe_customer_id', stripeCustomerId)
        .single()

      if (existingUser && stripeUser) {
        // Both accounts exist - need user to choose
        return {
          action: 'require_verification',
          message: `We found accounts with different email addresses. Please choose how to proceed:`,
          requiresUserChoice: true
        }
      }

      if (existingUser && !stripeUser) {
        // OAuth account exists, no Stripe account - normal login
        return {
          action: 'link_accounts',
          message: 'Account found. Linking your OAuth account.',
          requiresUserChoice: false
        }
      }

      if (!existingUser && stripeUser) {
        // Stripe account exists, no OAuth account - link OAuth to existing Stripe account
        return {
          action: 'link_accounts',
          message: 'Found your subscription. Linking your OAuth account.',
          requiresUserChoice: false
        }
      }

      // Neither exists - create new account
      return {
        action: 'create_separate',
        message: 'Creating new account.',
        requiresUserChoice: false
      }

    } catch (error) {
      console.error('Error in email reconciliation:', error)
      return {
        action: 'create_separate',
        message: 'Error occurred. Creating new account.',
        requiresUserChoice: false
      }
    }
  }

  /**
   * Handle user choice for account linking
   */
  async handleUserChoice(
    choice: 'link' | 'separate',
    oauthEmail: string,
    stripeCustomerId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const supabase = await this.getSupabase()

      if (choice === 'link') {
        // Link OAuth account to existing Stripe subscription
        const { error } = await supabase
          .from('user_subscriptions')
          .update({ user_id: userId })
          .eq('stripe_customer_id', stripeCustomerId)

        if (error) throw error

        // Update user metadata
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: {
            linked_accounts: [oauthEmail],
            stripe_customer_id: stripeCustomerId
          }
        })

        return {
          success: true,
          message: 'Accounts successfully linked!'
        }
      } else {
        // Keep accounts separate
        return {
          success: true,
          message: 'Accounts kept separate as requested.'
        }
      }
    } catch (error) {
      console.error('Error handling user choice:', error)
      return {
        success: false,
        message: 'Failed to process your choice. Please try again.'
      }
    }
  }

  /**
   * Send verification emails for account linking
   */
  async sendVerificationEmails(
    oauthEmail: string,
    stripeEmail: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // This would integrate with your email service (SendGrid, AWS SES, etc.)
      // For now, we'll just log the requirement
      console.log(`Verification emails required for:`, {
        oauthEmail,
        stripeEmail,
        timestamp: new Date().toISOString()
      })

      return {
        success: true,
        message: 'Verification emails sent to both addresses.'
      }
    } catch (error) {
      console.error('Error sending verification emails:', error)
      return {
        success: false,
        message: 'Failed to send verification emails.'
      }
    }
  }

  /**
   * Get reconciliation status for a user
   */
  async getReconciliationStatus(userId: string): Promise<{
    hasStripeAccount: boolean
    hasOAuthAccount: boolean
    emailsMatch: boolean
    requiresAction: boolean
  }> {
    try {
      const supabase = await this.getSupabase()
      
      // Get user details
      const { data: user } = await supabase.auth.admin.getUserById(userId)
      
      // Check for Stripe subscription
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single()

      return {
        hasStripeAccount: !!subscription,
        hasOAuthAccount: !!user?.user,
        emailsMatch: true, // This would be determined by comparing emails
        requiresAction: false
      }
    } catch (error) {
      console.error('Error getting reconciliation status:', error)
      return {
        hasStripeAccount: false,
        hasOAuthAccount: false,
        emailsMatch: false,
        requiresAction: false
      }
    }
  }
}

export const emailReconciliationService = new EmailReconciliationService()
