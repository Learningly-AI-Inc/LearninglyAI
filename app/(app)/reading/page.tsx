"use client"

import * as React from "react"
import {
  Upload,
  BookOpen,
  Search,
  Brain,
  Globe,
  Headphones,
  Sparkles,
  Zap,
  ArrowUpRight,
  Play,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

import { DocumentProvider } from "@/components/reading/document-context"
import { FileUploaderComponent } from "@/components/reading/file-uploader"
import { OptimizedFileUploader } from "@/components/reading/optimized-file-uploader"
import { DocumentListModal } from "@/components/reading/document-list-modal"
import { UsageProgressBar } from "@/components/ui/usage-progress-bar"
import { useUsageLimits } from "@/hooks/use-usage-limits"

const ReadingPage = () => {
  const router = useRouter()
  const [showUploadModal, setShowUploadModal] = React.useState(false)
  const [showDocumentListModal, setShowDocumentListModal] = React.useState(false)
  const { getCurrentUsage, getCurrentLimit, isLoading: usageLoading, usage, limits } = useUsageLimits()

  // Debug: Log usage data
  React.useEffect(() => {
    console.log('📊 Reading Page Usage Data:', {
      usage,
      limits,
      current: getCurrentUsage('documents_uploaded'),
      limit: getCurrentLimit('documents_uploaded'),
      isLoading: usageLoading
    });
  }, [usage, limits, usageLoading])

  const uploadOptions = [
    {
      icon: Upload,
      title: "Upload Documents",
      description: "PDF, DOCX, images, and text files",
      gradient: "from-blue-600 to-blue-600",
      action: () => setShowUploadModal(true)
    },
    {
      icon: BookOpen,
      title: "Load Existing Document",
      description: "Browse and load documents from your library",
      gradient: "from-blue-600 to-blue-600",
      action: () => setShowDocumentListModal(true)
    }
  ]

  const aiFeatures = [
    {
      icon: Brain,
      title: "Smart Analysis",
      description: "AI-powered document insights",
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      icon: Sparkles,
      title: "Auto Summaries",
      description: "Instant key point extraction",
      color: "text-blue-700",
      bg: "bg-blue-50"
    },
    {
      icon: Zap,
      title: "Quick Notes",
      description: "Smart note-taking assistance",
      color: "text-blue-700",
      bg: "bg-blue-50"
    }
  ]

  return (
    <DocumentProvider>
      <div className="min-h-screen bg-white">
        {/* Modern Header */}
        <div className="bg-white border-b border-border/50 sticky top-0 z-40">
          <div className="w-full max-w-[85vw] mx-auto px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-blue-700">
                  Reading Hub
                </h1>
              </div>

              {/* Usage Limit Indicator */}
              {!usageLoading && (
                <div className="min-w-[280px]">
                  <UsageProgressBar
                    current={getCurrentUsage('documents_uploaded')}
                    limit={getCurrentLimit('documents_uploaded')}
                    label="Documents Uploaded"
                    unit="docs"
                    size="sm"
                    showValues={true}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content (slightly reduced overall scale/spacing) */}
        <div className="origin-top transform scale-[0.95]">
        <main className="w-full max-w-4xl mx-auto px-6 py-16">
          {/* Upload Options */}
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center mb-10">
              <h3 className="text-4xl font-bold text-foreground mb-4">Get Started</h3>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">Choose how you&apos;d like to add your content</p>
            </div>
            
            <div className="w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 place-items-center">
                {uploadOptions.map((option, index) => (
                  <Card 
                    key={index} 
                    className="group relative overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer bg-white h-full w-full max-w-md" 
                    onClick={option.action}
                  >
                    <CardContent className="p-8 text-center relative flex flex-col justify-center h-full min-h-[260px]">
                      <div className={`inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl mb-6 shadow-md mx-auto`}>
                        <option.icon className="h-10 w-10 text-white" />
                      </div>
                      <h4 className="text-2xl font-bold text-foreground mb-3">
                        {option.title}
                      </h4>
                      <p className="text-muted-foreground leading-relaxed mb-6">{option.description}</p>
                      <div className="inline-flex items-center justify-center text-blue-700 font-semibold">
                        Get Started
                        <ArrowUpRight className="h-5 w-5 ml-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

        </main>
        </div>
      </div>
      
      {/* Upload Modal */}
      {showUploadModal && (
        <OptimizedFileUploader
          onClose={() => setShowUploadModal(false)}
          onUploaded={(result) => {
            console.log('Upload completed:', result);
            // Navigate to document viewer after successful upload
            if (result?.fileUrl && result?.documentId) {
              const title = result.title || 'Document';
              router.push(`/reading/document-viewer?title=${encodeURIComponent(title)}&url=${encodeURIComponent(result.fileUrl)}&documentId=${encodeURIComponent(result.documentId)}`);
            }
          }}
          enableClientSideExtraction={true}
        />
      )}
      
      {/* Document List Modal */}
      {showDocumentListModal && (
        <DocumentListModal onClose={() => setShowDocumentListModal(false)} />
      )}
    </DocumentProvider>
  )
}

export default ReadingPage
