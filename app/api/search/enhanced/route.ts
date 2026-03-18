import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import OpenAI from 'openai'
import { TokenManager } from '@/lib/token-manager'

// Initialize OpenAI client (Gemini API suspended)
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('🚀 [ENHANCED SEARCH API] POST request started')

  try {
    const { message, conversationId, model = 'gemini-2.5-flash', attachedDocumentIds = [] } = await request.json()
    
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

    // Verify user exists in database (optimized with minimal fields)
    const { data: userRecord, error: userError } = await supabase
      .from('user_data')
      .select('user_id')
      .eq('user_id', userId)
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
      // Map model to database-allowed values
      const mapModelToDatabaseModel = (model: string): 'openai' | 'gemini' => {
        if (model.startsWith('gpt') || model.startsWith('claude') || model.startsWith('grok') || model.startsWith('llama') || model.startsWith('deepseek')) {
          return 'openai'
        }
        if (model.startsWith('gemini')) {
          return 'gemini'
        }
        return 'openai' // Default fallback
      }

      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          conversation_type: 'search',
          model_used: mapModelToDatabaseModel(model)
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
      .from('messages')
      .select('*')
      .eq('conversation_id', currentConversationId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('🚀 [ENHANCED SEARCH API] Error fetching messages:', messagesError)
    }

    // If the user attached specific reading documents, fetch smart context for grounding
    // We intentionally scope context and sources ONLY to the documents explicitly attached
    // to this chat message to avoid cross-chat leakage.
    let smartContextSections: string[] = []
    let smartContextSources: string[] = []
    let smartContextDocs: any[] = []

    // FIRST: Fetch all document metadata to identify images
    // This must happen before get-context API calls
    if (Array.isArray(attachedDocumentIds) && attachedDocumentIds.length > 0) {
      try {
        console.log('🔍 [ENHANCED SEARCH API] Fetching document metadata for IDs:', attachedDocumentIds)
        const { data: docs, error: docsError } = await supabase
          .from('documents')
          .select('id, title, extracted_text, mime_type, public_url, file_path')
          .in('id', attachedDocumentIds)
          .eq('user_id', userId)

        if (docsError) {
          console.error('🔍 [ENHANCED SEARCH API] Error fetching documents:', docsError)
        }

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

        if (Array.isArray(docs) && docs.length > 0) {
          console.log('🖼️ [ENHANCED SEARCH API] Processing', docs.length, 'documents:', docs.map(d => ({ id: d.id, title: d.title, mime: d.mime_type })))

          // Separate images from text documents
          const imageDocs = docs.filter(d => d?.mime_type?.startsWith('image/'))
          const textDocs = docs.filter(d => !d?.mime_type?.startsWith('image/'))

          console.log('🖼️ [ENHANCED SEARCH API] Found', imageDocs.length, 'images and', textDocs.length, 'text documents')

          // Process images first
          for (const d of imageDocs) {
            console.log('🖼️ [ENHANCED SEARCH API] Processing image:', {
              title: d.title,
              mimeType: d.mime_type,
              hasFilePath: !!d.file_path
            })

            if (d?.file_path) {
              try {
                const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                  .from('reading-documents')
                  .createSignedUrl(d.file_path, 3600) // 1 hour expiry

                if (signedUrlError) {
                  console.error('🖼️ [ENHANCED SEARCH API] Error creating signed URL:', signedUrlError)
                  continue
                }

                const imageUrl = signedUrlData?.signedUrl
                if (!imageUrl) {
                  console.error('🖼️ [ENHANCED SEARCH API] No signed URL returned')
                  continue
                }

                // For images, store the signed URL in smartContextDocs
                const imageDoc = {
                  id: d.id,
                  title: d.title || 'Image',
                  isImage: true,
                  imageUrl: imageUrl,
                  mimeType: d.mime_type
                }
                smartContextDocs.push(imageDoc)
                smartContextSources.push(d.title || 'Image')
                console.log('✅ [ENHANCED SEARCH API] Added image with signed URL:', {
                  title: imageDoc.title,
                  urlLength: imageUrl.length,
                  urlStart: imageUrl.substring(0, 80) + '...'
                })
              } catch (error: any) {
                console.error('❌ [ENHANCED SEARCH API] Error processing image:', error)
              }
            }
          }

          // For text documents, try get-context API first, then fallback to extracted_text
          for (const d of textDocs) {
            console.log('📄 [ENHANCED SEARCH API] Processing text document:', d.title)

            // Try get-context API
            let gotContext = false
            try {
              const ctxRes = await fetch(`${request.nextUrl.origin}/api/reading/get-context`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': request.headers.get('Authorization') || '',
                  'Cookie': request.headers.get('Cookie') || request.headers.get('cookie') || ''
                },
                body: JSON.stringify({ documentId: d.id, options: { maxTokens: 6000, includeMetadata: true, strategy: 'smart' } })
              })

              if (ctxRes.ok) {
                const { context } = await ctxRes.json()
                const chunks = (context?.chunks || []).map((c: any) => c.content)
                if (chunks.length > 0 && chunks.some((c: string) => c.trim().length > 0)) {
                  smartContextSections.push(...chunks)
                  smartContextSources.push(d.title || 'Document')
                  smartContextDocs.push({ id: d.id, title: d.title })
                  gotContext = true
                  console.log('✅ [ENHANCED SEARCH API] Got context from API for:', d.title)
                }
              }
            } catch (error: any) {
              console.log('⚠️ [ENHANCED SEARCH API] get-context failed for', d.title, ':', error.message)
            }

            // Fallback to extracted_text
            if (!gotContext) {
              const text = sanitize(d?.extracted_text || '')
              if (text && text.length > 0) {
                const maxChars = 8000 * 4 // ~8000 tokens
                const snippet = text.slice(0, maxChars)
                smartContextSections.push(snippet)
                smartContextSources.push(d.title || 'Document')
                smartContextDocs.push({ id: d.id, title: d.title })
                console.log('✅ [ENHANCED SEARCH API] Used extracted_text for:', d.title)
              }
            }
          }
        } else {
          console.log('⚠️ [ENHANCED SEARCH API] No documents found for the given IDs')
        }
      } catch (error: any) {
        console.error('❌ [ENHANCED SEARCH API] Error processing documents:', error)
      }
    }

    // Prepare system prompt with user personalization
    // Use only the explicitly attached documents for personalization
    const hasImageAttachments = smartContextDocs.some((doc: any) => doc.isImage)
    const systemPrompt = buildSystemPrompt(userRecord, smartContextDocs || [], hasImageAttachments, message)

    // Build conversation context with model-specific style hints
    const modelStyleHint = (() => {
      if (model.startsWith('gpt')) {
        return 'Follow ChatGPT-style formatting: concise sections, headings when useful, bullet lists, and code blocks where appropriate.'
      }
      if (model.startsWith('gemini')) {
        return 'Follow Gemini-style formatting: friendly tone, structured bullets, and short paragraphs optimized for readability.'
      }
      if (model.startsWith('claude')) {
        return 'Follow Claude-style formatting: clear reasoning, numbered steps when explaining processes, and polite tone.'
      }
      if (model.startsWith('grok')) {
        return 'Follow Grok-style formatting: succinct, direct, lightly witty but professional.'
      }
      if (model.startsWith('llama')) {
        return 'Follow Llama-style formatting: straightforward, developer-friendly with examples when helpful.'
      }
      if (model.startsWith('deepseek')) {
        return 'Follow DeepSeek-style formatting: crisp technical explanations and compact bullet points.'
      }
      return 'Use clear headings, bullets, and concise explanations.'
    })()

    // Build conversation context
    const messages = [
      { role: 'system', content: systemPrompt + `\n\nOutput style: ${modelStyleHint}` }
    ]

    if (smartContextSections.length > 0) {
      const joined = smartContextSections.slice(0, 20).map((c, i) => `[Section ${i + 1}]\n${c}`).join('\n\n')
      messages.push({ role: 'system', content: `DOCUMENT ANALYSIS INSTRUCTIONS:
Use the following document sections to solve problems step-by-step. When the user asks questions about problems in these documents:

1. Extract the specific problem or question from the document
2. Identify what type of problem it is (math, science, economics, etc.)
3. Solve the problem completely with all steps shown
4. Don't just explain how to solve it - actually solve it
5. Use the document data/numbers in your solution
6. Show your work clearly
7. Provide the final answer

Document sections:
${joined}

Remember: Solve the problems, don't just explain how to solve them.` })
    }

    // Add recent conversation history (last 10 messages to manage context)
    const recentMessages = (existingMessages || []).slice(-10)
    for (const msg of recentMessages) {
      messages.push({
        role: msg.role,
        content: msg.content
      })
    }

    // Add current user message with images if any
    const imageAttachments = smartContextDocs.filter((doc: any) => doc.isImage)

    console.log('🖼️ [ENHANCED SEARCH API] Image attachments found:', imageAttachments.length)
    if (imageAttachments.length > 0) {
      console.log('🖼️ [ENHANCED SEARCH API] Image URLs:', imageAttachments.map(img => img.imageUrl))
    }

    if (imageAttachments.length > 0) {
      // Multi-modal message with text and images
      const userMessage = {
        role: 'user',
        content: [
          { type: 'text', text: message },
          ...imageAttachments.map((img: any) => ({
            type: 'image_url',
            image_url: { url: img.imageUrl }
          }))
        ]
      }
      messages.push(userMessage as any)
      console.log('🖼️ [ENHANCED SEARCH API] Added user message with', imageAttachments.length, 'images')
      console.log('🖼️ [ENHANCED SEARCH API] Message structure:', JSON.stringify(userMessage, null, 2))
    } else {
      // Text-only message
      messages.push({
        role: 'user',
        content: message
      })
    }

    // Check token limits and optimize if needed
    const totalTokens = TokenManager.countMessageTokens(messages)
    console.log('🚀 [ENHANCED SEARCH API] Token stats:', {
      totalTokens,
      messageCount: messages.length,
      hasImages: imageAttachments.length > 0
    })

    // Generate AI response
    console.log('🚀 [ENHANCED SEARCH API] Generating AI response...')
    const aiResponse = await generateAIResponse(messages, model, imageAttachments.length > 0)
    
    // Calculate response tokens
    const responseTokens = TokenManager.estimateTokens(aiResponse)

    // Map model to database-allowed values for message saving
    const mapModelToDatabaseModel = (model: string): 'openai' | 'gemini' => {
      if (model.startsWith('gpt') || model.startsWith('claude') || model.startsWith('grok') || model.startsWith('llama') || model.startsWith('deepseek')) {
        return 'openai'
      }
      if (model.startsWith('gemini')) {
        return 'gemini'
      }
      return 'openai' // Default fallback
    }

    // Save user message
    const { error: userMsgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: currentConversationId,
        role: 'user',
        content: message,
        model_used: mapModelToDatabaseModel(model),
        tokens_used: TokenManager.estimateTokens(message)
      })

    if (userMsgError) {
      console.error('🚀 [ENHANCED SEARCH API] Error saving user message:', userMsgError)
    }

    // Save AI response
    const { error: aiMsgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: currentConversationId,
        role: 'assistant',
        content: aiResponse,
        // Only cite the sources attached in this chat
        sources: smartContextSources,
        model_used: mapModelToDatabaseModel(model),
        tokens_used: responseTokens
      })

    if (aiMsgError) {
      console.error('🚀 [ENHANCED SEARCH API] Error saving AI response:', aiMsgError)
    }

    // Update conversation timestamp
    await supabase
      .from('conversations')
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
          // Log only the sources from this chat
          sources: smartContextSources
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
      // Return only the sources explicitly attached to this chat message
      sources: smartContextSources,
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
 * Detect subject area from user message
 */
