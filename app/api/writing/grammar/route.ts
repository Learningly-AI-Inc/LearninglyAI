import { NextRequest, NextResponse } from 'next/server';
import { processWithAI } from '@/lib/ai-helpers';
import { subscriptionService } from '@/lib/subscription-service';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, userId } = body;
    
    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check usage limits for writing words
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const canProcess = await subscriptionService.checkUsageLimit(user.id, 'writing_words', wordCount);
    if (!canProcess) {
      const subscription = await subscriptionService.getUserSubscriptionWithPlan(user.id);
      const isFreePlan = subscription?.subscription_plans?.name?.toLowerCase().includes('free');
      
      return NextResponse.json(
        { 
          error: 'Writing limit exceeded',
          message: isFreePlan 
            ? `You've reached your free plan writing limit (${wordCount} words). Upgrade to continue.`
            : 'Writing word limit exceeded.',
          needsUpgrade: isFreePlan,
          limitType: 'writing_words'
        },
        { status: 429 }
      );
    }
    
    let response;
    try {
      response = await processWithAI({
        text,
        action: 'grammar',
        userId: user.id
      });

      console.log(`Grammar check completed: Found ${response.grammarIssues?.length || 0} issues`);

      // Track usage after successful processing
      try {
        await subscriptionService.incrementUsage(user.id, 'writing_words', wordCount);
      } catch (usageError) {
        console.error('Failed to track writing usage:', usageError);
      }

      return NextResponse.json(response);
    } catch (aiError) {
      console.error('AI processing error in grammar check:', aiError);
      return NextResponse.json(
        {
          error: 'Grammar check failed',
          message: 'The AI service encountered an error. Please try again.',
          details: process.env.NODE_ENV === 'development' ? String(aiError) : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in grammar check API:', error);
    return NextResponse.json(
      {
        error: 'Failed to process grammar check request',
        message: 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    );
  }
}
