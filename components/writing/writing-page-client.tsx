"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import TiptapEditor from "@/components/writing/tiptap-editor"
import { TiptapToolbar } from "@/components/writing/tiptap-toolbar"
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
  const [highlightedContent, setHighlightedContent] = useState<string>("")
  const [currentIssueIndex, setCurrentIssueIndex] = useState<number>(-1)
  const [lastGrammarCheckHash, setLastGrammarCheckHash] = useState<string>("")
  const [lastGrammarCheckResult, setLastGrammarCheckResult] = useState<'no-issues' | 'had-issues' | null>(null)
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

    // Ensure textToParaphrase is a string
    if (typeof textToParaphrase !== 'string') {
      console.error('textToParaphrase is not a string:', typeof textToParaphrase, textToParaphrase);
      textToParaphrase = '';
    }

    // Strip HTML tags to get plain text for paraphrasing
    if (textToParaphrase) {
      textToParaphrase = textToParaphrase.replace(/<[^>]*>?/gm, '').trim();
    }

    if (!textToParaphrase || textToParaphrase.trim() === '') {
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
      console.log('Paraphrasing text:', textToParaphrase.substring(0, 100)); // Debug log
      console.log('Text type:', typeof textToParaphrase); // Debug log
      console.log('Tone:', tone); // Debug log

      // Call our API for paraphrasing
      const response = await fetch('/api/writing/paraphrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: String(textToParaphrase), // Ensure it's a string
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
      toast.success(`Entire content paraphrased successfully in ${tone} tone!`);
    } catch (error) {
      console.error("Error during paraphrasing:", error);
      setIsProcessing(false);
      setProcessingAction(null);
      toast.error("An error occurred while paraphrasing. Please try again.");
    }
  };

  // Function to handle grammar checking
  const handleGrammarCheck = async () => {
    // Store current editor content to prevent it from being cleared
    const currentContent = editorContent;

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
      textToCheck = currentContent;
      // Ensure textToCheck is a string
      if (typeof textToCheck !== 'string') {
        textToCheck = String(textToCheck || '');
      }
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

    // Check if we've already processed this exact content
    const currentContentHash = createContentHash(textToCheck);
    if (currentContentHash === lastGrammarCheckHash && lastGrammarCheckResult === 'no-issues') {
      toast.info("This content has already been checked and has no grammar issues.");
      setActiveTab("grammar");
      return;
    }

    // If we've already processed this content and it had issues, but now has no issues,
    // it means the user fixed them, so show no issues
    if (currentContentHash === lastGrammarCheckHash && lastGrammarCheckResult === 'had-issues' && grammarIssues.length === 0) {
      toast.success("No grammar issues found. Your text looks great!");
      setActiveTab("grammar");
      setLastGrammarCheckResult('no-issues');
      return;
    }

    // Auto-switch to grammar tab BEFORE starting processing
    setActiveTab("grammar");

    // Set processing state AFTER switching tab to prevent UI flickering
    setTimeout(() => {
      setIsProcessing(true);
      setProcessingAction('grammar');
    }, 10);

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

      // IMPORTANT: Don't modify editor content - just update grammar issues
      if (data.grammarIssues && data.grammarIssues.length > 0) {
        setGrammarIssues(data.grammarIssues);
        setLastProcessedFeature("Grammar Check");
        setLastGrammarCheckHash(currentContentHash);
        setLastGrammarCheckResult('had-issues');
        setHighlightedContent("");

        // Highlight grammar issues in the editor
        if (editorRef && editorRef.clearGrammarHighlights) {
          editorRef.clearGrammarHighlights(); // Clear old highlights first

          // Apply new highlights
          const editorText = editorRef.getText();
          data.grammarIssues.forEach((issue: any) => {
            const index = editorText.indexOf(issue.original);
            if (index !== -1 && editorRef.highlightGrammarIssue) {
              editorRef.highlightGrammarIssue(
                index + 1, // +1 because Tiptap positions start at 1
                index + 1 + issue.original.length,
                issue.id,
                issue.type
              );
            }
          });
        }

        toast.info(`Found ${data.grammarIssues.length} grammar issue${data.grammarIssues.length > 1 ? 's' : ''} to review.`);
      } else {
        setGrammarIssues([]);
        setHighlightedContent("");
        setCurrentIssueIndex(-1);
        setLastProcessedFeature("Grammar Check (No issues)");
        setLastGrammarCheckHash(currentContentHash);
        setLastGrammarCheckResult('no-issues');
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

  // Escape text for safe placement inside HTML attribute values
  const escapeHtmlAttribute = (value: string) => {
    if (value == null) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  // Simple hash function to track content changes
  const createContentHash = (text: string) => {
    const cleanText = stripHtmlTags(text).toLowerCase().replace(/\s+/g, ' ').trim();
    let hash = 0;
    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  };

  // Removed highlightGrammarIssues function - no longer needed since we don't highlight in the editor

  // Function to navigate to next/previous issue
  const navigateToIssue = (direction: 'next' | 'prev') => {
    if (grammarIssues.length === 0) return;
    
    const newIndex = direction === 'next' 
      ? (currentIssueIndex + 1) % grammarIssues.length
      : (currentIssueIndex - 1 + grammarIssues.length) % grammarIssues.length;
    
    setCurrentIssueIndex(newIndex);
    const issue = grammarIssues[newIndex];
    
    // Scroll to and highlight the issue
    setTimeout(() => {
      const issueElement = document.querySelector(`[data-issue-id="${issue.id}"]`);
      if (issueElement) {
        issueElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add temporary highlight
        issueElement.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
        setTimeout(() => {
          issueElement.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
        }, 2000);
      }
    }, 100);
  };

  // Removed clearHighlights function - no longer needed since we don't use highlights

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
      // Clean up the updated content to prevent extra line breaks
      let cleanedContent = updatedContent.trim();

      // Update state first
      setEditorContent(cleanedContent);
      setGrammarIssues([]);
      setHighlightedContent("");
      setCurrentIssueIndex(-1);
      setLastGrammarCheckHash(""); // Reset hash since content changed
      setLastGrammarCheckResult(null); // Reset result since content changed
      setSelectedText("");
      setLastSelectedText(""); // Clear backup

      // Then update the editor with a slight delay to ensure state is synced
      setTimeout(() => {
        // First, clear all grammar highlights
        if (editorRef && editorRef.clearGrammarHighlights) {
          editorRef.clearGrammarHighlights();
        }

        // Then update content
        if (editorRef && (editorRef as any).replaceHtmlContent) {
          (editorRef as any).replaceHtmlContent(cleanedContent);
        } else {
          setEditorKey(prev => prev + 1);
        }

        // Clear highlights again after content update to ensure they're gone
        setTimeout(() => {
          if (editorRef && editorRef.clearGrammarHighlights) {
            editorRef.clearGrammarHighlights();
          }
          ensureEditorFocus();
        }, 100);
      }, 50);

      toast.success(`All ${appliedCount} grammar issue${appliedCount > 1 ? 's' : ''} fixed successfully!`);
    } else {
      toast.error("Could not apply grammar fixes. Please try individual fixes.");
    }
  };

  // Function to handle accepting suggestions - improved approach
  const handleAcceptSuggestion = (newText: string, issueId?: string) => {
    // Check if this is a grammar suggestion or paraphrase
    const issue = issueId ? grammarIssues.find(issue => issue.id === issueId) : grammarIssues.find(issue => issue.suggestion === newText);
    const isParaphrase = !issue && newText === suggestedText;
    const textToReplace = issue?.original || selectedText;
    
    // For grammar issues, we must have a valid issue with original text
    if (issueId && (!issue || !issue.original || !issue.original.trim())) {
      toast.error("Invalid grammar issue. Please try checking grammar again.");
      return;
    }
    
    if (editorContent && textToReplace && textToReplace.trim()) {
      try {
        // Try multiple replacement strategies for better accuracy
        let updatedContent = editorContent;
        
        // Strategy 1: Direct replacement in HTML
        if (editorContent.includes(textToReplace)) {
          updatedContent = editorContent.replace(
            new RegExp(textToReplace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
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
              new RegExp(flexiblePattern, 'gi'),
              newText
            );
          } else {
            // Strategy 3: Try case-insensitive matching
            const caseInsensitivePattern = textToReplace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const caseInsensitiveRegex = new RegExp(caseInsensitivePattern, 'gi');
            if (caseInsensitiveRegex.test(editorContent)) {
              updatedContent = editorContent.replace(caseInsensitiveRegex, newText);
            } else {
              // Strategy 4: Robust fallback that tolerates tags and typography across characters
              const safeNewText = normalizeSuggestion(newText);
              const replaced = replaceHtmlTolerantOnce(editorContent, textToReplace, safeNewText);
              if (replaced !== editorContent) {
                updatedContent = replaced;
              } else {
                // Final fallback: try to find and replace with fuzzy matching
                const words = textToReplace.split(/\s+/);
                if (words.length > 1) {
                  // Try to find the first word and replace the whole phrase
                  const firstWord = words[0];
                  const firstWordRegex = new RegExp(firstWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                  if (firstWordRegex.test(editorContent)) {
                    // Find the position and replace with the full phrase
                    const match = editorContent.match(firstWordRegex);
                    if (match) {
                      const startIndex = editorContent.indexOf(match[0]);
                      const endIndex = startIndex + textToReplace.length;
                      const before = editorContent.substring(0, startIndex);
                      const after = editorContent.substring(endIndex);
                      updatedContent = before + newText + after;
                    }
                  }
                }
              }
            }
          }
        }
        
        // Only proceed if content actually changed
        if (updatedContent !== editorContent) {
          // Clean up the content
          const cleanedContent = updatedContent.trim();

          // Update state first
          setEditorContent(cleanedContent);

          // Update raw content if available
          if (editorRawContent) {
            const updatedRawContent = { ...editorRawContent };
            setEditorRawContent(updatedRawContent);
          }

          // Then update the editor with a slight delay
          setTimeout(() => {
            if (editorRef && (editorRef as any).replaceHtmlContent) {
              (editorRef as any).replaceHtmlContent(cleanedContent);
            } else {
              setEditorKey(prev => prev + 1);
            }

            // Ensure editor maintains focus
            setTimeout(() => {
              ensureEditorFocus();
            }, 100);
          }, 50);
          
          if (isParaphrase) {
            // Clear paraphrase suggestions
            setSuggestedText("");
            setSelectedText("");
            setLastSelectedText(""); // Clear backup too
            setLastGrammarCheckHash(""); // Reset hash since content changed
            setLastGrammarCheckResult(null); // Reset result since content changed
            toast.success("Text paraphrased successfully!");
          } else if (issue) {
            // Remove the grammar highlight from the editor
            if (editorRef && editorRef.removeGrammarHighlight) {
              editorRef.removeGrammarHighlight(issue.id);
            }

            // Only remove the specific grammar issue that was accepted
            const updatedGrammarIssues = grammarIssues.filter(gi => gi.id !== issue.id);
            setGrammarIssues(updatedGrammarIssues);
            setSelectedText("");

            // Clear highlights since we're not using them in the editor
            setHighlightedContent("");
            setCurrentIssueIndex(-1);

            // If no more issues, reset tracking and clear all highlights
            if (updatedGrammarIssues.length === 0) {
              setLastGrammarCheckHash(""); // Reset hash since content changed
              setLastGrammarCheckResult(null); // Reset result since content changed
              if (editorRef && editorRef.clearGrammarHighlights) {
                editorRef.clearGrammarHighlights();
              }
            }

            // Success message for grammar
            const remainingCount = updatedGrammarIssues.length;
            if (remainingCount > 0) {
              toast.success(`Grammar issue fixed! ${remainingCount} remaining.`);
            } else {
              toast.success("Grammar issue fixed! All issues resolved.");
              setLastSelectedText(""); // Clear backup when all issues resolved
            }
          }
        } else {
          // Try one more approach: find the text in the original issue
          if (issue && issue.original) {
            const originalText = issue.original;
            if (editorContent.includes(originalText)) {
              updatedContent = editorContent.replace(
                new RegExp(originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                newText
              );
              setEditorContent(updatedContent);
              setEditorKey(prev => prev + 1);
              
              // Remove the specific grammar issue
              const updatedGrammarIssues = grammarIssues.filter(gi => gi.id !== issue.id);
              setGrammarIssues(updatedGrammarIssues);
              setSelectedText("");
              
              toast.success("Grammar issue fixed using original text!");
              return;
            }
          }
          toast.warning("Could not find the exact text to replace. The text may have been modified. Please try checking grammar again.");
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

  // Scroll to the first occurrence of an issue in the editor (no inline highlighting)
  const revealIssueInEditor = (issue: GrammarIssue) => {
    // Try to find and scroll to the text in the editor without modifying content
    if (editorRef?.current?.editor && issue.original) {
      const editorElement = editorRef.current.editor;
      const editorContent = editorElement.textContent || editorElement.innerText || '';
      
      // Find the position of the issue text
      const textIndex = editorContent.indexOf(issue.original);
      if (textIndex !== -1) {
        // Create a temporary selection to scroll to the text
        const range = document.createRange();
        const walker = document.createTreeWalker(
          editorElement,
          NodeFilter.SHOW_TEXT
        );
        
        let currentIndex = 0;
        let targetNode = null;
        
        while (walker.nextNode()) {
          const node = walker.currentNode;
          const nodeLength = node.textContent?.length || 0;
          
          if (currentIndex + nodeLength >= textIndex) {
            targetNode = node;
            break;
          }
          currentIndex += nodeLength;
        }
        
        if (targetNode) {
          try {
            range.setStart(targetNode, textIndex - currentIndex);
            range.setEnd(targetNode, textIndex - currentIndex + issue.original.length);
            
            const selection = window.getSelection();
            if (selection) {
              selection.removeAllRanges();
              selection.addRange(range);
              
              // Scroll the range into view
              range.getBoundingClientRect();
              editorElement.scrollTop = editorElement.scrollTop + range.getBoundingClientRect().top - editorElement.getBoundingClientRect().top - 100;
            }
          } catch (error) {
            console.log('Could not scroll to issue:', error);
          }
        }
      }
    }
  };

  // Function to handle rejecting suggestions
  const handleRejectSuggestion = (issueId?: string) => {
    if (issueId) {
      // Remove only the specific grammar issue
      const updatedGrammarIssues = grammarIssues.filter(gi => gi.id !== issueId);
      setGrammarIssues(updatedGrammarIssues);
      
      // Update highlights for remaining issues
      if (updatedGrammarIssues.length > 0) {
        setHighlightedContent("");
        toast.info(`Grammar issue ignored. ${updatedGrammarIssues.length} remaining.`);
      } else {
        setHighlightedContent("");
        setCurrentIssueIndex(-1);
        setLastGrammarCheckResult('no-issues'); // Mark as no issues since all were ignored
        toast.success("Grammar issue ignored. All issues resolved.");
      }
    } else {
      // Clear all suggestions (for paraphrase rejection)
      setSuggestedText("");
      setGrammarIssues([]);
      setHighlightedContent("");
      setCurrentIssueIndex(-1);
      setLastGrammarCheckResult(null); // Reset result when clearing all
      setSelectedText("");
    }
  };
  
  // Function to clear all suggestions
  const handleClearSuggestions = () => {
    setSuggestedText("");
    setGrammarIssues([]);
    setHighlightedContent("");
    setCurrentIssueIndex(-1);
    setLastGrammarCheckHash(""); // Reset hash when clearing suggestions
    setLastGrammarCheckResult(null); // Reset result when clearing suggestions
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
  const handleEditorChange = (html: string, editor: any) => {
    setEditorContent(html);
    setEditorRawContent(editor); // Store the editor instance instead
    // Reset grammar check hash when content changes manually
    setLastGrammarCheckHash("");
    setLastGrammarCheckResult(null);
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

  // Removed preserveScrollPosition function - no longer needed after fixing scroll issues

  // Function to ensure editor has focus and cursor is visible
  const ensureEditorFocus = () => {
    if (editorRef && editorRef.getEditorInstance) {
      const editorInstance = editorRef.getEditorInstance();
      if (editorInstance) {
        setTimeout(() => {
          editorInstance.focus();
          // Ensure cursor is visible by clicking in the editor
          const editorElement = editorRef.current?.editor;
          if (editorElement) {
            editorElement.click();
            editorElement.focus();
          }
        }, 50);
      }
    }
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
        <div className="h-full flex flex-col overflow-hidden">
          {editorRef && <TiptapToolbar editor={editorRef.getEditor?.()} />}
          <div className="flex-1 min-h-0">
            <TiptapEditor
              key={`editor-${editorKey}`}
              initialContent={editorContent}
              onChange={handleEditorChange}
              onSelectedTextChange={setSelectedText}
              setEditorRef={setEditorRef}
            />
          </div>
        </div>
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
              currentIssueIndex={currentIssueIndex}
              onNavigateIssue={navigateToIssue}
            />
          </div>
        </div>
      }
    />
  )
}

export default WritingPageClient
