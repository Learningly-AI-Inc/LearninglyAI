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
import { useRouter } from "next/navigation"

import { DocumentProvider } from "@/components/reading/document-context"

const ReadingPage = () => {
  const router = useRouter()

  const uploadOptions = [
    {
      icon: Upload,
      title: "Upload Documents",
      description: "PDF, DOCX, images, and text files",
      gradient: "from-blue-500 to-indigo-600",
      action: () => router.push("/reading/document-viewer?title=Uploaded+Document&url=/sample-document.pdf")
    },
    {
      icon: Globe,
      title: "Import from Web",
      description: "YouTube videos, articles, and websites", 
      gradient: "from-green-500 to-emerald-600",
      action: () => router.push("/reading/document-viewer?title=Web+Content&url=/sample-website.pdf")
    },
    {
      icon: Headphones,
      title: "Record Audio",
      description: "Live lectures, meetings, and conversations",
      gradient: "from-purple-500 to-violet-600",
      action: () => router.push("/reading/document-viewer?title=Recorded+Content&url=/sample-recording.pdf")
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
        <main className="w-full max-w-[85vw] mx-auto px-6 py-12">
          {/* Upload Options */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Get Started</h3>
              <p className="text-lg text-gray-600">Choose how you&apos;d like to add your content</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {uploadOptions.map((option, index) => (
                <Card 
                  key={index} 
                  className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer bg-white/80 backdrop-blur-sm hover:scale-105" 
                  onClick={option.action}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${option.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                  <CardContent className="p-8 text-center relative">
                    <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${option.gradient} rounded-2xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <option.icon className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-700 transition-colors duration-200">
                      {option.title}
                    </h4>
                    <p className="text-gray-600 leading-relaxed mb-4">{option.description}</p>
                    <div className="inline-flex items-center text-blue-600 font-medium group-hover:text-blue-700 transition-colors duration-200">
                      Get Started
                      <ArrowUpRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* AI Features */}
          <div className="mb-16">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Powered by AI</h3>
              <p className="text-lg text-gray-600">Advanced features to enhance your learning experience</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {aiFeatures.map((feature, index) => (
                <Card key={index} className="group border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white/60 backdrop-blur-sm hover:scale-105">
                  <CardContent className="p-8 text-center">
                    <div className={`inline-flex items-center justify-center w-14 h-14 ${feature.bg} rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className={`h-7 w-7 ${feature.color}`} />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-3">{feature.title}</h4>
                    <p className="text-gray-600">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Play className="h-6 w-6 text-white" />
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Quick Start Tutorial</h4>
                <p className="text-gray-600 mb-4">Learn how to make the most of your reading experience</p>
                <Button variant="ghost" className="text-blue-600 hover:text-blue-700 p-0 h-auto font-semibold">
                  Watch Now
                </Button>
              </CardContent>
            </Card>

            <Card className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                    <Plus className="h-6 w-6 text-white" />
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-green-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Browse Templates</h4>
                <p className="text-gray-600 mb-4">Explore pre-built study guides and note templates</p>
                <Button variant="ghost" className="text-green-600 hover:text-green-700 p-0 h-auto font-semibold">
                  Explore Now
                </Button>
              </CardContent>
            </Card>

            <Card className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-violet-600 rounded-xl flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-purple-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Test Math Rendering</h4>
                <p className="text-gray-600 mb-4">See how LaTeX math equations and markdown are rendered</p>
                <Button 
                  variant="ghost" 
                  className="text-purple-600 hover:text-purple-700 p-0 h-auto font-semibold"
                  onClick={() => router.push('/math-test')}
                >
                  Try It Now
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </DocumentProvider>
  )
}

export default ReadingPage
