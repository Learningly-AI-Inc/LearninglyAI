import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { uploadKnowledgeBaseAs, webhookDebugger } from '@/api-config';
import { subscriptionService } from '@/lib/subscription-service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    const category = formData.get('category') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

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
    // To increase: Supabase Dashboard → Storage → exam-files → Settings → File size limit
    const maxSize = 50 * 1024 * 1024; // 50MB - matches bucket limit
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: 'File too large',
          details: `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds the maximum allowed size of 50MB. Please compress your file or split it into smaller parts.`
        },
        { status: 400 }
      );
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

    // Create unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${user.id}/${type}/${timestamp}-${file.name}`;

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // IMPORTANT: Extract text BEFORE uploading to Supabase
    // This way we have text even if the upload fails due to size limits
    let extractedText = '';
    try {
      const nameLower = (file.name || '').toLowerCase()
      console.log('🔍 Starting local extraction BEFORE upload for:', file.name, 'Size:', file.size, 'bytes');

      if (nameLower.endsWith('.pdf')) {
        // Import pdf-parse dynamically
        const pdfParse = (await import('pdf-parse')).default

        // Parse PDF from buffer
        console.log('📄 Parsing PDF buffer...');
        const pdfData = await pdfParse(buffer) as any
        extractedText = String(pdfData.text || '').trim()

        console.log('✅ PDF extracted locally BEFORE upload:', {
          textLength: extractedText.length,
          pages: pdfData.numpages,
          preview: extractedText.substring(0, 200)
        });
      } else if (nameLower.endsWith('.docx')) {
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ arrayBuffer })
        extractedText = String(result.value || '').trim()
        console.log('✅ DOCX extracted locally:', extractedText.length, 'chars');
      } else if (nameLower.endsWith('.txt')) {
        extractedText = buffer.toString('utf-8')
        console.log('✅ TXT extracted locally:', extractedText.length, 'chars');
      }

      // Validate extraction
      if (!extractedText || extractedText.trim().length < 10) {
        console.warn('⚠️ Extracted text is empty or too short');
      }
    } catch (localErr: any) {
      console.error('❌ Local extraction failed:', {
        error: localErr.message,
        stack: localErr.stack?.substring(0, 500),
        fileName: file.name
      })
    }

    // Proceed directly to upload since bucket should exist

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('exam-files')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      console.error('Upload error details:', {
        message: uploadError.message,
        filename: filename,
        fileSize: file.size,
        fileType: file.type
      });

      // Check if it's a file size error from Supabase
      const isSizeError = uploadError.message?.toLowerCase().includes('size') ||
                         uploadError.message?.toLowerCase().includes('413') ||
                         uploadError.message?.toLowerCase().includes('exceeded');

      if (isSizeError) {
        return NextResponse.json(
          {
            error: 'File too large for storage',
            details: `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds the storage bucket limit. The Supabase bucket is configured for a maximum of 50MB per file. To upload larger files, increase the bucket limit in Supabase Dashboard → Storage → exam-files → Settings.`,
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

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('exam-files')
      .getPublicUrl(filename);

    // Store file metadata in database with extracted text already available
    const hasValidText = extractedText && extractedText.trim().length > 10;
    const { data: fileRecord, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension for title
        original_filename: file.name,
        file_path: filename,
        file_size: file.size,
        file_type: file.type.split('/')[1] || 'unknown',
        mime_type: file.type,
        document_type: 'exam-prep',
        public_url: urlData.publicUrl,
        // Save extracted text immediately
        extracted_text: hasValidText ? extractedText : null,
        processing_status: hasValidText ? 'completed' : 'processing',
        metadata: {
          upload_type: type,
          file_category: category || 'learning_materials'
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
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
        userId: user.id,
        uploadType: type
      });

      webhookResult = await uploadKnowledgeBaseAs(file, {
        filename: file.name,
        userId: user.id,
        agentId: `${type}-${category}`,
        description: `Exam prep file upload: ${file.name} (${category})`
      });

      if (webhookResult.success) {
        webhookDebugger.info('EXAM_PREP_UPLOAD', 'Webhook processing successful', {
          filename: file.name,
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
          filename: file.name,
          error: webhookResult.error,
          debugInfo: webhookResult.debugInfo
        });

        // Webhook failed but local extraction might have succeeded
        console.log('⚠️ Webhook failed, relying on local extraction');
        // No need to update - we already saved extracted text in the initial insert
      }
    } catch (webhookError) {
      webhookDebugger.error('EXAM_PREP_UPLOAD', 'Webhook request failed', {
        filename: file.name,
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
      filename: file.name,
      fileId: fileRecord?.id,
      documentId: fileRecord?.id, // For compatibility with StudyMaterialsUploader
      title: file.name, // For compatibility with StudyMaterialsUploader
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
