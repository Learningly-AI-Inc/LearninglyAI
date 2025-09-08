import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  console.log('💬 Chat with context API called');
  
  try {
    const { 
      message, 
      documentId, 
      conversationHistory = [],
      maxContextTokens = 6000,
      includeMetadata = true
    } = await req.json();
    
    if (!message || !documentId) {
      return NextResponse.json(
        { error: 'Message and document ID are required' },
        { status: 400 }
      );
    }

    console.log('📝 Processing chat request:', {
      messageLength: message.length,
      documentId,
      historyLength: conversationHistory.length
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

    // Get document context
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
          maxTokens: maxContextTokens,
          includeMetadata,
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
    const { context, document } = contextData;

    console.log('✅ Context retrieved:', {
      chunks: context.chunks.length,
      totalTokens: context.totalTokens,
      documentTitle: document.title
    });

    // Build context-aware prompt
    const systemPrompt = buildSystemPrompt(document, context);
    const userPrompt = buildUserPrompt(message, context, conversationHistory);

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    if (!openaiResponse.ok) {
      console.error('❌ OpenAI API error:', openaiResponse.statusText);
      return NextResponse.json(
        { error: 'Failed to get AI response' },
        { status: 500 }
      );
    }

    const aiData = await openaiResponse.json();
    const aiResponse = aiData.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    console.log('✅ AI response generated:', {
      responseLength: aiResponse.length,
      tokensUsed: aiData.usage?.total_tokens
    });

    return NextResponse.json({
      success: true,
      response: aiResponse,
      context: {
        chunksUsed: context.chunks.length,
        totalTokens: context.totalTokens,
        strategy: context.metadata.strategy
      },
      document: {
        id: document.id,
        title: document.title
      }
    });

  } catch (error: any) {
    console.error('💥 Unexpected error in chat with context API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(document: any, context: any) {
  const basePrompt = `You are an AI assistant helping a student analyze and understand their document. You have access to the full text content of the document and should provide helpful, accurate responses based on the content.

Document Information:
- Title: ${document.title}
- Text Length: ${document.textLength} characters
- Pages: ${document.pageCount}
- Context Strategy: ${context.metadata.strategy}

Instructions:
1. Answer questions based on the document content provided
2. If the document has limited text extraction, mention this limitation
3. Provide specific references to document sections when possible
4. Help with summarization, analysis, and study questions
5. Be concise but comprehensive in your responses`;

  if (context.metadata.strategy === 'fallback') {
    return basePrompt + `

IMPORTANT: This document appears to be image-based or has limited text extraction. The available text is: "${context.chunks[0]?.content}". Please inform the user about this limitation and suggest they can still ask questions about what they can see in the document visually.`;
  }

  return basePrompt;
}

function buildUserPrompt(message: string, context: any, conversationHistory: any[]) {
  let prompt = `User Question: ${message}\n\n`;

  if (conversationHistory.length > 0) {
    prompt += `Previous conversation:\n`;
    conversationHistory.slice(-3).forEach((msg: any) => {
      prompt += `${msg.role}: ${msg.content}\n`;
    });
    prompt += `\n`;
  }

  prompt += `Document Content:\n`;
  
  context.chunks.forEach((chunk: any, index: number) => {
    prompt += `[Section ${index + 1}]\n${chunk.content}\n\n`;
  });

  prompt += `Please answer the user's question based on the document content above. If you reference specific parts of the document, mention which section you're referring to.`;

  return prompt;
}


