import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { uploadKnowledgeBaseAs, webhookDebugger } from '@/api-config';
import { subscriptionService } from '@/lib/subscription-service';

// Ensure large form-data uploads are handled by Node runtime and allow bigger bodies
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Note: Body size limit is configured in vercel.json
// Vercel free tier: 4.5MB, Pro: 4.5MB for Hobby, up to 100MB for serverless functions
// For larger files, consider uploading directly to Supabase storage from client

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const fileUrl = formData.get('fileUrl') as string | null;
    const fileName = formData.get('fileName') as string | null;
    const fileSizeStr = formData.get('fileSize') as string | null;
    const type = formData.get('type') as string;
    const category = formData.get('category') as string;

    // Support both direct file upload and file URL (for large files uploaded directly to Supabase)
    if (!file && !fileUrl) {
      return NextResponse.json(
        { error: 'No file or fileUrl provided' },
        { status: 400 }
      );
    }

    // Validate file type and size (skip if using fileUrl - already uploaded and validated)
    if (file) {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain'
      ];

      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Only PDF, DOCX, DOC, PPTX, and TXT files are allowed' },
          { status: 400 }
        );
      }

      // Check file size - MUST match Supabase bucket limit
      const maxSize = 100 * 1024 * 1024; // 100MB - matches bucket limit
      if (file.size > maxSize) {
        return NextResponse.json(
          {
            error: 'File too large',
            details: `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds the maximum allowed size of 100MB. Please compress your file or split it into smaller parts.`
          },
          { status: 400 }
        );
      }
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check usage limits before processing
    let canUpload = false;
    let subscription = null;
    let isFreePlan = false;

    let processingNotes: string[] = []
    let pageCount = 1
    try {
      canUpload = await subscriptionService.checkUsageLimit(user.id, 'documents_uploaded', 1);
      subscription = await subscriptionService.getUserSubscriptionWithPlan(user.id);

      // Determine if user is on free plan
      if (!subscription || !subscription.plan_name) {
        // No subscription record means free plan
        isFreePlan = true;
      } else {
        isFreePlan = subscription.plan_name.toLowerCase().includes('free');
      }

      console.log('📊 Usage limit check for exam prep:', {
        userId: user.id,
        canUpload,
        isFreePlan,
        hasPlan: !!subscription
      });
    } catch (limitError) {
      console.error('❌ Error checking usage limits:', limitError);
      // If we can't check limits, allow upload but log the error
      canUpload = true;
    }

    if (!canUpload) {
      console.log('❌ Upload limit exceeded for exam prep:', {
        userId: user.id,
        isFreePlan
      });

      return NextResponse.json(
        {
          error: 'Upload limit exceeded',
          message: isFreePlan
            ? 'You\'ve reached your free plan document upload limit. Upgrade to continue uploading exam prep materials.'
            : 'Document upload limit exceeded.',
          needsUpgrade: isFreePlan,
          limitType: 'documents_uploaded'
        },
        { status: 429 }
      );
    }

    // Handle file processing based on upload method
    let buffer: Buffer;
    let originalFileName: string;
    let fileSize: number;
    let storagePath: string | null = null;

    if (fileUrl) {
      // File was uploaded directly to Supabase - extract path from URL and download
      console.log('📥 Processing file from URL:', fileUrl);
      originalFileName = fileName || 'document.pdf';
      fileSize = fileSizeStr ? parseInt(fileSizeStr) : 0;
      
      // Extract storage path from public URL
      const urlParts = fileUrl.split('/storage/v1/object/public/exam-files/');
      if (urlParts.length > 1) {
        storagePath = urlParts[1];
        console.log('✅ Extracted storage path:', storagePath);
      } else {
        throw new Error('Invalid file URL format');
      }

      // Download file from Supabase to process it
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from('exam-files')
        .download(storagePath);

      if (downloadError) {
        throw new Error(`Failed to download file: ${downloadError.message}`);
      }

      buffer = Buffer.from(await downloadData.arrayBuffer());
    } else {
      // Standard file upload
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      originalFileName = file!.name;
      fileSize = file!.size;
      
      // Convert File to ArrayBuffer then to Buffer
      const arrayBuffer = await file!.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    // IMPORTANT: Extract text BEFORE uploading to Supabase (fast path)
    // Use pdfjs-dist for PDFs (first 50 pages) for reliability and speed
    let extractedText = '';
    try {
      const nameLower = (originalFileName || '').toLowerCase()
      console.log('🔍 Starting local extraction BEFORE upload for:', originalFileName, 'Size:', fileSize, 'bytes');

      // Helper: Extract text using pdf-parse (EXACT COPY from working reading upload)
      async function extractWithPdfParse(buf: Buffer): Promise<{ text: string; pages: number }> {
        try {
          const pdfParse = await import('pdf-parse').catch(() => null)

          if (pdfParse?.default) {
            console.log(`📄 Using pdf-parse for extraction (buffer size: ${buf.length} bytes)`)
            const data = await pdfParse.default(buf)
            const text = String(data.text || '').trim()
            const numPages = data.numpages || 1
            console.log(`📄 Extracted with pdf-parse: ${text.length} chars from ${numPages} pages`)
            console.log(`📄 First 300 chars: ${text.substring(0, 300)}`)
            return { text, pages: numPages }
          }

          console.warn('⚠️ pdf-parse not available')
          return { text: '', pages: 1 }
        } catch (e: any) {
          console.error('❌ PDF extraction error:', {
            message: e?.message,
            name: e?.name,
            stack: e?.stack?.substring(0, 500)
          })
          return { text: '', pages: 1 }
        }
      }

      if (nameLower.endsWith('.pdf')) {
        console.log('📄 Fast PDF extraction (pdf-parse only)...');

        try {
          const cleanBuffer = Buffer.from(buffer);
          const viaPdfParse = await extractWithPdfParse(cleanBuffer);

          if (viaPdfParse.text && viaPdfParse.text.trim().length > 0) {
            extractedText = viaPdfParse.text;
            pageCount = viaPdfParse.pages;
            processingNotes.push('Fast extraction: pdf-parse');
          } else {
            // If extraction fails, mark for on-demand extraction later
            extractedText = '';
            pageCount = 1;
            processingNotes.push('Text extraction deferred for speed');
          }
        } catch (err) {
          console.error('⚠️ PDF extraction error:', err);
          extractedText = '';
          pageCount = 1;
          processingNotes.push('Text extraction deferred (error occurred)');
        }
      } else if (nameLower.endsWith('.docx')) {
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ buffer })
        extractedText = String(result.value || '').trim()
        pageCount = Math.max(1, Math.ceil(extractedText.length / 2000))
        console.log('✅ DOCX extracted locally:', extractedText.length, 'chars');
        processingNotes.push('Fast DOCX extraction via mammoth')
      } else if (nameLower.endsWith('.txt')) {
        extractedText = buffer.toString('utf-8')
        pageCount = Math.max(1, Math.ceil(extractedText.length / 2000))
        console.log('✅ TXT extracted locally:', extractedText.length, 'chars');
        processingNotes.push('Processed as plain text (utf-8)')
      }

      // Normalize and validate extraction - be less aggressive with whitespace
      extractedText = extractedText
        .replace(/\u0000/g, '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .trim()

      if (!extractedText || extractedText.trim().length < 10) {
        console.warn('⚠️ Extracted text is empty or too short');
        processingNotes.push('No text extracted - document may be image-based or empty')
      }
    } catch (localErr: any) {
      console.error('❌ Local extraction failed:', {
        error: localErr.message,
        stack: localErr.stack?.substring(0, 500),
        fileName: originalFileName
      })
      processingNotes.push('Text extraction deferred (error occurred)')
    }

    // Upload to Supabase Storage (skip if already uploaded via direct upload)
    let finalStoragePath: string;
    
    if (storagePath) {
      // File was already uploaded directly to Supabase
      console.log('✅ File already in storage at:', storagePath);
      finalStoragePath = storagePath;
    } else {
      // Upload new file to Supabase Storage
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${user.id}/${type}/${timestamp}-${originalFileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('exam-files')
        .upload(filename, buffer, {
          contentType: file?.type || 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        console.error('Upload error details:', {
          message: uploadError.message,
          filename: filename,
          fileSize: fileSize,
          fileType: file?.type
        });

        // Check if it's a file size error from Supabase
        const isSizeError = uploadError.message?.toLowerCase().includes('size') ||
                           uploadError.message?.toLowerCase().includes('413') ||
                           uploadError.message?.toLowerCase().includes('exceeded');

        if (isSizeError) {
          return NextResponse.json(
            {
              error: 'File too large for storage',
              details: `File size (${Math.round(fileSize / 1024 / 1024)}MB) exceeds the storage bucket limit. The Supabase bucket is configured for a maximum of 100MB per file. To upload larger files, increase the bucket limit in Supabase Dashboard → Storage → exam-files → Settings.`,
              filename: filename
            },
            { status: 413 }
          );
        }

        return NextResponse.json(
          {
            error: 'Failed to upload file',
            details: uploadError.message,
            filename: filename
          },
          { status: 500 }
        );
      }
      
      finalStoragePath = filename;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('exam-files')
      .getPublicUrl(finalStoragePath);

    // Store file metadata in database with extracted text already available
    const hasValidText = extractedText && extractedText.trim().length > 10;
    const { data: fileRecord, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        title: originalFileName.replace(/\.[^/.]+$/, ''), // Remove extension for title
        original_filename: originalFileName,
        file_path: finalStoragePath,
        file_size: fileSize,
        file_type: (file?.type || 'application/pdf').split('/')[1] || 'unknown',
        mime_type: file?.type || 'application/pdf',
        document_type: 'exam-prep',
        public_url: urlData.publicUrl,
        // Save extracted text immediately (may be empty; mark completed like reading route)
        extracted_text: extractedText || '',
        processing_status: 'completed',
        metadata: {
          upload_type: type,
          file_category: category || 'learning_materials',
          processingNotes,
          pageCount,
          textLength: extractedText?.length || 0
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Don't fail the request if DB insert fails, file is still uploaded
    } else {
      console.log('✅ Document saved to database with extracted text:', {
        documentId: fileRecord?.id,
        hasText: hasValidText,
        textLength: extractedText.length
      });
    }

    // Send file to webhook for additional processing (async, non-blocking)
    let webhookResult = null;
    try {
      webhookDebugger.info('EXAM_PREP_UPLOAD', 'Sending file to knowledge base webhook', {
        filename: originalFileName,
        fileType: file?.type || 'application/pdf',
        fileSize: fileSize,
        userId: user.id,
        uploadType: type
      });

      // Skip webhook for files uploaded directly (already in storage, text already extracted)
      if (file && !storagePath) {
        webhookResult = await uploadKnowledgeBaseAs(file, {
          filename: originalFileName,
          userId: user.id,
          agentId: `${type}-${category}`,
          description: `Exam prep file upload: ${originalFileName} (${category})`
        });

        if (webhookResult && webhookResult.success) {
          webhookDebugger.info('EXAM_PREP_UPLOAD', 'Webhook processing successful', {
            filename: originalFileName,
            webhookData: webhookResult.data
          });

        // Try to get better extraction from webhook if local extraction was poor
        if (fileRecord?.id && (!extractedText || extractedText.trim().length < 100)) {
          console.log('Webhook result data structure:', JSON.stringify(webhookResult.data, null, 2));

          let webhookText = '';
          if (webhookResult.data && Array.isArray(webhookResult.data) && webhookResult.data.length > 0) {
            webhookText = webhookResult.data[0].extracted_text || webhookResult.data[0].text || webhookResult.data[0].content || '';
          } else if (webhookResult.data && typeof webhookResult.data === 'object') {
            webhookText = webhookResult.data.extracted_text || webhookResult.data.text || webhookResult.data.content || '';
          }

          if (webhookText && webhookText.length > extractedText.length) {
            console.log('💾 Updating with webhook extraction (better quality):', webhookText.length, 'chars');
            await supabase
              .from('documents')
              .update({
                extracted_text: webhookText,
                processing_status: 'completed',
                updated_at: new Date().toISOString()
              })
              .eq('id', fileRecord.id);
          }
        }
        } else {
          webhookDebugger.error('EXAM_PREP_UPLOAD', 'Webhook processing failed', {
            filename: originalFileName,
            error: webhookResult?.error,
            debugInfo: webhookResult?.debugInfo
          });

          // Webhook failed but local extraction might have succeeded
          console.log('⚠️ Webhook failed, relying on local extraction');
          // No need to update - we already saved extracted text in the initial insert
        }
      } else {
        console.log('📝 Skipping webhook for direct upload (text already extracted)');
      }
    } catch (webhookError) {
      webhookDebugger.error('EXAM_PREP_UPLOAD', 'Webhook request failed', {
        filename: originalFileName,
        error: webhookError instanceof Error ? webhookError.message : String(webhookError)
      });
      console.log('⚠️ Webhook failed, but continuing with local extraction');
      // Don't fail the upload if webhook fails - local extraction might have worked
    }

    // Track usage after successful upload
    try {
      await subscriptionService.incrementUsage(user.id, 'documents_uploaded', 1);
      console.log('✅ Usage tracked for exam prep document upload');
    } catch (usageError) {
      console.error('⚠️ Failed to track usage:', usageError);
      // Don't fail the upload if usage tracking fails
    }

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      filename: originalFileName,
      fileId: fileRecord?.id,
      documentId: fileRecord?.id, // For compatibility with StudyMaterialsUploader
      title: originalFileName, // For compatibility with StudyMaterialsUploader
      webhookProcessed: webhookResult?.success || false,
      webhookError: webhookResult?.error || null
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let query = supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .eq('document_type', 'exam-prep')
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('metadata->upload_type', type);
    }

    const { data: files, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch files' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      files: files || []
    });

  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