function detectSubject(message: string): string {
  const messageLower = message.toLowerCase()
  
  // Math indicators
  if (messageLower.match(/\b(calculate|solve|equation|formula|algebra|calculus|geometry|trigonometry|statistics|probability|derivative|integral|matrix|vector|function|graph|plot)\b/)) {
    return 'mathematics'
  }
  
  // Science indicators
  if (messageLower.match(/\b(physics|chemistry|biology|experiment|reaction|molecule|atom|cell|organism|evolution|photosynthesis|respiration|force|energy|motion|gravity|electricity|magnetism)\b/)) {
    return 'science'
  }
  
  // Economics indicators
  if (messageLower.match(/\b(economics|economy|supply|demand|market|price|cost|revenue|profit|inflation|gdp|unemployment|fiscal|monetary|policy|trade|export|import|budget|investment)\b/)) {
    return 'economics'
  }
  
  // Coding indicators
  if (messageLower.match(/\b(code|coding|programming|function|variable|loop|array|object|class|method|debug|error|syntax|algorithm|data structure|python|javascript|java|c\+\+|html|css|sql|api|bug|fix|exception|traceback|runtime error|compile error|undefined|null|typeerror|referenceerror|syntaxerror)\b/)) {
    return 'programming'
  }
  
  // Literature indicators
  if (messageLower.match(/\b(poem|poetry|novel|story|character|theme|symbol|metaphor|literature|author|book|chapter|plot|setting|analysis|essay|writing)\b/)) {
    return 'literature'
  }
  
  // History indicators
  if (messageLower.match(/\b(history|historical|war|battle|revolution|empire|ancient|medieval|renaissance|world war|civil war|timeline|chronology|historical event)\b/)) {
    return 'history'
  }
  
  return 'general'
}

