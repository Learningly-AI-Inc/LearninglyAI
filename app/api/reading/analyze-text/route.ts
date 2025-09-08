import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const { selectedText, prompt, pageNumber, documentTitle, actionType } = body;

    if (!selectedText || !prompt) {
      return NextResponse.json(
        { error: 'Selected text and prompt are required' },
        { status: 400 }
      );
    }

    console.log('🤖 Analyzing text with AI:', { actionType, textLength: selectedText.length });

    // Prepare the AI prompt based on action type
    let systemPrompt = '';
    let userPrompt = '';

    switch (actionType) {
      case 'explain':
        systemPrompt = `You are an expert tutor who explains complex concepts in simple, clear terms. Your goal is to help students understand the material by breaking it down into digestible parts.`;
        userPrompt = `Please explain the following text in simple, clear terms. Break down any complex concepts and provide examples where helpful:

"${selectedText}"

Provide a clear, educational explanation that would help a student understand this content.`;
        break;

      case 'summarize':
        systemPrompt = `You are an expert at creating concise, accurate summaries that capture the key points and main ideas of any text.`;
        userPrompt = `Please summarize the key points from the following text in a clear, organized manner:

"${selectedText}"

Focus on the main ideas and important details. Keep it concise but comprehensive.`;
        break;

      case 'elaborate':
        systemPrompt = `You are a knowledgeable assistant who provides detailed context and background information to help deepen understanding.`;
        userPrompt = `Please provide more detailed information and context about the following text. Include relevant background, related concepts, and additional insights:

"${selectedText}"

Help expand the reader's understanding with useful context and related information.`;
        break;

      case 'question':
      case 'custom':
        systemPrompt = `You are a helpful AI assistant who provides accurate, thoughtful answers based on the given text and context.`;
        userPrompt = `Based on the following text: "${selectedText}"

${prompt}

Please provide a thoughtful, accurate response based on the given text and your knowledge.`;
        break;

      default:
        systemPrompt = `You are a helpful AI assistant who analyzes text and provides insightful responses.`;
        userPrompt = `${prompt}

"${selectedText}"`;
    }

    // Add document context if available
    if (documentTitle) {
      userPrompt += `\n\nNote: This text is from "${documentTitle}"${pageNumber ? ` on page ${pageNumber}` : ''}.`;
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
      
      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      const text = response.text();

      // Log the interaction for analytics
      await supabase
        .from('ai_model_logs')
        .insert({
          user_id: user.id,
          model_name: 'gemini-pro',
          request_payload: {
            action_type: actionType,
            text_length: selectedText.length,
            document_title: documentTitle,
            page_number: pageNumber
          },
          response_payload: {
            response_length: text.length,
            success: true
          }
        });

      console.log('✅ AI analysis completed:', { 
        actionType, 
        responseLength: text.length 
      });

      return NextResponse.json({
        success: true,
        response: text,
        actionType,
        metadata: {
          model: 'gemini-pro',
          timestamp: new Date().toISOString(),
          documentTitle,
          pageNumber
        }
      });

    } catch (aiError: any) {
      console.error('❌ AI generation error:', aiError);
      
      // Log the error
      await supabase
        .from('ai_model_logs')
        .insert({
          user_id: user.id,
          model_name: 'gemini-pro',
          request_payload: {
            action_type: actionType,
            text_length: selectedText.length,
            error: aiError.message
          },
          response_payload: {
            success: false,
            error: aiError.message
          }
        });

      return NextResponse.json(
        { 
          error: 'Failed to generate AI response',
          details: aiError.message 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('💥 Unexpected error in analyze-text API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

