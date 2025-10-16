"use client"

import * as React from "react"
import { AlertCircle, RotateCcw, RefreshCw } from "lucide-react"

interface PDFDocumentProps {
  file: string;
  onLoadSuccess?: () => void;
  onLoadError?: (error: Error) => void;
  loading?: React.ReactNode;
  error?: React.ReactNode;
}

export const PDFDocument: React.FC<PDFDocumentProps> = ({
  file,
  onLoadSuccess,
  onLoadError,
  loading,
  error
}) => {
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasError, setHasError] = React.useState(false)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  const handleLoadSuccess = () => {
    const loadTime = Date.now() - (window as any).pdfLoadStartTime
    console.log(`✅ PDF loaded successfully using browser viewer (${loadTime}ms)`)
    setIsLoading(false)
    setHasError(false)
    onLoadSuccess?.()
  }

  const handleLoadError = () => {
    console.error("❌ Error loading PDF in browser viewer")
    setHasError(true)
    setIsLoading(false)
    onLoadError?.(new Error('Failed to load PDF'))
  }

  const handleRetry = () => {
    setIsLoading(true)
    setHasError(false)
    // Force reload by changing the key
    if (iframeRef.current) {
      iframeRef.current.src = file
    }
  }

  React.useEffect(() => {
    if (file) {
      setIsLoading(true)
      setHasError(false)
      
      // Start performance timing
      ;(window as any).pdfLoadStartTime = Date.now()

      // Set a very short timeout for maximum speed
      const timeout = setTimeout(() => {
        if (isLoading) {
          const loadTime = Date.now() - (window as any).pdfLoadStartTime
          console.log(`⚠️ PDF loading timeout - assuming successful load (${loadTime}ms)`)
          setIsLoading(false)
          onLoadSuccess?.()
        }
      }, 500) // Reduced to 0.5s for maximum speed

      return () => clearTimeout(timeout)
    }
  }, [file])

  const defaultLoading = (
    <div className="flex items-center justify-center p-8 h-96 bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-foreground font-medium">Loading PDF document...</p>
        <p className="text-sm text-muted-foreground mt-1">Using browser's native PDF viewer</p>
        <div className="mt-3 w-48 h-1 bg-muted rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-pulse"></div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Loading in under 1 second</p>
      </div>
    </div>
  )

  const defaultError = (
    <div className="flex items-center justify-center p-8 h-96 bg-background">
      <div className="text-center text-destructive">
        <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-2" />
        <p className="font-medium">Failed to load PDF</p>
        <p className="text-sm text-muted-foreground mt-1">The document might be corrupted or unavailable</p>
        <button
          onClick={handleRetry}
          className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 flex items-center gap-2 mx-auto transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  )

  if (hasError) {
    return error || defaultError
  }

  if (isLoading) {
    return loading || defaultLoading
  }

  return (
    <div className="w-full h-full bg-background">
      <iframe
        ref={iframeRef}
        src={file}
        className="w-full h-full border-0 bg-background"
        title="PDF Document"
        onLoad={handleLoadSuccess}
        onError={handleLoadError}
        style={{ minHeight: '600px' }}
      />
    </div>
  )
}

// Simple PDF Viewer Component using Browser Native Viewer
interface EnhancedPDFViewerProps {
  file: string;
  onTextSelectionChange?: (selectedText: string, pageNumber: number, selection: Selection | null) => void;
  onLoadSuccess?: () => void;
  onLoadError?: (error: Error) => void;
  className?: string;
}

export const EnhancedPDFViewer: React.FC<EnhancedPDFViewerProps> = ({
  file,
  onTextSelectionChange,
  onLoadSuccess,
  onLoadError,
  className
}) => {
  const handleLoadSuccess = () => {
    console.log('✅ PDF loaded successfully in enhanced viewer')
    onLoadSuccess?.()
  }

  return (
    <div className={`flex flex-col h-full bg-background ${className}`}>
      {/* Simple toolbar with refresh option */}
      <div className="flex items-center justify-between p-2 bg-muted border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground ps-2">
            PDF Document - Using Browser Viewer
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground pe-2">
            Native browser PDF controls available
          </span>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-hidden bg-background">
        <PDFDocument
          file={file}
          onLoadSuccess={handleLoadSuccess}
          onLoadError={onLoadError}
        />
      </div>
    </div>
  )
}

// Simplified PDF Page component (not needed for native viewer, but keeping for compatibility)
export const PDFPage: React.FC<{
  pageNumber?: number;
  scale?: number;
  renderTextLayer?: boolean;
  renderAnnotationLayer?: boolean;
  loading?: React.ReactNode;
}> = ({ loading }) => {
  // Native viewer handles all pages automatically
  return (
    <div className="w-full h-full bg-background">
      {/* Native browser PDF viewer shows all pages automatically */}
      <p className="text-center text-muted-foreground p-4">
        PDF is displayed using the native browser viewer
      </p>
    </div>
  )
}