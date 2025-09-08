import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
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

    const contextData = await contextResponse.json();
    const { context } = contextData;

    console.log('✅ Context retrieved for summarization:', {
      chunks: context.chunks.length,
      totalTokens: context.totalTokens,
      strategy: context.metadata.strategy
    });

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
    const { error: saveError } = await supabase
      .from('reading_documents')
      .update({
        summary: summary,
        summary_type: summaryType,
        summary_updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (saveError) {
      console.error('❌ Error saving summary:', saveError);
      // Don't fail the request, just log the error
    } else {
      console.log('✅ Summary saved to database');
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


