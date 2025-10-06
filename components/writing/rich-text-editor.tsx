"use client";

import React, { useState, useEffect } from "react";
import { EditorState, convertToRaw, ContentState } from "draft-js";
import { Editor } from "react-draft-wysiwyg";
import draftToHtml from "draftjs-to-html";
import htmlToDraft from "html-to-draftjs";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
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
      setEditorRef({
        getEditorState: () => editorState,
        setEditorState,
        getEditorInstance: () => editorRef.current?.editor,
      });
    }
  }, [setEditorRef, editorState]);
  
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
    if (editorRef.current?.editor) {
      setTimeout(() => {
        editorRef.current.editor.focus();
        // Force cursor to appear
        const editorElement = editorRef.current.editor;
        if (editorElement) {
          editorElement.click();
          editorElement.focus();
        }
      }, 10);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div
        className={`editor-wrapper ${readOnly ? "read-only" : ""} flex flex-col h-full`}
        style={{ 
          overflow: "hidden",
          position: "relative"
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