/**
 * Detect if the message contains code or coding problems
 */
function detectCodingProblem(message: string): boolean {
  const messageLower = message.toLowerCase()
  
  // Check for code blocks
  if (messageLower.includes('```') || messageLower.includes('`')) {
    return true
  }
  
  // Check for common error messages
  const errorPatterns = [
    /error:/i,
    /exception:/i,
    /traceback/i,
    /undefined/i,
    /null/i,
    /typeerror/i,
    /referenceerror/i,
    /syntaxerror/i,
    /runtime error/i,
    /compile error/i,
    /cannot read property/i,
    /is not defined/i,
    /unexpected token/i,
    /unexpected end of input/i
  ]
  
  return errorPatterns.some(pattern => pattern.test(message))
}

/**
 * Get subject-specific instructions
 */
function getSubjectSpecificInstructions(subject: string): string {
  switch (subject) {
    case 'mathematics':
      return `MATHEMATICS SPECIALIZATION:
- Show all steps clearly with proper mathematical notation
- Use LaTeX formatting for equations: $inline$ and $$block$$
- Explain the reasoning behind each step
- Check your work and verify solutions
- Provide alternative methods when applicable
- Use appropriate units and significant figures`
    
    case 'science':
      return `SCIENCE SPECIALIZATION:
- Use proper scientific notation and units
- Show calculations with clear formulas
- Explain scientific principles and concepts
- Include relevant diagrams or visualizations when helpful
- Reference scientific laws and theories
- Consider experimental design and methodology`
    
    case 'economics':
      return `ECONOMICS SPECIALIZATION:
- Use economic models and graphs when appropriate
- Show calculations for economic indicators
- Explain economic concepts and theories
- Consider both micro and macro perspectives
- Use proper economic terminology
- Analyze cause-and-effect relationships`
    
    case 'programming':
      return `PROGRAMMING SPECIALIZATION:
- Provide working, tested code solutions
- Explain the logic and algorithm clearly
- Use proper code formatting and comments
- Debug errors systematically and explain fixes
- Consider edge cases and error handling
- Suggest best practices and optimizations
- When debugging: identify the error type, explain why it occurs, show the fix, and test the solution
- For code errors: provide the corrected code with explanations of what was wrong and how it's fixed
- Always test your solutions and verify they work`
    
    case 'literature':
      return `LITERATURE SPECIALIZATION:
- Provide detailed textual analysis
- Support arguments with specific examples
- Explain literary devices and techniques
- Consider themes, symbols, and motifs
- Analyze character development and relationships
- Connect to broader literary contexts`
    
    case 'history':
      return `HISTORY SPECIALIZATION:
- Provide accurate historical context
- Use primary and secondary sources when possible
- Explain cause-and-effect relationships
- Consider multiple perspectives
- Use proper historical terminology
- Connect events to broader historical themes`
    
    default:
      return `GENERAL ACADEMIC APPROACH:
- Use clear, logical structure
- Support arguments with evidence
- Explain concepts thoroughly
- Use appropriate academic language
- Consider multiple perspectives
- Provide examples and illustrations`
  }
}

