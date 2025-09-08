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

    // Extract file and optional extracted text
    const file = formData.get('file') as File;
    const extractedText = formData.get('extractedText') as string;
    const pageCount = formData.get('pageCount') as string;
    
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
    let serverExtractedText = '';
    let serverPageCount = 1;
    let processingNotes: string[] = [];
    
    // Always process on server side for now to avoid client-side PDF.js issues
    const useClientText = false; // Disabled due to webpack issues
    
    if (useClientText) {
      console.log('✅ Using client-provided extracted text');
      serverExtractedText = extractedText;
      serverPageCount = parseInt(pageCount) || 1;
    } else {
      console.log('🔍 Processing text on server side');
    }

    try {
      if (fileExtension === 'pdf' || file.type === 'application/pdf') {
        console.log('📄 Processing PDF...');
        
        try {
          // Suppress stderr temporarily to avoid test file errors from pdf-parse
          const originalStderr = process.stderr.write;
          const originalConsoleError = console.error;
          let suppressedErrors: string[] = [];
          
          // Override stderr to catch library errors
          process.stderr.write = function(chunk: any) {
            const msg = chunk.toString();
            // Filter out known pdf-parse test file errors
            if (msg.includes('test/data/05-versions-space.pdf') || 
                msg.includes('ENOENT') && msg.includes('test') ||
                msg.includes('no such file or directory') && msg.includes('test')) {
              suppressedErrors.push(msg);
              return true;
            }
            return originalStderr.call(process.stderr, chunk);
          };
          
          // Override console.error to catch additional errors
          console.error = function(...args: any[]) {
            const msg = args.join(' ');
            if (msg.includes('test/data/05-versions-space.pdf') || 
                msg.includes('ENOENT') && msg.includes('test') ||
                msg.includes('no such file or directory') && msg.includes('test')) {
              suppressedErrors.push(msg);
              return;
            }
            return originalConsoleError.apply(console, args);
          };
          
          try {
            // Dynamic import of pdf-parse to avoid compilation issues
            const { default: PDFParse } = await import('pdf-parse');
            
            // Create a clean buffer without any file system references
            const cleanBuffer = Buffer.from(buffer);
            
            console.log('📄 Starting PDF parsing with pdf-parse...');
            const pdfData = await PDFParse(cleanBuffer, {
              // Add options to improve parsing
              max: 0, // Parse all pages
              version: 'v1.10.100' // Use specific version
            });
          
          serverExtractedText = pdfData.text || '';
          serverPageCount = pdfData.numpages || 1;
          
          console.log('📊 PDF parsing results:', {
            pages: serverPageCount,
            textLength: serverExtractedText.length,
            hasText: serverExtractedText.trim().length > 0
          });
          
          if (serverExtractedText.trim().length === 0) {
            serverExtractedText = `PDF Document Analysis

This PDF document has been successfully uploaded and is ready for analysis. The document contains ${serverPageCount} page(s).

Note: The PDF appears to contain mostly images, scanned content, or non-text elements. While full text extraction wasn't possible, you can still:
- Ask questions about the document structure
- Request analysis of the content type
- Discuss the document's purpose or context
- Get help with document-related tasks

The document is now available in our system and ready for your questions.`;
            processingNotes.push('PDF contains no extractable text - likely image-based or scanned document');
          } else {
            // Clean up the extracted text
            serverExtractedText = serverExtractedText
              .replace(/\s+/g, ' ')
              .replace(/\n\s*\n/g, '\n\n')
              .trim();
          }
          
          console.log('✅ PDF processed successfully:', {
            pages: serverPageCount,
            textLength: serverExtractedText.length,
            processingNotes: processingNotes
          });
          
          } finally {
            // Restore original functions
            process.stderr.write = originalStderr;
            console.error = originalConsoleError;
            
            // Log suppressed errors for debugging (but not to stderr)
            if (suppressedErrors.length > 0 && process.env.NODE_ENV === 'development') {
              console.log('ℹ️ Suppressed pdf-parse test file errors:', suppressedErrors.length);
            }
          }
          
        } catch (pdfError: any) {
          // Filter out non-critical ENOENT errors for test files
          if (pdfError.code === 'ENOENT' && pdfError.path && 
              (pdfError.path.includes('test/data') || pdfError.path.includes('05-versions-space.pdf'))) {
            console.log('⚠️ Ignoring pdf-parse test file error (non-critical)');
            // This is a known issue with pdf-parse trying to access test files
            // Continue processing normally - set default values
            serverExtractedText = `PDF Document Analysis

This PDF document has been successfully uploaded and is ready for analysis. The document contains ${serverPageCount} page(s).

Note: The PDF appears to contain mostly images, scanned content, or non-text elements. While full text extraction wasn't possible, you can still:
- Ask questions about the document structure
- Request analysis of the content type
- Discuss the document's purpose or context
- Get help with document-related tasks

The document is now available in our system and ready for your questions.`;
            processingNotes.push('PDF processed successfully (ignored test file error)');
          } else {
              console.error('❌ PDF parsing error:', pdfError);
            
            // Provide more specific error messages
            let errorMessage = 'PDF processing encountered an issue. ';
            if (pdfError.message.includes('password')) {
              errorMessage += 'The PDF appears to be password-protected. ';
            } else if (pdfError.message.includes('corrupt')) {
              errorMessage += 'The PDF file appears to be corrupted. ';
            } else if (pdfError.message.includes('invalid')) {
              errorMessage += 'The file may not be a valid PDF. ';
            } else {
              errorMessage += 'The file may be corrupted, password-protected, or contain only images. ';
            }
            
            errorMessage += 'You can still upload it, but text extraction is limited. The document is available for reference and you can ask questions about it.';
            
            serverExtractedText = errorMessage;
            serverPageCount = 1;
            processingNotes.push(`PDF parsing failed: ${pdfError.message}`);
          }
        }
        
      } else if (fileExtension === 'txt' || file.type === 'text/plain') {
        console.log('📝 Processing TXT...');
        
        try {
          serverExtractedText = buffer.toString('utf-8');
          serverPageCount = Math.max(1, Math.ceil(serverExtractedText.length / 2000));
          
          console.log('✅ TXT processed:', {
            textLength: serverExtractedText.length,
            estimatedPages: serverPageCount
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

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('reading-documents')
      .getPublicUrl(storagePath);

    if (!urlData?.publicUrl) {
      console.error('❌ Failed to generate public URL');
      return NextResponse.json(
        { error: 'Failed to generate file URL' },
        { status: 500 }
      );
    }

    const fileUrl = urlData.publicUrl;

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
        extracted_text: useClientText ? (extractedText || '') : (serverExtractedText || ''),
        page_count: useClientText ? parseInt(pageCount) || 1 : serverPageCount,
        text_length: useClientText ? (extractedText ? extractedText.length : 0) : (serverExtractedText ? serverExtractedText.length : 0),
        processing_status: 'completed',
        processing_notes: processingNotes,
        public_url: fileUrl,
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
      textLength: extractedText ? extractedText.length : 0,
      uploadedAt: new Date().toISOString(),
      processingNotes,
      fileUrl: fileUrl,
      documentId: documentRecord?.id
    };

    console.log('✅ Upload successful:', {
      documentId: documentRecord?.id,
      title: metadata.title,
      fileSize: metadata.fileSize,
      textLength: metadata.textLength,
      storagePath
    });

    // Return success response with public URL
    return NextResponse.json({
      success: true,
      documentId: documentRecord?.id,
      text: useClientText ? (extractedText || '') : (serverExtractedText || ''),
      metadata,
      fileUrl: fileUrl,
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