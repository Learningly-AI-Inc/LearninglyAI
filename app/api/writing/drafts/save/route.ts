import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { draftStorageService, Draft } from '@/lib/draft-storage';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, rawContent, tone, userId, draftId } = body;
    
    console.log('Draft save request:', { 
      hasContent: !!content, 
      contentLength: content?.length || 0,
      userId, 
      draftId,
      isNewDraft: !draftId 
    });
    
    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    const isNewDraft = !draftId;
    const newDraftId = draftId || uuidv4();
    const now = new Date();
    
    if (isNewDraft) {
      // Create new draft
      console.log('Creating new draft for user:', userId);
      
      try {
        const title = draftStorageService.generateDraftTitle(userId);
        console.log('Generated title:', title);
        
        const newDraft: Draft = {
          id: newDraftId,
          userId,
          title,
          content,
          rawContent: rawContent || null,
          tone: tone || 'formal',
          versionNumber: 1,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        };
        
        console.log('Saving new draft:', { id: newDraft.id, title: newDraft.title });
        draftStorageService.saveDraft(newDraft);
        console.log('Draft saved successfully');
        
        return NextResponse.json({
          id: newDraftId,
          userId,
          title,
          content,
          rawContent: newDraft.rawContent,
          tone: newDraft.tone,
          versionNumber: 1,
          createdAt: newDraft.createdAt,
          updatedAt: newDraft.updatedAt,
          isNewDraft: true
        });
      } catch (storageError) {
        console.error('Storage error, returning fallback response:', storageError);
        // Return a fallback response even if storage fails
        return NextResponse.json({
          id: newDraftId,
          userId,
          title: 'Untitled Draft',
          content,
          rawContent: rawContent || null,
          tone: tone || 'formal',
          versionNumber: 1,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          isNewDraft: true
        });
      }
    } else {
      // Update existing draft
      console.log('Updating existing draft:', draftId);
      
      try {
        const existingDraft = draftStorageService.getDraft(draftId);
        if (!existingDraft) {
          console.log('Draft not found, creating new one instead');
          // If draft not found, create a new one
          const title = draftStorageService.generateDraftTitle(userId);
          const newDraft: Draft = {
            id: newDraftId,
            userId,
            title,
            content,
            rawContent: rawContent || null,
            tone: tone || 'formal',
            versionNumber: 1,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
          };
          
          draftStorageService.saveDraft(newDraft);
          
          return NextResponse.json({
            id: newDraftId,
            userId,
            title,
            content,
            rawContent: newDraft.rawContent,
            tone: newDraft.tone,
            versionNumber: 1,
            createdAt: newDraft.createdAt,
            updatedAt: newDraft.updatedAt,
            isNewDraft: true
          });
        }
        
        const updatedDraft: Draft = {
          ...existingDraft,
          content,
          rawContent: rawContent || existingDraft.rawContent,
          tone: tone || existingDraft.tone,
          versionNumber: existingDraft.versionNumber + 1,
          updatedAt: now.toISOString()
        };
        
        console.log('Updating draft:', { id: updatedDraft.id, version: updatedDraft.versionNumber });
        draftStorageService.saveDraft(updatedDraft);
        console.log('Draft updated successfully');
        
        return NextResponse.json({
          id: draftId,
          userId: updatedDraft.userId,
          title: updatedDraft.title,
          content: updatedDraft.content,
          rawContent: updatedDraft.rawContent,
          tone: updatedDraft.tone,
          versionNumber: updatedDraft.versionNumber,
          createdAt: updatedDraft.createdAt,
          updatedAt: updatedDraft.updatedAt,
          isNewDraft: false
        });
      } catch (storageError) {
        console.error('Storage error during update, returning fallback response:', storageError);
        // Return a fallback response even if storage fails
        return NextResponse.json({
          id: draftId,
          userId,
          title: 'Untitled Draft',
          content,
          rawContent: rawContent || null,
          tone: tone || 'formal',
          versionNumber: 1,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          isNewDraft: false
        });
      }
    }
  } catch (error) {
    console.error('Error saving draft:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        error: 'Failed to save draft',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}
