import { NextRequest, NextResponse } from 'next/server';
import { optimizeForAI, estimateTokens } from '@/lib/document-optimizer';

export async function POST(req: NextRequest) {
  // Build-time safety check - return early if we're in a build environment without API keys
  if (process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'API keys not available during build' },
      { status: 503 }
    );
  }

  try {
    const { text, documentTitle } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: 'No text provided for summarization' },
        { status: 400 }
      );
    }

    console.log('📝 Summarization request:', {
      title: documentTitle,
      originalLength: text.length,
      originalTokens: estimateTokens(text)
    });

    // Use OpenAI API for summarization
    const openaiApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // AGGRESSIVE OPTIMIZATION: For very large docs, compress even more
    const textLength = text.length;
    let targetTokens = 6000;

    // For 17MB+ documents, be even more aggressive
    if (textLength > 1000000) { // >1MB of text
      targetTokens = 3000; // Much more aggressive compression
      console.log('🚀 Large document detected, using aggressive compression');
    } else if (textLength > 500000) {
      targetTokens = 4000;
    }

    // Optimize document for AI processing (compress large documents intelligently)
    const optimized = optimizeForAI(text, targetTokens);
    const processedText = optimized.compressed;

    console.log('🗜️ Document optimized:', {
      compressionRatio: optimized.compressionRatio.toFixed(2),
      compressedLength: processedText.length,
      estimatedTokens: optimized.estimatedTokens,
      keyPhrasesCount: optimized.keyPhrases.length
    });

    const prompt = `Please provide a comprehensive and well-structured summary of the following document.

Document Title: ${documentTitle || 'Untitled Document'}

${optimized.keyPhrases.length > 0 ? `Key Topics: ${optimized.keyPhrases.slice(0, 10).join(', ')}` : ''}

Please structure your response as follows:

## Executive Summary
[Provide a concise 2-3 sentence overview of the main topic and key findings]

## Key Points
[Bullet points of the most important concepts, findings, or arguments]

## Main Sections
[Break down the document into logical sections with brief summaries]

## Important Details
[Highlight any specific data, statistics, dates, or critical information]

## Conclusions/Recommendations
[Summarize any conclusions, recommendations, or next steps mentioned]

## Key Terms & Definitions
[List and define any important terms, acronyms, or concepts]

Document Content:
${processedText}

Please ensure the summary is:
- Well-organized and easy to follow
- Maintains the original document's key information
- Uses clear, professional language
- Includes specific details and examples where relevant
- Provides a complete overview without being overly verbose`;

    // Use faster model for very large documents
    const model = textLength > 1000000 ? 'gpt-4o-mini' : 'gpt-3.5-turbo';
    console.log(`🤖 Using model: ${model} for ${textLength} char document`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional document summarizer. Provide clear, structured, and comprehensive summaries that maintain the original document\'s key information while being easy to read and understand. Work FAST.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500, // Reduced for speed
        temperature: 0.2, // Lower for faster, more deterministic responses
        stream: false
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices[0]?.message?.content;

    if (!summary) {
      throw new Error('No summary generated');
    }

    return NextResponse.json({
      success: true,
      summary,
      model: 'gpt-3.5-turbo',
      tokens_used: data.usage?.total_tokens || 0,
    });

  } catch (error: any) {
    console.error('Summarization error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate summary',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
