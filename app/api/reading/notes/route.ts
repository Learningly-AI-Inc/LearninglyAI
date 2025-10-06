import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { documentId, style = 'concise' } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .eq('document_type', 'reading')
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Get smart context chunks like other endpoints
    const contextResponse = await fetch(`${req.nextUrl.origin}/api/reading/get-context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization') || '',
        'Cookie': req.headers.get('Cookie') || ''
      },
      body: JSON.stringify({
        documentId,
        options: { maxTokens: 6000, includeMetadata: true, strategy: 'smart' }
      })
    });

    if (!contextResponse.ok) {
      return NextResponse.json({ error: 'Failed to retrieve document context' }, { status: 500 });
    }

    const contextData = await contextResponse.json();
    const { context } = contextData;

    const systemPrompt = `You create crisp study notes as short bullet points.
Style: ${style}.
Rules:
- Use clear, exam-friendly bullets.
- Prefer definitions, formulas, facts, and key takeaways.
- Avoid fluff; keep each bullet ≤ 140 chars.
- Group bullets by small headings when helpful.`;

    const userPrompt = `Document: ${document.title}

Create notes from the following content:
${context.chunks.map((c: any, i: number) => `[Section ${i + 1}]\n${c.content}`).join('\n\n')}

Return ONLY markdown with optional small headings and bullet lists.`;

    const modelMap: Record<string, string> = {
      'gpt-5': 'gpt-4o',
      'gpt-5-mini': 'gpt-4o-mini',
      'gpt-5-nano': 'gpt-3.5-turbo',
      'gpt-5-thinking-pro': 'gpt-4o'
    };
    const model = modelMap['gpt-5'];

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_completion_tokens: 1200,
      temperature: 0.4,
    });

    const notes = completion.choices[0]?.message?.content || '';

    // Optionally store latest notes snapshot
    await supabase
      .from('documents')
      .update({ notes_md: notes, notes_updated_at: new Date().toISOString() })
      .eq('id', documentId)
      .eq('document_type', 'reading');

    return NextResponse.json({ success: true, notes, metadata: { model, contextChunks: context.chunks.length } });
  } catch (error: any) {
    console.error('Notes API error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}


