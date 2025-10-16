import { NextRequest, NextResponse } from 'next/server';
import { draftStorageService } from '@/lib/draft-storage';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    const draftId = req.nextUrl.searchParams.get('draftId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    if (draftId) {
      // Load specific draft
      const draft = draftStorageService.getDraft(draftId);
      if (!draft || draft.userId !== userId) {
        return NextResponse.json(
          { error: 'Draft not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        id: draft.id,
        userId: draft.userId,
        title: draft.title,
        content: draft.content,
        rawContent: draft.rawContent,
        tone: draft.tone,
        versionNumber: draft.versionNumber,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt
      });
    } else {
      // Load most recent draft for user
      const userDrafts = draftStorageService.getUserDrafts(userId);
      
      if (userDrafts.length === 0) {
        return NextResponse.json(
          { error: 'No drafts found' },
          { status: 404 }
        );
      }
      
      const mostRecentDraft = userDrafts[0];
      return NextResponse.json({
        id: mostRecentDraft.id,
        userId: mostRecentDraft.userId,
        title: mostRecentDraft.title,
        content: mostRecentDraft.content,
        rawContent: mostRecentDraft.rawContent,
        tone: mostRecentDraft.tone,
        versionNumber: mostRecentDraft.versionNumber,
        createdAt: mostRecentDraft.createdAt,
        updatedAt: mostRecentDraft.updatedAt
      });
    }
  } catch (error) {
    console.error('Error loading draft:', error);
    return NextResponse.json(
      { error: 'Failed to load draft' },
      { status: 500 }
    );
  }
}
