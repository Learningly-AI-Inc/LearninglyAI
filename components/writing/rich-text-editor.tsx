"use client";

import React, { useState, useEffect } from "react";
import { EditorState, convertToRaw, ContentState } from "draft-js";
import { Editor } from "react-draft-wysiwyg";
import draftToHtml from "draftjs-to-html";
import htmlToDraft from "html-to-draftjs";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import "./editor-styles.css";
import { Card, CardContent } from "@/components/ui/card";

interface RichTextEditorProps {
  initialContent?: string;
  onChange?: (html: string, raw: any) => void;
  placeholder?: string;
  height?: string;
  readOnly?: boolean;
  onSelectedTextChange?: (selectedText: string) => void;
  setEditorRef?: (ref: any) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialContent = "",
  onChange,
  placeholder = "Start writing or paste text here...",
  height = "400px",
  readOnly = false,
  onSelectedTextChange,
  setEditorRef,
}) => {
  // Create a reference to the editor
  const editorRef = React.useRef<any>(null);
  // Track if component is mounted to prevent setState on unmounted component
  const isMountedRef = React.useRef(true);
  const [editorState, setEditorState] = useState(() => {
    if (initialContent && initialContent.trim()) {
      const contentBlock = htmlToDraft(initialContent);
      if (contentBlock && contentBlock.contentBlocks && contentBlock.contentBlocks.length > 0) {
        const contentState = ContentState.createFromBlockArray(
          contentBlock.contentBlocks
        );
        return EditorState.createWithContent(contentState);
      }
    }
    // Create empty editor with single block to prevent auto-expansion
    const contentState = ContentState.createFromText('');
    return EditorState.createWithContent(contentState);
  });

  // Set editor reference for parent components to use
  useEffect(() => {
    if (setEditorRef) {
      const replaceHtmlContent = (html: string) => {
        try {
          // Clean the HTML to prevent extra line breaks
          let cleanedHtml = html || '';
          // Remove leading/trailing whitespace and normalize line breaks
          cleanedHtml = cleanedHtml.trim();
          // Ensure we don't have duplicate line breaks at the start
          cleanedHtml = cleanedHtml.replace(/^(<p><br><\/p>)+/, '');

          const contentBlock = htmlToDraft(cleanedHtml);
          if (!contentBlock || !contentBlock.contentBlocks) return;

          const element: any = editorRef.current?.editor;
          const prevScrollTop = element?.scrollTop || 0;

          // Get current selection/cursor position
          const currentSelection = editorState.getSelection();
          const currentOffset = currentSelection.getAnchorOffset();

          const contentState = ContentState.createFromBlockArray(contentBlock.contentBlocks);
          let newState = EditorState.createWithContent(contentState);

          // Try to restore cursor position if we had one
          if (currentOffset > 0) {
            const firstBlock = newState.getCurrentContent().getFirstBlock();
            const newSelection = currentSelection.merge({
              anchorKey: firstBlock.getKey(),
              anchorOffset: Math.min(currentOffset, firstBlock.getLength()),
              focusKey: firstBlock.getKey(),
              focusOffset: Math.min(currentOffset, firstBlock.getLength()),
            });
            newState = EditorState.forceSelection(newState, newSelection);
          }

          setEditorState(newState);

          // Maintain the exact scroll position
          requestAnimationFrame(() => {
            if (element) {
              element.scrollTop = prevScrollTop;
              if (isMountedRef.current) {
                element.focus?.();
              }
            }
          });
        } catch (err) {
          console.error('Error replacing HTML content:', err);
        }
      };

      setEditorRef({
        getEditorState: () => editorState,
        setEditorState,
        getEditorInstance: () => editorRef.current?.editor,
        replaceHtmlContent,
      });
    }
  }, [setEditorRef, editorState]);
  
  // Cleanup effect to prevent setState on unmounted component
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // IMPORTANT: Do NOT re-import HTML on every keystroke.
  // The parent passes updated HTML back as initialContent, but we only want
  // to initialize from it on mount (or when the component is remounted via `key`).
  // Re-importing on each change creates extra empty blocks and causes growth.
  
  // Track selected text - using a more stable approach
  useEffect(() => {
    if (!onSelectedTextChange) return;
    
    const handleSelectionChange = () => {
      // Add a small delay to ensure selection is stable
      setTimeout(() => {
        if (typeof window === 'undefined') return; // SSR guard
        
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
          onSelectedTextChange(selection.toString().trim());
        }
      }, 50);
    };
    
    // Use selectionchange event which is more reliable
    if (typeof document !== 'undefined') {
      document.addEventListener('selectionchange', handleSelectionChange);
    }
    
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('selectionchange', handleSelectionChange);
      }
    };
  }, [onSelectedTextChange]);

  // Ensure editor gets focus on mount to show cursor
  useEffect(() => {
    if (editorRef.current?.editor) {
      setTimeout(() => {
        editorRef.current.editor.focus();
      }, 200);
    }
  }, []);

  const onEditorStateChange = (newState: EditorState) => {
    // Prevent automatic new line creation by checking content
    const content = newState.getCurrentContent();
    const blocks = content.getBlockMap();
    
    // If there are too many empty blocks, consolidate them
    if (blocks.size > 1) {
      const hasOnlyEmptyBlocks = blocks.every(block => 
        block ? block.getText().trim() === '' && block.getType() === 'unstyled' : false
      );
      
      if (hasOnlyEmptyBlocks) {
        // Keep only the first block and prevent expansion
        const firstBlock = blocks.first();
        if (firstBlock) {
          const newContentState = ContentState.createFromBlockArray([firstBlock]);
          const consolidatedState = EditorState.createWithContent(newContentState);
          setEditorState(consolidatedState);
          
          if (onChange) {
            const rawContent = convertToRaw(newContentState);
            const htmlBody = draftToHtml(rawContent);
            const html = `<div dir="ltr" style="direction:ltr;text-align:left;">${htmlBody}</div>`;
            onChange(html, rawContent);
          }
          return;
        }
      }
    }
    
    setEditorState(newState);
    
    if (onChange) {
      const rawContent = convertToRaw(content);
      // Ensure exported HTML enforces LTR to avoid mirrored text when rendered elsewhere
      const htmlBody = draftToHtml(rawContent);
      const html = `<div dir="ltr" style="direction:ltr;text-align:left;">${htmlBody}</div>`;
      onChange(html, rawContent);
    }
  };

  // Configure simplified toolbar options for the editor
  const toolbarOptions = {
    options: ['inline', 'blockType', 'fontSize', 'list', 'textAlign', 'link', 'history'],
    inline: {
      inDropdown: false,
      options: ['bold', 'italic', 'underline', 'strikethrough'],
    },
    blockType: {
      inDropdown: true,
      options: ['Normal', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'Blockquote'],
      className: 'blocktype-dropdown',
    },
    fontSize: {
      inDropdown: true,
      options: [8, 9, 10, 11, 12, 14, 16, 18, 24, 30, 36, 48],
      className: 'fontsize-dropdown',
    },
    list: {
      inDropdown: false,
      options: ['unordered', 'ordered', 'indent', 'outdent'],
    },
    textAlign: {
      inDropdown: false,
      options: ['left', 'center', 'right', 'justify'],
    },
    link: {
      inDropdown: false,
      showOpenOptionOnHover: true,
      defaultTargetOption: '_blank',
    },
  };

  // Handle click to focus editor and show cursor
  const handleEditorClick = () => {
    if (editorRef.current?.editor && isMountedRef.current) {
      setTimeout(() => {
        // Check if component is still mounted before calling focus
        if (editorRef.current?.editor && isMountedRef.current) {
          editorRef.current.editor.focus();
          // Force cursor to appear
          const editorElement = editorRef.current.editor;
          if (editorElement && isMountedRef.current) {
            editorElement.focus();
          }
        }
      }, 10);
    }
  };

  return (
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: 'hsl(var(--card))' }}>
      <div
        className={`editor-wrapper ${readOnly ? "read-only" : ""} flex flex-col h-full`}
        style={{ 
          overflow: "hidden",
          position: "relative",
          backgroundColor: 'hsl(var(--card))',
          color: 'hsl(var(--foreground))'
        }}
        onClick={handleEditorClick}
      >
        <Editor
          ref={editorRef}
          editorState={editorState}
          toolbarClassName="toolbar-class"
          wrapperClassName="wrapper-class flex flex-col h-full"
          editorClassName="editor-class p-4 flex-1 overflow-auto focus:outline-none"
          onEditorStateChange={onEditorStateChange}
          placeholder={placeholder}
          readOnly={readOnly}
          toolbar={toolbarOptions}
          textAlignment="left"
          toolbarStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: 'none',
            borderBottom: '1px solid hsl(var(--border))',
            color: 'hsl(var(--foreground))'
          }}
          editorStyle={{
            backgroundColor: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))',
            minHeight: '300px',
            padding: '1rem'
          }}
          wrapperStyle={{
            backgroundColor: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))'
          }}
          onFocus={() => {
            // Ensure cursor is visible when editor gains focus
            if (editorRef.current?.editor) {
              setTimeout(() => {
                editorRef.current.editor.focus();
              }, 0);
            }
          }}
        />
      </div>
    </div>
  );
};

export default RichTextEditor;
