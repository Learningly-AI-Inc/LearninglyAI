"use client";

import React from "react";
import {
  RefreshCw,
  CheckCircle,
  ChevronDown,
  Download,
  Save,
  Book,
  Wand2,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WritingToolbarProps {
  onParaphrase: () => void;
  onCheckGrammar: () => void;
  onSaveDraft: () => void;
  onExport: (format: string) => void;
  onToneChange: (tone: string) => void;
  onLengthAdjustClick: (action: 'shorten' | 'expand') => void;
  selectedTone: string;
  isProcessing: boolean;
  hasContent: boolean;
  lastProcessedFeature?: string;
}

const WritingToolbar: React.FC<WritingToolbarProps> = ({
  onParaphrase,
  onCheckGrammar,
  onSaveDraft,
  onExport,
  onToneChange,
  onLengthAdjustClick,
  selectedTone,
  isProcessing,
  hasContent,
  lastProcessedFeature,
}) => {
  const toneOptions = ["Formal", "Informal", "Academic", "Casual"];
  
  return (
    <div className="flex flex-wrap gap-3 items-center justify-between py-4 px-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
      <div className="flex flex-wrap gap-3 items-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="sm"
                onClick={onParaphrase}
                disabled={isProcessing || !hasContent}
                className="bg-gray-900 hover:bg-black text-white shadow-md hover:shadow-lg transition-all duration-200 border-0 px-4 py-2 h-9"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Paraphrase
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Rewrite selected text with smart assistance</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="sm"
                onClick={onCheckGrammar}
                disabled={isProcessing || !hasContent}
                className="bg-gray-800 hover:bg-gray-900 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0 px-4 py-2 h-9"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Check Grammar
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Check grammar and spelling errors</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="sm"
                onClick={() => onLengthAdjustClick('shorten')}
                disabled={isProcessing || !hasContent}
                className="bg-gray-700 hover:bg-gray-800 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0 px-4 py-2 h-9"
              >
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Shorten
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Shorten selected text</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="sm"
                onClick={() => onLengthAdjustClick('expand')}
                disabled={isProcessing || !hasContent}
                className="bg-gray-600 hover:bg-gray-700 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0 px-4 py-2 h-9"
              >
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Expand
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Expand selected text</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-3">
        {/* Tone Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Tone:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-white border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1 h-8"
              >
                {selectedTone}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-32">
              {toneOptions.map((tone) => (
                <DropdownMenuItem
                  key={tone}
                  onClick={() => onToneChange(tone)}
                  className="cursor-pointer"
                >
                  {tone}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Save Draft Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onSaveDraft}
                disabled={isProcessing || !hasContent}
                className="bg-white border-gray-300 hover:bg-gray-50 text-gray-700 shadow-sm hover:shadow-md transition-all duration-200 px-3 py-1 h-8"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Save current document as draft</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Export Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isProcessing || !hasContent}
                    className="bg-white border-gray-300 hover:bg-gray-50 text-gray-700 shadow-sm hover:shadow-md transition-all duration-200 px-3 py-1 h-8"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-32">
                  <DropdownMenuItem onClick={() => onExport("pdf")} className="cursor-pointer">
                    <Book className="h-4 w-4 mr-2" />
                    PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExport("docx")} className="cursor-pointer">
                    <Book className="h-4 w-4 mr-2" />
                    DOCX
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExport("txt")} className="cursor-pointer">
                    <Book className="h-4 w-4 mr-2" />
                    TXT
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExport("gdoc")} className="cursor-pointer">
                    <Book className="h-4 w-4 mr-2" />
                    Google Docs
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            <TooltipContent>
              <p>Export document in various formats</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Last Processed Feature Indicator */}
      {lastProcessedFeature && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {lastProcessedFeature}
          </span>
        </div>
      )}
    </div>
  );
};

export default WritingToolbar;
