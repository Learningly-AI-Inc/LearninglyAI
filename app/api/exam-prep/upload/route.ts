import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { uploadKnowledgeBaseAs, webhookDebugger } from '@/api-config';

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

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
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

    // Create unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${user.id}/${type}/${timestamp}-${file.name}`;

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Proceed directly to upload since bucket should exist

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
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

    // Store file metadata in database
    const { data: fileRecord, error: dbError } = await supabase
      .from('exam_files')
      .insert({
        user_id: user.id,
        filename: file.name,
        file_path: filename,
        file_size: file.size,
        content_type: file.type,
        upload_type: type,
        public_url: urlData.publicUrl,
        file_category: category || 'learning_materials', // Default to learning_materials if not specified
        processing_status: 'processing' // Set initial status to processing
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Don't fail the request if DB insert fails, file is still uploaded
    }

    // Send file to webhook for PDF/DOCX parsing
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
        agentId: `${type}-${category}`, // Include category in agent ID for better processing
        description: `Exam prep file upload: ${file.name} (${category})`
      });

      if (webhookResult.success) {
        webhookDebugger.info('EXAM_PREP_UPLOAD', 'Webhook processing successful', {
          filename: file.name,
          webhookData: webhookResult.data
        });

        // Extract the text content from webhook response
        let extractedText = '';
        console.log('Webhook result data structure:', JSON.stringify(webhookResult.data, null, 2));
        
        if (webhookResult.data && Array.isArray(webhookResult.data) && webhookResult.data.length > 0) {
          extractedText = webhookResult.data[0].extracted_text || '';
          console.log('Extracted text length:', extractedText.length);
        } else if (webhookResult.data && typeof webhookResult.data === 'object') {
          // Handle case where data is not an array
          extractedText = webhookResult.data.extracted_text || '';
          console.log('Extracted text from object:', extractedText.length);
        }

        // Update the database with extracted content and processing status
        console.log('File record ID:', fileRecord?.id);
        console.log('Extracted text available:', !!extractedText);
        console.log('Extracted text length:', extractedText ? extractedText.length : 0);
        console.log('Extracted text preview:', extractedText ? extractedText.substring(0, 100) : 'No content');
        
        // Always try to update the status, even if no content
        if (fileRecord?.id) {
          console.log('Updating database with extracted content...');
          const { error: updateError } = await supabase
            .from('exam_files')
            .update({
              extracted_content: extractedText || null,
              processing_status: extractedText ? 'completed' : 'failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', fileRecord.id);

          if (updateError) {
            console.error('Failed to update extracted content:', updateError);
          } else {
            console.log('Successfully updated database with extracted content');
            webhookDebugger.info('EXAM_PREP_UPLOAD', 'Updated database with extracted content', {
              filename: file.name,
              contentLength: extractedText ? extractedText.length : 0,
              status: extractedText ? 'completed' : 'failed'
            });
          }
        } else {
          console.log('Skipping database update - missing fileRecord ID');
        }
      } else {
        webhookDebugger.error('EXAM_PREP_UPLOAD', 'Webhook processing failed', {
          filename: file.name,
          error: webhookResult.error,
          debugInfo: webhookResult.debugInfo
        });

        // Update processing status to failed
        if (fileRecord?.id) {
          await supabase
            .from('exam_files')
            .update({
              processing_status: 'failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', fileRecord.id);
        }
      }
    } catch (webhookError) {
      webhookDebugger.error('EXAM_PREP_UPLOAD', 'Webhook request failed', {
        filename: file.name,
        error: webhookError instanceof Error ? webhookError.message : String(webhookError)
      });
      // Don't fail the upload if webhook fails
    }

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      filename: file.name,
      fileId: fileRecord?.id,
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
      .from('exam_files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('upload_type', type);
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
