"use client"

import React from "react"
import { DocumentViewer } from "@/components/reading/document-viewer"
import { DocumentProvider } from "@/components/reading/document-context"
import { HighlightContextProvider } from "@/components/reading/highlight-context"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function DocumentViewerContent() {
  const searchParams = useSearchParams()
  const documentUrl = searchParams.get("url")
  const documentTitle = searchParams.get("title") || "Untitled Document"
  
  // Memoize the props to prevent unnecessary re-renders
  const memoizedProps = React.useMemo(() => ({
    documentUrl: documentUrl || undefined,
    documentTitle
  }), [documentUrl, documentTitle])
  
  return (
    <HighlightContextProvider documentUrl={memoizedProps.documentUrl || ""}>
      <DocumentViewer 
        documentUrl={memoizedProps.documentUrl} 
        documentTitle={memoizedProps.documentTitle} 
      />
    </HighlightContextProvider>
  )
}

export default function DocumentViewerPage() {
  return (
    <DocumentProvider>
      <Suspense fallback={<div>Loading document viewer...</div>}>
        <DocumentViewerContent />
      </Suspense>
    </DocumentProvider>
  )
}

