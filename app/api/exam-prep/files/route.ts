import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's uploaded files
    const { data: files, error: dbError } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .eq('document_type', 'exam-prep')
      .order('created_at', { ascending: false })

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
    }

    // Transform the data to match the component interface
    const transformedFiles = files.map(file => ({
      id: file.id,
      name: file.original_filename,
      size: file.file_size,
      type: file.mime_type,
      uploadDate: new Date(file.created_at).toISOString().split('T')[0],
      status: file.processing_status === 'completed' ? 'analyzed' : 
              file.processing_status === 'processing' ? 'processing' :
              file.processing_status === 'failed' ? 'failed' : 'analyzed', // Default to analyzed for existing files
      category: file.metadata?.file_category || 'learning_materials', // Use the actual file_category from metadata
      extracted_content: file.extracted_text, // Include extracted text content
      processing_status: file.processing_status, // Include processing status
      // Add mock analysis data for now (in real implementation, this would come from the database)
      patternAnalysis: {
        questionTypes: ['Multiple Choice', 'Short Answer', 'Essay'],
        difficultyDistribution: { 
          easy: Math.floor(Math.random() * 30) + 10, 
          medium: Math.floor(Math.random() * 40) + 40, 
          hard: Math.floor(Math.random() * 30) + 10 
        },
        topicAreas: ['Topic A', 'Topic B', 'Topic C', 'Topic D'],
        questionCount: Math.floor(Math.random() * 50) + 20,
        averageWordCount: Math.floor(Math.random() * 50) + 50,
        insights: [
          'Balanced question distribution',
          'Clear difficulty progression',
          'Comprehensive topic coverage'
        ]
      },
      contentAnalysis: {
        topicCoverage: ['Topic A', 'Topic B', 'Topic C', 'Topic D', 'Topic E'],
        keyConceptsCount: Math.floor(Math.random() * 100) + 50,
        difficultyLevel: (['beginner', 'intermediate', 'advanced'] as const)[Math.floor(Math.random() * 3)],
        contentType: (['theoretical', 'practical', 'mixed'] as const)[Math.floor(Math.random() * 3)],
        readabilityScore: Math.floor(Math.random() * 30) + 70,
        textLength: Math.floor(Math.random() * 30000) + 10000,
        isOptimized: Math.random() > 0.3,
        optimizationSummary: 'Content processed and optimized for question generation.',
        chapterSummary: [
          {
            title: 'Chapter 1',
            keyPoints: ['Key concept 1', 'Key concept 2', 'Key concept 3'],
            questionPotential: Math.floor(Math.random() * 10) + 5
          },
          {
            title: 'Chapter 2', 
            keyPoints: ['Advanced concept 1', 'Advanced concept 2'],
            questionPotential: Math.floor(Math.random() * 10) + 5
          }
        ]
      }
    }))

    return NextResponse.json({ files: transformedFiles })

  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
