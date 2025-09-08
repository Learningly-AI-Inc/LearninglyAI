import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  console.log('📝 Update document API called');
  
  try {
    const { documentId, extractedText, pageCount } = await req.json();
    
    if (!documentId || !extractedText) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Update the document with the extracted text
    const { data, error } = await supabase
      .from('reading_documents')
      .update({
        extracted_text: extractedText,
        page_count: pageCount || 1,
        text_length: extractedText.length,
        processing_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Database update error:', error);
      return NextResponse.json(
        { error: 'Failed to update document' },
        { status: 500 }
      );
    }

    console.log('✅ Document updated successfully:', {
      documentId,
      textLength: extractedText.length,
      pageCount
    });

    return NextResponse.json({
      success: true,
      message: 'Document updated successfully'
    });

  } catch (error: any) {
    console.error('❌ Update document error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
