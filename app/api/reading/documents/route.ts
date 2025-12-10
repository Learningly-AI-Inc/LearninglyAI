import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ User authentication failed:', userError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('📚 Fetching documents for user:', user.id);

    // Fetch user's documents from database with only needed columns for faster queries
    const { data: documents, error: dbError } = await supabase
      .from('documents')
      .select('id, title, original_filename, file_type, file_size, page_count, text_length, processing_status, public_url, file_path, created_at, updated_at, metadata')
      .eq('user_id', user.id)
      .eq('document_type', 'reading')
      .order('created_at', { ascending: false })
      .limit(100); // Limit to prevent excessive data transfer

    if (dbError) {
      console.error('❌ Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    console.log('✅ Documents fetched:', documents?.length || 0);

    // Transform documents for frontend
    const transformedDocuments = documents?.map(doc => ({
      id: doc.id,
      title: doc.title,
      originalFilename: doc.original_filename,
      fileType: doc.file_type,
      fileSize: doc.file_size,
      pageCount: doc.page_count || 1,
      textLength: doc.text_length || 0,
      processingStatus: doc.processing_status,
      publicUrl: doc.public_url,
      filePath: doc.file_path,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
      metadata: doc.metadata
    })) || [];

    return NextResponse.json({
      success: true,
      documents: transformedDocuments,
      count: transformedDocuments.length
    });

  } catch (error) {
    console.error('💥 Unexpected error in documents API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ DELETE request received');
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    
    console.log('🔍 Document ID from request:', documentId);

    if (!documentId) {
      console.log('❌ No document ID provided');
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('👤 User authentication result:', { user: user?.id, error: userError });
    
    if (userError || !user) {
      console.error('❌ User authentication failed:', userError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get document details first
    console.log('🔍 Fetching document details for:', documentId);
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('file_path')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .eq('document_type', 'reading')
      .single();

    console.log('📄 Document fetch result:', { document, fetchError });

    if (fetchError || !document) {
      console.error('❌ Document not found:', fetchError);
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete from storage
    console.log('🗂️ Deleting from storage:', document.file_path);
    const { error: storageError } = await supabase.storage
      .from('reading-documents')
      .remove([document.file_path]);

    if (storageError) {
      console.error('❌ Storage deletion error:', storageError);
      // Continue with database deletion even if storage fails
    } else {
      console.log('✅ Storage deletion successful');
    }

    // Delete from database
    console.log('🗃️ Deleting from database:', documentId);
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', user.id)
      .eq('document_type', 'reading');

    if (dbError) {
      console.error('❌ Database deletion error:', dbError);
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      );
    } else {
      console.log('✅ Database deletion successful');
    }

    console.log('✅ Document deleted successfully:', documentId);

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('💥 Unexpected error in delete API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
