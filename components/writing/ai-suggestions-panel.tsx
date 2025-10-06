"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle, X, RefreshCw, Eraser, Copy, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import MarkdownRenderer from "@/components/ui/markdown-renderer";
import { Badge } from "@/components/ui/badge";

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
  onNavigateIssue
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [expandedIssueIds, setExpandedIssueIds] = useState<Record<string, boolean>>({});

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
    <Card className="shadow-sm rounded-lg h-full border bg-white overflow-hidden">
      <CardHeader className="bg-white border-b sticky top-0 z-10">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center">
            <span className="font-semibold text-gray-800">Output</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onClear}
              className="text-gray-600 hover:text-gray-900"
              disabled={isProcessing || (!suggestedText && grammarIssues.length === 0)}
            >
              <Eraser className="h-4 w-4 mr-1" /> Clear
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-full min-h-0">
        {/* Keep internal tab state but hide the visual tabs; the toolbar will control it */}
        <Tabs value={activeTab} onValueChange={onTabChange} className="h-full flex flex-col min-h-0">
          <div className="flex-1 px-4 pb-4 overflow-auto">
            <TabsContent value="paraphrase" className="h-full m-0">
              {isProcessing ? (
                <div className="space-y-4 p-4">
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
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Generating paraphrase...</span>
                    </div>
                  </div>
                </div>
              ) : suggestedText ? (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 max-h-72 overflow-auto">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Suggestion</h4>
                    <div className="max-h-60 overflow-auto">
                      <MarkdownRenderer 
                        content={suggestedText}
                        className="prose prose-sm max-w-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyText}
                      className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <Copy className="h-4 w-4 mr-2" /> 
                      {copySuccess ? "Copied!" : "Copy"}
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => onTryAgain?.()}
                      className="flex-1 bg-gray-900 hover:bg-black text-white"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" /> Try Again
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full border-2 border-dashed border-gray-300 rounded-lg bg-white/50 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-gray-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Ready to Help</h3>
                    <p className="text-gray-600 mb-4">Select text and click "Paraphrase" to see suggestions</p>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-sm text-gray-600">
                        💡 <strong>Tip:</strong> You can also use the toolbar buttons to check grammar, shorten, or expand your text.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="grammar" className="h-full m-0">
              {isProcessing ? (
                <div className="space-y-4 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-5/6" />
                </div>
              ) : grammarIssues.length > 0 ? (
                <div className="space-y-3 p-3 h-full min-h-0 flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Badge variant="outline" className="text-gray-700 border-gray-300"><AlertTriangle className="mr-1" /> Found {grammarIssues.length} issues</Badge>
                      {grammarIssues.length > 0 && currentIssueIndex >= 0 && (
                        <Badge variant="secondary" className="text-blue-700 bg-blue-100">
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
                            className="h-7 px-2 border-gray-300"
                            title="Previous issue"
                          >
                            ←
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => onNavigateIssue('next')}
                            className="h-7 px-2 border-gray-300"
                            title="Next issue"
                          >
                            →
                          </Button>
                        </div>
                      )}
                      <Button size="sm" variant="default" onClick={onAcceptAll} className="bg-gray-900 hover:bg-black text-white">
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
                              badge: 'bg-red-100 text-red-800 border-red-200',
                              original: 'text-red-600',
                              badgeText: 'Grammar'
                            };
                          case 'spelling':
                            return {
                              badge: 'bg-orange-100 text-orange-800 border-orange-200',
                              original: 'text-orange-600',
                              badgeText: 'Spelling'
                            };
                          case 'style':
                            return {
                              badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                              original: 'text-yellow-600',
                              badgeText: 'Style'
                            };
                          case 'clarity':
                            return {
                              badge: 'bg-blue-100 text-blue-800 border-blue-200',
                              original: 'text-blue-600',
                              badgeText: 'Clarity'
                            };
                          default:
                            return {
                              badge: 'bg-gray-100 text-gray-800 border-gray-200',
                              original: 'text-gray-600',
                              badgeText: 'Issue'
                            };
                        }
                      };

                      const colors = getIssueColors(issue.type);

                      return (
                        <div key={issue.id} className="flex items-start justify-between gap-2 rounded-md border px-3 py-2 bg-white">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={`${colors.badge} border`}>{colors.badgeText}</Badge>
                            </div>
                            <div className={`text-xs text-gray-700 ${expandedIssueIds[issue.id] ? '' : 'truncate'}`}>
                              <span className={`line-through ${colors.original} mr-2`}>{issue.original}</span>
                              <span className="text-green-700 font-medium">{issue.suggestion}</span>
                            </div>
                          <button
                            className="text-[11px] text-blue-600 hover:underline mt-1"
                            onClick={() => {
                              setExpandedIssueIds((prev) => ({ ...prev, [issue.id]: !prev[issue.id] }));
                              onRevealIssue?.(issue);
                            }}
                          >
                            {expandedIssueIds[issue.id] ? 'Collapse' : 'View full'}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button size="sm" variant="outline" className="h-7 px-2 border-gray-300 text-green-700" onClick={() => onAccept(issue.suggestion, issue.id)}>Accept</Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600" onClick={() => onReject(issue.id)}>Deny</Button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full border-2 border-dashed border-gray-300 rounded-lg bg-white/50">
                  <div className="text-center">
                    <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-green-700 mb-2">Grammar Check Complete</h3>
                    <p className="text-green-600">No issues found in your text!</p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Placeholder content for AI Detector */}
            <TabsContent value="detector" className="h-full m-0">
              <div className="flex items-center justify-center h-full border-2 border-dashed border-gray-300 rounded-lg bg-white/50">
                <div className="text-center">
                  <div className="p-4 bg-yellow-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-yellow-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-yellow-700 mb-2">AI Detector</h3>
                  <p className="text-yellow-700/80">Coming soon</p>
                </div>
              </div>
            </TabsContent>

            {/* Placeholder content for AI Checker */}
            <TabsContent value="checker" className="h-full m-0">
              <div className="flex items-center justify-center h-full border-2 border-dashed border-gray-300 rounded-lg bg-white/50">
                <div className="text-center">
                  <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-blue-700 mb-2">AI Checker</h3>
                  <p className="text-blue-700/80">Coming soon</p>
                </div>
              </div>
            </TabsContent>

          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
};

export default AISuggestionsPanel;