/**
 * Build personalized system prompt with enhanced problem-solving capabilities
 */
function buildSystemPrompt(userRecord: any, userContent: any[], hasImages: boolean = false, userMessage?: string): string {
  const userName = userRecord.full_name || 'User'
  const hasDocuments = userContent && userContent.length > 0

  // Detect subject area if user message is provided
  const subject = userMessage ? detectSubject(userMessage) : 'general'
  const isCodingProblem = userMessage ? detectCodingProblem(userMessage) : false
  const subjectInstructions = getSubjectSpecificInstructions(subject)

  let prompt = `You are an expert AI tutor and problem-solving assistant talking to ${userName}. `

  // Enhanced problem-solving instructions
  prompt += `CORE CAPABILITIES:
- Solve problems step-by-step with detailed explanations
- Work across ALL academic subjects (math, science, economics, coding, literature, etc.)
- Provide complete solutions, not just explanations of how to solve
- Debug code errors and provide working solutions
- Analyze documents and solve problems within them
- Break down complex problems into manageable steps

PROBLEM-SOLVING APPROACH:
1. Understand the problem completely
2. Identify the subject area and appropriate methods
3. Show your work step-by-step
4. Provide the complete solution
5. Explain key concepts and reasoning
6. Offer additional practice or related problems when helpful

${subjectInstructions}

${isCodingProblem ? `
CODING ERROR DETECTED - SPECIAL INSTRUCTIONS:
- This appears to be a coding problem or error
- Identify the specific error type and cause
- Provide the corrected code with clear explanations
- Show before/after code comparison
- Explain why the error occurred and how the fix resolves it
- Test the solution to ensure it works
- Provide best practices to prevent similar errors
` : ''}

`

  if (hasImages) {
    prompt += `VISION CAPABILITIES: You can see and analyze images. `
    prompt += `${userName} has attached ${userContent.filter((doc: any) => doc.isImage).length} image(s). `
    prompt += `Analyze images thoroughly and solve problems shown in them. `
    prompt += `For charts, graphs, or diagrams, extract data and solve related problems. `
  }

  if (hasDocuments) {
    const textDocs = userContent.filter((doc: any) => !doc.isImage)
    if (textDocs.length > 0) {
      prompt += `DOCUMENT ANALYSIS: You have access to ${textDocs.length} document(s). `
      prompt += `When solving problems from documents, extract the relevant information and provide complete solutions. `
      prompt += `Don't just explain how to solve - actually solve the problems step-by-step. `
    }
    if (!hasImages) {
      prompt += `If information isn't in the documents, use your knowledge to provide complete solutions. `
    }
  }

  prompt += `
COMMUNICATION STYLE:
- Be encouraging and supportive
- Use clear, step-by-step explanations
- Show your work and reasoning
- Provide complete solutions, not just hints
- Use appropriate notation for each subject (math symbols, code formatting, etc.)
- Be conversational but thorough

Remember: Your goal is to help ${userName} learn by providing complete, step-by-step solutions to their problems.`

  return prompt
}

