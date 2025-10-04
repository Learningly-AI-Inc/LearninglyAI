"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import RichTextEditor from "@/components/writing/rich-text-editor"
import WritingToolbar from "@/components/writing/writing-toolbar"
import AISuggestionsPanel from "@/components/writing/ai-suggestions-panel"
import DraftsManager from "@/components/writing/drafts-manager"
import WordCounter from "@/components/writing/word-counter"
import LengthAdjustDialog from "@/components/writing/length-adjust-dialog"
import { getMockUserId } from "@/lib/mock-user"
import { openInGoogleDocs, downloadFile } from "@/components/writing/google-docs-export"
import { toast } from "sonner"
import Toast from "@/components/ui/toast"
import { ImprovedWritingPage } from "./improved/improved-writing-page"

interface GrammarIssue {
  id: string;
  original: string;
  suggestion: string;
  type: "grammar" | "spelling" | "style" | "clarity";
  description: string;
}

const WritingPageClient = () => {
  const [editorContent, setEditorContent] = useState<string>("")
  const [editorRawContent, setEditorRawContent] = useState<any>(null)
  const [selectedText, setSelectedText] = useState<string>("")
  const [suggestedText, setSuggestedText] = useState<string>("")
  const [grammarIssues, setGrammarIssues] = useState<GrammarIssue[]>([])
  const [tone, setTone] = useState<string>("Formal")
  const [englishType, setEnglishType] = useState<string>("American")
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [processingAction, setProcessingAction] = useState<'paraphrase' | 'grammar' | 'shorten' | 'expand' | null>(null)
  const [collapseSuggestions, setCollapseSuggestions] = useState<boolean>(false)
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const [lastProcessedFeature, setLastProcessedFeature] = useState<string>("")
  const [lengthAdjustDialogOpen, setLengthAdjustDialogOpen] = useState<boolean>(false)
  const [lengthAdjustAction, setLengthAdjustAction] = useState<'shorten' | 'expand'>('shorten')

  const [editorKey, setEditorKey] = useState<number>(0)
  const [editorRef, setEditorRef] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<string>("paraphrase")
  const [lastSelectedText, setLastSelectedText] = useState<string>("") // Backup for selected text
  
  // Using Sonner toast directly
  
  // Function to handle paraphrasing (optionally re-paraphrase an existing suggestion)
  const handleParaphrase = async (sourceText?: string) => {
    // Use provided source text (e.g., current suggestion) or entire editor content
    let textToParaphrase = sourceText ?? editorContent;
    
    // Strip HTML tags to get plain text for paraphrasing
    if (textToParaphrase) {
      textToParaphrase = textToParaphrase.replace(/<[^>]*>?/gm, '').trim();
    }
    
    if (!textToParaphrase) {
      setSuggestedText("");
      setGrammarIssues([]);
      setLastProcessedFeature("Content Required");
      toast.warning("Please add some content to the editor before clicking 'Paraphrase'");
      return;
    }

    // Auto-switch to paraphrase tab
    setActiveTab("paraphrase");
    setIsProcessing(true);
    setProcessingAction('paraphrase');
    
    try {
      console.log('Paraphrasing entire content with tone:', tone); // Debug log
      // Call our API for paraphrasing
      const response = await fetch('/api/writing/paraphrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: textToParaphrase, 
          tone: tone.toLowerCase(), // Ensure consistent case
          userId: getMockUserId()
        })
      });
      
      if (!response.ok) {
        throw new Error('Paraphrasing request failed');
      }
      
      const data = await response.json();
      setSuggestedText(data.result);
      setLastProcessedFeature("Paraphrase");
      setIsProcessing(false);
      setProcessingAction(null);
      toast.info(`Entire content paraphrased successfully in ${tone} tone!`);
    } catch (error) {
      console.error("Error during paraphrasing:", error);
      setIsProcessing(false);
      setProcessingAction(null);
      toast.error("An error occurred while paraphrasing. Please try again.");
    }
  };

  // Function to handle grammar checking
  const handleGrammarCheck = async () => {
    // Try to get current selection first
    let textToCheck = selectedText;
    if (!textToCheck.trim()) {
      if (typeof window !== 'undefined') {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
          textToCheck = selection.toString().trim();
          setSelectedText(textToCheck);
        }
      }
      
      if (!textToCheck.trim() && lastSelectedText.trim()) {
        // Fall back to last known selection
        textToCheck = lastSelectedText;
        setSelectedText(textToCheck);
      }
    }
    
    // If still no text selected, use the entire editor content
    if (!textToCheck.trim()) {
      textToCheck = editorContent;
      // Strip HTML tags to get plain text for grammar checking
      if (textToCheck) {
        textToCheck = textToCheck.replace(/<[^>]*>?/gm, '').trim();
      }
    }
    
    if (!textToCheck.trim()) {
      setSuggestedText("");
      setGrammarIssues([]);
      setLastProcessedFeature("Content Required");
      toast.warning("Please add some content to the editor before clicking 'Check Grammar'");
      return;
    }

    // Auto-switch to grammar tab
    setActiveTab("grammar");
    setIsProcessing(true);
    setProcessingAction('grammar');
    
    try {
      // Call our API for grammar checking
      const response = await fetch('/api/writing/grammar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: textToCheck,
          userId: getMockUserId()
        })
      });
      
      if (!response.ok) {
        throw new Error('Grammar check request failed');
      }
      
      const data = await response.json();
      if (data.grammarIssues && data.grammarIssues.length > 0) {
        setGrammarIssues(data.grammarIssues);
        setLastProcessedFeature("Grammar Check");
        toast.info(`Found ${data.grammarIssues.length} grammar issue${data.grammarIssues.length > 1 ? 's' : ''} to review`);
      } else {
        setGrammarIssues([]);
        setLastProcessedFeature("Grammar Check (No issues)");
        toast.success('No grammar issues found. Your text looks great!');
      }
      setIsProcessing(false);
      setProcessingAction(null);
    } catch (error) {
      console.error("Error during grammar check:", error);
      setIsProcessing(false);
      setProcessingAction(null);
      toast.error("An error occurred while checking grammar. Please try again.");
    }
  };

  // Helper function to strip HTML tags for text matching
  const stripHtmlTags = (html: string) => {
    return html.replace(/<[^>]*>?/gm, '');
  };

  // Build an HTML-tolerant regex that matches the target text even if
  // there are inline tags, whitespace differences, or typographic quotes/dashes
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const charToPattern = (ch: string) => {
    if (/\s/.test(ch)) return '\\s+';
    if (ch === "'") return "[\\u2018\\u2019']"; // straight/smart single quotes
    if (ch === '"') return '[\\u201C\\u201D\"]'; // straight/smart double quotes
    if (ch === '-') return '[-\\u2013\\u2014]'; // hyphen/en dash/em dash
    return escapeRegex(ch);
  };
  const buildHtmlInterleavedRegex = (text: string) => {
    const inter = Array.from(text).map((ch) => charToPattern(ch)).join('(?:<[^>]*>\\s*)*');
    // Allow tags/whitespace before the first char and after the last
    const pattern = '(?:<[^>]*>\\s*)*' + inter + '(?:<[^>]*>\\s*)*';
    return new RegExp(pattern, 'i');
  };
  const normalizeSuggestion = (s: string) => {
    if (!s) return s;
    // Treat bracketed removal instructions as delete
    const trimmed = s.trim();
    if (/^\[.*remove.*\]$/i.test(trimmed) || /^\(.*remove.*\)$/i.test(trimmed)) return '';
    return trimmed;
  };
  const replaceHtmlTolerantOnce = (html: string, target: string, replacement: string) => {
    try {
      const regex = buildHtmlInterleavedRegex(target);
      return html.replace(regex, replacement);
    } catch {
      return html;
    }
  };

  // Function to handle accepting all grammar suggestions
  const handleAcceptAll = async () => {
    if (grammarIssues.length === 0) return;
    
    let updatedContent = editorContent;
    let appliedCount = 0;
    
    // Apply each grammar fix sequentially
    for (const issue of grammarIssues) {
      try {
        if (updatedContent.includes(issue.original)) {
          updatedContent = updatedContent.replace(
            new RegExp(issue.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 
            issue.suggestion
          );
          appliedCount++;
        } else {
          // Try flexible pattern matching
          const plainTextContent = stripHtmlTags(updatedContent);
          if (plainTextContent.includes(issue.original)) {
            const flexiblePattern = issue.original
              .split(' ')
              .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
              .join('\\s+(?:<[^>]*>\\s*)*');
            
            updatedContent = updatedContent.replace(
              new RegExp(flexiblePattern, 'i'),
              issue.suggestion
            );
            appliedCount++;
          } else {
            // Final fallback: robust HTML-tolerant, char-by-char interleaved matching
            const safeSuggestion = normalizeSuggestion(issue.suggestion);
            const replaced = replaceHtmlTolerantOnce(updatedContent, issue.original, safeSuggestion);
            if (replaced !== updatedContent) {
              updatedContent = replaced;
              appliedCount++;
            }
          }
        }
      } catch (error) {
        console.error(`Error applying fix for "${issue.original}":`, error);
      }
    }
    
    if (appliedCount > 0) {
      setEditorContent(updatedContent);
      setEditorKey(prev => prev + 1);
      setGrammarIssues([]);
      setSelectedText("");
      setLastSelectedText(""); // Clear backup
      toast.success(`All ${appliedCount} grammar issue${appliedCount > 1 ? 's' : ''} fixed successfully!`);
    } else {
      toast.error("Could not apply grammar fixes. Please try individual fixes.");
    }
  };

  // Function to handle accepting suggestions - improved approach
  const handleAcceptSuggestion = (newText: string) => {
    // Check if this is a grammar suggestion or paraphrase
    const issue = grammarIssues.find(issue => issue.suggestion === newText);
    const isParaphrase = !issue && newText === suggestedText;
    const textToReplace = issue?.original || selectedText;
    
    if (editorContent && textToReplace && textToReplace.trim()) {
      try {
        // Try multiple replacement strategies for better accuracy
        let updatedContent = editorContent;
        
        // Strategy 1: Direct replacement in HTML
        if (editorContent.includes(textToReplace)) {
          updatedContent = editorContent.replace(
            new RegExp(textToReplace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 
            newText
          );
        } else {
          // Strategy 2: Check if we need to find the text in plain text and replace in HTML
          const plainTextContent = stripHtmlTags(editorContent);
          if (plainTextContent.includes(textToReplace)) {
            // Create a more flexible regex that accounts for HTML tags
            const flexiblePattern = textToReplace
              .split(' ')
              .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
              .join('\\s+(?:<[^>]*>\\s*)*');
            
            updatedContent = editorContent.replace(
              new RegExp(flexiblePattern, 'i'),
              newText
            );
          } else {
            // Strategy 3: Robust fallback that tolerates tags and typography across characters
            const safeNewText = normalizeSuggestion(newText);
            const replaced = replaceHtmlTolerantOnce(editorContent, textToReplace, safeNewText);
            if (replaced !== editorContent) {
              updatedContent = replaced;
            }
          }
        }
        
        // Only proceed if content actually changed
        if (updatedContent !== editorContent) {
          // Force editor to update by setting content and incrementing key
          setEditorContent(updatedContent);
          setEditorKey(prev => prev + 1);
          
          // Also update raw content if available
          if (editorRawContent) {
            const updatedRawContent = { ...editorRawContent };
            setEditorRawContent(updatedRawContent);
          }
          
          if (isParaphrase) {
            // Clear paraphrase suggestions
            setSuggestedText("");
            setSelectedText("");
            setLastSelectedText(""); // Clear backup too
            toast.success("Text paraphrased successfully!");
          } else if (issue) {
            // Only remove the specific grammar issue that was accepted
            const updatedGrammarIssues = grammarIssues.filter(gi => gi.id !== issue.id);
            setGrammarIssues(updatedGrammarIssues);
            setSelectedText("");
            
            // Success message for grammar
            const remainingCount = grammarIssues.length - 1;
            if (remainingCount > 0) {
              toast.success(`Grammar issue fixed! ${remainingCount} remaining.`);
            } else {
              toast.success("Grammar issue fixed! All issues resolved.");
              setLastSelectedText(""); // Clear backup when all issues resolved
            }
          }
        } else {
          toast.warning("Could not find the exact text to replace. Please try selecting the text again.");
        }
        
      } catch (error) {
        console.error("Error replacing text:", error);
        toast.error("An error occurred while updating the text. Please try again.");
      }
    } else {
      // If no content or text to replace
      toast.warning("Unable to determine where to replace text. Please select text again.");
    }
  };

  // Scroll to and highlight the first occurrence of an issue in the editor
  const revealIssueInEditor = (issue: GrammarIssue) => {
    try {
      if (typeof document === 'undefined') return;
      const container = document.querySelector('.editor-class') as HTMLElement | null;
      if (!container) return;
      const plain = (editorContent || '').replace(/<[^>]*>?/gm, '');
      if (!plain || !issue?.original) return;
      // Build a robust HTML-tolerant regex to account for inline tags and typography
      const regex = buildHtmlInterleavedRegex(issue.original);
      const html = editorContent || '';
      const match = html.match(regex);
      if (!match) return;
      const startIndex = match.index ?? 0;
      // Create a temporary marker
      const before = html.slice(0, startIndex);
      const marked = `<span data-gi="1" class="bg-yellow-100 outline outline-1 outline-yellow-300">${match[0]}</span>`;
      const after = html.slice(startIndex + match[0].length);
      setEditorContent(before + marked + after);
      setEditorKey(prev => prev + 1);
      // Scroll to marker after re-render
      setTimeout(() => {
        const el = container.querySelector('[data-gi="1"]') as HTMLElement | null;
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Remove highlight after a moment
          setTimeout(() => {
            el.classList.remove('bg-yellow-100');
            el.classList.remove('outline');
            el.removeAttribute('data-gi');
          }, 1500);
        }
      }, 50);
    } catch {
      // best-effort only
    }
  };

  // Function to handle rejecting suggestions
  const handleRejectSuggestion = (issueId?: string) => {
    if (issueId) {
      // Remove only the specific grammar issue
      const updatedGrammarIssues = grammarIssues.filter(gi => gi.id !== issueId);
      setGrammarIssues(updatedGrammarIssues);
      if (updatedGrammarIssues.length > 0) {
        toast.info(`Grammar issue ignored. ${updatedGrammarIssues.length} remaining.`);
      } else {
        toast.success("Grammar issue ignored. All issues resolved.");
      }
    } else {
      // Clear all suggestions (for paraphrase rejection)
      setSuggestedText("");
      setGrammarIssues([]);
      setSelectedText("");
    }
  };
  
  // Function to clear all suggestions
  const handleClearSuggestions = () => {
    setSuggestedText("");
    setGrammarIssues([]);
    setLastProcessedFeature("");
  };

  // Function to handle saving drafts
  const handleSaveDraft = async () => {
    if (!editorContent.trim()) {
      toast.warning("Nothing to save. Please add some content first.");
      return;
    }

    toast.info("Saving draft...");
    
    try {
      const response = await fetch('/api/writing/drafts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: editorContent,
          rawContent: editorRawContent,
          tone,
          userId: "mock-user-id", // In production, this would be the actual user ID
          draftId: currentDraftId // This will be null for new drafts
        })
      });
      
      if (!response.ok) {
        throw new Error('Draft saving failed');
      }
      
      const data = await response.json();
      
      // Update the current draft ID if this is a new draft
      if (data.isNewDraft) {
        setCurrentDraftId(data.id);
      }
      
      toast.success(`Draft ${data.isNewDraft ? 'created' : 'updated'} successfully!`);
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error("Error saving draft. Please try again.");
    }
  };

  // Function to handle exporting
  const handleExport = async (format: string) => {
    if (!editorContent.trim()) {
      toast.warning("Nothing to export. Please add some content first.");
      return;
    }
    
    // Handle Google Docs export separately (client-side)
    if (format === "gdocs") {
      toast.info("Opening in Google Docs...");
      try {
        openInGoogleDocs(editorContent);
        toast.success("Opened in Google Docs successfully!");
        
        // Log the export
        await fetch('/api/writing/drafts/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            downloadFormat: "gdocs",
            userId: getMockUserId(),
            summaryId: currentDraftId || null
          })
        });
      } catch (error) {
        console.error("Error opening in Google Docs:", error);
        toast.error("Failed to open in Google Docs. Please try again.");
      }
      return;
    }
    
    // For simple text download, handle it client-side
    if (format === "txt") {
      toast.info(`Preparing TXT export...`);
      try {
        // Strip HTML tags for plain text
        const plainText = editorContent.replace(/<[^>]*>?/gm, '');
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `document-${timestamp}.txt`;
        
        // Download the file
        downloadFile(plainText, filename, "text/plain");
        
        toast.success(`Text file downloaded successfully!`);
        
        // Log the download
        await fetch('/api/writing/drafts/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            downloadFormat: format,
            userId: getMockUserId(),
            summaryId: currentDraftId || null
          })
        });
        
        return;
      } catch (error) {
        console.error("Error downloading text file:", error);
        toast.error("Text export failed. Please try again.");
        return;
      }
    }
    
    // For PDF and DOCX, use the server API
    toast.info(`Preparing ${format.toUpperCase()} export...`);
    
    try {
      const response = await fetch('/api/writing/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: editorContent,
          format,
          title: `Document-${new Date().toLocaleDateString()}`,
          userId: getMockUserId()
        })
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const data = await response.json();
      
      toast.success(`${format.toUpperCase()} export ready! Download started.`);
      
      // Create an invisible link to trigger download
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Also log the download in our database
      await fetch('/api/writing/drafts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          downloadFormat: format,
          userId: getMockUserId(),
          summaryId: currentDraftId || null // In production, this would track which summary was downloaded
        })
      });
    } catch (error) {
      console.error("Error exporting document:", error);
      toast.error(`${format.toUpperCase()} export failed. Please try again.`);
    }
  };

  // Function to handle tone changes
  const handleToneChange = (newTone: string) => {
    setTone(newTone);
  };

    // Function to open length adjust dialog
  const openLengthAdjustDialog = (action: 'shorten' | 'expand') => {
    if (!selectedText.trim()) {
      setSuggestedText("");
      setGrammarIssues([]);
      setLastProcessedFeature("Selection Required");
      toast.warning(`Please select text before using the ${action === 'shorten' ? 'shorten' : 'expand'} feature`);
      return;
    }
    
    setLengthAdjustAction(action);
    setLengthAdjustDialogOpen(true);
  };
  
  // Function to handle length adjustments with percentage parameter
  const handleLengthAdjust = async (action: 'shorten' | 'expand', percentage: number = 50) => {
    if (!selectedText.trim()) {
      toast.warning(`Please select text to ${action}`);
      return;
    }

    setIsProcessing(true);
    setActiveTab("paraphrase"); // Switch to paraphrase tab for length adjust results
    
    try {
      const response = await fetch('/api/writing/adjust-length', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: selectedText,
          action,
          percentage,
          userId: getMockUserId()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Text ${action} request failed`);
      }
      
      const data = await response.json();
      setSuggestedText(data.result);
      setLastProcessedFeature(`${action === 'shorten' ? 'Shortened' : 'Expanded'} Text (${percentage}%)`);
      setIsProcessing(false);
      toast.info(`Text ${action}ed successfully by ${percentage}%!`);
    } catch (error) {
      console.error(`Error ${action}ing text:`, error);
      setIsProcessing(false);
      toast.error(`An error occurred while ${action}ing the text. Please try again.`);
    }
  };

  // Handle editor content changes
  const handleEditorChange = (html: string, raw: any) => {
    setEditorContent(html);
    setEditorRawContent(raw);
  };

  // Function to get selected text from editor
  const handleTextSelection = () => {
    if (typeof window === 'undefined') return; // SSR guard
    
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const text = selection.toString().trim();
      setSelectedText(text);
      setLastSelectedText(text); // Keep a backup
    }
    // Don't clear selectedText immediately - let user actions handle it
  };

  // Function to handle loading a draft
  const handleLoadDraft = async (draftId: string) => {
    toast.info("Loading draft...");
    setIsProcessing(true);
    
    try {
      const response = await fetch(`/api/writing/drafts/load?userId=mock-user-id&draftId=${draftId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load draft');
      }
      
      const data = await response.json();
      
      // Update the editor content and other state
      setEditorContent(data.content);
      setEditorRawContent(data.rawContent || null);
      setTone(data.tone || "Formal");
      setCurrentDraftId(data.id);
      setEditorKey(prev => prev + 1); // Force editor re-render
      
      toast.success("Draft loaded successfully!");
    } catch (error) {
      console.error("Error loading draft:", error);
      toast.error("Error loading draft. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Add event listener for text selection
  useEffect(() => {
    if (typeof document === 'undefined') return; // SSR guard
    
    const handleSelectionWithDelay = () => {
      // Add a small delay to avoid conflicts with button clicks
      setTimeout(handleTextSelection, 100);
    };
    
    // Use selectionchange event which is more reliable for text selection
    document.addEventListener('selectionchange', handleSelectionWithDelay);
    
    return () => {
      document.removeEventListener('selectionchange', handleSelectionWithDelay);
    };
  }, []);

  return (
    <ImprovedWritingPage
      header={null}
      draftsManager={
        <DraftsManager
          userId={getMockUserId()}
          onLoadDraft={handleLoadDraft}
        />
      }
      writingToolbar={
        <WritingToolbar
          onParaphrase={handleParaphrase}
          onCheckGrammar={handleGrammarCheck}
          onSaveDraft={handleSaveDraft}
          onExport={handleExport}
          onToneChange={handleToneChange}
          onLengthAdjustClick={openLengthAdjustDialog}
          selectedTone={tone}
          isProcessing={isProcessing}
          processingAction={processingAction}
          hasContent={editorContent.trim().length > 0}
          lastProcessedFeature={lastProcessedFeature}
          onSelectOutput={(panel) => setActiveTab(panel)}
          selectedEnglishType={englishType}
          onEnglishTypeChange={setEnglishType}
        />
      }
      richTextEditor={
        <RichTextEditor
          key={`editor-${editorKey}`}
          initialContent={editorContent}
          onChange={handleEditorChange}
          height="100%"
          onSelectedTextChange={setSelectedText}
          setEditorRef={setEditorRef}
        />
      }
      wordCounter={
        <WordCounter text={editorContent} />
      }
      aiSuggestionsPanel={
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-auto">
            <AISuggestionsPanel
              selectedText={selectedText}
              onAccept={handleAcceptSuggestion}
              onReject={handleRejectSuggestion}
              onAcceptAll={handleAcceptAll}
              onClear={handleClearSuggestions}
              onTryAgain={() => handleParaphrase(suggestedText || editorContent)}
              isProcessing={isProcessing}
              suggestedText={suggestedText}
              grammarIssues={grammarIssues}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onRevealIssue={revealIssueInEditor}
            />
          </div>
        </div>
      }
    />
  )
}

export default WritingPageClient
