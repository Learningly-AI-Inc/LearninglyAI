"use client";

import React from "react";
import { Clock, FileText } from "lucide-react";

interface WordCounterProps {
  text: string;
  className?: string;
}

const WordCounter: React.FC<WordCounterProps> = ({ text, className = "" }) => {
  // Function to count words
  const getWordCount = (content: string): number => {
    if (!content || content.trim() === "") return 0;
    
    // Strip HTML tags if present
    const strippedContent = content.replace(/<\/?[^>]+(>|$)/g, " ");
    
    // Split by whitespace and filter out empty strings
    const words = strippedContent.trim().split(/\s+/).filter(Boolean);
    
    return words.length;
  };

  // Function to count characters
  const getCharCount = (content: string): number => {
    if (!content) return 0;
    
    // Strip HTML tags if present
    const strippedContent = content.replace(/<\/?[^>]+(>|$)/g, "");
    
    return strippedContent.length;
  };

  // Function to estimate reading time (words per minute)
  const getReadingTime = (wordCount: number): string => {
    const wordsPerMinute = 200;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    
    if (minutes < 1) {
      return "< 1 min read";
    }
    
    return `${minutes} min read`;
  };

  const wordCount = getWordCount(text);
  const charCount = getCharCount(text);
  const readingTime = getReadingTime(wordCount);

  return (
    <div className={`flex items-center justify-between text-sm text-gray-600 ${className}`}>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1">
          <FileText className="h-4 w-4 text-blue-600" />
          <span className="font-medium">{wordCount}</span>
          <span className="text-gray-500">word{wordCount !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-400">•</span>
          <span className="font-medium">{charCount}</span>
          <span className="text-gray-500">character{charCount !== 1 ? "s" : ""}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Clock className="h-4 w-4 text-green-600" />
        <span className="font-medium text-gray-700">{readingTime}</span>
      </div>
    </div>
  );
};

export default WordCounter;
