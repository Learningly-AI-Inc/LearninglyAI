"use client"

import * as React from "react"
import { 
  MessageSquare, 
  Archive, 
  Sparkles, 
  FileText,
  BookOpen
} from "lucide-react"
import { ChatInterface } from "./chat-interface"

interface RightDrawerProps {
  isOpen: boolean
  onClose: () => void
  document?: any
  className?: string
}

export function RightDrawer({ document, className = "" }: RightDrawerProps) {
  const [activeTab, setActiveTab] = React.useState("chat")

  const tabs = [
    {
      id: "chat",
      label: "Chat",
      icon: <MessageSquare className="h-4 w-4" />
    },
    {
      id: "flashcards", 
      label: "Flashcards",
      icon: <Sparkles className="h-4 w-4" />
    },
    {
      id: "summary",
      label: "Summary", 
      icon: <Archive className="h-4 w-4" />
    }
  ]

  const quickActions = [
    {
      text: "Summarize this document",
      icon: <Sparkles className="h-3 w-3" />,
      action: "Summarize this document"
    },
    {
      text: "What are the key points?",
      icon: <BookOpen className="h-3 w-3" />,
      action: "What are the key points?"
    },
    {
      text: "Explain the main concepts",
      icon: <FileText className="h-3 w-3" />,
      action: "Explain the main concepts"
    },
    {
      text: "Create flashcards",
      icon: <Sparkles className="h-3 w-3" />,
      action: "Create flashcards from this document"
    }
  ]

  return (
    <div className={`bg-white shadow-xl transition-all duration-200 ${className}`}>
             {/* Header */}
       <div className="flex items-center p-3 border-b border-gray-200">
         <div>
           <div className="text-xs font-semibold text-gray-900">
             {document ? "AI Assistant" : "Chat"}
           </div>
           <div className="text-xs text-gray-500">
             {document ? (
               <div className="flex items-center gap-1">
                 <span className="text-green-600">✓</span>
                 <span>Document loaded successfully! 🎉</span>
               </div>
             ) : (
               "Upload a document to start"
             )}
           </div>
         </div>
       </div>
      
             {/* Tabs */}
       <div className="p-3">
         <div className="flex rounded-lg bg-gray-100 p-0.5 mb-3">
          {tabs.map((tab) => (
                         <button
               key={tab.id}
               className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                 activeTab === tab.id 
                   ? 'bg-white text-blue-600 shadow-sm' 
                   : 'text-gray-600 hover:text-gray-900'
               }`}
               onClick={() => setActiveTab(tab.id)}
             >
               {tab.icon}
               {tab.label}
             </button>
          ))}
        </div>
        
                 {/* Content */}
         <div className="h-[calc(100vh-180px)] overflow-hidden flex flex-col">
          {activeTab === "chat" && (
            <ChatInterface />
          )}
          
                     {activeTab === "flashcards" && (
             <div className="h-full flex items-center justify-center">
               <div className="text-center">
                 <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                   <Sparkles className="h-6 w-6 text-blue-600" />
                 </div>
                 <h3 className="text-sm font-semibold text-gray-900 mb-1">
                   {document ? "Ready to create flashcards!" : "Flashcards"}
                 </h3>
                 <p className="text-xs text-gray-600 mb-4">
                   {document ? 
                     "Generate AI-powered flashcards from your document content." :
                     "AI-generated flashcards will appear here based on your document content."
                   }
                 </p>
                                 {document ? (
                   <div className="space-y-3">
                     <div className="flex flex-wrap justify-center gap-1.5">
                       {quickActions.slice(3, 4).map((action, index) => (
                         <button
                           key={index}
                           className="px-3 py-2 rounded-full text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1 font-medium"
                         >
                           {action.icon}
                           {action.text}
                         </button>
                       ))}
                     </div>
                     <div className="text-xs text-gray-500">
                       Click the button above to generate flashcards from &ldquo;{document.title}&rdquo;
                     </div>
                   </div>
                 ) : (
                   <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                     <FileText className="h-5 w-5 text-blue-600" />
                   </div>
                 )}
              </div>
            </div>
          )}
          
                     {activeTab === "summary" && (
             <div className="h-full flex items-center justify-center">
               <div className="text-center">
                 <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                   <Archive className="h-6 w-6 text-green-600" />
                 </div>
                 <h3 className="text-sm font-semibold text-gray-900 mb-1">
                   {document ? "Ready to generate summary!" : "Document Summary"}
                 </h3>
                 <p className="text-xs text-gray-600 mb-4">
                   {document ? 
                     "Get an AI-powered summary of your document's key points and concepts." :
                     "AI-generated summary will appear here once you upload a document."
                   }
                 </p>
                                 {document ? (
                   <div className="space-y-3">
                     <div className="flex flex-wrap justify-center gap-1.5">
                       {quickActions.slice(0, 1).map((action, index) => (
                         <button
                           key={index}
                           className="px-3 py-2 rounded-full text-xs bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-1 font-medium"
                         >
                           {action.icon}
                           {action.text}
                         </button>
                       ))}
                     </div>
                     <div className="text-xs text-gray-500">
                       Click the button above to summarize &ldquo;{document.title}&rdquo;
                     </div>
                   </div>
                 ) : (
                   <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                     <FileText className="h-5 w-5 text-green-600" />
                   </div>
                 )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
