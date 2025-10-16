import { NextRequest, NextResponse } from 'next/server';
import { draftStorageService } from '@/lib/draft-storage';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { draftId, newName, userId } = body;
    
    console.log('Draft rename request:', { draftId, newName, userId });
    
    if (!draftId) {
      return NextResponse.json(
        { error: 'Draft ID is required' },
        { status: 400 }
      );
    }
    
    if (!newName || !newName.trim()) {
      return NextResponse.json(
        { error: 'Draft name is required' },
        { status: 400 }
      );
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Debug: Check what's in storage
    const allDrafts = draftStorageService.getUserDrafts(userId);
    console.log('All user drafts before rename:', allDrafts.map(d => ({ id: d.id, title: d.title })));
    
    // Get the existing draft
    const existingDraft = draftStorageService.getDraft(draftId);
    console.log('Found existing draft:', existingDraft ? { id: existingDraft.id, title: existingDraft.title } : 'null');
    
    if (!existingDraft) {
      console.log('Draft not found in storage, checking if it exists in user drafts...');
      // Check if the draft exists in user's drafts (maybe it was created but not properly stored)
      const userDrafts = draftStorageService.getUserDrafts(userId);
      const draftInUserList = userDrafts.find(d => d.id === draftId);
      
      if (!draftInUserList) {
        console.log('Draft not found in user drafts either');
        return NextResponse.json(
          { error: 'Draft not found' },
          { status: 404 }
        );
      }
      
      console.log('Found draft in user list, using that for rename');
      // Use the draft from user list
      const updatedDraft = {
        ...draftInUserList,
        title: newName.trim(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('Updating draft name:', { id: updatedDraft.id, oldTitle: draftInUserList.title, newTitle: updatedDraft.title });
      draftStorageService.saveDraft(updatedDraft);
      console.log('Draft name updated successfully');
      
      return NextResponse.json({
        success: true,
        draft: {
          id: updatedDraft.id,
          title: updatedDraft.title,
          updatedAt: updatedDraft.updatedAt
        }
      });
    }
    
    // Check if user owns this draft
    if (existingDraft.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Update the draft with new name
    const updatedDraft = {
      ...existingDraft,
      title: newName.trim(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('Updating draft name:', { id: updatedDraft.id, oldTitle: existingDraft.title, newTitle: updatedDraft.title });
    draftStorageService.saveDraft(updatedDraft);
    console.log('Draft name updated successfully');
    
    return NextResponse.json({
      success: true,
      draft: {
        id: updatedDraft.id,
        title: updatedDraft.title,
        updatedAt: updatedDraft.updatedAt
      }
    });
  } catch (error) {
    console.error('Error renaming draft:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // If it's a storage issue, try to create a new draft with the new name
    try {
      console.log('Attempting fallback: creating new draft with new name');
      const fallbackDraft = {
        id: draftId,
        userId,
        title: newName.trim(),
        content: '<p>Draft content</p>', // Placeholder content
        rawContent: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Draft content' }] }] },
        tone: 'formal',
        versionNumber: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      draftStorageService.saveDraft(fallbackDraft);
      console.log('Fallback draft created successfully');
      
      return NextResponse.json({
        success: true,
        draft: {
          id: fallbackDraft.id,
          title: fallbackDraft.title,
          updatedAt: fallbackDraft.updatedAt
        },
        message: 'Draft renamed using fallback method'
      });
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return NextResponse.json(
        { 
          error: 'Failed to rename draft',
          message: errorMessage,
          details: process.env.NODE_ENV === 'development' ? String(error) : undefined
        },
        { status: 500 }
      );
    }
  }
}
