import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  console.log('🔐 Get signed URL API called');
  
  try {
    const { fileUrl } = await req.json();
    
    if (!fileUrl) {
      return NextResponse.json(
        { error: 'File URL is required' },
        { status: 400 }
      );
    }

    console.log('📁 Getting signed URL for:', fileUrl);

    // Initialize Supabase client
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

    // Extract storage path from URL
    let storagePath: string;
    
    if (fileUrl.includes('supabase')) {
      // Handle Supabase URLs
      const urlParts = fileUrl.split('/');
      const bucketIndex = urlParts.findIndex(part => part === 'reading-documents');
      if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
        storagePath = urlParts.slice(bucketIndex + 1).join('/');
      } else {
        throw new Error('Invalid Supabase URL format');
      }
    } else {
      throw new Error('Unsupported file URL format');
    }

    console.log('📂 Storage path:', storagePath);

    // Generate signed URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from('reading-documents')
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (error) {
      console.error('❌ Failed to create signed URL:', error);
      return NextResponse.json(
        { 
          error: 'Failed to create signed URL',
          details: error.message
        },
        { status: 500 }
      );
    }

    console.log('✅ Signed URL created successfully');

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl,
      expiresIn: 3600
    });

  } catch (error: any) {
    console.error('💥 Unexpected error in get signed URL API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
