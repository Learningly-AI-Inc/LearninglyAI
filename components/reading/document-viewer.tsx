"use client"

import * as React from "react"
import { 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
  BookOpen,
  Menu,
  Focus,
  Upload,
  ArrowLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { EnhancedPDFViewer } from "./pdf-viewer-wrapper"
import { RightDrawer } from "./right-drawer"
import { useDocument } from "./document-context"
import { HighlightQuestionModal } from "./highlight-question-modal"
import { PageHighlightOverlay } from "./page-highlight-overlay"
import { TextSelectionModal } from "./text-selection-modal"
import { useHighlightQuestion } from "@/hooks/use-highlight-question"
import { useHighlights, useHighlightActions } from "@/components/reading/highlight-context"

interface DocumentViewerProps {
  documentUrl?: string
  documentTitle?: string
}

export function DocumentViewer({ documentUrl = "/sample-document.pdf", documentTitle = "Document" }: DocumentViewerProps) {
  console.log('🎬 DocumentViewer rendered with:', { documentUrl, documentTitle })
  
  const { document, setDocument } = useDocument()
  const router = useRouter()
  const [pdfError, setPdfError] = React.useState(false)
  const [pdfLoading, setPdfLoading] = React.useState(true)
  const [zoomLevel, setZoomLevel] = React.useState(100)
  const [isFocusMode, setIsFocusMode] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageDimensions, setPageDimensions] = React.useState({ width: 0, height: 0 })
  
  // Text selection state
  const [selectedText, setSelectedText] = React.useState('')
  const [textSelectionPageNumber, setTextSelectionPageNumber] = React.useState(1)
  const [showTextSelectionModal, setShowTextSelectionModal] = React.useState(false)
  
  // Highlight context
  const { highlights } = useHighlights()
  const { removeHighlight } = useHighlightActions()
  
  // Highlight question functionality
  const {
    isModalOpen,
    selectedHighlight,
    openQuestionModal,
    closeQuestionModal,
    submitQuestion
  } = useHighlightQuestion()

  // Set document title in context when props are provided
  const hasProcessedRef = React.useRef(false)
  
  React.useEffect(() => {
    console.log('🔄 useEffect triggered with:', { 
      document: document?.title, 
      documentUrl, 
      documentTitle, 
      hasProcessed: hasProcessedRef.current,
      pdfLoading 
    })
    
    // Reset the processed flag when documentUrl changes
    hasProcessedRef.current = false
    
    if (!document && documentUrl && documentTitle && !hasProcessedRef.current) {
      console.log('✅ Conditions met - starting document processing')
      hasProcessedRef.current = true
      
      // Create a basic document structure for the UI
      const basicDocument = {
        id: 'doc-' + Date.now(),
        title: documentTitle,
        text: '', // Will be populated by PDF processing
        metadata: {
          originalFileName: documentTitle,
          fileSize: 0,
          fileType: 'pdf',
          mimeType: 'application/pdf',
          pages: 0,
          textLength: 0,
          uploadedAt: new Date().toISOString(),
        }
      }
      console.log('📄 Created basic document:', basicDocument)
      setDocument(basicDocument)
      
      // Process the PDF to extract text
      console.log('🚀 Starting PDF text processing...')
      processPDFText(documentUrl, documentTitle)
    } else {
      console.log('❌ Conditions not met:', {
        hasDocument: !!document,
        hasUrl: !!documentUrl,
        hasTitle: !!documentTitle,
        hasProcessed: hasProcessedRef.current
      })
    }

    // Add a timeout to prevent infinite PDF loading
    const loadingTimeout = setTimeout(() => {
      if (pdfLoading) {
        console.log('⚠️ PDF loading timeout - forcing load completion')
        setPdfLoading(false)
      }
    }, 15000) // 15 second timeout

    return () => clearTimeout(loadingTimeout)
  }, [documentUrl, documentTitle, document, setDocument, pdfLoading])

  // Cleanup effect to reset processed flag on unmount
  React.useEffect(() => {
    return () => {
      hasProcessedRef.current = false
    }
  }, [])

  // Function to get signed URL for private bucket access
  const getSignedUrl = React.useCallback(async (url: string) => {
    console.log('🔐 Getting signed URL for:', url)
    
    try {
      const response = await fetch('/api/reading/get-signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileUrl: url }),
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Signed URL obtained:', data.signedUrl)
        return data.signedUrl
      } else {
        console.error('❌ Failed to get signed URL:', response.statusText)
        return url // Fallback to original URL
      }
    } catch (error) {
      console.error('💥 Error getting signed URL:', error)
      return url // Fallback to original URL
    }
  }, [])

  // Function to process PDF and extract text
  const processPDFText = React.useCallback(async (url: string, title: string) => {
    console.log('🎯 processPDFText called with:', { url, title })
    console.log('📊 Current state before processing:', { 
      pdfLoading, 
      pdfError, 
      documentExists: !!document,
      documentTitle: document?.title 
    })
    
    try {
      console.log('📤 Creating FormData...')
      
      // Create a FormData with the PDF URL
      const formData = new FormData()
      formData.append('fileUrl', url)
      formData.append('title', title)
      console.log('✅ FormData created successfully')
      
      console.log('🌐 Making API request to /api/reading/process-pdf...')
      const startTime = Date.now()
      
      const response = await fetch('/api/reading/process-pdf', {
        method: 'POST',
        body: formData,
      })
      
      const endTime = Date.now()
      console.log(`📡 API response received in ${endTime - startTime}ms:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })
      
      if (response.ok) {
        console.log('📥 Parsing response JSON...')
        const data = await response.json()
        console.log('✅ API Response data:', {
          success: data.success,
          textLength: data.text?.length || 0,
          metadataPages: data.metadata?.pages,
          metadataTextLength: data.metadata?.textLength,
          processingNotes: data.metadata?.processingNotes,
          fullResponse: data
        })
        
        console.log('📝 Updating document with extracted text...')
        
        // Update the document with extracted text
        if (document) {
          console.log('🔄 Updating existing document...')
          const updatedDocument = {
            ...document,
            text: data.text,
            metadata: {
              ...document.metadata,
              pages: data.metadata.pages,
              textLength: data.metadata.textLength,
              processingNotes: data.metadata.processingNotes
            }
          }
          console.log('📄 Updated document:', updatedDocument)
          setDocument(updatedDocument)
        } else {
          console.log('🆕 Creating new document...')
          // If document is null, create a new one
          const newDocument = {
            id: 'doc-' + Date.now(),
            title: title,
            text: data.text,
            metadata: {
              originalFileName: title,
              fileSize: 0,
              fileType: 'pdf',
              mimeType: 'application/pdf',
              pages: data.metadata.pages,
              textLength: data.metadata.textLength,
              uploadedAt: new Date().toISOString(),
              processingNotes: data.metadata.processingNotes
            }
          }
          console.log('📄 New document created:', newDocument)
          setDocument(newDocument)
        }
        
        // Clear loading state after successful processing
        console.log('🏁 Clearing PDF loading state...')
        setPdfLoading(false)
        console.log('✅ PDF processing completed - loading state cleared')
        console.log('📊 Final state after processing:', { 
          pdfLoading: false, 
          pdfError, 
          documentExists: true 
        })
        
        // Force a re-render to ensure UI updates
        setTimeout(() => {
          console.log('🔄 Forcing UI update after processing...')
          setPdfLoading(false)
        }, 100)
      } else {
        console.error('❌ API request failed:', {
          status: response.status,
          statusText: response.statusText
        })
        const errorText = await response.text()
        console.error('❌ Error response body:', errorText)
        setPdfLoading(false) // Clear loading state on error too
      }
    } catch (error) {
      console.error('💥 Exception in processPDFText:', error)
      console.error('🔍 Error details:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      })
      setPdfLoading(false) // Clear loading state on error
    }
  }, [document, setDocument, pdfLoading, pdfError])

  const handleDocumentLoadSuccess = () => {
    console.log('🎉 handleDocumentLoadSuccess called')
    console.log('📊 State before PDF load success:', { pdfLoading, pdfError })
    setPdfLoading(false)
    setPdfError(false)
    console.log('✅ PDF loaded successfully using browser native viewer')
    console.log('📊 State after PDF load success:', { pdfLoading: false, pdfError: false })

    // Set initial page dimensions (approximate for native viewer)
    // These will be updated when we can measure the actual PDF content
    setPageDimensions({ width: 612, height: 792 }) // Standard US Letter size in points
  }

  const handleDocumentLoadError = (error: Error) => {
    console.error("💥 handleDocumentLoadError called:", error)
    console.log('📊 State before PDF load error:', { pdfLoading, pdfError })
    setPdfError(true)
    setPdfLoading(false)
    console.log('📊 State after PDF load error:', { pdfLoading: false, pdfError: true })
    toast({
      title: "Error loading document",
      description: "There was a problem loading your document. Please try again.",
      variant: "destructive"
    })
  }



  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsFocusMode(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle text selection from PDF
  const handleTextSelectionChange = (text: string, pageNumber: number, selection: Selection | null) => {
    if (text.trim().length > 10) { // Only show modal for meaningful text selections
      setSelectedText(text)
      setTextSelectionPageNumber(pageNumber)
      setShowTextSelectionModal(true)
      console.log('📝 Text selected:', { text: text.substring(0, 100) + '...', pageNumber })
    }
  }

  // Handle question request from highlight overlay
  const handleQuestionRequest = (highlight: any) => {
    openQuestionModal(highlight);
  };
  
  // Get highlights for current page
  const currentPageHighlights = highlights.filter(h => h.pageNumber === currentPage);

  // Component to handle signed URL for PDF viewing
  const PDFViewerWithSignedUrl = React.useCallback(({ fileUrl, onTextSelectionChange, onLoadSuccess, onLoadError, className }: {
    fileUrl: string;
    onTextSelectionChange?: (text: string, pageNumber: number, selection: Selection | null) => void;
    onLoadSuccess?: () => void;
    onLoadError?: (error: Error) => void;
    className?: string;
  }) => {
    const [signedUrl, setSignedUrl] = React.useState<string | null>(null);
    const [isLoadingUrl, setIsLoadingUrl] = React.useState(true);

    React.useEffect(() => {
      const fetchSignedUrl = async () => {
        console.log('🔐 Fetching signed URL for PDF viewer...');
        try {
          const url = await getSignedUrl(fileUrl);
          setSignedUrl(url);
          setIsLoadingUrl(false);
          console.log('✅ Signed URL ready for PDF viewer');
        } catch (error) {
          console.error('❌ Failed to get signed URL for PDF viewer:', error);
          setSignedUrl(fileUrl); // Fallback to original URL
          setIsLoadingUrl(false);
        }
      };

      fetchSignedUrl();
    }, [fileUrl, getSignedUrl]);

    if (isLoadingUrl) {
      return (
        <div className="h-full w-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Getting document access...</p>
          </div>
        </div>
      );
    }

    return (
      <EnhancedPDFViewer
        file={signedUrl || fileUrl}
        onTextSelectionChange={onTextSelectionChange}
        onLoadSuccess={onLoadSuccess}
        onLoadError={onLoadError}
        className={className}
      />
    );
  }, [getSignedUrl]);
  
     return (
     <div className="grid min-h-screen grid-cols-[1fr_360px] xl:grid-cols-[1fr_360px]">
      {/* Main Content */}
      <main className="relative flex flex-col h-screen">
                          {/* Header */}
         <div className="flex items-center justify-between gap-2 border-b px-4 py-3 bg-white shadow-sm">
           <div className="flex items-center gap-3">
             <button className="xl:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
               <Menu className="h-4 w-4 text-gray-600" />
             </button>
             {document?.title && (
               <div className="text-xs text-gray-700 font-medium px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-1.5">
                 <span className="text-blue-600">📄</span>
                 <span className="truncate max-w-[200px]">{document.title}</span>
               </div>
             )}
             <Button 
               variant="outline" 
               size="sm"
               onClick={() => router.push('/reading')}
               className="text-gray-600 hover:text-gray-900 flex items-center gap-2 px-3 py-1.5 h-8"
               title="Load another document"
             >
               <Upload className="h-3 w-3" />
               <span className="text-xs">Load Another</span>
             </Button>
           </div>
           
           <div className="flex items-center gap-3">
             {/* Zoom Controls */}
             <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
               <button
                 onClick={() => setZoomLevel(prev => Math.max(25, prev - 25))}
                 className="p-1 rounded hover:bg-gray-200 transition-colors"
                 title="Zoom Out"
               >
                 <ChevronDown className="h-3 w-3 text-gray-600" />
               </button>
               <span className="text-xs font-medium text-gray-700 min-w-[40px] text-center">
                 {zoomLevel}%
               </span>
               <button
                 onClick={() => setZoomLevel(prev => Math.min(200, prev + 25))}
                 className="p-1 rounded hover:bg-gray-200 transition-colors"
                 title="Zoom In"
               >
                 <ChevronUp className="h-3 w-3 text-gray-600" />
               </button>
             </div>
             
             <Button 
               variant="ghost" 
               size="sm"
               onClick={() => setIsFocusMode(prev => !prev)}
               className="text-gray-600 hover:text-gray-900 p-1.5"
               title="Focus Mode (Ctrl+F)"
             >
               <Focus className="h-3 w-3" />
             </Button>
             

           </div>
         </div>

                                  {/* PDF Area */}
         <section className="flex-1 overflow-hidden bg-gray-50">
           <div className="h-full w-full">
               <div className="h-full w-full bg-white overflow-hidden">
                 {documentUrl ? (
                   <div className="w-full h-full overflow-hidden">
                    {(() => {
                      console.log('🖼️ Render decision:', { pdfLoading, pdfError, documentUrl })
                      if (pdfLoading) {
                        console.log('⏳ Showing loading state')
                        return (
                          <div className="h-full w-full flex items-center justify-center">
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
                              <p className="text-gray-500">Loading document...</p>
                              <p className="text-xs text-gray-400 mt-2">Debug: pdfLoading={pdfLoading.toString()}</p>
                            </div>
                          </div>
                        )
                      }
                      if (pdfError) {
                        console.log('❌ Showing error state')
                        return (
                          <div className="h-full w-full flex items-center justify-center">
                            <div className="text-center text-red-500">
                              <AlertCircle className="h-10 w-10 mx-auto mb-4" />
                              <p>Failed to load document. Please try again.</p>
                            </div>
                          </div>
                        )
                      }
                      console.log('📄 Showing PDF viewer')
                      return (
                        <div className="w-full h-full">
                          <PDFViewerWithSignedUrl
                            fileUrl={documentUrl}
                            onTextSelectionChange={handleTextSelectionChange}
                            onLoadSuccess={handleDocumentLoadSuccess}
                            onLoadError={handleDocumentLoadError}
                            className="h-full"
                          />
                        </div>
                      )
                    })()}
                   </div>
                 ) : (
                   <div className="h-full w-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No document loaded</p>
                      <p className="text-sm text-gray-400">Upload a document to get started</p>
                    </div>
                  </div>
                )}
              </div>
          </div>
        </section>

        
      </main>

             {/* Right Drawer - Desktop */}
       <aside className="hidden xl:flex flex-col border-l bg-white w-[360px]">
         <RightDrawer 
           isOpen={true}
           onClose={() => {}}
           document={document}
           className="h-full"
         />
       </aside>

      {/* Highlight Question Modal */}
      <HighlightQuestionModal
        isOpen={isModalOpen}
        onClose={closeQuestionModal}
        highlightedText={selectedHighlight?.selectedText || ''}
        onSubmitQuestion={submitQuestion}
        highlightId={selectedHighlight?.id || ''}
      />

      {/* Text Selection Modal */}
      <TextSelectionModal
        isOpen={showTextSelectionModal}
        onClose={() => setShowTextSelectionModal(false)}
        selectedText={selectedText}
        pageNumber={textSelectionPageNumber}
        documentTitle={documentTitle}
      />
             
    </div>
  )
}
