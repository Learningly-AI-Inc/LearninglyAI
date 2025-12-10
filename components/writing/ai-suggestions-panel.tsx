"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle, X, RefreshCw, Eraser, Copy, AlertTriangle, ShieldCheck, Scan, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import MarkdownRenderer from "@/components/ui/markdown-renderer";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// AI Detection result interface
interface AIDetectionResult {
  score: number;
  confidence: 'low' | 'medium' | 'high';
  verdict: 'human' | 'likely_human' | 'mixed' | 'likely_ai' | 'ai';
  analysis: {
    patterns: string;
    vocabulary: string;
    structure: string;
    naturalness: string;
  };
  suggestions: string[];
}

interface AISuggestionsPanelProps {
  selectedText: string;
  onAccept: (newText: string, issueId?: string) => void;
  onReject: (issueId?: string) => void;
  onAcceptAll: () => void;
  onClear: () => void;
  onTryAgain?: () => void;
  isProcessing: boolean;
  suggestedText: string;
  grammarIssues: GrammarIssue[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onRevealIssue?: (issue: GrammarIssue) => void;
  currentIssueIndex?: number;
  onNavigateIssue?: (direction: 'next' | 'prev') => void;
  // New props for AI detection and humanizing
  onAIDetect?: () => void;
  onHumanize?: (style?: string) => void;
  aiDetectionResult?: AIDetectionResult | null;
  humanizedText?: string;
  isDetecting?: boolean;
  isHumanizing?: boolean;
}

interface GrammarIssue {
  id: string;
  original: string;
  suggestion: string;
  type: "grammar" | "spelling" | "style" | "clarity";
  description: string;
}

const AISuggestionsPanel: React.FC<AISuggestionsPanelProps> = ({
  selectedText,
  onAccept,
  onReject,
  onAcceptAll,
  onClear,
  onTryAgain,
  isProcessing,
  suggestedText,
  grammarIssues = [],
  activeTab,
  onTabChange,
  onRevealIssue,
  currentIssueIndex = -1,
  onNavigateIssue,
  onAIDetect,
  onHumanize,
  aiDetectionResult,
  humanizedText,
  isDetecting = false,
  isHumanizing = false
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [expandedIssueIds, setExpandedIssueIds] = useState<Record<string, boolean>>({});
  const grammarTabRef = React.useRef<HTMLDivElement>(null);

  // Debug logging
  React.useEffect(() => {
    console.log('🎯 AISuggestionsPanel render - grammarIssues:', grammarIssues.length, 'activeTab:', activeTab, 'isProcessing:', isProcessing);
  }, [grammarIssues, activeTab, isProcessing]);

  // Ensure grammar panel scrolls to top when loading or showing completion
  React.useEffect(() => {
    if (activeTab === 'grammar' && grammarTabRef.current) {
      grammarTabRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [activeTab, isProcessing, grammarIssues.length]);

  const handleCopyText = async () => {
    try {
      // Strip HTML tags to get plain text for copying
      const plainText = suggestedText.replace(/<[^>]*>?/gm, '');
      await navigator.clipboard.writeText(plainText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
    } catch (error) {
      console.error('Failed to copy text:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = suggestedText.replace(/<[^>]*>?/gm, '');
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };
  
  return (
    <Card className="shadow-sm rounded-lg h-full border bg-card overflow-hidden">
      <CardHeader className="bg-card border-b sticky top-0 z-10">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center">
            <span className="font-semibold text-foreground">Output</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyText}
              className="text-muted-foreground hover:text-foreground"
              disabled={isProcessing || (!suggestedText && grammarIssues.length === 0)}
            >
              <Copy className="h-4 w-4 mr-1" /> {copySuccess ? "Copied!" : "Copy"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClear}
              className="text-muted-foreground hover:text-foreground"
              disabled={isProcessing || (!suggestedText && grammarIssues.length === 0)}
            >
              <Eraser className="h-4 w-4 mr-1" /> Clear
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-full min-h-0">
        {/* Internal tabs; toolbar controls active value */}
        <Tabs value={activeTab} onValueChange={onTabChange} className="h-full flex flex-col min-h-0">
          {/* Common scrollable body wrapper for all tabs */}
          <TabsContent value="paraphrase" hidden={activeTab !== 'paraphrase'} className={`h-full m-0 flex flex-col ${activeTab !== 'paraphrase' ? 'hidden' : ''}`}>
            <div className="flex-1 min-h-0 overflow-auto px-4 pb-4 pt-4">
              {isProcessing ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  
                  <div className="space-y-2 mt-6">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  
                  <div className="flex gap-2 mt-6">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  
                  <div className="flex items-center justify-center mt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Generating paraphrase...</span>
                    </div>
                  </div>
                </div>
              ) : suggestedText ? (
                <div className="flex flex-col gap-4">
                  <div className="bg-muted rounded-lg p-4 shadow-sm border">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-foreground">Suggestion</h4>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onTryAgain?.()}
                              disabled={isProcessing}
                              className="h-7 px-2 text-xs"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Re-paraphrase
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Generate a new paraphrase</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto">
                      <div className="prose prose-sm max-w-none text-foreground">
                        {suggestedText.split(/\n\s*\n/).map((paragraph, index) => (
                          <p key={index} className="mb-4 leading-relaxed last:mb-0">
                            {paragraph.trim()}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => onTryAgain?.()}
                            className="flex-1"
                            disabled={isProcessing}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" /> 
                            {isProcessing ? 'Reparaphrasing...' : 'Re-paraphrase'}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Generate a new paraphrase with different wording</p>
                          <p className="text-xs text-muted-foreground mt-1">Ctrl+Shift+R</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onTryAgain?.()}
                            disabled={isProcessing}
                            className="px-3"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Quick re-paraphrase</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full border-2 border-dashed border-border rounded-lg bg-muted/30 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="p-4 bg-muted rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Ready to Help</h3>
                    <p className="text-muted-foreground mb-4">Select text and click "Paraphrase" to see suggestions</p>
                    <div className="bg-card rounded-lg p-3 border">
                      <p className="text-sm text-muted-foreground">
                        💡 <strong>Tip:</strong> You can also use the toolbar buttons to check grammar, shorten, or expand your text.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

            <TabsContent ref={grammarTabRef} value="grammar" hidden={activeTab !== 'grammar'} className={`${activeTab !== 'grammar' ? 'hidden' : 'h-full m-0 flex flex-col'}`}>
              <div className="flex-1 min-h-0 overflow-auto px-4 pb-4 pt-4">
                {isProcessing ? (
                  <div className="space-y-4">
                    {/* status at top */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Checking grammar...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-5/6" />
                  </div>
                ) : grammarIssues.length > 0 ? (
                  <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Badge variant="outline"><AlertTriangle className="mr-1 h-3 w-3" /> Found {grammarIssues.length} issues</Badge>
                      {grammarIssues.length > 0 && currentIssueIndex >= 0 && (
                        <Badge variant="secondary">
                          {currentIssueIndex + 1} of {grammarIssues.length}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {grammarIssues.length > 1 && onNavigateIssue && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onNavigateIssue('prev')}
                            className="h-7 px-2"
                            title="Previous issue"
                          >
                            ←
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onNavigateIssue('next')}
                            className="h-7 px-2"
                            title="Next issue"
                          >
                            →
                          </Button>
                        </div>
                      )}
                      <Button size="sm" variant="default" onClick={onAcceptAll}>
                        <CheckCircle className="h-4 w-4 mr-2" /> Fix All
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {grammarIssues.map((issue) => {
                      // Color coding for different issue types
                      const getIssueColors = (type: string) => {
                        switch (type) {
                          case 'grammar':
                            return {
                              badge: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800',
                              original: 'text-red-600 dark:text-red-400',
                              badgeText: 'Grammar'
                            };
                          case 'spelling':
                            return {
                              badge: 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-800',
                              original: 'text-orange-600 dark:text-orange-400',
                              badgeText: 'Spelling'
                            };
                          case 'style':
                            return {
                              badge: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
                              original: 'text-yellow-600 dark:text-yellow-400',
                              badgeText: 'Style'
                            };
                          case 'clarity':
                            return {
                              badge: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800',
                              original: 'text-blue-600 dark:text-blue-400',
                              badgeText: 'Clarity'
                            };
                          default:
                            return {
                              badge: 'bg-muted text-muted-foreground border-border',
                              original: 'text-muted-foreground',
                              badgeText: 'Issue'
                            };
                        }
                      };

                      const colors = getIssueColors(issue.type);

                      return (
                        <div key={issue.id} className="flex items-start justify-between gap-2 rounded-md border px-3 py-2 bg-card">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={`${colors.badge} border`}>{colors.badgeText}</Badge>
                            </div>
                            <div className={`text-xs text-foreground ${expandedIssueIds[issue.id] ? '' : 'truncate'}`}>
                              <span className={`line-through ${colors.original} mr-2`}>{issue.original}</span>
                              <span className="text-green-600 dark:text-green-400 font-medium">{issue.suggestion}</span>
                            </div>
                          <button
                            className="text-[11px] text-primary hover:underline mt-1"
                            onClick={() => {
                              setExpandedIssueIds((prev) => ({ ...prev, [issue.id]: !prev[issue.id] }));
                              onRevealIssue?.(issue);
                            }}
                          >
                            {expandedIssueIds[issue.id] ? 'Collapse' : 'View full'}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-green-600 dark:text-green-400" onClick={() => onAccept(issue.suggestion, issue.id)}>Accept</Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600 dark:text-red-400" onClick={() => onReject(issue.id)}>Deny</Button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border rounded-lg bg-muted/30 p-4">
                    <div className="text-center">
                      <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-2">Grammar Check Complete</h3>
                      <p className="text-green-600 dark:text-green-400">No issues found in your text!</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Humanizer Tab */}
            <TabsContent value="detector" className="h-full m-0 px-4 pb-4 pt-4 overflow-auto">
              {isHumanizing ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Humanizing your text...</span>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : humanizedText ? (
                <div className="flex flex-col gap-4">
                  <div className="bg-muted rounded-lg p-4 shadow-sm border">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Scan className="h-4 w-4 text-green-600" />
                        Humanized Text
                      </h4>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onHumanize?.()}
                              disabled={isHumanizing}
                              className="h-7 px-2 text-xs"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Re-humanize
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Generate a new humanized version</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      <div className="prose prose-sm max-w-none text-foreground">
                        {humanizedText.split(/\n\s*\n/).map((paragraph, index) => (
                          <p key={index} className="mb-4 leading-relaxed last:mb-0">
                            {paragraph.trim()}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => onAccept(humanizedText)}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Apply to Editor
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(humanizedText);
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 2000);
                      }}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      {copySuccess ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs text-muted-foreground self-center">Try different style:</span>
                    <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => onHumanize?.('natural')}>Natural</Button>
                    <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => onHumanize?.('casual')}>Casual</Button>
                    <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => onHumanize?.('professional')}>Professional</Button>
                    <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => onHumanize?.('academic')}>Academic</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full border-2 border-dashed border-border rounded-lg bg-muted/30">
                  <div className="text-center">
                    <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Scan className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Humanizer</h3>
                    <p className="text-muted-foreground mb-2">Click the "Humanizer" button in the toolbar to humanize your text</p>
                    <p className="text-xs text-muted-foreground">Makes AI-generated text sound more natural and human-written</p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* AI Checker Tab */}
            <TabsContent value="checker" className="h-full m-0 px-4 pb-4 pt-4 overflow-auto">
              {isDetecting ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing text for AI patterns...</span>
                  </div>
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              ) : aiDetectionResult ? (
                <div className="flex flex-col gap-4">
                  {/* Score Display */}
                  <div className="bg-muted rounded-lg p-4 shadow-sm border">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        AI Detection Result
                      </h4>
                      <Badge variant={
                        aiDetectionResult.verdict === 'human' || aiDetectionResult.verdict === 'likely_human' ? 'default' :
                        aiDetectionResult.verdict === 'mixed' ? 'secondary' : 'destructive'
                      }>
                        {aiDetectionResult.verdict.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>

                    {/* Score Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-green-600">Human</span>
                        <span className="font-medium">{aiDetectionResult.score}% AI Likelihood</span>
                        <span className="text-red-600">AI</span>
                      </div>
                      <Progress
                        value={aiDetectionResult.score}
                        className="h-3"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Confidence: {aiDetectionResult.confidence}
                      </p>
                    </div>

                    {/* Analysis Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex gap-2">
                        <Badge variant="outline" className="shrink-0">Patterns</Badge>
                        <span className="text-muted-foreground">{aiDetectionResult.analysis.patterns}</span>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="shrink-0">Vocabulary</Badge>
                        <span className="text-muted-foreground">{aiDetectionResult.analysis.vocabulary}</span>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="shrink-0">Structure</Badge>
                        <span className="text-muted-foreground">{aiDetectionResult.analysis.structure}</span>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="shrink-0">Naturalness</Badge>
                        <span className="text-muted-foreground">{aiDetectionResult.analysis.naturalness}</span>
                      </div>
                    </div>
                  </div>

                  {/* Suggestions */}
                  {aiDetectionResult.suggestions && aiDetectionResult.suggestions.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                      <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-400 mb-2">
                        💡 Suggestions to Make it More Human
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-blue-700 dark:text-blue-300">
                        {aiDetectionResult.suggestions.map((suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => onAIDetect?.()}
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Re-analyze
                    </Button>
                    {aiDetectionResult.score > 30 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onTabChange('detector');
                          onHumanize?.();
                        }}
                        className="flex-1"
                      >
                        <Scan className="h-4 w-4 mr-2" />
                        Humanize Text
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full border-2 border-dashed border-border rounded-lg bg-muted/30">
                  <div className="text-center">
                    <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <ShieldCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">AI Content Checker</h3>
                    <p className="text-muted-foreground mb-2">Click the "AI Checker" button in the toolbar to analyze your text</p>
                    <p className="text-xs text-muted-foreground">Detects if text appears to be AI-generated</p>
                  </div>
                </div>
              )}
            </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  )
};

export default AISuggestionsPanel;
