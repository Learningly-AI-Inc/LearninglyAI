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
import { DocumentListModal } from "@/components/reading/document-list-modal"

const ReadingPage = () => {
  const router = useRouter()
  const [showUploadModal, setShowUploadModal] = React.useState(false)
  const [showDocumentListModal, setShowDocumentListModal] = React.useState(false)

  const uploadOptions = [
    {
      icon: Upload,
      title: "Upload Documents",
      description: "PDF, DOCX, images, and text files",
      gradient: "from-blue-500 to-indigo-600",
      action: () => setShowUploadModal(true)
    },
    {
      icon: BookOpen,
      title: "Load Existing Document",
      description: "Browse and load documents from your library",
      gradient: "from-purple-500 to-violet-600",
      action: () => setShowDocumentListModal(true)
    },
    {
      icon: Globe,
      title: "Import from Web",
      description: "YouTube videos, articles, and websites", 
      gradient: "from-green-500 to-emerald-600",
      action: () => router.push(`/reading/document-viewer?title=${encodeURIComponent("Web Content")}&url=${encodeURIComponent("/sample-website.pdf")}`),
      comingSoon: true
    },
    {
      icon: Headphones,
      title: "Record Audio",
      description: "Live lectures, meetings, and conversations",
      gradient: "from-purple-500 to-violet-600",
      action: () => router.push(`/reading/document-viewer?title=${encodeURIComponent("Recorded Content")}&url=${encodeURIComponent("/sample-recording.pdf")}`),
      comingSoon: true
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
      color: "text-purple-600",
      bg: "bg-purple-50"
    },
    {
      icon: Zap,
      title: "Quick Notes",
      description: "Smart note-taking assistance",
      color: "text-green-600",
      bg: "bg-green-50"
    }
  ]

  return (
    <DocumentProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
        {/* Modern Header */}
        <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 sticky top-0 z-40">
          <div className="w-full max-w-[85vw] mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Reading Hub
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="w-full max-w-6xl mx-auto px-6 py-16">
          {/* Upload Options */}
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center mb-16">
              <h3 className="text-4xl font-bold text-gray-900 mb-6">Get Started</h3>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">Choose how you&apos;d like to add your content</p>
            </div>
            
            <div className="w-full max-w-6xl">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {uploadOptions.map((option, index) => (
                  <Card 
                    key={index} 
                    className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer bg-white/80 backdrop-blur-sm hover:scale-105 h-full" 
                    onClick={option.action}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${option.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                    {option.comingSoon && (
                      <div className="absolute top-4 right-4 z-10">
                        <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                          Coming Soon
                        </Badge>
                      </div>
                    )}
                    <CardContent className="p-8 text-center relative flex flex-col justify-center h-full min-h-[280px]">
                      <div className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br ${option.gradient} rounded-2xl mb-8 shadow-lg group-hover:scale-110 transition-transform duration-300 mx-auto`}>
                        <option.icon className="h-10 w-10 text-white" />
                      </div>
                      <h4 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-700 transition-colors duration-200">
                        {option.title}
                      </h4>
                      <p className="text-gray-600 leading-relaxed mb-6 text-lg">{option.description}</p>
                      <div className="inline-flex items-center justify-center text-blue-600 font-semibold text-lg group-hover:text-blue-700 transition-colors duration-200">
                        {option.comingSoon ? "Coming Soon" : "Get Started"}
                        {!option.comingSoon && (
                          <ArrowUpRight className="h-5 w-5 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

        </main>
      </div>
      
      {/* Upload Modal */}
      {showUploadModal && (
        <FileUploaderComponent onClose={() => setShowUploadModal(false)} />
      )}
      
      {/* Document List Modal */}
      {showDocumentListModal && (
        <DocumentListModal onClose={() => setShowDocumentListModal(false)} />
      )}
    </DocumentProvider>
  )
}

export default ReadingPage
