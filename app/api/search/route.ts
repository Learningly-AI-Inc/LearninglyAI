import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

// Simplified model mapping - just use the basic model name
const mapModelToDatabaseModel = (model: string): string => {
  if (model.startsWith('gemini')) {
    return 'gemini'
  } else if (model.startsWith('gpt')) {
    return 'openai'
  }
  return 'gemini' // Default fallback
}

// Initialize AI clients
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '')
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  // Build-time safety check - return early if we're in a build environment without API keys
  if (process.env.NODE_ENV !== 'production' && (!process.env.NEXT_PUBLIC_GOOGLE_API_KEY || !process.env.NEXT_PUBLIC_OPENAI_API_KEY)) {
    return NextResponse.json(
      { error: 'API keys not available during build' },
      { status: 503 }
    );
  }

  const startTime = Date.now()
  console.log('🔍 [SEARCH API] POST request started')

  try {
    const { message, conversationId, model = 'gemini-2.5-flash' } = await request.json()
    const mappedModel = mapModelToDatabaseModel(model)
    
    console.log('🔍 [SEARCH API] Request details:', {
      message: message?.substring(0, 50) + (message?.length > 50 ? '...' : ''),
      conversationId,
      original_model: model,
      mapped_model: mappedModel,
      hasMessage: !!message
    })

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Get the authenticated user from the session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('🔍 [SEARCH API] Authentication error:', authError)
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }
    
    const userId = user.id
    let newUser: any = null // Declare newUser variable for potential user creation/update
    
    console.log('🔍 [SEARCH API] Authenticated user:', {
      userId,
      userIdType: typeof userId,
      userIdLength: userId?.length,
      email: user.email
    })
    
    // Validate user ID format
    if (!userId || typeof userId !== 'string' || userId.length < 10) {
      console.error('🔍 [SEARCH API] Invalid user ID format:', userId)
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      )
    }

    // First, verify the user exists in the users table
    console.log('🔍 [SEARCH API] Verifying user exists in users table...')
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId)
      .single()
    
    if (userError) {
      console.error('🔍 [SEARCH API] Error fetching user record:', {
        error: userError,
        userId,
        errorCode: userError.code,
        errorMessage: userError.message
      })
      
      // If user doesn't exist, try to create them automatically
      if (userError.code === 'PGRST116') {
        console.log('🔍 [SEARCH API] User not found, attempting to create user profile...')
        
        // First, check if there's an existing user with the same email but different ID
        const { data: existingUserByEmail, error: emailCheckError } = await supabase
          .from('users')
          .select('id, email, full_name')
          .eq('email', user.email)
          .single()
        
        if (existingUserByEmail && !emailCheckError) {
          console.log('🔍 [SEARCH API] Found existing user with same email, updating ID...')
          
          // Update the existing user's ID to match the auth user
          const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({
              id: user.id,
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || existingUserByEmail.full_name,
              last_login: user.last_sign_in_at
            })
            .eq('email', user.email)
            .select('id, email, full_name')
            .single()
          
          if (updateError) {
            console.error('🔍 [SEARCH API] Error updating user ID:', updateError)
            return NextResponse.json(
              { error: 'User ID mismatch and could not be updated' },
              { status: 500 }
            )
          }
          
          console.log('🔍 [SEARCH API] User ID updated successfully:', {
            userId: updatedUser.id,
            email: updatedUser.email,
            fullName: updatedUser.full_name
          })
          
          // Set newUser to the updated user
          newUser = updatedUser
        } else {
          // Create new user profile
          const { data: createdUser, error: createError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
              username: `user_${user.id.substring(0, 8)}`,
              role: 'self-learner',
              created_at: user.created_at,
              last_login: user.last_sign_in_at
            })
            .select('id, email, full_name')
            .single()
          
          if (createError) {
            console.error('🔍 [SEARCH API] Error creating user profile:', createError)
            return NextResponse.json(
              { error: 'User not found and could not be created' },
              { status: 404 }
            )
          }
          
          console.log('🔍 [SEARCH API] User profile created successfully:', {
            userId: createdUser.id,
            email: createdUser.email,
            fullName: createdUser.full_name
          })
          
          // Set newUser to the created user
          newUser = createdUser
        }
      } else {
        return NextResponse.json(
          { error: 'User not found in database' },
          { status: 404 }
        )
      }
    }
    
    // Get the user record (either existing or newly created)
    const finalUserRecord = userRecord || newUser
    console.log('🔍 [SEARCH API] User verified in database:', {
      userId: finalUserRecord.id,
      email: finalUserRecord.email,
      fullName: finalUserRecord.full_name
    })

    // Get user's uploaded documents for context
    console.log('🔍 [SEARCH API] Fetching user content for user:', userId)
    const { data: userContent, error: contentError } = await supabase
      .from('user_content')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')

    if (contentError) {
      console.error('🔍 [SEARCH API] Error fetching user content:', contentError)
    } else {
      console.log('🔍 [SEARCH API] User content fetched:', {
        count: userContent?.length || 0,
        hasContent: !!userContent?.length
      })
    }

    // Prepare context from user's documents
    let context = ''
    if (userContent && userContent.length > 0) {
      context = `Based on the user's uploaded documents, please answer the following question. If the information is not available in their documents, please say so and provide a general helpful response.\n\n`
      console.log('🔍 [SEARCH API] Context prepared with user documents')
    } else {
      console.log('🔍 [SEARCH API] No user documents found, using general context')
    }

    let aiResponse = ''
    let sources: string[] = []

    try {
      if (model.startsWith('gemini')) {
        // Map model names to actual Gemini models
        const modelMap: Record<string, string> = {
          'gemini-2.5-flash': 'gemini-2.5-flash',
          'gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',
          'gemini-2.5-pro': 'gemini-2.5-pro'
        }
        
        const geminiModelName = modelMap[model] || 'gemini-2.5-flash'
        const geminiModel = genAI.getGenerativeModel({ model: geminiModelName })
        
        const prompt = `${context}User Question: ${message}\n\nYou are a friendly, helpful chatbot assistant. Answer questions naturally and conversationally, like you're talking to a friend. Be casual, helpful, and engaging. Don't be overly formal or academic. If you reference any documents, mention them naturally in your response. Keep your answers clear and easy to understand.`
        
        const result = await geminiModel.generateContent(prompt)
        const response = await result.response
        aiResponse = response.text()
        
        // Extract sources from response (simple heuristic)
        if (userContent) {
          sources = userContent.map(content => content.content_url.split('/').pop() || 'document')
        }
      } else if (model.startsWith('gpt-5')) {
        console.log('🔍 [SEARCH API] Using OpenAI model:', model)

        // Map model names to actual OpenAI models
        const modelMap: Record<string, string> = {
          'gpt-5': 'gpt-4o',
          'gpt-5-mini': 'gpt-4o-mini',
          'gpt-5-nano': 'gpt-3.5-turbo'
        }

        const openaiModelName = modelMap[model] || 'gpt-4o-mini'
        console.log('🔍 [SEARCH API] Mapped to OpenAI model:', openaiModelName)

        const completion = await openai.chat.completions.create({
          model: openaiModelName,
          messages: [
            {
              role: "system",
              content: `${context}You are a friendly, casual chatbot assistant. Chat naturally like you're talking to a friend. Be helpful and engaging but don't be formal or academic. Answer questions in a conversational way. If you reference any documents, mention them naturally. Keep responses clear and easy to understand.`
            },
            {
              role: "user",
              content: message
            }
          ],
          max_completion_tokens: 1000, // Changed from max_tokens to max_completion_tokens
          temperature: 0.7,
        })

        aiResponse = completion.choices[0]?.message?.content || 'No response generated'
        console.log('🔍 [SEARCH API] OpenAI response received:', {
          hasResponse: !!aiResponse,
          responseLength: aiResponse?.length || 0
        })
        
        // Extract sources from response
        if (userContent) {
          sources = userContent.map(content => content.content_url.split('/').pop() || 'document')
        }
      }

      // Save conversation and messages to database (both old and new systems)
      console.log('🔍 [SEARCH API] Saving conversation and messages...')
      let currentConversationId = conversationId

      if (!currentConversationId) {
        console.log('🔍 [SEARCH API] Creating new conversation...')
        const mappedModel = mapModelToDatabaseModel(model)
        console.log('🔍 [SEARCH API] Model mapping:', {
          original: model,
          mapped: mappedModel
        })
        
        // Create new conversation
        const { data: newConversation, error: convError } = await supabase
          .from('search_conversations')
          .insert({
            user_id: userId,
            title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
            model_used: mappedModel
          })
          .select()
          .single()

        if (convError) {
          console.error('🔍 [SEARCH API] Error creating conversation:', convError)
          console.error('🔍 [SEARCH API] This might be a RLS policy issue')
        } else {
          currentConversationId = newConversation.id
          console.log('🔍 [SEARCH API] New conversation created:', currentConversationId)
        }
      } else {
        console.log('🔍 [SEARCH API] Using existing conversation:', currentConversationId)
      }

      // Save user message
      console.log('🔍 [SEARCH API] Saving user message...')
      const { error: userMsgError } = await supabase
        .from('search_messages')
        .insert({
          conversation_id: currentConversationId,
          role: 'user',
          content: message,
          model_used: mapModelToDatabaseModel(model)
        })

      if (userMsgError) {
        console.error('🔍 [SEARCH API] Error saving user message:', userMsgError)
      } else {
        console.log('🔍 [SEARCH API] User message saved successfully')
      }

      // Save AI response to both systems
      console.log('🔍 [SEARCH API] Saving AI response...')
      const { error: aiMsgError } = await supabase
        .from('search_messages')
        .insert({
          conversation_id: currentConversationId,
          role: 'assistant',
          content: aiResponse,
          sources: sources,
          model_used: mapModelToDatabaseModel(model)
        })

      if (aiMsgError) {
        console.error('🔍 [SEARCH API] Error saving AI response:', aiMsgError)
      } else {
        console.log('🔍 [SEARCH API] AI response saved successfully')
      }

      // Removed chat system integration since we're only using search tables now

      // Log AI model call
      console.log('🔍 [SEARCH API] Logging AI model call...')
      const { error: logError } = await supabase
        .from('ai_model_logs')
        .insert({
          user_id: userId,
          model_name: mapModelToDatabaseModel(model),
          request_payload: { 
            message, 
            original_model: model,
            mapped_model: mapModelToDatabaseModel(model)
          },
          response_payload: { response: aiResponse, sources }
        })

      if (logError) {
        console.error('🔍 [SEARCH API] Error logging AI call:', logError)
      } else {
        console.log('🔍 [SEARCH API] AI call logged successfully')
      }

      const responseTime = Date.now() - startTime
      console.log('🔍 [SEARCH API] Request completed successfully:', {
        responseTime: `${responseTime}ms`,
        responseLength: aiResponse.length,
        sourcesCount: sources.length,
        conversationId: currentConversationId
      })

      return NextResponse.json({
        response: aiResponse,
        sources,
        conversationId: currentConversationId
      })

    } catch (aiError: any) {
      const responseTime = Date.now() - startTime
      console.error('🔍 [SEARCH API] AI API error:', {
        error: aiError.message,
        code: aiError.code,
        type: aiError.type,
        responseTime: `${responseTime}ms`
      })
      return NextResponse.json(
        { error: 'Failed to generate AI response', details: aiError.message },
        { status: 500 }
      )
    }

  } catch (error: any) {
    const responseTime = Date.now() - startTime
    console.error('🔍 [SEARCH API] General error:', {
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

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  console.log('🔍 [SEARCH API] GET request started')

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const conversationId = searchParams.get('conversationId')

    console.log('🔍 [SEARCH API] GET request details:', {
      userId: userId?.substring(0, 8) + '...',
      conversationId: conversationId?.substring(0, 8) + '...',
      isConversationRequest: !!conversationId
    })

    if (!userId) {
      console.error('🔍 [SEARCH API] Missing userId parameter')
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    if (conversationId) {
      console.log('🔍 [SEARCH API] Fetching messages for conversation:', conversationId)
      // Get messages for specific conversation
      const { data: messages, error } = await supabase
        .from('search_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('🔍 [SEARCH API] Error fetching messages:', error)
        return NextResponse.json(
          { error: 'Failed to fetch messages' },
          { status: 500 }
        )
      }

      console.log('🔍 [SEARCH API] Messages fetched successfully:', {
        messageCount: messages?.length || 0,
        responseTime: `${Date.now() - startTime}ms`
      })
      return NextResponse.json({ messages })
    } else {
      console.log('🔍 [SEARCH API] Fetching conversations for user')
      // Get all conversations for user
      const { data: conversations, error } = await supabase
        .from('search_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('🔍 [SEARCH API] Error fetching conversations:', error)
        return NextResponse.json(
          { error: 'Failed to fetch conversations' },
          { status: 500 }
        )
      }

      console.log('🔍 [SEARCH API] Conversations fetched successfully:', {
        conversationCount: conversations?.length || 0,
        responseTime: `${Date.now() - startTime}ms`
      })
      return NextResponse.json({ conversations })
    }

  } catch (error: any) {
    const responseTime = Date.now() - startTime
    console.error('🔍 [SEARCH API] GET error:', {
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

export async function DELETE(request: NextRequest) {
  const startTime = Date.now()
  console.log('🔍 [SEARCH API] DELETE request started')

  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    console.log('🔍 [SEARCH API] DELETE request details:', {
      conversationId: conversationId?.substring(0, 8) + '...'
    })

    if (!conversationId) {
      console.error('🔍 [SEARCH API] Missing conversationId parameter')
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Get the authenticated user from the session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('🔍 [SEARCH API] Authentication error:', authError)
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    console.log('🔍 [SEARCH API] Deleting conversation and its messages...')
    
    // First delete all messages for this conversation
    const { error: messagesError } = await supabase
      .from('search_messages')
      .delete()
      .eq('conversation_id', conversationId)

    if (messagesError) {
      console.error('🔍 [SEARCH API] Error deleting messages:', messagesError)
      return NextResponse.json(
        { error: 'Failed to delete conversation messages' },
        { status: 500 }
      )
    }

    // Then delete the conversation
    const { error: conversationError } = await supabase
      .from('search_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', user.id) // Ensure user can only delete their own conversations

    if (conversationError) {
      console.error('🔍 [SEARCH API] Error deleting conversation:', conversationError)
      return NextResponse.json(
        { error: 'Failed to delete conversation' },
        { status: 500 }
      )
    }

    const responseTime = Date.now() - startTime
    console.log('🔍 [SEARCH API] Conversation deleted successfully:', {
      conversationId,
      responseTime: `${responseTime}ms`
    })

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully'
    })

  } catch (error: any) {
    const responseTime = Date.now() - startTime
    console.error('🔍 [SEARCH API] DELETE error:', {
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
