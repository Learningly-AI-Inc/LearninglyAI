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
    const rawExtractedText = formData.get('extractedText') as string;
    const pageCount = formData.get('pageCount') as string;
    
    // Clean client-side extracted text of null characters and control characters
    const extractedText = rawExtractedText ? rawExtractedText
      .replace(/\u0000/g, '') // Remove null characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove other control characters
      .trim() : '';
    
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

    // Extract file extension first
    const fileExtension = file.name.toLowerCase().split('.').pop() || '';

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

    // Validate minimum file size for PDFs
    if (fileExtension === 'pdf' && file.size < 500) { // Less than 500 bytes is likely corrupt
      console.error('❌ PDF file too small:', file.size);
      return NextResponse.json(
        { 
          error: 'Invalid PDF file',
          details: 'The PDF file appears to be corrupted or incomplete (too small)'
        },
        { status: 400 }
      );
    }

    // Validate file type
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
          // Check file size to decide which service to use
          const fileSizeMB = file.size / (1024 * 1024);
          const maxOCRSize = 1; // 1MB limit for OCR.space free tier
          
          if (fileSizeMB <= maxOCRSize) {
            console.log('📄 Starting PDF parsing with OCR.space (small file)...');
            
            // Use OCR.space API for smaller files
            const formData = new FormData();
            const blob = new Blob([buffer], { type: 'application/pdf' });
            formData.append('file', blob, file.name);
            
            // Add OCR parameters for better results
            const ocrParams = new URLSearchParams({
              'filetype': 'PDF',
              'detectOrientation': 'false',
              'isCreateSearchablePdf': 'false',
              'isSearchablePdfHideTextLayer': 'false',
              'scale': 'true',
              'isTable': 'true',
              'OCREngine': '2'
            });
            
            const ocrResponse = await fetch(`https://api.ocr.space/parse/image?${ocrParams}`, {
              method: 'POST',
              headers: {
                'apikey': process.env.NEXT_OCR_SPACE_KEY || 'K88523969288957',
              },
              body: formData
            });
            
            const ocrData = await ocrResponse.json();
            
            if (ocrData.IsErroredOnProcessing) {
              console.error('❌ OCR.space processing error:', ocrData.ErrorMessage);
              throw new Error(`OCR processing failed: ${ocrData.ErrorMessage}`);
            }
            
            // Extract text from OCR response
            if (ocrData.ParsedResults && ocrData.ParsedResults.length > 0) {
              serverExtractedText = ocrData.ParsedResults[0].ParsedText || '';
              serverPageCount = ocrData.ParsedResults.length;
              
              console.log('📊 OCR.space parsing results:', {
                pages: serverPageCount,
                textLength: serverExtractedText.length,
                hasText: serverExtractedText.trim().length > 0,
                processingTime: ocrData.ProcessingTimeInMilliseconds
              });
              
              processingNotes.push(`OCR.space processing completed in ${ocrData.ProcessingTimeInMilliseconds}ms`);
            } else {
              throw new Error('No parsed results returned from OCR.space');
            }
            
          } else {
            console.log('📄 Starting PDF parsing with Adobe PDF Services (large file)...');
            
            // Use Adobe PDF Services for larger files
            const { 
              ServicePrincipalCredentials,
              PDFServices,
              MimeType,
              ExtractPDFParams,
              ExtractElementType,
              ExtractPDFJob,
              ExtractPDFResult
            } = await import('@adobe/pdfservices-node-sdk');
            
            // Check if credentials are available
            if (!process.env.ADOBE_PDF_SERVICES_CLIENT_ID || !process.env.ADOBE_PDF_SERVICES_CLIENT_SECRET) {
              throw new Error('Adobe PDF Services credentials not configured. Please add ADOBE_PDF_SERVICES_CLIENT_ID and ADOBE_PDF_SERVICES_CLIENT_SECRET to your environment variables.');
            }
            
            // Set up credentials
            const credentials = new ServicePrincipalCredentials({
              clientId: process.env.ADOBE_PDF_SERVICES_CLIENT_ID,
              clientSecret: process.env.ADOBE_PDF_SERVICES_CLIENT_SECRET
            });
            
            // Create PDF Services instance
            const pdfServices = new PDFServices({credentials});
            
            // Create a readable stream from buffer 
            const { Readable } = require('stream');
            const bufferStream = new Readable({
              read() {} // Required method for Readable streams
            });
            bufferStream.push(buffer);
            bufferStream.push(null);
            
            // Upload the PDF
            const inputAsset = await pdfServices.upload({
              readStream: bufferStream,
              mimeType: MimeType.PDF
            });
            
            // Create parameters for text extraction
            const params = new ExtractPDFParams({
              elementsToExtract: [ExtractElementType.TEXT]
            });
            
            // Create and submit the job
            const job = new ExtractPDFJob({inputAsset, params});
            const pollingURL = await pdfServices.submit({job});
            
            // Get the result
            const pdfServicesResponse = await pdfServices.getJobResult({
              pollingURL,
              resultType: ExtractPDFResult
            });
            
            // Get content from the resulting asset
            const resultAsset = pdfServicesResponse.result?.resource;
            if (!resultAsset) {
              throw new Error('No result asset returned from Adobe PDF Services');
            }
            
            const streamAsset = await pdfServices.getContent({asset: resultAsset});
            
            // Adobe PDF Services returns a ZIP file, so we need to process it
            const chunks: Buffer[] = [];
            streamAsset.readStream.on('data', (chunk: Buffer) => {
              chunks.push(chunk);
            });
            
            await new Promise((resolve, reject) => {
              streamAsset.readStream.on('end', resolve);
              streamAsset.readStream.on('error', reject);
            });
            
            const zipBuffer = Buffer.concat(chunks);
            
            // Process the ZIP file to extract text
            const AdmZip = require('adm-zip');
            const zip = new AdmZip(zipBuffer);
            
            // Check if structuredData.json exists in the ZIP
            const zipEntries = zip.getEntries();
            const hasStructuredData = zipEntries.some((entry: any) => entry.entryName === 'structuredData.json');
            
            if (!hasStructuredData) {
              console.warn('⚠️ No structuredData.json found in Adobe PDF Services response');
              throw new Error('Adobe PDF Services response does not contain expected structured data');
            }
            
            // Read the structured data JSON file from the ZIP
            const jsonData = zip.readAsText('structuredData.json');
            const data = JSON.parse(jsonData);
            
            // Extract text from the structured data
            let extractedText = '';
            if (data.elements && Array.isArray(data.elements)) {
              console.log(`📊 Processing ${data.elements.length} elements from Adobe PDF Services`);
              
              data.elements.forEach((element: any) => {
                if (element.Text) {
                  extractedText += element.Text;
                  
                  // Add appropriate spacing based on element type
                  if (element.Path && element.Path.includes('H')) {
                    // Heading - add extra line break
                    extractedText += '\n\n';
                  } else if (element.Path && element.Path.includes('P')) {
                    // Paragraph - add line break
                    extractedText += '\n';
                  } else {
                    // Default spacing
                    extractedText += ' ';
                  }
                }
              });
            } else {
              console.warn('⚠️ No elements found in Adobe PDF Services structured data');
            }
            
            extractedText = extractedText.trim();
            
            // Clean null characters and other problematic characters for database storage
            serverExtractedText = extractedText
              .replace(/\u0000/g, '') // Remove null characters
              .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove other control characters
              .trim();
            serverPageCount = Math.max(1, Math.ceil(serverExtractedText.length / 2000)); // Estimate pages
            
            console.log('📊 Adobe PDF Services parsing results:', {
            pages: serverPageCount,
            textLength: serverExtractedText.length,
            hasText: serverExtractedText.trim().length > 0
          });
          
            processingNotes.push(`Adobe PDF Services processing completed`);
          }
          
          // Handle empty text results
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
          
        } catch (pdfError: any) {
          console.error('❌ PDF processing error:', pdfError);
          
          // Provide more specific error messages
          let errorMessage = 'PDF processing encountered an issue. ';
          if (pdfError.message.includes('OCR processing failed')) {
            errorMessage += 'OCR processing failed. ';
          } else if (pdfError.message.includes('Adobe') || pdfError.message.includes('PDFServices')) {
            errorMessage += 'Adobe PDF Services processing failed. ';
          } else if (pdfError.message.includes('network') || pdfError.message.includes('fetch')) {
            errorMessage += 'Network error during processing. ';
          } else if (pdfError.message.includes('limit') || pdfError.message.includes('quota')) {
            errorMessage += 'API limit exceeded. ';
          } else if (pdfError.message.includes('credentials') || pdfError.message.includes('authentication')) {
            errorMessage += 'Authentication error. ';
          } else {
            errorMessage += 'The file may be corrupted, password-protected, or contain only images. ';
          }
          
          errorMessage += 'You can still upload it, but text extraction is limited. The document is available for reference and you can ask questions about it.';
          
          serverExtractedText = errorMessage;
          serverPageCount = 1;
          processingNotes.push(`PDF processing failed: ${pdfError.message}`);
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