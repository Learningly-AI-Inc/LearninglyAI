"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Clock, Edit, Trash2, Loader2 } from "lucide-react";

interface Draft {
  id: string;
  title: string;
  excerpt: string;
  tone: string;
  versionNumber: number;
  createdAt: string;
  updatedAt: string;
}

interface DraftsManagerProps {
  userId: string;
  onLoadDraft: (draftId: string) => void;
}

const DraftsManager: React.FC<DraftsManagerProps> = ({ userId, onLoadDraft }) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchDrafts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/writing/drafts/list?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load drafts');
      }
      
      const data = await response.json();
      setDrafts(data.drafts);
    } catch (err) {
      console.error('Error loading drafts:', err);
      setError('Failed to load your drafts. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load drafts when dialog opens
  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      fetchDrafts();
    }
  };

  const handleLoadDraft = (draftId: string) => {
    onLoadDraft(draftId);
    setIsOpen(false);
  };

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          My Drafts
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Your Drafts</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">{error}</div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            You don&apos;t have any saved drafts yet.
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {drafts.map((draft) => (
                <Card key={draft.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="py-3 px-4">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base font-medium">
                        {draft.title}
                      </CardTitle>
                      <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        {draft.tone}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 px-4">
                    <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                      {draft.excerpt}
                    </p>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        Updated {formatDate(draft.updatedAt)}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleLoadDraft(draft.id)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DraftsManager;
