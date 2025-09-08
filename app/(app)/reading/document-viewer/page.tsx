"use client"

import React from "react"
import { DocumentViewer } from "@/components/reading/document-viewer"
import { DocumentProvider } from "@/components/reading/document-context"
import { HighlightContextProvider } from "@/components/reading/highlight-context"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function DocumentViewerContent() {
  const searchParams = useSearchParams()

  // Safely extract params to avoid readonly property issues
  const documentUrl = React.useMemo(() => {
    try {
      const url = searchParams.get("url")
      // Decode the URL if it's encoded
      return url ? decodeURIComponent(url) : null
    } catch (error) {
      console.error('Error getting URL param:', error)
      return null
    }
  }, [searchParams])

  const documentTitle = React.useMemo(() => {
    try {
      const title = searchParams.get("title")
      // Decode the title if it's encoded
      return title ? decodeURIComponent(title) : "Untitled Document"
    } catch (error) {
      console.error('Error getting title param:', error)
      return "Untitled Document"
    }
  }, [searchParams])
  
  console.log('🌐 DocumentViewerContent - URL params:', {
    url: documentUrl,
    title: documentTitle
  })
  
  // Memoize the props to prevent unnecessary re-renders
  const memoizedProps = React.useMemo(() => ({
    documentUrl: documentUrl || undefined,
    documentTitle
  }), [documentUrl, documentTitle])
  
  console.log('📝 DocumentViewerContent - Memoized props:', memoizedProps)
  
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

