"use client";

import React, { useState, useEffect } from "react";
import { 
  Wand2, 
  ChevronDown, 
  ShrinkIcon, 
  ExpandIcon, 
  CheckCircle,
  Book
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FloatingFormatWidgetProps {
  onParaphrase: () => void;
  onToneChange: (tone: string) => void;
  onShorten: () => void;
  onExpand: () => void;
  selectedText: string;
  selectedTone: string;
  isVisible: boolean;
}

const FloatingFormatWidget: React.FC<FloatingFormatWidgetProps> = ({
  onParaphrase,
  onToneChange,
  onShorten,
  onExpand,
  selectedText,
  selectedTone,
  isVisible
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const toneOptions = ["Formal", "Informal", "Academic", "Casual"];
  
  useEffect(() => {
    const updatePosition = () => {
      const selection = window.getSelection();
      
      if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Position the widget above the selection with better positioning
        const top = window.scrollY + rect.top - 50; // 50px above selection
        const left = Math.max(10, window.scrollX + rect.left + (rect.width / 2) - 100); // Centered but not off-screen
        
        setPosition({ top, left });
      }
    };
    
    // Update position with a small delay to ensure selection is complete
    const delayedUpdate = () => {
      setTimeout(updatePosition, 50);
    };
    
    // Update position whenever selection changes
    document.addEventListener('selectionchange', delayedUpdate);
    document.addEventListener('mouseup', delayedUpdate);
    updatePosition(); // Initial position
    
    return () => {
      document.removeEventListener('selectionchange', delayedUpdate);
      document.removeEventListener('mouseup', delayedUpdate);
    };
  }, [selectedText, isVisible]);
  
  if (!isVisible || !selectedText) return null;
  
  return (
    <div 
      className="fixed z-[9999] bg-background border-2 border-border shadow-xl rounded-lg py-2 px-3 flex items-center gap-2 animate-in fade-in-0 zoom-in-95 duration-200"
      style={{ 
        top: `${Math.max(10, position.top)}px`, 
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
        minWidth: '200px'
      }}
    >
      <button
        onClick={onParaphrase}
        className="p-2 hover:bg-accent rounded-md text-foreground transition-colors"
        title="Paraphrase"
      >
        <Wand2 className="h-4 w-4" />
      </button>
      
      <DropdownMenu>
        <DropdownMenuTrigger className="p-2 hover:bg-primary/10 rounded-md text-primary flex items-center gap-1 transition-colors">
          <Book className="h-4 w-4" />
          <ChevronDown className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {toneOptions.map((tone) => (
            <DropdownMenuItem
              key={tone}
              onClick={() => onToneChange(tone)}
              className="text-sm flex items-center"
            >
              {tone === selectedTone && (
                <CheckCircle className="h-3 w-3 mr-1 text-green-500 dark:text-green-400" />
              )}
              {tone}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      <button
        onClick={onShorten}
        className="p-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md text-orange-600 dark:text-orange-400 transition-colors"
        title="Shorten Text"
      >
        <ShrinkIcon className="h-4 w-4" />
      </button>
      
      <button
        onClick={onExpand}
        className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md text-green-600 dark:text-green-400 transition-colors"
        title="Expand Text"
      >
        <ExpandIcon className="h-4 w-4" />
      </button>
    </div>
  );
};

export default FloatingFormatWidget;
