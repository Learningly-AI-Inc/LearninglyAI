import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  // Build-time safety check - return early if we're in a build environment without API keys
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'AI API keys not configured' },
      { status: 500 }
    );
  }

  // During build time, return a placeholder response to prevent build failures
  if (process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'API keys not available during build' },
      { status: 503 }
    );
  }

  try {
    // Verify authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, conversationId, modelName = 'gpt-3.5-turbo' } = body;

    if (!message || !conversationId) {
      return NextResponse.json(
        { error: 'Message and conversationId are required' },
        { status: 400 }
      );
    }

    // Verify conversation belongs to user
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 403 }
      );
    }

    // Get conversation history for context
    const { data: messages, error: msgError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) {
      return NextResponse.json(
        { error: 'Failed to fetch conversation history' },
        { status: 500 }
      );
    }

    // Prepare conversation context for AI
    const conversationHistory = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content
    }));

    // Add the new user message
    conversationHistory.push({ role: 'user' as const, content: message });

    let aiResponse: string;
    let tokensUsed: number = 0;
    let cost: number = 0;

    try {
      if (modelName.startsWith('gpt-')) {
        // Use OpenAI
        const completion = await openai.chat.completions.create({
          model: modelName,
          messages: conversationHistory,
          max_tokens: 1000,
          temperature: 0.7,
        });

        aiResponse = completion.choices[0]?.message?.content || 'No response generated';
        tokensUsed = completion.usage?.total_tokens || 0;
        
        // Calculate cost (approximate)
        const costPer1kTokens = modelName === 'gpt-4' ? 0.03 : 0.002;
        cost = (tokensUsed / 1000) * costPer1kTokens;

      } else if (modelName.startsWith('gemini-')) {
        // Gemini API suspended - fall back to OpenAI
        const fallbackModel = 'gpt-4o-mini';
        const completion = await openai.chat.completions.create({
          model: fallbackModel,
          messages: conversationHistory,
          max_tokens: 1000,
          temperature: 0.7,
        });

        aiResponse = completion.choices[0]?.message?.content || 'No response generated';
        tokensUsed = completion.usage?.total_tokens || 0;
        cost = (tokensUsed / 1000) * 0.0005;

      } else {
        throw new Error(`Unsupported model: ${modelName}`);
      }

    } catch (aiError) {
      console.error('AI service error:', aiError);
      return NextResponse.json(
        { error: 'Failed to generate AI response' },
        { status: 500 }
      );
    }

    // Save the user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
        content_type: 'text',
        metadata: { model_name: modelName }
      })
      .select()
      .single();

    if (userMsgError) {
      console.error('Failed to save user message:', userMsgError);
    }

    // Save the AI response
    const { data: aiMessage, error: aiMsgError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: aiResponse,
        content_type: 'text',
        metadata: { 
          model_name: modelName,
          tokens_used: tokensUsed,
          cost: cost
        }
      })
      .select()
      .single();

    if (aiMsgError) {
      console.error('Failed to save AI message:', aiMsgError);
    }

    // Log usage for analytics
    try {
      await supabase
        .from('chat_usage')
        .insert({
          user_id: user.id,
          conversation_id: conversationId,
          tokens_used: tokensUsed,
          model_name: modelName,
          cost: cost
        });
    } catch (usageError) {
      console.error('Failed to log usage:', usageError);
    }

    // Update conversation timestamp
    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return NextResponse.json({
      success: true,
      response: aiResponse,
      messageId: aiMessage?.id,
      tokensUsed,
      cost
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Get messages for the conversation
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages });

  } catch (error) {
    console.error('Chat GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
