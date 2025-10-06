import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function DELETE(
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

    // First, get the file to verify ownership and get file path
    const { data: file, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .eq('document_type', 'exam-prep')
      .single()

    if (fetchError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Delete the file from storage
    const { error: storageError } = await supabase.storage
      .from('exam-files')
      .remove([file.file_path])

    if (storageError) {
      console.error('Storage deletion error:', storageError)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete the file record from database
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', fileId)
      .eq('user_id', user.id)
      .eq('document_type', 'exam-prep')

    if (dbError) {
      console.error('Database deletion error:', dbError)
      return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'File deleted successfully' 
    })

  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
