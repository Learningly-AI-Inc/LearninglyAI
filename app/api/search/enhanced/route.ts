import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { TokenManager } from '@/lib/token-manager'

// Initialize AI clients
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '')
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('🚀 [ENHANCED SEARCH API] POST request started')

  try {
    const { message, conversationId, model = 'gemini-2.5-flash' } = await request.json()
    
    console.log('🚀 [ENHANCED SEARCH API] Request details:', {
      message: message?.substring(0, 50) + (message?.length > 50 ? '...' : ''),
      conversationId,
      model,
      hasMessage: !!message
    })

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('🚀 [ENHANCED SEARCH API] Authentication error:', authError)
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }
    
    const userId = user.id
    console.log('🚀 [ENHANCED SEARCH API] Authenticated user:', {
      userId,
      email: user.email
    })

    // Verify user exists in database
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId)
      .single()
    
    if (userError) {
      console.error('🚀 [ENHANCED SEARCH API] User not found:', userError)
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      )
    }

    // Get or create conversation
    let currentConversationId = conversationId
    if (!currentConversationId) {
      console.log('🚀 [ENHANCED SEARCH API] Creating new conversation...')
      const { data: newConversation, error: convError } = await supabase
        .from('search_conversations')
        .insert({
          user_id: userId,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          model_used: model
        })
        .select()
        .single()

      if (convError) {
        console.error('🚀 [ENHANCED SEARCH API] Error creating conversation:', convError)
        return NextResponse.json(
          { error: 'Failed to create conversation' },
          { status: 500 }
        )
      }
      currentConversationId = newConversation.id
    }

    // Get conversation history for context
    console.log('🚀 [ENHANCED SEARCH API] Getting conversation context...')
    const { data: existingMessages, error: messagesError } = await supabase
      .from('search_messages')
      .select('*')
      .eq('conversation_id', currentConversationId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('🚀 [ENHANCED SEARCH API] Error fetching messages:', messagesError)
    }

    // Get user's uploaded documents for additional context
    const { data: userContent } = await supabase
      .from('user_content')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')

    // Prepare system prompt with user personalization
    const systemPrompt = buildSystemPrompt(userRecord, userContent || [])

    // Build conversation context
    const messages = [
      { role: 'system', content: systemPrompt }
    ]

    // Add recent conversation history (last 10 messages to manage context)
    const recentMessages = (existingMessages || []).slice(-10)
    for (const msg of recentMessages) {
      messages.push({
        role: msg.role,
        content: msg.content
      })
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: message
    })

    // Check token limits and optimize if needed
    const totalTokens = TokenManager.countMessageTokens(messages)
    console.log('🚀 [ENHANCED SEARCH API] Token stats:', {
      totalTokens,
      messageCount: messages.length
    })

    // Generate AI response
    console.log('🚀 [ENHANCED SEARCH API] Generating AI response...')
    const aiResponse = await generateAIResponse(messages, model)
    
    // Calculate response tokens
    const responseTokens = TokenManager.estimateTokens(aiResponse)

    // Save user message
    const { error: userMsgError } = await supabase
      .from('search_messages')
      .insert({
        conversation_id: currentConversationId,
        role: 'user',
        content: message,
        model_used: model,
        tokens_used: TokenManager.estimateTokens(message)
      })

    if (userMsgError) {
      console.error('🚀 [ENHANCED SEARCH API] Error saving user message:', userMsgError)
    }

    // Save AI response
    const { error: aiMsgError } = await supabase
      .from('search_messages')
      .insert({
        conversation_id: currentConversationId,
        role: 'assistant',
        content: aiResponse,
        sources: userContent?.map(c => c.content_url.split('/').pop() || 'document') || [],
        model_used: model,
        tokens_used: responseTokens
      })

    if (aiMsgError) {
      console.error('🚀 [ENHANCED SEARCH API] Error saving AI response:', aiMsgError)
    }

    // Update conversation timestamp
    await supabase
      .from('search_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentConversationId)

    // Log AI model usage
    await supabase
      .from('ai_model_logs')
      .insert({
        user_id: userId,
        model_name: model,
        request_payload: { 
          message, 
          conversationId: currentConversationId,
          totalTokens 
        },
        response_payload: { 
          response: aiResponse, 
          tokensUsed: totalTokens + responseTokens,
          sources: userContent?.map(c => c.content_url.split('/').pop() || 'document') || []
        }
      })

    const responseTime = Date.now() - startTime
    console.log('🚀 [ENHANCED SEARCH API] Request completed successfully:', {
      responseTime: `${responseTime}ms`,
      responseLength: aiResponse.length,
      totalTokens: totalTokens + responseTokens,
      conversationId: currentConversationId
    })

    return NextResponse.json({
      response: aiResponse,
      sources: userContent?.map(c => c.content_url.split('/').pop() || 'document') || [],
      conversationId: currentConversationId,
      tokenUsage: {
        totalTokens: totalTokens + responseTokens,
        estimatedCost: TokenManager.calculateCost(totalTokens, responseTokens, model)
      }
    })

  } catch (error: any) {
    const responseTime = Date.now() - startTime
    console.error('🚀 [ENHANCED SEARCH API] Error:', {
      error: error.message,
      stack: error.stack,
      responseTime: `${responseTime}ms`
    })
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Build personalized system prompt
 */
function buildSystemPrompt(userRecord: any, userContent: any[]): string {
  const userName = userRecord.full_name || 'User'
  const hasDocuments = userContent && userContent.length > 0
  
  let prompt = `You are a helpful AI assistant talking to ${userName}. `
  
  if (hasDocuments) {
    prompt += `You have access to ${userContent.length} document(s) that ${userName} has uploaded. `
    prompt += `When answering questions, reference these documents when relevant and helpful. `
    prompt += `If the information isn't in their documents, provide a general helpful response. `
  }
  
  prompt += `Be conversational, friendly, and helpful. Keep responses clear and engaging. `
  prompt += `Remember the conversation context and build upon previous exchanges naturally.`
  
  return prompt
}

/**
 * Generate AI response using the appropriate model
 */
async function generateAIResponse(
  messages: Array<{ role: string; content: string }>,
  model: string
): Promise<string> {
  try {
    if (model.startsWith('gemini')) {
      return await generateGeminiResponse(messages, model)
    } else if (model.startsWith('gpt')) {
      return await generateOpenAIResponse(messages, model)
    } else if (model.startsWith('claude') || model.startsWith('grok') || model.startsWith('deepseek')) {
      // Map unsupported providers to closest available engines for MVP
      const mapped = model.startsWith('claude') ? 'gpt-5' : model.startsWith('grok') ? 'gpt-5-mini' : 'gpt-5-nano'
      return await generateOpenAIResponse(messages, mapped)
    } else {
      throw new Error(`Unsupported model: ${model}`)
    }
  } catch (error) {
    console.error('Error generating AI response:', error)
    throw error
  }
}

/**
 * Generate response using Gemini
 */
async function generateGeminiResponse(
  messages: Array<{ role: string; content: string }>,
  model: string
): Promise<string> {
  const modelMap: Record<string, string> = {
    'gemini-2.5-flash': 'gemini-2.5-flash',
    'gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',
    'gemini-2.5-pro': 'gemini-2.5-pro'
  }
  
  const geminiModelName = modelMap[model] || 'gemini-2.5-flash'
  const geminiModel = genAI.getGenerativeModel({ model: geminiModelName })
  
  // Convert messages to Gemini format
  const prompt = messages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n')
  
  const result = await geminiModel.generateContent(prompt)
  const response = await result.response
  return response.text()
}

/**
 * Generate response using OpenAI
 */
async function generateOpenAIResponse(
  messages: Array<{ role: string; content: string }>,
  model: string
): Promise<string> {
  const modelMap: Record<string, string> = {
    'gpt-5': 'gpt-4o',
    'gpt-5-mini': 'gpt-4o-mini',
    'gpt-5-nano': 'gpt-3.5-turbo',
    'gpt-5-thinking-pro': 'gpt-4o'
  }

  const openaiModelName = modelMap[model] || 'gpt-4o-mini'
  
  const completion = await openai.chat.completions.create({
    model: openaiModelName,
    messages: messages as any,
    max_completion_tokens: 1000,
    temperature: 0.7,
  })

  return completion.choices[0]?.message?.content || 'No response generated'
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  console.log('🚀 [ENHANCED SEARCH API] GET request started')

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const conversationId = searchParams.get('conversationId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    if (conversationId) {
      // Get messages for specific conversation
      const { data: messages, error } = await supabase
        .from('search_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('🚀 [ENHANCED SEARCH API] Error fetching messages:', error)
        return NextResponse.json(
          { error: 'Failed to fetch messages' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        messages: (messages || []).map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          created_at: msg.created_at,
          sources: msg.sources || []
        }))
      })
    } else {
      // Get all conversations for user
      const { data: conversations, error } = await supabase
        .from('search_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('🚀 [ENHANCED SEARCH API] Error fetching conversations:', error)
        return NextResponse.json(
          { error: 'Failed to fetch conversations' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        conversations: (conversations || []).map((conv: any) => ({
          id: conv.id,
          title: conv.title,
          model_used: conv.model_used,
          created_at: conv.created_at,
          updated_at: conv.updated_at
        }))
      })
    }

  } catch (error: any) {
    const responseTime = Date.now() - startTime
    console.error('🚀 [ENHANCED SEARCH API] GET error:', {
      error: error.message,
      responseTime: `${responseTime}ms`
    })
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const startTime = Date.now()
  console.log('🚀 [ENHANCED SEARCH API] DELETE request started')

  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Delete conversation and its messages
    const { error: messagesError } = await supabase
      .from('search_messages')
      .delete()
      .eq('conversation_id', conversationId)

    if (messagesError) {
      console.error('🚀 [ENHANCED SEARCH API] Error deleting messages:', messagesError)
    }

    const { error: conversationError } = await supabase
      .from('search_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', user.id)

    if (conversationError) {
      console.error('🚀 [ENHANCED SEARCH API] Error deleting conversation:', conversationError)
      return NextResponse.json(
        { error: 'Failed to delete conversation' },
        { status: 500 }
      )
    }

    const responseTime = Date.now() - startTime
    console.log('🚀 [ENHANCED SEARCH API] Conversation deleted successfully:', {
      conversationId,
      responseTime: `${responseTime}ms`
    })

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully'
    })

  } catch (error: any) {
    const responseTime = Date.now() - startTime
    console.error('🚀 [ENHANCED SEARCH API] DELETE error:', {
      error: error.message,
      responseTime: `${responseTime}ms`
    })
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}