import { NextRequest, NextResponse } from 'next/server';
import { draftStorageService } from '@/lib/draft-storage';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId') || 'test-user';
    
    // Test creating a draft
    const testDraft = {
      id: 'test-draft-1',
      userId,
      title: 'Test Draft',
      content: 'This is a test draft content',
      rawContent: null,
      tone: 'formal',
      versionNumber: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save the test draft
    draftStorageService.saveDraft(testDraft);
    
    // Try to retrieve it
    const retrievedDraft = draftStorageService.getDraft('test-draft-1');
    const userDrafts = draftStorageService.getUserDrafts(userId);
    
    return NextResponse.json({
      success: true,
      testDraft,
      retrievedDraft,
      userDraftsCount: userDrafts.length,
      storageWorking: !!retrievedDraft
    });
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
