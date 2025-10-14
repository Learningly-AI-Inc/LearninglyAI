import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  console.log('📤 Process PDF API called');
  console.log('🌐 Request details:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });
  
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

    // Initialize Supabase client with proper authentication context
    const cookieStore = await cookies();
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ User authentication failed:', userError);
      console.log('🔍 Auth error details:', {
        userError: userError?.message,
        user: user?.id ? 'User exists' : 'No user',
        cookies: Object.keys(cookieStore).length > 0 ? 'Cookies present' : 'No cookies'
      });
      return NextResponse.json(
        {
          error: 'Unauthorized - Please log in again',
          details: 'Authentication failed. Try refreshing the page and logging in again.'
        },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Download file from Supabase storage
    let buffer: Buffer | undefined;
    let storagePath: string = '';
    
    try {
      // Extract storage path from URL
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
        const fs = await import('fs/promises');
        const path = await import('path');
        const filePath = path.join(process.cwd(), 'public', fileUrl);
        buffer = await fs.readFile(filePath);
        console.log('✅ File read from local storage:', buffer.length, 'bytes');
      } else if (fileUrl.startsWith('/')) {
        // Handle local files from public directory
        const fs = await import('fs/promises');
        const path = await import('path');
        const filePath = path.join(process.cwd(), 'public', fileUrl);
        buffer = await fs.readFile(filePath);
        console.log('✅ File read from public directory:', buffer.length, 'bytes');
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
          console.log('🔍 Download error details:', {
            message: downloadError.message
          });

          // Check if it's an authentication issue
          if (downloadError.message?.includes('not found')) {
            return NextResponse.json(
              {
                error: 'File not found or access denied',
                details: 'The file may not exist or you may not have permission to access it. Please try uploading again.'
              },
              { status: 404 }
            );
          }

          return NextResponse.json(
            {
              error: 'Storage access failed',
              details: 'Could not download the file from storage. Please check your authentication.'
            },
            { status: 403 }
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
      console.log('📄 Processing PDF with pdf2json...');
      
      // Use pdf2json for reliable Node.js PDF extraction
      const PDFParser = (await import('pdf2json')).default;
      
      const cleanBuffer = Buffer.from(buffer);
      
      // Add timeout to PDF processing to prevent hanging
      const parsePromise = new Promise<{ text: string; pages: number }>((resolve, reject) => {
        const pdfParser = new PDFParser(null, true);
        
        pdfParser.on('pdfParser_dataError', (errData: any) => {
          reject(errData.parserError || new Error('PDF parsing failed'));
        });
        
        pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
          try {
            const numPages = pdfData.Pages?.length || 0;
            const textParts: string[] = [];
            
            if (pdfData.Pages) {
              for (const page of pdfData.Pages) {
                if (page.Texts) {
                  for (const text of page.Texts) {
                    if (text.R) {
                      for (const run of text.R) {
                        if (run.T) {
                          // Safely decode URI-encoded text
                          try {
                            textParts.push(decodeURIComponent(run.T));
                          } catch (e) {
                            textParts.push(run.T);
                          }
                        }
                      }
                    }
                  }
                }
                textParts.push('\n\n');
              }
            }
            
            const text = textParts.join(' ').replace(/\s+/g, ' ').trim();
            resolve({ text, pages: numPages });
          } catch (err) {
            reject(err);
          }
        });
        
        pdfParser.parseBuffer(cleanBuffer);
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('PDF processing timeout')), 30000); // 30 second timeout
      });

      const result = await Promise.race([parsePromise, timeoutPromise]);
      extractedText = result.text || '';
      pageCount = result.pages || 1;
      
      if (extractedText.trim().length === 0) {
        extractedText = 'This PDF appears to be image-based or contains no extractable text. The document will display visually for reading and analysis, but AI chat features may be limited without searchable text.';
        processingNotes.push('Image-based PDF - visual display available, text extraction failed');
        console.log('ℹ️ PDF has no extractable text - likely image-based or scanned document');
      } else {
        processingNotes.push('Text extracted successfully with pdf2json');
      }
      
      console.log('✅ PDF processed:', {
        pages: pageCount,
        textLength: extractedText.length
      });
      
    } catch (pdfError: any) {
      if (pdfError.message === 'PDF processing timeout') {
        console.log('⚠️ PDF processing timed out - continuing with visual PDF display');
        extractedText = 'PDF processing timed out. The document will display visually for reading, but AI chat features may be limited without extracted text.';
        pageCount = 1;
        processingNotes.push('PDF processing timeout - visual display available');
      } else {
        console.error('❌ PDF parsing error:', pdfError);
        extractedText = 'PDF processing encountered an issue. The document will display visually, but AI features may be limited. This could be due to password protection, corruption, or image-based content.';
        pageCount = 1;
        processingNotes.push('PDF parsing failed - visual display available');
      }
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
