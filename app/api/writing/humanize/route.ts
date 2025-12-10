import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { text, userId, style = 'natural' } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (text.trim().length < 20) {
      return NextResponse.json(
        { error: 'Text must be at least 20 characters' },
        { status: 400 }
      );
    }

    console.log('✍️ [HUMANIZE] Humanizing text, length:', text.length, 'style:', style);

    const styleInstructions = {
      natural: 'Make it sound like a thoughtful human wrote it naturally',
      casual: 'Make it conversational and relaxed, like chatting with a friend',
      professional: 'Make it sound professionally written by a human expert',
      academic: 'Make it sound like a knowledgeable student or researcher'
    };

    const instruction = styleInstructions[style as keyof typeof styleInstructions] || styleInstructions.natural;

    const systemPrompt = `You are a humanizer - you take AI-generated or robotic-sounding text and rewrite it to sound naturally human-written.

Your task: ${instruction}

IMPORTANT GUIDELINES:
1. Vary sentence lengths - mix short punchy sentences with longer flowing ones
2. Add subtle imperfections humans make (but keep it grammatically correct)
3. Use contractions naturally (don't, can't, it's, etc.)
4. Include conversational transitions (Well, Actually, You know, I think, etc.) where appropriate
5. Add personality and voice - humans have opinions and perspectives
6. Break up long paragraphs into digestible chunks
7. Use more active voice than passive voice
8. Include rhetorical questions occasionally
9. Add specific examples or anecdotes where relevant
10. Avoid overly formal or robotic phrases like "It is important to note that" or "Furthermore"

PRESERVE:
- The original meaning and key information
- Any technical accuracy
- The general structure and flow
- Approximate length (can be slightly shorter or longer)

Output ONLY the humanized text, nothing else.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text.slice(0, 15000) }
      ],
      temperature: 0.9, // Higher temperature for more creative/human-like output
      max_tokens: 4096,
    });

    const humanizedText = completion.choices[0]?.message?.content?.trim() || '';

    console.log('✍️ [HUMANIZE] Complete, original length:', text.length, 'humanized length:', humanizedText.length);

    return NextResponse.json({
      success: true,
      result: humanizedText,
      originalLength: text.length,
      humanizedLength: humanizedText.length
    });

  } catch (error: any) {
    console.error('✍️ [HUMANIZE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to humanize text', details: error.message },
      { status: 500 }
    );
  }
}
