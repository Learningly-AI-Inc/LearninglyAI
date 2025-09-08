import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  console.log('📤 Process PDF API called');
  
  try {
    // Parse form data
    let formData: FormData;
    try {
      formData = await req.formData();
      console.log('✅ FormData parsed successfully');
    } catch (error) {
      console.error('❌ Failed to parse FormData:', error);
      return NextResponse.json(
        { 
          error: 'Invalid request format.',
          details: 'FormData parsing failed'
        },
        { status: 400 }
      );
    }

    // Extract file URL and title
    const fileUrl = formData.get('fileUrl') as string;
    const title = formData.get('title') as string;
    
    if (!fileUrl) {
      console.error('❌ No file URL in request');
      return NextResponse.json(
        { 
          error: 'No file URL provided',
          details: 'Please provide a valid file URL'
        },
        { status: 400 }
      );
    }

    console.log('📁 Processing file:', fileUrl);

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

    // Download file from Supabase storage
    let buffer: Buffer;
    try {
      // Extract storage path from URL
      let storagePath: string;
      
      if (fileUrl.includes('supabase')) {
        // Handle Supabase public URLs
        const urlParts = fileUrl.split('/');
        const bucketIndex = urlParts.findIndex(part => part === 'reading-documents');
        if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
          storagePath = urlParts.slice(bucketIndex + 1).join('/');
        } else {
          throw new Error('Invalid Supabase URL format');
        }
      } else if (fileUrl.startsWith('/uploads/')) {
        // Handle legacy local uploads (fallback)
        const fs = await import('fs');
        const path = await import('path');
        const filePath = path.join(process.cwd(), 'public', fileUrl);
        buffer = await fs.readFile(filePath);
        console.log('✅ File read from local storage:', buffer.length, 'bytes');
      } else {
        throw new Error('Unsupported file URL format');
      }

      if (!buffer) {
        // Download from Supabase storage
        const { data, error: downloadError } = await supabase.storage
          .from('reading-documents')
          .download(storagePath);

        if (downloadError) {
          console.error('❌ Failed to download from Supabase:', downloadError);
          return NextResponse.json(
            { 
              error: 'File not found or not accessible',
              details: 'Could not download the file from storage'
            },
            { status: 404 }
          );
        }

        // Convert Blob to Buffer
        const arrayBuffer = await data.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        console.log('✅ File downloaded from Supabase storage:', buffer.length, 'bytes');
      }
    } catch (error) {
      console.error('❌ Failed to read file:', error);
      return NextResponse.json(
        { 
          error: 'File not found or not accessible',
          details: 'Could not read the specified file'
        },
        { status: 404 }
      );
    }

    // Extract text from PDF
    let extractedText = '';
    let pageCount = 1;
    let processingNotes: string[] = [];

    try {
      console.log('📄 Processing PDF...');
      
      // Dynamic import of pdf-parse to avoid compilation issues
      const { default: PDFParse } = await import('pdf-parse');
      
      // Create a clean buffer without any file system references
      const cleanBuffer = Buffer.from(buffer);
      
      const pdfData = await PDFParse(cleanBuffer);
      extractedText = pdfData.text || '';
      pageCount = pdfData.numpages || 1;
      
      if (extractedText.trim().length === 0) {
        extractedText = 'This PDF appears to contain mostly images or has no extractable text. You can still analyze it, but text-based features may be limited.';
        processingNotes.push('PDF contains no extractable text');
      }
      
      console.log('✅ PDF processed:', {
        pages: pageCount,
        textLength: extractedText.length
      });
      
    } catch (pdfError: any) {
      console.error('❌ PDF parsing error:', pdfError);
      extractedText = 'PDF processing encountered an issue. The file may be corrupted, password-protected, or contain only images. You can still upload it, but text extraction is limited.';
      pageCount = 1;
      processingNotes.push('PDF parsing failed - using fallback');
    }

    // Generate metadata
    const metadata = {
      title: title || 'Untitled Document',
      originalFileName: title || 'document.pdf',
      fileSize: buffer.length,
      fileType: 'pdf',
      mimeType: 'application/pdf',
      pages: pageCount,
      textLength: extractedText.length,
      uploadedAt: new Date().toISOString(),
      processingNotes,
      fileUrl
    };

    console.log('✅ PDF processing successful:', {
      title: metadata.title,
      fileSize: metadata.fileSize,
      textLength: metadata.textLength
    });

    // Return success response
    return NextResponse.json({
      success: true,
      text: extractedText,
      metadata,
      message: 'PDF processed successfully'
    });

  } catch (error: any) {
    console.error('💥 Unexpected error in process PDF API:', error);
    
    // Return detailed error for debugging
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
