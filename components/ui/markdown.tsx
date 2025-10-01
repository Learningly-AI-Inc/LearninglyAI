"use client";

import React, {useState} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import {Copy} from "lucide-react";

/** Optional: extend sanitize schema to allow math & code classes */
import { defaultSchema } from "hast-util-sanitize";

const mathSchema = structuredClone(defaultSchema);
mathSchema.attributes ||= {};
mathSchema.attributes["code"] = [
  ...(mathSchema.attributes["code"] || []),
  ["className"], // allow hljs language classes
];
mathSchema.attributes["span"] = [
  ...(mathSchema.attributes["span"] || []),
  ["className"], // KaTeX uses spans with classes
];
mathSchema.attributes["div"] = [
  ...(mathSchema.attributes["div"] || []),
  ["className"],
];

function stripFence(markdown: string) {
  // Some models reply with ```markdown ... ```
  return markdown.replace(/^```(?:markdown|md)?\s*/i, "").replace(/\s*```$/i, "");
}

export function Markdown({children}: {children: string}) {
  const [copied, setCopied] = useState<number | null>(null);

  // Debug: log the content being processed (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Markdown component received:', children);
    console.log('Content type:', typeof children);
    console.log('Content length:', children?.length);
    console.log('Content preview:', children?.substring(0, 100));
  }

  return (
    <div className="max-w-none text-slate-900">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeRaw,                 // allow inline HTML *after* sanitize
          [rehypeSanitize, mathSchema],
          rehypeKatex,
          rehypeHighlight,
        ]}

        components={{
          h1: (p) => <h1 className="text-2xl font-bold mt-4 mb-2 text-slate-900" {...p} />,
          h2: (p) => <h2 className="text-xl font-semibold mt-3 mb-2 text-slate-900" {...p} />,
          h3: (p) => <h3 className="text-lg font-semibold mt-3 mb-2 text-slate-900" {...p} />,
          p:  (p) => <p className="leading-relaxed mb-3 text-slate-900" {...p} />,
          ul: (p) => <ul className="list-disc pl-6 my-3 space-y-1 text-slate-900" {...p} />,
          ol: (p) => <ol className="list-decimal pl-6 my-3 space-y-1 text-slate-900" {...p} />,
          blockquote: (p) => (
            <blockquote className="border-l-2 border-gray-200/70 pl-3 italic text-slate-700 my-3 bg-gray-50/40 rounded-md" {...p} />
          ),
          a: ({href, ...props}) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-blue-600 underline decoration-blue-300 hover:decoration-blue-500"
              {...props}
            />
          ),
          img: (p) => (
            <img {...p} className="max-w-full rounded-lg border border-gray-200" />
          ),
          hr: (p) => <hr className="my-6 border-gray-200" {...p} />,
          code: (props: any) => {
            const { inline, className, children, ...restProps } = props;
            if (inline) {
              return (
                <code className="bg-gray-100 px-1 py-0.5 rounded text-slate-900" {...props}>
                  {children}
                </code>
              );
            }
            // Block code with copy button
            const lang = (className || "").replace(/language-/, "");
            const idx = Math.random(); // local key for copy state
            const text = String(children).replace(/\n$/, "");
            return (
              <div className="relative group my-3">
                <button
                  aria-label="Copy code"
                  onClick={() => {
                    navigator.clipboard.writeText(text);
                    setCopied(idx);
                    setTimeout(() => setCopied(null), 1200);
                  }}
                  className="absolute right-2 top-2 z-20 inline-flex items-center gap-1
                             rounded-md bg-gray-800/90 text-gray-100 px-2 py-1
                             text-[11px] opacity-0 group-hover:opacity-100 transition
                             shadow-lg"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied === idx ? "Copied" : "Copy"}
                </button>
                <pre className="bg-gray-900 text-gray-100 rounded-lg overflow-x-auto p-3 relative">
                  <code className={`${className} text-gray-100`} {...restProps}>{children}</code>
                </pre>
                {lang && <div className="absolute right-2 bottom-2 text-[10px] text-gray-300">{lang}</div>}
              </div>
            );
          },
        }}
      >
        {stripFence(children)}
      </ReactMarkdown>
    </div>
  );
}
