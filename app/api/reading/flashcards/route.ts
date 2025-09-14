import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  console.log('🃏 Reading Flashcards API called');
  
  try {
    const { 
      documentId, 
      count = 8,
      difficulty = 'medium',
      focus = 'comprehensive'
    } = await req.json();
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    console.log('🃏 Processing flashcard request:', {
      documentId,
      count,
      difficulty,
      focus
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
          maxTokens: 6000, // Use fewer tokens for flashcards
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

    console.log('✅ Context retrieved for flashcards:', {
      chunks: context.chunks.length,
      totalTokens: context.totalTokens,
      strategy: context.metadata.strategy
    });

    // Build flashcard generation prompt
    const systemPrompt = `You are an expert educational content creator specializing in creating effective flashcards for studying.

Document Information:
- Title: ${document.title}
- Text Length: ${document.text_length} characters
- Pages: ${document.page_count}
- Processing Status: ${document.processing_status}

Instructions:
1. Create ${count} high-quality flashcards based on the document content
2. Focus on: ${focus}
3. Difficulty level: ${difficulty}
4. Each flashcard should have a clear, concise question on the front and a comprehensive answer on the back
5. Cover the most important concepts, definitions, facts, and key information from the document
6. Make questions that test understanding, not just memorization
7. Ensure answers are accurate and based only on the document content
8. If the document has limited text extraction, create flashcards based on available information and mention limitations

Return your response as a JSON object with this exact structure:
{
  "cards": [
    {
      "id": "card_1",
      "front": "Question or term here",
      "back": "Answer or definition here",
      "category": "Topic category",
      "difficulty": "${difficulty}"
    }
  ]
}`;

    const userPrompt = `Please create ${count} flashcards from the following document content:

Document Content:
${context.chunks.map((chunk: any, index: number) => `[Section ${index + 1}]\n${chunk.content}`).join('\n\n')}

Focus on: ${focus}
Difficulty: ${difficulty}

Create flashcards that will help students effectively study and understand this document.`;

    // Map model names to actual OpenAI models
    const modelMap: Record<string, string> = {
      'gpt-5': 'gpt-4o',
      'gpt-5-mini': 'gpt-4o-mini',
      'gpt-5-nano': 'gpt-3.5-turbo',
      'gpt-5-thinking-pro': 'gpt-4o'
    };

    const openaiModelName = modelMap['gpt-5'] || 'gpt-4o';
    console.log('🤖 Using OpenAI model for flashcards:', openaiModelName);

    // Call OpenAI API for flashcard generation
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
      response_format: { type: "json_object" },
      max_completion_tokens: 2000,
      temperature: 0.7, // Higher temperature for more creative flashcards
    });

    const responseText = completion.choices[0]?.message?.content || '{"cards": []}';
    let flashcards;
    
    try {
      flashcards = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse flashcard JSON:', parseError);
      return NextResponse.json(
        { error: 'Failed to generate valid flashcards' },
        { status: 500 }
      );
    }
    
    console.log('✅ Flashcards generated:', {
      cardCount: flashcards.cards?.length || 0,
      tokensUsed: completion.usage?.total_tokens,
      model: openaiModelName
    });

    // Save flashcards to database (optional - for future features)
    try {
      const { error: saveError } = await supabase
        .from('exam_prep_flashcards')
        .insert({
          document_id: documentId,
          user_id: user.id,
          flashcards: flashcards,
          generation_settings: {
            count,
            difficulty,
            focus
          },
          created_at: new Date().toISOString()
        });

      if (saveError) {
        console.error('❌ Error saving flashcards:', saveError);
        // Don't fail the request, just log the error
      } else {
        console.log('✅ Flashcards saved to database');
      }
    } catch (saveError) {
      console.error('❌ Error saving flashcards:', saveError);
      // Don't fail the request
    }

    return NextResponse.json({
      success: true,
      flashcards: flashcards.cards || [],
      metadata: {
        documentId: document.id,
        title: document.title,
        count: flashcards.cards?.length || 0,
        difficulty,
        focus,
        model: openaiModelName,
        tokensUsed: completion.usage?.total_tokens,
        contextChunks: context.chunks.length,
        originalTextLength: document.text_length
      }
    });

  } catch (error: any) {
    console.error('💥 Unexpected error in flashcard generation API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
