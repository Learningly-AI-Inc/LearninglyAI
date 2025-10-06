import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: fileId } = await params

    // Get the file and its extracted content
    const { data: file, error: fetchError } = await supabase
      .from('documents')
      .select('id, original_filename, extracted_text, processing_status')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .eq('document_type', 'exam-prep')
      .single()

    if (fetchError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Check if content has been extracted
    if (!file.extracted_text) {
      return NextResponse.json({ 
        error: 'Content not yet extracted',
        processing_status: file.processing_status 
      }, { status: 202 }) // 202 = Accepted but not yet processed
    }

    return NextResponse.json({ 
      id: file.id,
      filename: file.original_filename,
      extracted_content: file.extracted_text,
      processing_status: file.processing_status
    })

  } catch (error) {
    console.error('Error fetching file content:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

