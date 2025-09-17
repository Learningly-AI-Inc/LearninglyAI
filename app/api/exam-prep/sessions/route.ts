import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch exam prep sessions for the user
    const { data: sessions, error: sessionsError } = await supabase
      .from('exam_prep_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_type', 'full_exam')
      .order('created_at', { ascending: false });

    if (sessionsError) {
      console.error('Error fetching exam sessions:', sessionsError);
      return NextResponse.json(
        { error: 'Failed to fetch exam sessions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessions: sessions || []
    });

  } catch (error) {
    console.error('Exam sessions fetch error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch exam sessions', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
