import { NextRequest, NextResponse } from 'next/server';
import { draftStorageService } from '@/lib/draft-storage';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId') || 'mock-user-id';
    
    // Get all drafts for the user
    const userDrafts = draftStorageService.getUserDrafts(userId);
    
    // Get storage size
    const storageSize = (draftStorageService as any).draftStorage?.size || 0;
    
    return NextResponse.json({
      message: 'Debug info for draft storage',
      userId,
      storageSize,
      userDraftsCount: userDrafts.length,
      userDrafts: userDrafts.map(d => ({
        id: d.id,
        title: d.title,
        userId: d.userId,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error in debug API:', error);
    return NextResponse.json(
      { error: 'Failed to get debug info', details: String(error) },
      { status: 500 }
    );
  }
}
