"use client";

import React, { useEffect, useImperativeHandle, forwardRef } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import "./tiptap-styles.css";

interface TiptapEditorProps {
  initialContent?: string;
  onChange?: (html: string, editor: Editor) => void;
  placeholder?: string;
  readOnly?: boolean;
  onSelectedTextChange?: (selectedText: string) => void;
  setEditorRef?: (ref: any) => void;
}

const TiptapEditor = forwardRef<any, TiptapEditorProps>(
  (
    {
      initialContent = "",
      onChange,
      placeholder = "Start writing or paste text here...",
      readOnly = false,
      onSelectedTextChange,
      setEditorRef,
    },
    ref
  ) => {
    const editor = useEditor({
      immediatelyRender: false, // Fix SSR hydration mismatch
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3],
          },
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-blue-600 underline cursor-pointer",
          },
        }),
        Placeholder.configure({
          placeholder,
        }),
        TextAlign.configure({
          types: ["heading", "paragraph"],
        }),
        Underline,
        TextStyle,
        Color,
      ],
      content: initialContent || "",
      editable: !readOnly,
      editorProps: {
        attributes: {
          class: "tiptap-content focus:outline-none",
        },
      },
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        if (onChange) {
          onChange(html, editor);
        }
      },
      onSelectionUpdate: ({ editor }) => {
        const { from, to } = editor.state.selection;
        const text = editor.state.doc.textBetween(from, to, " ");
        if (text.trim() && onSelectedTextChange) {
          onSelectedTextChange(text.trim());
        }
      },
    });

    // Expose methods to parent component
    useEffect(() => {
      if (editor && setEditorRef) {
        const replaceHtmlContent = (html: string) => {
          if (!editor) return;

          // Get current scroll position
          const editorElement = document.querySelector(".tiptap");
          const scrollTop = editorElement?.scrollTop || 0;

          // Update content without losing focus
          editor.commands.setContent(html, { emitUpdate: false });

          // Restore scroll position
          requestAnimationFrame(() => {
            if (editorElement) {
              editorElement.scrollTop = scrollTop;
            }
            editor.commands.focus("end");
          });
        };

        setEditorRef({
          getEditor: () => editor,
          getHTML: () => editor.getHTML(),
          getText: () => editor.getText(),
          replaceHtmlContent,
          focus: () => editor.commands.focus(),
          clear: () => editor.commands.clearContent(),
        });
      }
    }, [editor, setEditorRef]);

    // Update content when initialContent changes externally (e.g., loading a draft)
    useEffect(() => {
      if (editor && initialContent !== editor.getHTML()) {
        editor.commands.setContent(initialContent || "", { emitUpdate: false });
      }
    }, [editor, initialContent]);

    useImperativeHandle(ref, () => ({
      getEditor: () => editor,
      getHTML: () => editor?.getHTML() || "",
      getText: () => editor?.getText() || "",
      focus: () => editor?.commands.focus(),
    }));

    if (!editor) {
      return <div>Loading editor...</div>;
    }

    return (
      <div className="tiptap-wrapper h-full flex flex-col">
        <EditorContent editor={editor} className="flex-1 min-h-0 overflow-y-auto p-3" />
      </div>
    );
  }
);

TiptapEditor.displayName = "TiptapEditor";

export default TiptapEditor;