/**
 * Generate AI response using the appropriate model
 */
async function generateAIResponse(
  messages: Array<{ role: string; content: any }>,
  model: string,
  hasImages: boolean = false
): Promise<string> {
  try {
    if (model.startsWith('gemini')) {
      return await generateGeminiResponse(messages, model, hasImages)
    } else if (model.startsWith('gpt')) {
      return await generateOpenAIResponse(messages, model, hasImages)
    } else if (model.startsWith('claude') || model.startsWith('grok') || model.startsWith('deepseek') || model.startsWith('llama')) {
      // Map unsupported providers to closest available engines for MVP
      const mapped = model.startsWith('claude') ? 'gpt-5'
        : model.startsWith('grok') ? 'gpt-5-mini'
        : model.startsWith('llama') ? 'gpt-5-mini'
        : 'gpt-5-nano'
      return await generateOpenAIResponse(messages, mapped, hasImages)
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
  messages: Array<{ role: string; content: any }>,
  model: string,
  hasImages: boolean = false
): Promise<string> {
  // Gemini API suspended - fall back to OpenAI
  return generateOpenAIResponse(messages, 'gpt-5-mini', hasImages)
}

/**
 * Generate response using OpenAI
 */
async function generateOpenAIResponse(
  messages: Array<{ role: string; content: any }>,
  model: string,
  hasImages: boolean = false
): Promise<string> {
  const modelMap: Record<string, string> = {
    'gpt-5': 'gpt-4o',
    'gpt-5-mini': 'gpt-4o-mini',
    'gpt-5-nano': 'gpt-3.5-turbo',
    'gpt-5-thinking-pro': 'gpt-4o'
  }

  const openaiModelName = modelMap[model] || 'gpt-4o-mini'

  // If images are present, ensure we use a vision-capable model
  const finalModel = hasImages && openaiModelName === 'gpt-3.5-turbo' ? 'gpt-4o-mini' : openaiModelName

  console.log('🤖 [OPENAI] Generating response:', {
    requestedModel: model,
    mappedModel: openaiModelName,
    finalModel,
    hasImages,
    messageCount: messages.length
  })

  // Log the last message to see structure
  const lastMessage = messages[messages.length - 1]
  if (lastMessage) {
    console.log('🤖 [OPENAI] Last message role:', lastMessage.role)
    if (typeof lastMessage.content === 'string') {
      console.log('🤖 [OPENAI] Last message type: string')
    } else if (Array.isArray(lastMessage.content)) {
      console.log('🤖 [OPENAI] Last message type: array with', lastMessage.content.length, 'parts')
      console.log('🤖 [OPENAI] Content parts:', lastMessage.content.map((part: any) => part.type))
    }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: finalModel,
      messages: messages as any,
      max_completion_tokens: 1000,
      temperature: 0.7,
    })

    const response = completion.choices[0]?.message?.content || 'No response generated'
    console.log('🤖 [OPENAI] Response generated successfully, length:', response.length)
    return response
  } catch (error: any) {
    console.error('🤖 [OPENAI] Error generating response:', {
      error: error.message,
      code: error.code,
      type: error.type
    })
    throw error
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  console.log('🚀 [ENHANCED SEARCH API] GET request started')

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const conversationId = searchParams.get('conversationId')
    const searchQuery = searchParams.get('search')

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
        .from('messages')
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
    } else if (searchQuery) {
      // Search conversations by title or message content
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
          *,
          messages!inner(content)
        `)
        .eq('conversation_type', 'search')
        .eq('user_id', userId)
        .or(`title.ilike.%${searchQuery}%,messages.content.ilike.%${searchQuery}%`)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('🚀 [ENHANCED SEARCH API] Error searching conversations:', error)
        return NextResponse.json(
          { error: 'Failed to search conversations' },
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
    } else {
      // Get all conversations for user
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('conversation_type', 'search')
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
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId)

    if (messagesError) {
      console.error('🚀 [ENHANCED SEARCH API] Error deleting messages:', messagesError)
    }

    const { error: conversationError } = await supabase
      .from('conversations')
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