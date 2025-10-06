import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

interface ContextOptions {
  maxTokens?: number;
  includeMetadata?: boolean;
  chunkSize?: number;
  overlap?: number;
  strategy?: 'smart' | 'sequential' | 'semantic';
}

export async function POST(req: NextRequest) {
  console.log('📚 Get context API called');
  
  try {
    const { documentId, options = {} }: { 
      documentId: string; 
      options?: ContextOptions 
    } = await req.json();
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    console.log('📄 Getting context for document:', documentId);

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
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .eq('document_type', 'reading')
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

    // On-demand re-extraction if text is missing or processing failed
    let updatedExtractedText: string | null = null
    let updatedPageCount: number | null = null
    if (!document.extracted_text || String(document.extracted_text).trim().length === 0 || document.processing_status !== 'completed') {
      console.log('🛠️ Attempting on-demand text re-extraction for document:', document.id)

      // Helper to download the original file
      async function downloadOriginal(): Promise<Buffer | null> {
        try {
          if (document.file_path) {
            const { data: blob } = await supabase.storage
              .from('reading-documents')
              .download(document.file_path)
            if (blob) {
              const ab = await blob.arrayBuffer()
              return Buffer.from(ab)
            }
          }
        } catch {}
        try {
          if (document.public_url) {
            const res = await fetch(document.public_url)
            if (res.ok) {
              const ab = await res.arrayBuffer()
              return Buffer.from(ab)
            }
          }
        } catch {}
        return null
      }

      // Helper: run OCR via Adobe Services if credentials are available
      async function runAdobeOcrIfAvailable(pdfBuffer: Buffer): Promise<{ searchablePdf?: Buffer; note?: string } | null> {
        try {
          const sdk: any = await import('@adobe/pdfservices-node-sdk')
          const path = await import('path')
          const fs = await import('node:fs/promises')
          const clientId = process.env.PDF_SERVICES_CLIENT_ID || process.env.ADOBE_CLIENT_ID
          const clientSecret = process.env.PDF_SERVICES_CLIENT_SECRET || process.env.ADOBE_CLIENT_SECRET
          let resolvedClientId = clientId
          let resolvedClientSecret = clientSecret
          if (!resolvedClientId || !resolvedClientSecret) {
            try {
              const credPath = path.join(process.cwd(), 'pdfservices-api-credentials.json')
              const raw = await fs.readFile(credPath, 'utf-8').catch(() => '')
              if (raw) {
                const json = JSON.parse(raw)
                resolvedClientId = json?.client_id || json?.clientId || resolvedClientId
                resolvedClientSecret = json?.client_secret || json?.clientSecret || resolvedClientSecret
              }
            } catch {}
          }
          if (!resolvedClientId || !resolvedClientSecret) {
            return { note: 'OCR skipped: Adobe credentials missing' }
          }
          const credentials = new (sdk as any).ServicePrincipalCredentials({ clientId: resolvedClientId, clientSecret: resolvedClientSecret })
          const pdfServices = new (sdk as any).PDFServices({ credentials })
          const streamMod: any = await import('node:stream').catch(() => import('stream'))
          const ReadableAny = (streamMod as any).Readable || (streamMod as any).default?.Readable
          const rs = ReadableAny?.from ? ReadableAny.from(pdfBuffer) : new ReadableAny({
            read() {
              // @ts-ignore
              this.push(pdfBuffer)
              // @ts-ignore
              this.push(null)
            }
          })
          const inputAsset = await pdfServices.upload({ readStream: rs, mimeType: (sdk as any).MimeType.PDF })
          const params = new (sdk as any).OCRParams({ ocrType: (sdk as any).OCRType.SEARCHABLE_IMAGE_EXACT })
          const job = new (sdk as any).OCRJob({ inputAsset, params })
          const pollingURL = await pdfServices.submit({ job })
          const resp = await pdfServices.getJobResult({ pollingURL, resultType: (sdk as any).OCRResult })
          const resultAsset = resp.result.asset
          const streamAsset = await pdfServices.getContent({ asset: resultAsset })
          const chunks: Buffer[] = []
          const rs2: any = streamAsset.readStream
          await new Promise<void>((resolve, reject) => {
            rs2.on('data', (c: Buffer) => chunks.push(c))
            rs2.on('end', () => resolve())
            rs2.on('error', (e: any) => reject(e))
          })
          return { searchablePdf: Buffer.concat(chunks), note: 'OCR used: Adobe PDF Services' }
        } catch (e) {
          console.error('⚠️ OCR attempt failed (get-context):', e)
          return { note: 'OCR failed' }
        }
      }

      // Helper: Export PDF -> DOCX using Adobe Services, then extract with mammoth
      async function adobeExportPdfToDocxExtractText(pdfBuffer: Buffer): Promise<string> {
        try {
          const sdk: any = await import('@adobe/pdfservices-node-sdk')
          const mammoth = await import('mammoth')
          const clientId = process.env.PDF_SERVICES_CLIENT_ID || process.env.ADOBE_CLIENT_ID
          const clientSecret = process.env.PDF_SERVICES_CLIENT_SECRET || process.env.ADOBE_CLIENT_SECRET
          if (!clientId || !clientSecret) return ''
          // Convert buffer to readable stream
          const streamMod: any = await import('node:stream').catch(() => import('stream'))
          const ReadableAny = (streamMod as any).Readable || (streamMod as any).default?.Readable
          const rs = ReadableAny?.from ? ReadableAny.from(pdfBuffer) : new ReadableAny({
            read() {
              // @ts-ignore
              this.push(pdfBuffer)
              // @ts-ignore
              this.push(null)
            }
          })
          const credentials = new (sdk as any).ServicePrincipalCredentials({ clientId, clientSecret })
          const pdfServices = new (sdk as any).PDFServices({ credentials })
          const asset = await pdfServices.upload({ readStream: rs, mimeType: (sdk as any).MimeType.PDF })
          const params = new (sdk as any).ExportPDFParams({ targetFormat: (sdk as any).ExportPDFTargetFormat.DOCX, ocrLocale: (sdk as any).ExportOCRLocale.EN_US })
          const job = new (sdk as any).ExportPDFJob({ inputAsset: asset, params })
          const poll = await pdfServices.submit({ job })
          const resp = await pdfServices.getJobResult({ pollingURL: poll, resultType: (sdk as any).ExportPDFResult })
          const docxAsset = resp.result.asset
          const streamAsset = await pdfServices.getContent({ asset: docxAsset })
          const chunks: Buffer[] = []
          const rs2: any = streamAsset.readStream
          await new Promise<void>((resolve, reject) => {
            rs2.on('data', (c: Buffer) => chunks.push(c))
            rs2.on('end', () => resolve())
            rs2.on('error', (e: any) => reject(e))
          })
          const docxBuffer = Buffer.concat(chunks)
          const { value } = await mammoth.extractRawText({ buffer: docxBuffer })
          return String(value || '').trim()
        } catch (e) {
          console.error('⚠️ Adobe export to DOCX failed (get-context):', e)
          return ''
        }
      }

      try {
        const buf = await downloadOriginal()
        if (buf) {
          const ext = String(document.file_type || document.original_filename || '').toLowerCase()
          if (ext.includes('pdf')) {
            // Prefer Adobe Export -> DOCX to avoid pdf-parse import issues
            let text = await adobeExportPdfToDocxExtractText(Buffer.from(buf))
            if (!text) {
              const ocr = await runAdobeOcrIfAvailable(Buffer.from(buf))
              if (ocr?.searchablePdf) {
                // Try export again after OCR
                text = await adobeExportPdfToDocxExtractText(ocr.searchablePdf)
              }
            }
            if (text) {
              updatedExtractedText = text
              updatedPageCount = Math.max(1, Math.ceil(text.length / 2000))
            }
          } else if (ext.includes('docx')) {
            const mammoth = await import('mammoth')
            const result = await mammoth.extractRawText({ buffer: Buffer.from(buf) })
            const text = String(result.value || '').trim()
            if (text) {
              updatedExtractedText = text
              updatedPageCount = Math.max(1, Math.ceil(text.length / 2000))
            }
          }
        }
      } catch (reErr) {
        console.error('❌ Re-extraction failed in get-context:', reErr)
      }

      // If we recovered text, persist it so subsequent calls are fast
      if (updatedExtractedText && updatedExtractedText.length > 0) {
        try {
          await supabase
            .from('documents')
            .update({
              extracted_text: updatedExtractedText,
              text_length: updatedExtractedText.length,
              processing_status: 'completed',
              page_count: updatedPageCount || document.page_count,
              updated_at: new Date().toISOString()
            })
            .eq('id', document.id)
            .eq('user_id', user.id)
            .eq('document_type', 'reading')
        } catch {}
        // Reflect in-memory
        document.extracted_text = updatedExtractedText
        document.text_length = updatedExtractedText.length
        document.processing_status = 'completed'
        if (updatedPageCount) document.page_count = updatedPageCount
      }
    }

    // Process context based on strategy
    const context = await processContext(document, options);
    
    console.log('✅ Context processed:', {
      strategy: options.strategy || 'smart',
      chunks: context.chunks.length,
      totalTokens: context.totalTokens,
      metadata: context.metadata
    });

    return NextResponse.json({
      success: true,
      context,
      document: {
        id: document.id,
        title: document.title,
        textLength: document.text_length,
        pageCount: document.page_count
      }
    });

  } catch (error: any) {
    console.error('💥 Unexpected error in get context API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

async function processContext(document: any, options: ContextOptions) {
  const {
    maxTokens = 8000,
    includeMetadata = true,
    chunkSize = 1000,
    overlap = 200,
    strategy = 'smart'
  } = options;

  // Sanitize to remove any accidental boilerplate/placeholder UI text that might have been stored
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
  const extractedText = sanitize(document.extracted_text || '');
  
  // If text is too short or is a fallback message, return minimal context
  if (extractedText.length < 500 || extractedText.includes('PDF processing encountered an issue')) {
    return {
      chunks: [{
        content: extractedText,
        startIndex: 0,
        endIndex: extractedText.length,
        tokens: Math.ceil(extractedText.length / 4), // Rough token estimation
        metadata: {
          isFallback: true,
          note: 'Limited text extraction - document may be image-based'
        }
      }],
      totalTokens: Math.ceil(extractedText.length / 4),
      metadata: {
        strategy: 'fallback',
        originalLength: extractedText.length,
        processingNotes: document.processing_notes || []
      }
    };
  }

  // Smart chunking strategy
  if (strategy === 'smart') {
    return smartChunking(extractedText, maxTokens, chunkSize, overlap, includeMetadata);
  }
  
  // Sequential chunking
  if (strategy === 'sequential') {
    return sequentialChunking(extractedText, maxTokens, chunkSize, overlap);
  }

  // Default to smart chunking
  return smartChunking(extractedText, maxTokens, chunkSize, overlap, includeMetadata);
}

function smartChunking(text: string, maxTokens: number, chunkSize: number, overlap: number, includeMetadata: boolean) {
  const chunks = [];
  let currentIndex = 0;
  let totalTokens = 0;

  // Split text into paragraphs for better context preservation
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  let currentChunk = '';
  let chunkStartIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    const paragraphTokens = Math.ceil(paragraph.length / 4);
    
    // If adding this paragraph would exceed chunk size, finalize current chunk
    if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        startIndex: chunkStartIndex,
        endIndex: chunkStartIndex + currentChunk.length,
        tokens: Math.ceil(currentChunk.length / 4),
        metadata: includeMetadata ? {
          type: 'paragraph',
          paragraphCount: currentChunk.split(/\n\s*\n/).length
        } : undefined
      });
      
      totalTokens += Math.ceil(currentChunk.length / 4);
      
      // Start new chunk with overlap
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + '\n\n' + paragraph;
      chunkStartIndex = chunkStartIndex + currentChunk.length - overlap - paragraph.length;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  // Add final chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      startIndex: chunkStartIndex,
      endIndex: chunkStartIndex + currentChunk.length,
      tokens: Math.ceil(currentChunk.length / 4),
      metadata: includeMetadata ? {
        type: 'paragraph',
        paragraphCount: currentChunk.split(/\n\s*\n/).length
      } : undefined
    });
    totalTokens += Math.ceil(currentChunk.length / 4);
  }

  return {
    chunks,
    totalTokens,
    metadata: {
      strategy: 'smart',
      originalLength: text.length,
      chunkCount: chunks.length,
      averageChunkSize: Math.round(text.length / chunks.length)
    }
  };
}

function sequentialChunking(text: string, maxTokens: number, chunkSize: number, overlap: number) {
  const chunks = [];
  let currentIndex = 0;
  let totalTokens = 0;

  while (currentIndex < text.length) {
    const endIndex = Math.min(currentIndex + chunkSize, text.length);
    let chunkText = text.slice(currentIndex, endIndex);
    
    // Try to end at a sentence boundary
    if (endIndex < text.length) {
      const lastSentenceEnd = chunkText.lastIndexOf('.');
      if (lastSentenceEnd > chunkSize * 0.7) { // Only if we don't lose too much
        chunkText = chunkText.slice(0, lastSentenceEnd + 1);
      }
    }

    chunks.push({
      content: chunkText.trim(),
      startIndex: currentIndex,
      endIndex: currentIndex + chunkText.length,
      tokens: Math.ceil(chunkText.length / 4)
    });

    totalTokens += Math.ceil(chunkText.length / 4);
    currentIndex += chunkText.length - overlap; // Overlap for context continuity
  }

  return {
    chunks,
    totalTokens,
    metadata: {
      strategy: 'sequential',
      originalLength: text.length,
      chunkCount: chunks.length
    }
  };
}



