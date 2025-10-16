import { NextRequest, NextResponse } from 'next/server';
import { draftStorageService } from '@/lib/draft-storage';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Get all drafts for this user from storage
    const allDrafts = draftStorageService.getUserDrafts(userId);
    
    // Apply pagination
    const paginatedDrafts = allDrafts.slice(offset, offset + limit);
    
    // Format drafts for response
    const formattedDrafts = paginatedDrafts.map(draft => {
      // Create excerpt from content (strip HTML and limit length)
      const excerpt = draft.content
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
        .substring(0, 100) + (draft.content.length > 100 ? '...' : '');
      
      return {
        id: draft.id,
        userId: draft.userId,
        title: draft.title,
        excerpt,
        tone: draft.tone,
        versionNumber: draft.versionNumber,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
      };
    });
    
    return NextResponse.json({
      drafts: formattedDrafts,
      total: allDrafts.length,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error listing drafts:', error);
    return NextResponse.json(
      { error: 'Failed to list drafts' },
      { status: 500 }
    );
  }
}
