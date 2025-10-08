import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { uploadKnowledgeBaseAs, webhookDebugger } from '@/api-config';
import { subscriptionService } from '@/lib/subscription-service';

// Ensure large form-data uploads are handled by Node runtime and allow bigger bodies
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120
// Note: Next.js may ignore this for App Router in some environments, but
// keeping it helps when the route is executed as a Node API handler.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb'
    }
  }
}

export async function POST(req: NextRequest) {
  console.log('📤 Reading Upload API called');
  
  try {
    // Parse form data with better error handling
    let formData: FormData;
    try {
      formData = await req.formData();
      console.log('✅ FormData parsed successfully');
    } catch (error) {
      console.error('❌ Failed to parse FormData:', error);
      return NextResponse.json(
        { 
          error: 'Invalid request format. Please ensure you are uploading a file.',
          details: 'FormData parsing failed',
          code: 'PARSE_ERROR'
        },
        { status: 400 }
      );
    }

    // Accept either a File or a public fileUrl pointing to Supabase storage
    const file = formData.get('file') as File | null;
    const fileUrlFromClient = (formData.get('fileUrl') as string | null) || null;
    const rawExtractedText = formData.get('extractedText') as string;
    const pageCount = formData.get('pageCount') as string;
    
    // Clean client-side extracted text of null characters and control characters
    const extractedText = rawExtractedText ? rawExtractedText
      .replace(/\u0000/g, '') // Remove null characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove other control characters
      .trim() : '';
    
    if (!file && !fileUrlFromClient) {
      console.error('❌ No file or fileUrl in request');
      return NextResponse.json(
        { 
          error: 'No file provided',
          details: 'Please select a file to upload or provide a fileUrl'
        },
        { status: 400 }
      );
    }

    let fileName = file ? file.name : (fileUrlFromClient ? fileUrlFromClient.split('/').pop() || 'document.pdf' : 'document.pdf');
    let fileType = file ? file.type : 'application/pdf';
    let fileSize = file ? file.size : 0;
    console.log('📁 Incoming upload:', { via: file ? 'binary' : 'url', fileName, fileType, fileSize });

    // Extract file extension first
    const fileExtension = fileName.toLowerCase().split('.').pop() || '';

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file && file.size > maxSize) {
      console.error('❌ File too large:', file.size);
      return NextResponse.json(
        { 
          error: 'File too large',
          details: `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds the 30MB limit`
        },
        { status: 400 }
      );
    }

    if (file && file.size === 0) {
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
    if (fileExtension === 'pdf' && ((file && file.size < 500) || (!file && fileSize > 0 && fileSize < 500))) { // Less than 500 bytes is likely corrupt
      console.error('❌ PDF file too small:', file ? file.size : fileSize);
      return NextResponse.json(
        { 
          error: 'Invalid PDF file',
          details: 'The PDF file appears to be corrupted or incomplete (too small)'
        },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedExtensions = ['pdf', 'txt', 'docx', 'png', 'jpg', 'jpeg'];
    const allowedMimeTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg'
    ];
    
    const isValidExtension = allowedExtensions.includes(fileExtension);
    const isValidMimeType = file ? allowedMimeTypes.includes(file.type) : true;
    
    console.log('🔍 File validation:', {
      extension: fileExtension,
      mimeType: fileType,
      isValidExtension,
      isValidMimeType
    });

    if (!isValidExtension && !isValidMimeType) {
      console.error('❌ Invalid file type');
      return NextResponse.json(
        { 
          error: 'Unsupported file type',
          details: `Only PDF, TXT, and DOCX files are supported. Found: ${fileExtension} (${fileType})`
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

    // Check usage limits before processing
    const canUpload = await subscriptionService.checkUsageLimit(user.id, 'documents_uploaded', 1);
    if (!canUpload) {
      const subscription = await subscriptionService.getUserSubscriptionWithPlan(user.id);
      const isFreePlan = subscription?.subscription_plans?.name?.toLowerCase().includes('free');

      console.log('❌ Upload limit exceeded:', isFreePlan);
      
      return NextResponse.json(
        { 
          error: 'Upload limit exceeded',
          message: isFreePlan 
            ? 'You\'ve reached your free plan document upload limit. Upgrade to continue uploading documents.'
            : 'Document upload limit exceeded.',
          needsUpgrade: isFreePlan,
          limitType: 'documents_uploaded'
        },
        { status: 429 }
      );
    }

    // Obtain the file buffer (from binary upload or by downloading from Supabase via fileUrl)
    let buffer: Buffer | null = null;
    let storagePathFromUrl: string | null = null;
    let filePublicUrl: string | null = null;

    if (file) {
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
    } else if (fileUrlFromClient) {
      // Parse storage path from Supabase public URL
      try {
        const parts = fileUrlFromClient.split('/');
        const bucketIdx = parts.findIndex(p => p === 'reading-documents');
        if (bucketIdx !== -1 && bucketIdx < parts.length - 1) {
          storagePathFromUrl = parts.slice(bucketIdx + 1).join('/');
        } else {
          throw new Error('Invalid Supabase URL format');
        }
        const { data: downloadData, error: downloadError } = await supabase.storage
          .from('reading-documents')
          .download(storagePathFromUrl);
        if (downloadError || !downloadData) throw downloadError;
        const arrayBuffer = await downloadData.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        fileSize = buffer.length;
        filePublicUrl = fileUrlFromClient;
        console.log('✅ Downloaded file from storage:', storagePathFromUrl, 'bytes:', buffer.length);
      } catch (e) {
        console.error('❌ Failed to download file from storage:', e);
        return NextResponse.json({ error: 'Failed to retrieve file from storage' }, { status: 500 });
      }
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

    // Removed Adobe OCR helpers to optimize upload speed
    // These can be re-enabled if needed for image-based PDFs

    // Helper: Extract text using pdfjs-dist (no filesystem access)
    async function extractWithPdfJs(buffer: Buffer): Promise<{ text: string; pages: number }> {
      try {
        const pdfjsLib: any = await import('pdfjs-dist')
        // In Node, set worker to null per pdfjs-dist docs
        if (pdfjsLib.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = null
        }
        const uint8 = new Uint8Array(buffer)
        const doc = await pdfjsLib.getDocument({ data: uint8 }).promise
        let out = ''
        const numPages = doc.numPages || 1
        for (let i = 1; i <= Math.min(numPages, 200); i++) {
          const page = await doc.getPage(i)
          const content = await page.getTextContent()
          const strings = (content.items || []).map((it: any) => it.str || '')
          out += strings.join(' ') + '\n\n'
        }
        const text = String(out || '').replace(/\s+/g, ' ').trim()
        return { text, pages: numPages }
      } catch (e) {
        return { text: '', pages: 1 }
      }
    }

    try {
      if (fileExtension === 'pdf' || fileType === 'application/pdf' || 
          fileExtension === 'docx' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          fileExtension === 'txt' || fileType === 'text/plain' ||
          fileExtension === 'png' || fileExtension === 'jpg' || fileExtension === 'jpeg' || fileType.startsWith('image/')) {
        console.log(`📄 Processing ${fileExtension.toUpperCase()} with webhook...`);
        
        try {
          // Create a File object from the buffer for the webhook
          const arrayBufferForBlob = ((buffer as Buffer).buffer.slice((buffer as Buffer).byteOffset, (buffer as Buffer).byteOffset + (buffer as Buffer).byteLength)) as ArrayBuffer
          const blob = new Blob([arrayBufferForBlob as any], { type: fileType })
          const fileBlob = new File([blob as any], fileName, { type: fileType });
          
          // Use the webhook to process the PDF
          const webhookResult = await uploadKnowledgeBaseAs(fileBlob, {
            filename: fileName,
            userId: user.id,
            description: `Reading document upload: ${fileName}`
          });
          
          if (webhookResult.success && webhookResult.data) {
            console.log('✅ Webhook processing successful:', webhookResult.data);
            
            // Extract text from webhook response
            // The webhook response structure may vary, so we'll handle different possible formats
            let responseData = webhookResult.data;
            
            // Handle array response (n8n returns array format)
            if (Array.isArray(responseData) && responseData.length > 0) {
              responseData = responseData[0]; // Take the first item from the array
            }
            
            if (responseData.text) {
              serverExtractedText = responseData.text;
            } else if (responseData.content) {
              serverExtractedText = responseData.content;
            } else if (responseData.extractedText) {
              serverExtractedText = responseData.extractedText;
            } else if (responseData.extracted_text) {
              serverExtractedText = responseData.extracted_text;
            } else if (typeof responseData === 'string') {
              serverExtractedText = responseData;
            } else {
              // If no text found in response, create a placeholder
              serverExtractedText = `PDF Document Analysis

This PDF document has been successfully uploaded and processed. The document is ready for analysis.

Note: The document has been processed through our webhook system and is available for questions and analysis.`;
            }
            
            // Extract page count if available
            if (responseData.pages) {
              serverPageCount = responseData.pages;
            } else if (responseData.pageCount) {
              serverPageCount = responseData.pageCount;
            } else {
              // Estimate pages based on text length
              serverPageCount = Math.max(1, Math.ceil(serverExtractedText.length / 2000));
            }
            
            // Clean up the extracted text
            serverExtractedText = serverExtractedText
              .replace(/\u0000/g, '') // Remove null characters
              .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove other control characters
              .replace(/\s+/g, ' ')
              .replace(/\n\s*\n/g, '\n\n')
              .trim();
            
            processingNotes.push(`Webhook processing completed successfully`);

            // If webhook returned no usable text, attempt local fallback extraction
            if (!serverExtractedText || serverExtractedText.trim().length === 0) {
              try {
                if (fileExtension === 'pdf' || fileType === 'application/pdf') {
                  const cleanBuffer = Buffer.from(buffer as Buffer)
                  // Try pdfjs-dist first (faster)
                  const viaPdfJs = await extractWithPdfJs(cleanBuffer)
                  if (viaPdfJs.text) {
                    serverExtractedText = viaPdfJs.text
                    serverPageCount = viaPdfJs.pages
                    processingNotes.push('Fallback: pdfjs-dist extraction')
                  } else {
                    // Fallback to pdf-parse if pdfjs fails
                    const { default: PDFParse } = await import('pdf-parse')
                    const pdfData = await PDFParse(cleanBuffer, { max: 0 }) as any
                    serverExtractedText = String(pdfData.text || '').trim()
                    serverPageCount = pdfData.numpages || 1
                    processingNotes.push('Fallback: pdf-parse extraction')
                  }
                } else if (fileExtension === 'docx' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                  const mammoth = await import('mammoth')
                  const buf = buffer as Buffer
                  const result = await mammoth.extractRawText({ buffer: buf })
                  serverExtractedText = String(result.value || '').trim()
                  serverPageCount = Math.max(1, Math.ceil(serverExtractedText.length / 2000))
                  processingNotes.push('Fallback: DOCX extraction via mammoth')
                } else if (fileExtension === 'txt' || fileType === 'text/plain') {
                  serverExtractedText = (buffer as Buffer).toString('utf-8');
                  serverPageCount = Math.max(1, Math.ceil(serverExtractedText.length / 2000));
                  processingNotes.push('Fallback: TXT extraction')
                }
              } catch (fallbackErr: any) {
                processingNotes.push(`Fallback extraction failed: ${fallbackErr?.message || String(fallbackErr)}`)
              }
            }
            
            console.log('📊 Webhook parsing results:', {
              pages: serverPageCount,
              textLength: serverExtractedText.length,
              hasText: serverExtractedText.trim().length > 0,
              debugInfo: webhookResult.debugInfo
            });
            
          }
          
          // If webhook failed or returned no text, run local fallback extraction
          if (!webhookResult.success || !serverExtractedText || serverExtractedText.trim().length === 0) {
            if (!webhookResult.success) {
              console.error('❌ Webhook processing failed:', webhookResult.error);
            }
            console.log('🛠️ Running optimized local extraction')
            
            try {
              if (fileExtension === 'pdf' || fileType === 'application/pdf') {
                const cleanBuffer = Buffer.from(buffer as Buffer)
                // Simple fallback: try pdfjs-dist first, then pdf-parse
                const viaPdfJs = await extractWithPdfJs(cleanBuffer)
                if (viaPdfJs.text) {
                  serverExtractedText = viaPdfJs.text
                  serverPageCount = viaPdfJs.pages
                  processingNotes.push('Local extraction via pdfjs-dist')
                } else {
                  const { default: PDFParse } = await import('pdf-parse')
                  const pdfData = await PDFParse(cleanBuffer, { max: 0 }) as any
                  serverExtractedText = String(pdfData.text || '').trim()
                  serverPageCount = pdfData.numpages || 1
                  processingNotes.push('Local extraction via pdf-parse')
                }
              } else if (fileExtension === 'docx' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const mammoth = await import('mammoth')
                const buf = buffer as Buffer
                const result = await mammoth.extractRawText({ buffer: buf })
                serverExtractedText = String(result.value || '').trim()
                serverPageCount = Math.max(1, Math.ceil(serverExtractedText.length / 2000))
                processingNotes.push('Local DOCX extraction via mammoth')
              } else if (fileExtension === 'txt' || fileType === 'text/plain') {
                serverExtractedText = (buffer as Buffer).toString('utf-8');
                serverPageCount = Math.max(1, Math.ceil(serverExtractedText.length / 2000));
                processingNotes.push('Local TXT extraction')
              } else {
                processingNotes.push(`No local extractor available for type: ${fileExtension}`)
              }
            } catch (fbErr: any) {
              processingNotes.push(`Local extraction failed: ${fbErr?.message || String(fbErr)}`)
            }
          }
          
        } catch (webhookError: any) {
          console.error('❌ Webhook processing error:', webhookError);
          console.log('🛠️ Running local fallback extraction after exception')

          // Fallback: Try local extraction when webhook throws
          try {
            if (fileExtension === 'pdf' || fileType === 'application/pdf') {
              const cleanBuffer = Buffer.from(buffer as Buffer)
              const viaPdfJs = await extractWithPdfJs(cleanBuffer)
              if (viaPdfJs.text) {
                serverExtractedText = viaPdfJs.text
                serverPageCount = viaPdfJs.pages
                processingNotes.push('Error recovery: pdfjs-dist extraction')
              } else {
                const { default: PDFParse } = await import('pdf-parse')
                const pdfData = await PDFParse(cleanBuffer, { max: 0 }) as any
                serverExtractedText = String(pdfData.text || '').trim()
                serverPageCount = pdfData.numpages || 1
                processingNotes.push('Error recovery: pdf-parse extraction')
              }
            } else if (fileExtension === 'docx' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
              const mammoth = await import('mammoth')
              const buf = buffer as Buffer
              const result = await mammoth.extractRawText({ buffer: buf })
              serverExtractedText = String(result.value || '').trim()
              serverPageCount = Math.max(1, Math.ceil(serverExtractedText.length / 2000))
              processingNotes.push('Error recovery: DOCX extraction via mammoth')
            } else if (fileExtension === 'txt' || fileType === 'text/plain') {
              serverExtractedText = (buffer as Buffer).toString('utf-8');
              serverPageCount = Math.max(1, Math.ceil(serverExtractedText.length / 2000));
              processingNotes.push('Error recovery: TXT extraction')
            }
          } catch (fbErr: any) {
            processingNotes.push(`Error recovery failed: ${fbErr?.message || String(fbErr)}`)
          }
        }
        
      } else if (fileExtension === 'txt' || fileType === 'text/plain') {
        console.log('📝 Processing TXT...');
        
        try {
          if (!buffer) {
            throw new Error('Missing file buffer')
          }
          serverExtractedText = (buffer as Buffer).toString('utf-8');
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
    
    // Clean up and normalize extracted text
    const cleanText = serverExtractedText
      .replace(/\u0000/g, '') // Remove null characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove other control characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n\s*\n/g, '\n\n') // Preserve paragraph breaks
      .trim();
    
    const textLength = cleanText.length;
    
    if (textLength === 0) {
      console.warn('⚠️ No text extracted from document');
      processingNotes.push('No text extracted - document may be image-based or empty');
    }
    
    console.log('📊 Final extraction results:', {
      pages: serverPageCount,
      textLength,
      hasText: textLength > 0,
      processingNotes
    });
    
    // Upload to Supabase Storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${user.id}/${timestamp}-${safeFileName}`;
    
    console.log('📤 Uploading to Supabase storage:', storagePath);
    
    if (!buffer) {
      console.error('❌ Missing buffer for upload');
      return NextResponse.json(
        { 
          error: 'Internal error',
          details: 'File buffer missing for upload'
        },
        { status: 500 }
      );
    }
    
    // Decide final buffer and type for storage; convert DOCX/TXT to PDF for compatibility
    let finalBuffer = buffer;
    let finalMimeType = fileType;
    let finalFileName = fileName;
    
    if ((fileExtension === 'docx' || fileExtension === 'txt') && serverExtractedText && serverExtractedText.trim().length > 0) {
      try {
        console.log('🧭 Converting extracted text to PDF for storage...');
        const { PDFDocument, StandardFonts } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 12;
        const lineHeight = Math.round(fontSize * 1.4);
        const pageWidth = 595.28; // A4 width (pt)
        const pageHeight = 841.89; // A4 height (pt)
        const margin = 50;
        
        let page = pdfDoc.addPage([pageWidth, pageHeight]);
        let y = pageHeight - margin;
        const maxWidth = pageWidth - margin * 2;
        
        const paragraphs = (serverExtractedText || '').split(/\n{2,}/);
        for (const para of paragraphs) {
          const words = para.split(/\s+/).filter(Boolean);
          let currentLine = '';
          for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            const width = font.widthOfTextAtSize(testLine, fontSize);
            if (width <= maxWidth) {
              currentLine = testLine;
            } else {
              if (currentLine) {
                page.drawText(currentLine, { x: margin, y, size: fontSize, font });
                y -= lineHeight;
                if (y <= margin) {
                  page = pdfDoc.addPage([pageWidth, pageHeight]);
                  y = pageHeight - margin;
                }
              }
              currentLine = word;
            }
          }
          if (currentLine) {
            page.drawText(currentLine, { x: margin, y, size: fontSize, font });
            y -= lineHeight;
            if (y <= margin) {
              page = pdfDoc.addPage([pageWidth, pageHeight]);
              y = pageHeight - margin;
            }
          }
          // Paragraph spacing
          y -= lineHeight;
          if (y <= margin) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
        }
        
        const pdfPageCount = pdfDoc.getPages().length;
        const pdfBytes = await pdfDoc.save();
        finalBuffer = Buffer.from(pdfBytes);
        finalMimeType = 'application/pdf';
        finalFileName = fileName.replace(/\.(pdf|txt|docx)$/i, '.pdf');
        serverPageCount = pdfPageCount;
        processingNotes.push('Stored as generated PDF (converted from ' + fileExtension.toUpperCase() + ')');
        
        console.log('✅ Text converted to PDF for storage:', {
          pages: pdfPageCount,
          originalType: fileType,
          storageMimeType: finalMimeType,
          originalFileName: fileName,
          storedFileName: finalFileName
        });
      } catch (pdfErr) {
        console.error('⚠️ PDF conversion failed; storing original buffer with original type:', pdfErr);
        processingNotes.push('PDF conversion failed; stored original content');
      }
    }
    
    console.log('📤 Uploading to Supabase storage:', {
      path: storagePath,
      originalMimeType: fileType,
      storageMimeType: finalMimeType,
      fileSize: finalBuffer.length,
      fileName: finalFileName
    });
    
    const { error: uploadError } = await supabase.storage
      .from('reading-documents')
      .upload(storagePath, finalBuffer, {
        contentType: finalMimeType,
        upsert: false
      });
    
    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      return NextResponse.json(
        { 
          error: 'Failed to upload file',
          details: uploadError.message
        },
        { status: 500 }
      );
    }
    
    console.log('✅ File uploaded to Supabase storage:', storagePath);
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('reading-documents')
      .getPublicUrl(storagePath);
    
    const fileUrl = urlData.publicUrl;
    
    // Store document metadata in database
    const { data: documentRecord, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        title: fileName.replace(/\.(pdf|txt|docx)$/i, ''),
        original_filename: fileName,
        file_path: storagePath,
        file_type: fileExtension,
        file_size: fileSize,
        mime_type: fileType,
        document_type: 'reading',
        extracted_text: useClientText ? (extractedText || '') : (serverExtractedText || ''),
        page_count: useClientText ? parseInt(pageCount) || 1 : serverPageCount,
        text_length: useClientText ? (extractedText ? extractedText.length : 0) : (serverExtractedText ? serverExtractedText.length : 0),
        processing_status: 'completed', // Always mark as completed if file uploaded successfully, even if text extraction failed
        public_url: fileUrl,
        metadata: {
          uploadedAt: new Date().toISOString(),
          processingNotes,
          originalFileType: fileExtension,
          originalMimeType: fileType,
          storedAsPdf: (fileExtension === 'docx' || fileExtension === 'txt') && finalMimeType === 'application/pdf',
          storedFileName: finalFileName,
          storedMimeType: finalMimeType
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
      title: fileName.replace(/\.(pdf|txt|docx)$/i, ''),
      originalFileName: fileName,
      fileSize: fileSize,
      fileType: fileExtension,
      mimeType: fileType,
      pages: useClientText ? (parseInt(pageCount) || 1) : serverPageCount,
      textLength: useClientText ? (extractedText ? extractedText.length : 0) : (serverExtractedText ? serverExtractedText.length : 0),
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
    
    // Track usage after successful upload
    try {
      await subscriptionService.incrementUsage(user.id, 'documents_uploaded', 1);
      console.log('✅ Usage tracked for document upload');
    } catch (usageError) {
      console.error('⚠️ Failed to track usage:', usageError);
      // Don't fail the upload if usage tracking fails
    }
    
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