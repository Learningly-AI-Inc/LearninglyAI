import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

interface MindmapNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    category: string;
    level: number;
  };
  style?: {
    background?: string;
    color?: string;
    border?: string;
  };
}

interface MindmapEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  style?: {
    stroke?: string;
    strokeWidth?: number;
  };
}

export async function POST(req: NextRequest) {
  console.log('🧠 Reading Mindmap API called');
  
  try {
    const { 
      documentId, 
      style = 'hierarchical',
      complexity = 'medium'
    } = await req.json();
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    console.log('🧠 Processing mindmap request:', {
      documentId,
      style,
      complexity
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
          maxTokens: 8000, // Use more tokens for comprehensive mindmap
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

    console.log('✅ Context retrieved for mindmap:', {
      chunks: context.chunks.length,
      totalTokens: context.totalTokens,
      strategy: context.metadata.strategy
    });

    // Build mindmap generation prompt
    const systemPrompt = `You are an expert knowledge visualization specialist who creates comprehensive mindmaps from documents.

Document Information:
- Title: ${document.title}
- Text Length: ${document.text_length} characters
- Pages: ${document.page_count}
- Processing Status: ${document.processing_status}

Instructions:
1. Analyze the document content and extract the key concepts, themes, and relationships
2. Create a hierarchical mindmap structure with a central topic and branching subtopics
3. Style: ${style} (hierarchical, radial, or network)
4. Complexity: ${complexity} (simple: 8-12 nodes, medium: 15-25 nodes, complex: 30-50 nodes)
5. Include main concepts, key points, relationships, and supporting details
6. Organize information logically with proper categorization
7. Use appropriate colors and positioning for visual clarity

Return your response as a JSON object with this exact structure:
{
  "nodes": [
    {
      "id": "node_1",
      "type": "central",
      "position": { "x": 400, "y": 200 },
      "data": {
        "label": "Main Topic",
        "description": "Brief description",
        "category": "central",
        "level": 0
      },
      "style": {
        "background": "#3B82F6",
        "color": "white",
        "border": "2px solid #1E40AF"
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2",
      "type": "smoothstep",
      "style": {
        "stroke": "#6366F1",
        "strokeWidth": 2
      }
    }
  ]
}

Node Types:
- "central": Main topic (level 0)
- "primary": Major concepts (level 1)  
- "secondary": Supporting ideas (level 2)
- "detail": Specific points (level 3)

Color Scheme:
- Central: Blue (#3B82F6)
- Primary: Purple (#8B5CF6)
- Secondary: Green (#10B981)
- Detail: Orange (#F59E0B)`;

    const userPrompt = `Please create a ${complexity} complexity ${style} mindmap from the following document content:

Document Content:
${context.chunks.map((chunk: any, index: number) => `[Section ${index + 1}]\n${chunk.content}`).join('\n\n')}

Create a comprehensive mindmap that captures the key concepts, relationships, and structure of this document.`;

    // Map model names to actual OpenAI models
    const modelMap: Record<string, string> = {
      'gpt-5': 'gpt-4o',
      'gpt-5-mini': 'gpt-4o-mini',
      'gpt-5-nano': 'gpt-3.5-turbo',
      'gpt-5-thinking-pro': 'gpt-4o'
    };

    const openaiModelName = modelMap['gpt-5'] || 'gpt-4o';
    console.log('🤖 Using OpenAI model for mindmap:', openaiModelName);

    // Call OpenAI API for mindmap generation
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
      max_completion_tokens: 3000,
      temperature: 0.3, // Lower temperature for consistent structure
    });

    const responseText = completion.choices[0]?.message?.content || '{"nodes": [], "edges": []}';
    let mindmapData;
    
    try {
      mindmapData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse mindmap JSON:', parseError);
      return NextResponse.json(
        { error: 'Failed to generate valid mindmap' },
        { status: 500 }
      );
    }
    
    console.log('✅ Mindmap generated:', {
      nodeCount: mindmapData.nodes?.length || 0,
      edgeCount: mindmapData.edges?.length || 0,
      tokensUsed: completion.usage?.total_tokens,
      model: openaiModelName
    });

    // Save mindmap to database (optional - for future features)
    try {
      const { error: saveError } = await supabase
        .from('exam_prep_flashcards')
        .insert({
          id: documentId, // Use document ID as the primary key
          user_id: user.id,
          flashcards: { 
            type: 'mindmap',
            nodes: mindmapData.nodes,
            edges: mindmapData.edges
          },
          generation_settings: {
            style,
            complexity
          },
          created_at: new Date().toISOString()
        });

      if (saveError) {
        console.error('❌ Error saving mindmap:', saveError);
        // Don't fail the request, just log the error
      } else {
        console.log('✅ Mindmap saved to database');
      }
    } catch (saveError) {
      console.error('❌ Error saving mindmap:', saveError);
      // Don't fail the request
    }

    return NextResponse.json({
      success: true,
      mindmap: {
        nodes: mindmapData.nodes || [],
        edges: mindmapData.edges || []
      },
      metadata: {
        documentId: document.id,
        title: document.title,
        nodeCount: mindmapData.nodes?.length || 0,
        edgeCount: mindmapData.edges?.length || 0,
        style,
        complexity,
        model: openaiModelName,
        tokensUsed: completion.usage?.total_tokens,
        contextChunks: context.chunks.length,
        originalTextLength: document.text_length
      }
    });

  } catch (error: any) {
    console.error('💥 Unexpected error in mindmap generation API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
