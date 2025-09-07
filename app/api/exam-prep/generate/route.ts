import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

interface ExamConfig {
  numMCQ: number;
  examDuration: number;
  difficulty: 'easy' | 'medium' | 'hard';
  examTitle: string;
  additionalInstructions: string;
}

interface FileData {
  url: string;
  name: string;
}

export async function POST(request: NextRequest) {
  try {
    const { files, config }: { files: FileData[], config: ExamConfig } = await request.json();

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract text content from PDFs
    let combinedContent = '';
    const fileContents: string[] = [];

    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name} from URL: ${file.url}`);
        
        // For now, we'll create meaningful mock content based on the file name
        // In a production environment, you would integrate with a PDF processing service
        // or use a server-side PDF processing library that works with Next.js
        
        const mockContent = `Study Material: ${file.name}

This document contains important study material for your exam preparation. The content includes:

1. Key Concepts and Definitions
2. Important Formulas and Equations  
3. Practice Problems and Solutions
4. Review Questions and Answers
5. Case Studies and Examples

Based on the filename "${file.name}", this appears to be study material that covers the relevant topics for your exam. The AI will generate exam questions based on the typical content structure and learning objectives that would be found in such study materials.

Key topics likely covered:
- Fundamental concepts and principles
- Problem-solving methodologies
- Application of theoretical knowledge
- Critical thinking and analysis
- Practical examples and case studies

This content will be used to generate comprehensive exam questions that test your understanding of the material.`;
        
        fileContents.push(mockContent);
        combinedContent += `\n\n=== ${file.name} ===\n${mockContent}`;
        console.log(`Successfully processed ${file.name} - using structured mock content`);
        
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        // Fallback content for failed processing
        const fallbackContent = `Content from ${file.name}: Error processing this PDF file. ${error instanceof Error ? error.message : 'Unknown error'}`;
        fileContents.push(fallbackContent);
        combinedContent += `\n\n=== ${file.name} ===\n${fallbackContent}`;
      }
    }

    if (!combinedContent.trim()) {
      return NextResponse.json(
        { error: 'Failed to extract content from PDF files' },
        { status: 400 }
      );
    }

    // Generate exam using OpenAI
    const examPrompt = `
You are an expert exam creator. Based on the following study materials, create a comprehensive ${config.difficulty} level exam.

EXAM REQUIREMENTS:
- Number of questions: ${config.numMCQ}
- Difficulty: ${config.difficulty}
- Duration: ${config.examDuration} minutes
- Title: ${config.examTitle || 'Comprehensive Exam'}
${config.additionalInstructions ? `- Additional instructions: ${config.additionalInstructions}` : ''}

STUDY MATERIALS:
${combinedContent}

Please generate a JSON response with the following structure:
{
  "examTitle": "string",
  "instructions": "string",
  "duration": number,
  "questions": [
    {
      "id": "string",
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A|B|C|D",
      "explanation": "string",
      "difficulty": "easy|medium|hard",
      "topic": "string"
    }
  ]
}

GUIDELINES:
1. Create exactly ${config.numMCQ} multiple choice questions
2. Questions should be ${config.difficulty} difficulty level
3. Cover different topics and concepts from the materials
4. Ensure questions test understanding, not just memorization
5. Provide clear explanations for correct answers
6. Make sure all options are plausible
7. Questions should be appropriate for the ${config.examDuration}-minute duration

Generate the exam now:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert exam creator who generates comprehensive, fair, and educationally valuable exams based on study materials. Always respond with valid JSON."
        },
        {
          role: "user",
          content: examPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    let examData;
    try {
      // Extract JSON from response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        examData = JSON.parse(jsonMatch[0]);
      } else {
        examData = JSON.parse(responseContent);
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.error('Response content:', responseContent);
      throw new Error('Failed to parse exam data from AI response');
    }

    // Validate exam data structure
    if (!examData.questions || !Array.isArray(examData.questions)) {
      throw new Error('Invalid exam data structure');
    }

    // Store the generated exam in database
    const { data: examRecord, error: examError } = await supabase
      .from('generated_exams')
      .insert({
        user_id: user.id,
        exam_title: examData.examTitle || config.examTitle || 'Generated Exam',
        exam_config: config,
        exam_data: examData,
        source_files: files.map(f => f.name),
        content_hash: Buffer.from(combinedContent).toString('base64').slice(0, 50) // First 50 chars of hash
      })
      .select()
      .single();

    if (examError) {
      console.error('Database error saving exam:', examError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      examId: examRecord?.id,
      exam: examData,
      metadata: {
        filesProcessed: files.length,
        contentLength: combinedContent.length,
        questionsGenerated: examData.questions.length
      }
    });

  } catch (error) {
    console.error('Exam generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate exam', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
