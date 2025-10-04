import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import OpenAI from 'openai';

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
    // Adobe helper: Export PDF -> DOCX (with OCR if available), then read text via mammoth
    async function adobeExtractTextFromPdf(pdfBuffer: Buffer): Promise<{ text: string; pages?: number } | null> {
      try {
        const sdk: any = await import('@adobe/pdfservices-node-sdk')
        // Robust Readable creation across environments
        async function bufferToReadable(buf: Buffer): Promise<any> {
          try {
            const streamMod: any = await import('node:stream').catch(() => import('stream'))
            const ReadableAny = (streamMod as any).Readable || (streamMod as any).default?.Readable
            if (ReadableAny?.from) return ReadableAny.from(buf)
            // Fallback: construct a simple Readable
            return new ReadableAny({
              read() {
                this.push(buf)
                this.push(null)
              }
            })
          } catch {
            return buf as any
          }
        }
        const mammoth = await import('mammoth')

        const clientId = process.env.PDF_SERVICES_CLIENT_ID || process.env.ADOBE_CLIENT_ID
        const clientSecret = process.env.PDF_SERVICES_CLIENT_SECRET || process.env.ADOBE_CLIENT_SECRET
        if (!clientId || !clientSecret) return null

        const credentials = new sdk.ServicePrincipalCredentials({ clientId, clientSecret })
        const pdfServices = new sdk.PDFServices({ credentials })
        const readStream = await bufferToReadable(pdfBuffer)
        const inputAsset = await pdfServices.upload({ readStream, mimeType: sdk.MimeType.PDF })

        // Export -> DOCX with OCR locale via supported params
        const exportParams = new sdk.ExportPDFParams({
          targetFormat: sdk.ExportPDFTargetFormat.DOCX,
          ocrLocale: sdk.ExportOCRLocale.EN_US
        })
        const exportJob = new sdk.ExportPDFJob({ inputAsset, params: exportParams })

        const pollingURL = await pdfServices.submit({ job: exportJob })
        const exportResponse = await pdfServices.getJobResult({ pollingURL, resultType: sdk.ExportPDFResult })
        const resultAsset = exportResponse.result.asset
        const streamAsset = await pdfServices.getContent({ asset: resultAsset })

        const chunks: Buffer[] = []
        const rs: any = streamAsset.readStream
        await new Promise<void>((resolve, reject) => {
          rs.on('data', (c: Buffer) => chunks.push(c))
          rs.on('end', () => resolve())
          rs.on('error', (e: any) => reject(e))
        })
        const docxBuffer = Buffer.concat(chunks)
        const { value } = await mammoth.extractRawText({ buffer: docxBuffer })
        return { text: String(value || '').trim() }
      } catch (e) {
        console.error('⚠️ Adobe export-to-docx text extraction failed:', e)
        try {
          // Fallback: run OCR to produce searchable PDF, then export to DOCX without OCR params
          const sdk: any = await import('@adobe/pdfservices-node-sdk')
          async function bufferToReadable(buf: Buffer): Promise<any> {
            try {
              const streamMod: any = await import('node:stream').catch(() => import('stream'))
              const ReadableAny = (streamMod as any).Readable || (streamMod as any).default?.Readable
              if (ReadableAny?.from) return ReadableAny.from(buf)
              return new ReadableAny({
                read() {
                  this.push(buf)
                  this.push(null)
                }
              })
            } catch {
              return buf as any
            }
          }
          const mammoth = await import('mammoth')
          const clientId = process.env.PDF_SERVICES_CLIENT_ID || process.env.ADOBE_CLIENT_ID
          const clientSecret = process.env.PDF_SERVICES_CLIENT_SECRET || process.env.ADOBE_CLIENT_SECRET
          if (!clientId || !clientSecret) return null
          const credentials = new sdk.ServicePrincipalCredentials({ clientId, clientSecret })
          const pdfServices = new sdk.PDFServices({ credentials })
          const rs1 = await bufferToReadable(pdfBuffer)
          const asset1 = await pdfServices.upload({ readStream: rs1, mimeType: sdk.MimeType.PDF })
          const ocrJob = new sdk.OCRJob({ inputAsset: asset1 })
          const poll1 = await pdfServices.submit({ job: ocrJob })
          const ocrResp = await pdfServices.getJobResult({ pollingURL: poll1, resultType: sdk.OCRResult })
          const ocrAsset = ocrResp.result.asset
          const rs2 = await pdfServices.getContent({ asset: ocrAsset })
          const pdfChunks: Buffer[] = []
          const prs: any = rs2.readStream
          await new Promise<void>((resolve, reject) => {
            prs.on('data', (c: Buffer) => pdfChunks.push(c))
            prs.on('end', () => resolve())
            prs.on('error', (e: any) => reject(e))
          })
          const searchablePdf = Buffer.concat(pdfChunks)
          const rs3 = await bufferToReadable(searchablePdf)
          const asset2 = await pdfServices.upload({ readStream: rs3, mimeType: sdk.MimeType.PDF })
          const exportJob2 = new sdk.ExportPDFJob({ inputAsset: asset2, params: new sdk.ExportPDFParams({ targetFormat: sdk.ExportPDFTargetFormat.DOCX }) })
          const poll2 = await pdfServices.submit({ job: exportJob2 })
          const exportResp2 = await pdfServices.getJobResult({ pollingURL: poll2, resultType: sdk.ExportPDFResult })
          const docxAsset2 = exportResp2.result.asset
          const docxStream2 = await pdfServices.getContent({ asset: docxAsset2 })
          const dchunks: Buffer[] = []
          const drs: any = docxStream2.readStream
          await new Promise<void>((resolve, reject) => {
            drs.on('data', (c: Buffer) => dchunks.push(c))
            drs.on('end', () => resolve())
            drs.on('error', (e: any) => reject(e))
          })
          const docxBuffer2 = Buffer.concat(dchunks)
          const { value } = await mammoth.extractRawText({ buffer: docxBuffer2 })
          return { text: String(value || '').trim() }
        } catch (e2) {
          console.error('💥 Adobe OCR + export fallback failed:', e2)
          return null
        }
      }
    }

  console.log('📄 Document Summarization API called');
  
  try {
    const { 
      documentId, 
      summaryType = 'comprehensive',
      maxTokens = 2000,
      model = 'gpt-5'
    } = await req.json();
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    console.log('📝 Processing summarization request:', {
      documentId,
      summaryType,
      maxTokens,
      model
    });

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

    // Get document from database
    const { data: document, error: docError } = await supabase
      .from('reading_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (docError || !document) {
      console.error('❌ Document not found:', docError);
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    console.log('✅ Document found:', {
      title: document.title,
      textLength: document.text_length,
      processingStatus: document.processing_status
    });

    // If the stored text is empty or appears to be placeholder/boilerplate, attempt server-side re-extraction with Adobe OCR
    try {
      const sanitize = (text: string): string => {
        try {
          return String(text || '')
            .replace(/PDF\s+Document\s+Analysis[\s\S]*?questions\./gi, '')
            .replace(/Document\s+Analysis[\s\S]*?questions\./gi, '')
            .replace(/This\s+document\s+has\s+been\s+successfully\s+uploaded[\s\S]*?analysis\.?/gi, '')
            .replace(/(drag\s+and\s+drop|choose\s+files|click\s+to\s+upload|processing\s+status|file\s+upload|guidelines)/gi, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim()
        } catch { return String(text || '') }
      }
      const currentText = String(document.extracted_text || '')
      const sanitized = sanitize(currentText)
      const needsReextract = sanitized.length < 200
      if (needsReextract) {
        console.log('🔄 Re-extracting text for summarization (stored text too short)')
        const supabase = await createClient()
        // Prefer storage download via file_path if available
        let buffer: Buffer | null = null
        try {
          if (document.file_path) {
            const { data, error } = await supabase.storage
              .from('reading-documents')
              .download(document.file_path)
            if (!error && data) {
              const ab = await data.arrayBuffer()
              buffer = Buffer.from(ab)
            }
          }
        } catch {}

        // Fallback: try public_url
        if (!buffer && document.public_url) {
          try {
            const res = await fetch(document.public_url)
            if (res.ok) {
              const ab = await res.arrayBuffer()
              buffer = Buffer.from(ab)
            }
          } catch {}
        }

        if (buffer) {
          const extracted = await adobeExtractTextFromPdf(buffer)
          let freshText = extracted?.text || ''
          let pageCount = document.page_count || 1

          if (freshText && freshText.trim().length >= 50) {
            await supabase
              .from('reading_documents')
              .update({
                extracted_text: freshText,
                text_length: freshText.length,
                page_count: pageCount,
                processing_status: 'completed',
                updated_at: new Date().toISOString()
              })
              .eq('id', document.id)
            // Update in-memory object for downstream context
            document.extracted_text = freshText
            document.text_length = freshText.length
            document.page_count = pageCount
            document.processing_status = 'completed'
            console.log('✅ Re-extraction succeeded. New length:', freshText.length)
          } else {
            console.log('ℹ️ Re-extraction did not yield usable text')
          }
        }
      }
    } catch (reErr) {
      console.error('⚠️ Re-extraction attempt failed:', reErr)
    }

    // Get document context using the existing context API
    const contextResponse = await fetch(`${req.nextUrl.origin}/api/reading/get-context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization') || '',
        'Cookie': req.headers.get('Cookie') || ''
      },
      body: JSON.stringify({
        documentId,
        options: {
          maxTokens: 8000, // Use more tokens for summarization
          includeMetadata: true,
          strategy: 'smart'
        }
      })
    });

    if (!contextResponse.ok) {
      console.error('❌ Failed to get document context');
      return NextResponse.json(
        { error: 'Failed to retrieve document context' },
        { status: 500 }
      );
    }

    let contextData = await contextResponse.json();
    let { context } = contextData;

    console.log('✅ Context retrieved for summarization:', {
      chunks: context.chunks.length,
      totalTokens: context.totalTokens,
      strategy: context.metadata.strategy
    });

    // If context is still fallback/empty, try one more re-extraction using Adobe OCR and re-fetch context
    try {
      const isFallback = context?.metadata?.strategy === 'fallback' || (context?.totalTokens || 0) < 50
      const likelyPdf = String(document?.mime_type || document?.file_type || '').includes('pdf') || String(document?.original_filename || '').toLowerCase().endsWith('.pdf')
      if (isFallback && likelyPdf) {
        console.log('🔁 Fallback context detected; attempting OCR re-extract and re-fetch context')
        const supabase2 = await createClient()
        let buffer2: Buffer | null = null
        try {
          if (document.file_path) {
            const { data, error } = await supabase2.storage
              .from('reading-documents')
              .download(document.file_path)
            if (!error && data) {
              const ab = await data.arrayBuffer()
              buffer2 = Buffer.from(ab)
            }
          }
        } catch {}
        if (!buffer2 && document.public_url) {
          try {
            const res2 = await fetch(document.public_url)
            if (res2.ok) {
              const ab2 = await res2.arrayBuffer()
              buffer2 = Buffer.from(ab2)
            }
          } catch {}
        }
        if (buffer2) {
          const extracted2 = await adobeExtractTextFromPdf(buffer2)
          const fresh = extracted2?.text || ''
          const pages = document.page_count || 1
          if (fresh && fresh.length > 50) {
              await supabase2
                .from('reading_documents')
                .update({
                  extracted_text: fresh,
                  text_length: fresh.length,
                  page_count: pages,
                  processing_status: 'completed',
                  updated_at: new Date().toISOString()
                })
                .eq('id', document.id)
              // Re-fetch context
              const contextResponse2 = await fetch(`${req.nextUrl.origin}/api/reading/get-context`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': req.headers.get('Authorization') || '',
                  'Cookie': req.headers.get('Cookie') || ''
                },
                body: JSON.stringify({
                  documentId,
                  options: { maxTokens: 8000, includeMetadata: true, strategy: 'smart' }
                })
              })
              if (contextResponse2.ok) {
                contextData = await contextResponse2.json()
                context = contextData.context
                console.log('✅ Context re-fetched after OCR:', { chunks: context.chunks.length, totalTokens: context.totalTokens })
              }
          }
        }
      }
    } catch (ctxReErr) {
      console.error('⚠️ Context re-extraction safeguard failed:', ctxReErr)
    }

    // Build summarization prompt based on type
    const systemPrompt = buildSummarizationPrompt(summaryType, document);
    const userPrompt = buildSummarizationUserPrompt(context, summaryType);

    // Map model names to actual OpenAI models (same as search API)
    const modelMap: Record<string, string> = {
      'gpt-5': 'gpt-4o',
      'gpt-5-mini': 'gpt-4o-mini',
      'gpt-5-nano': 'gpt-3.5-turbo',
      'gpt-5-thinking-pro': 'gpt-4o'
    };

    const openaiModelName = modelMap[model] || 'gpt-4o';
    console.log('🤖 Using OpenAI model for summarization:', openaiModelName);

    // Call OpenAI API for summarization
    const completion = await openai.chat.completions.create({
      model: openaiModelName,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      max_completion_tokens: maxTokens,
      temperature: 0.3, // Lower temperature for more consistent summaries
    });

    const summary = completion.choices[0]?.message?.content || 'No summary generated';
    
    console.log('✅ Summary generated:', {
      summaryLength: summary.length,
      tokensUsed: completion.usage?.total_tokens,
      model: openaiModelName
    });

    // Save summary to database
    try {
      const { error: saveError } = await supabase
        .from('reading_documents')
        .update({
          summary: summary,
          summary_type: summaryType,
          summary_updated_at: new Date().toISOString()
        })
        .eq('id', documentId);
      if (saveError) {
        const code = (saveError as any)?.code || ''
        if (code === 'PGRST204') {
          console.warn('ℹ️ Summary columns not present; skipping save')
        } else {
          console.error('❌ Error saving summary:', saveError);
        }
      } else {
        console.log('✅ Summary saved to database');
      }
    } catch (e) {
      console.warn('ℹ️ Skipped saving summary due to schema mismatch')
    }

    return NextResponse.json({
      success: true,
      summary,
      metadata: {
        documentId: document.id,
        title: document.title,
        summaryType,
        model: openaiModelName,
        tokensUsed: completion.usage?.total_tokens,
        contextChunks: context.chunks.length,
        originalTextLength: document.text_length
      }
    });

  } catch (error: any) {
    console.error('💥 Unexpected error in document summarization API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

function buildSummarizationPrompt(summaryType: string, document: any): string {
  const basePrompt = `You are an expert document summarization assistant. You will receive a document and create a high-quality summary based on the specified type.

Document Information:
- Title: ${document.title}
- Text Length: ${document.text_length} characters
- Pages: ${document.pageCount}
- Processing Status: ${document.processing_status}

Instructions:
1. Create a comprehensive, accurate summary based on the document content
2. Maintain the original meaning and key information
3. Use clear, professional language
4. Structure the summary logically
5. Include important details, facts, and conclusions
6. If the document has limited text extraction, mention this limitation`;

  switch (summaryType) {
    case 'brief':
      return basePrompt + `

SUMMARY TYPE: BRIEF
Create a concise 2-3 paragraph summary that captures the main points and key takeaways. Focus on the most important information only.`;

    case 'detailed':
      return basePrompt + `

SUMMARY TYPE: DETAILED
Create a comprehensive summary that covers all major sections and topics. Include supporting details, examples, and conclusions. Structure with clear headings if appropriate.`;

    case 'key-points':
      return basePrompt + `

SUMMARY TYPE: KEY POINTS
Create a bullet-point summary highlighting the main concepts, findings, and important details. Use clear, actionable bullet points.`;

    case 'academic':
      return basePrompt + `

SUMMARY TYPE: ACADEMIC
Create a formal academic summary suitable for research or study purposes. Include methodology, findings, conclusions, and implications. Use academic language and structure.`;

    case 'study-guide':
      return basePrompt + `

SUMMARY TYPE: STUDY GUIDE
Create a study-friendly summary with clear sections, key concepts, important terms, and potential exam topics. Make it easy to review and memorize.`;

    default: // comprehensive
      return basePrompt + `

SUMMARY TYPE: COMPREHENSIVE
Create a well-structured summary that covers all aspects of the document. Include an introduction, main content sections, and conclusion. Balance detail with readability.`;
  }
}

function buildSummarizationUserPrompt(context: any, summaryType: string): string {
  let prompt = `Please create a ${summaryType} summary of the following document:\n\n`;
  
  if (context.metadata.strategy === 'fallback') {
    prompt += `IMPORTANT: This document appears to be image-based or has limited text extraction. The available text is: "${context.chunks[0]?.content}". Please create a summary based on the available information and mention the limitation.`;
  } else {
    prompt += `Document Content:\n`;
    
    context.chunks.forEach((chunk: any, index: number) => {
      prompt += `[Section ${index + 1}]\n${chunk.content}\n\n`;
    });
  }

  prompt += `\nPlease provide a well-structured summary that captures the essential information from this document.`;

  return prompt;
}



