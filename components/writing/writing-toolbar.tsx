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
  Loader2,
  ShieldCheck,
  Scan,
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
  // Which action is currently processing; used to scope spinners to the right button
  processingAction?: 'paraphrase' | 'grammar' | 'shorten' | 'expand' | null;
  hasContent: boolean;
  lastProcessedFeature?: string;
  onSelectOutput: (panel: 'paraphrase' | 'grammar' | 'detector' | 'checker') => void;
  selectedEnglishType: string;
  onEnglishTypeChange: (type: string) => void;
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
  processingAction,
  hasContent,
  lastProcessedFeature,
  onSelectOutput,
  selectedEnglishType,
  onEnglishTypeChange,
}) => {
  const toneOptions = ["Formal", "Informal", "Academic", "Casual"];
  const englishOptions = ["American", "British"];
  
  return (
    <div className="flex flex-wrap gap-3 items-center justify-between py-3 px-3 bg-white">
      <div className="flex flex-wrap gap-2 items-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="sm"
                onClick={onParaphrase}
                disabled={isProcessing || !hasContent}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0 px-3 py-2 h-9"
                onMouseDown={() => onSelectOutput('paraphrase')}
              >
                {isProcessing && processingAction === 'paraphrase' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Paraphrasing...
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
              <p>Rewrite entire content with smart assistance</p>
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
                className="bg-sky-600 hover:bg-sky-700 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0 px-3 py-2 h-9"
                onMouseDown={() => onSelectOutput('grammar')}
              >
                {isProcessing && processingAction === 'grammar' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Check Grammar
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Check grammar and spelling errors</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {/* AI Detector */}
        <Button
          variant="outline"
          size="sm"
          onMouseDown={() => onSelectOutput('detector')}
          className="text-gray-700 border-gray-300 h-9"
        >
          <Scan className="h-4 w-4 mr-2" />
          AI Detector
        </Button>
        {/* AI Checker */}
        <Button
          variant="outline"
          size="sm"
          onMouseDown={() => onSelectOutput('checker')}
          className="text-gray-700 border-gray-300 h-9"
        >
          <ShieldCheck className="h-4 w-4 mr-2" />
          AI Checker
        </Button>

        {/* Shorten / Expand */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onLengthAdjustClick('shorten')}
                disabled={isProcessing || !hasContent}
                className="text-gray-700 border-gray-300 h-9"
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
                variant="outline"
                size="sm"
                onClick={() => onLengthAdjustClick('expand')}
                disabled={isProcessing || !hasContent}
                className="text-gray-700 border-gray-300 h-9"
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
        {/* Tune (Tone) Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Tune:</span>
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

        {/* English Type Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">English:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-white border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1 h-8"
              >
                {selectedEnglishType}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-36">
              {englishOptions.map((opt) => (
                <DropdownMenuItem key={opt} className="cursor-pointer" onClick={() => onEnglishTypeChange(opt)}>
                  {opt}
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
