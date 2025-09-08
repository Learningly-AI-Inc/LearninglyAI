import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  console.log('📤 Reading Upload API called');
  
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
          error: 'Invalid request format. Please ensure you are uploading a file.',
          details: 'FormData parsing failed'
        },
        { status: 400 }
      );
    }

    // Extract file
    const file = formData.get('file') as File;
    
    if (!file) {
      console.error('❌ No file in request');
      return NextResponse.json(
        { 
          error: 'No file provided',
          details: 'Please select a file to upload'
        },
        { status: 400 }
      );
    }

    console.log('📁 File received:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });

    // Validate file size (20MB limit)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      console.error('❌ File too large:', file.size);
      return NextResponse.json(
        { 
          error: 'File too large',
          details: `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds the 20MB limit`
        },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      console.error('❌ Empty file');
      return NextResponse.json(
        { 
          error: 'Empty file',
          details: 'The uploaded file appears to be empty'
        },
        { status: 400 }
      );
    }

    // Validate file type
    const fileExtension = file.name.toLowerCase().split('.').pop() || '';
    const allowedExtensions = ['pdf', 'txt'];
    const allowedMimeTypes = ['application/pdf', 'text/plain'];
    
    const isValidExtension = allowedExtensions.includes(fileExtension);
    const isValidMimeType = allowedMimeTypes.includes(file.type);
    
    console.log('🔍 File validation:', {
      extension: fileExtension,
      mimeType: file.type,
      isValidExtension,
      isValidMimeType
    });

    if (!isValidExtension && !isValidMimeType) {
      console.error('❌ Invalid file type');
      return NextResponse.json(
        { 
          error: 'Unsupported file type',
          details: `Only PDF and TXT files are supported. Found: ${fileExtension} (${file.type})`
        },
        { status: 400 }
      );
    }

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

    console.log('✅ User authenticated:', user.id);

    // Convert file to buffer
    let buffer: Buffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      console.log('✅ File converted to buffer:', buffer.length, 'bytes');
    } catch (error) {
      console.error('❌ Failed to read file:', error);
      return NextResponse.json(
        { 
          error: 'Failed to read file',
          details: 'Could not process the uploaded file'
        },
        { status: 500 }
      );
    }

    // Extract text based on file type
    let extractedText = '';
    let pageCount = 1;
    let processingNotes: string[] = [];

    try {
      if (fileExtension === 'pdf' || file.type === 'application/pdf') {
        console.log('📄 Processing PDF...');
        
        try {
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
        
      } else if (fileExtension === 'txt' || file.type === 'text/plain') {
        console.log('📝 Processing TXT...');
        
        try {
          extractedText = buffer.toString('utf-8');
          pageCount = Math.max(1, Math.ceil(extractedText.length / 2000));
          
          console.log('✅ TXT processed:', {
            textLength: extractedText.length,
            estimatedPages: pageCount
          });
          
        } catch (txtError) {
          console.error('❌ TXT processing error:', txtError);
          return NextResponse.json(
            { 
              error: 'Failed to process text file',
              details: 'Could not read the text file content'
            },
            { status: 500 }
          );
        }
      } else {
        console.error('❌ Unsupported file type reached processing');
        return NextResponse.json(
          { 
            error: 'Unsupported file type',
            details: 'File passed validation but cannot be processed'
          },
          { status: 400 }
        );
      }
    } catch (processingError) {
      console.error('❌ Text extraction failed:', processingError);
      return NextResponse.json(
        { 
          error: 'Text extraction failed',
          details: 'Could not extract text from the uploaded file'
        },
        { status: 500 }
      );
    }

    // Create unique filename for Supabase storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${user.id}/${timestamp}-${safeFileName}`;

    console.log('📤 Uploading to Supabase storage:', storagePath);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('reading-documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Supabase upload error:', uploadError);
      return NextResponse.json(
        { 
          error: 'Failed to upload file to storage',
          details: uploadError.message
        },
        { status: 500 }
      );
    }

    console.log('✅ File uploaded to Supabase storage:', uploadData.path);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('reading-documents')
      .getPublicUrl(storagePath);

    // Store document metadata in database
    const { data: documentRecord, error: dbError } = await supabase
      .from('reading_documents')
      .insert({
        user_id: user.id,
        title: file.name.replace(/\.(pdf|txt)$/i, ''),
        original_filename: file.name,
        file_path: storagePath,
        file_type: fileExtension,
        file_size: file.size,
        mime_type: file.type,
        extracted_text: extractedText,
        page_count: pageCount,
        text_length: extractedText.length,
        processing_status: 'completed',
        processing_notes: processingNotes,
        public_url: urlData.publicUrl,
        metadata: {
          uploadedAt: new Date().toISOString(),
          processingNotes
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      // Don't fail the request if DB insert fails, file is still uploaded
      console.warn('⚠️ File uploaded but database record failed');
    }

    console.log('✅ Document record created:', documentRecord?.id);

    // Generate response metadata
    const metadata = {
      title: file.name.replace(/\.(pdf|txt)$/i, ''),
      originalFileName: file.name,
      fileSize: file.size,
      fileType: fileExtension,
      mimeType: file.type,
      pages: pageCount,
      textLength: extractedText.length,
      uploadedAt: new Date().toISOString(),
      processingNotes,
      fileUrl: urlData.publicUrl,
      documentId: documentRecord?.id
    };

    console.log('✅ Upload successful:', {
      documentId: documentRecord?.id,
      title: metadata.title,
      fileSize: metadata.fileSize,
      textLength: metadata.textLength,
      storagePath
    });

    // Return success response with file URL
    return NextResponse.json({
      success: true,
      documentId: documentRecord?.id,
      text: extractedText,
      metadata,
      fileUrl: urlData.publicUrl,
      title: metadata.title,
      message: 'Document processed and uploaded successfully'
    });

  } catch (error: any) {
    console.error('💥 Unexpected error in upload API:', error);
    
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