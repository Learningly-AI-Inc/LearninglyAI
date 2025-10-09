"use client"

import React from "react";
import { Markdown } from "@/components/ui/markdown";

interface ChatMessageProps {
  content: string;
  role: "user" | "assistant";
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ content, role }) => {
  if (role === "user") {
    return (
      <div className="max-w-[90%] rounded-2xl px-4 py-3 shadow-sm bg-gradient-to-r from-primary to-primary/80 text-primary-foreground ml-auto">
        <p className="text-sm font-medium leading-relaxed">{content}</p>
      </div>
    );
  }

  return (
    <div className="max-w-[95%] rounded-2xl px-4 py-3 shadow-sm bg-card border border-border text-card-foreground">
      <div className="flex items-start space-x-3">
        <div className="w-6 h-6 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
          <svg className="h-3 w-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 0c0 .993-.241 1.929-.668 2.754l-1.524-1.525a3.997 3.997 0 00.078-2.183l1.562-1.562C15.802 8.249 16 9.1 16 10zm-5.165 3.913l1.58 1.58A5.98 5.98 0 0110 16a5.976 5.976 0 01-2.516-.552l1.562-1.562a4.006 4.006 0 001.789.027zm-4.677-2.796a4.002 4.002 0 01-.041-2.08l-.08.08-1.53-1.533A5.98 5.98 0 004 10c0 .954.223 1.856.619 2.657l1.54-1.54zm-1.457-1.457l1.525 1.525a3.997 3.997 0 00.078 2.183l-1.562 1.562C4.198 11.751 4 10.9 4 10c0-.954.223-1.856.619-2.657l-1.54 1.54z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <Markdown>{content}</Markdown>
        </div>
      </div>
    </div>
  );
};
