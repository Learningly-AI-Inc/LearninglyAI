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



