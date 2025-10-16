// Simple in-memory storage for drafts
// In production, this would be replaced with a proper database
// Use a global variable to ensure persistence across API calls
declare global {
  var __draftStorage: Map<string, any> | undefined;
}

const draftStorage = globalThis.__draftStorage ?? new Map<string, any>();
if (!globalThis.__draftStorage) {
  globalThis.__draftStorage = draftStorage;
}

// Add some debugging
console.log('Draft storage initialized, current size:', draftStorage.size);

export interface Draft {
  id: string;
  userId: string;
  title: string;
  content: string;
  rawContent?: any;
  tone: string;
  versionNumber: number;
  createdAt: string;
  updatedAt: string;
}

export const draftStorageService = {
  // Save or update a draft
  saveDraft(draft: Draft): void {
    console.log('Saving draft to storage:', { id: draft.id, title: draft.title, userId: draft.userId });
    draftStorage.set(draft.id, draft);
    console.log('Draft saved, storage size now:', draftStorage.size);
  },

  // Get a draft by ID
  getDraft(draftId: string): Draft | undefined {
    return draftStorage.get(draftId);
  },

  // Get all drafts for a user
  getUserDrafts(userId: string): Draft[] {
    console.log('Getting drafts for user:', userId, 'storage size:', draftStorage.size);
    const allDrafts = Array.from(draftStorage.values());
    console.log('All drafts in storage:', allDrafts.map(d => ({ id: d.id, userId: d.userId, title: d.title })));
    const userDrafts = allDrafts
      .filter(draft => draft.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    console.log('User drafts found:', userDrafts.length);
    return userDrafts;
  },

  // Delete a draft
  deleteDraft(draftId: string): boolean {
    return draftStorage.delete(draftId);
  },

  // Generate a unique title for new drafts
  generateDraftTitle(userId: string): string {
    const userDrafts = this.getUserDrafts(userId);
    const untitledDrafts = userDrafts.filter(draft => draft.title.startsWith('Untitled'));
    return `Untitled ${untitledDrafts.length + 1}`;
  }
};
