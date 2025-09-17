import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Fetch specific exam session
    const { data: session, error: sessionError } = await supabase
      .from('exam_prep_sessions')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (sessionError) {
      console.error('Error fetching exam session:', sessionError);
      return NextResponse.json(
        { error: 'Exam session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session
    });

  } catch (error) {
    console.error('Exam session fetch error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch exam session', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
