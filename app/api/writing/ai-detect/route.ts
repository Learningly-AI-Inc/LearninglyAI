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
    const { text, userId } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (text.trim().length < 50) {
      return NextResponse.json(
        { error: 'Text must be at least 50 characters for accurate AI detection' },
        { status: 400 }
      );
    }

    console.log('🔍 [AI DETECT] Analyzing text for AI patterns, length:', text.length);

    const systemPrompt = `You are an AI content detector. Analyze text and determine the likelihood that it was written by an AI.

Analyze these aspects:
1. Writing patterns (repetitive structures, formulaic phrases)
2. Vocabulary usage (unusual word choices, overly sophisticated or generic language)
3. Sentence structure variety
4. Natural flow and human-like imperfections
5. Topic coherence and depth
6. Presence of personal voice or opinions

Respond ONLY with a valid JSON object in this exact format (no markdown, no code blocks):
{
  "score": <number between 0-100 representing likelihood of AI generation>,
  "confidence": "<low|medium|high>",
  "verdict": "<human|likely_human|mixed|likely_ai|ai>",
  "analysis": {
    "patterns": "<brief analysis of writing patterns>",
    "vocabulary": "<brief analysis of vocabulary>",
    "structure": "<brief analysis of sentence structure>",
    "naturalness": "<brief analysis of natural flow>"
  },
  "suggestions": ["<suggestion 1 to make text more human-like>", "<suggestion 2>", "<suggestion 3>"]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this text for AI detection:\n\n${text.slice(0, 10000)}` }
      ],
      temperature: 0.3, // Lower temperature for more consistent analysis
      max_tokens: 1024,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    console.log('🔍 [AI DETECT] Raw response:', responseText.substring(0, 200));

    // Parse the JSON response
    let analysisResult;
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('🔍 [AI DETECT] Failed to parse response:', parseError);
      // Return a fallback response
      analysisResult = {
        score: 50,
        confidence: 'low',
        verdict: 'mixed',
        analysis: {
          patterns: 'Unable to fully analyze patterns',
          vocabulary: 'Unable to fully analyze vocabulary',
          structure: 'Unable to fully analyze structure',
          naturalness: 'Unable to fully analyze naturalness'
        },
        suggestions: [
          'Add more personal anecdotes or experiences',
          'Vary your sentence lengths',
          'Include more conversational phrases'
        ]
      };
    }

    console.log('🔍 [AI DETECT] Analysis complete, score:', analysisResult.score);

    return NextResponse.json({
      success: true,
      result: analysisResult
    });

  } catch (error: any) {
    console.error('🔍 [AI DETECT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze text', details: error.message },
      { status: 500 }
    );
  }
}
