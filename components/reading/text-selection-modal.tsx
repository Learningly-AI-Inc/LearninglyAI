"use client"

import * as React from "react"
import { 
  X, 
  Brain, 
  Sparkles, 
  MessageCircle, 
  BookOpen, 
  HelpCircle,
  Send,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { LoadingFacts } from './loading-facts';

interface TextSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  selectedText: string
  pageNumber: number
  documentTitle?: string
}

const quickActions = [
  {
    id: 'explain',
    icon: Brain,
    title: 'Explain This',
    description: 'Get a clear explanation of the selected text',
    prompt: 'Please explain the following text in simple terms:',
    color: 'bg-blue-500',
    hoverColor: 'hover:bg-blue-600'
  },
  {
    id: 'summarize', 
    icon: Sparkles,
    title: 'Summarize',
    description: 'Get a concise summary of the key points',
    prompt: 'Please summarize the key points from the following text:',
    color: 'bg-purple-500',
    hoverColor: 'hover:bg-purple-600'
  },
  {
    id: 'question',
    icon: HelpCircle,
    title: 'Ask Question',
    description: 'Ask a specific question about this text',
    prompt: 'Based on the following text, please answer:',
    color: 'bg-green-500',
    hoverColor: 'hover:bg-green-600'
  },
  {
    id: 'elaborate',
    icon: BookOpen,
    title: 'Elaborate',
    description: 'Get more detailed information and context',
    prompt: 'Please provide more detailed information and context about:',
    color: 'bg-orange-500',
    hoverColor: 'hover:bg-orange-600'
  }
]

export function TextSelectionModal({ 
  isOpen, 
  onClose, 
  selectedText, 
  pageNumber, 
  documentTitle 
}: TextSelectionModalProps) {
  const [selectedAction, setSelectedAction] = React.useState<string | null>(null)
  const [customQuestion, setCustomQuestion] = React.useState('')
  const [aiResponse, setAiResponse] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedAction(null)
      setCustomQuestion('')
      setAiResponse('')
    }
  }, [isOpen])

  const handleQuickAction = async (actionId: string) => {
    const action = quickActions.find(a => a.id === actionId)
    if (!action) return

    setSelectedAction(actionId)
    setIsLoading(true)

    try {
      const response = await fetch('/api/reading/analyze-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedText,
          prompt: action.prompt,
          pageNumber,
          documentTitle,
          actionType: actionId
        }),
      })

      const data = await response.json()

      if (data.success) {
        setAiResponse(data.response)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to analyze text",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Failed to analyze text:', error)
      toast({
        title: "Error", 
        description: "Failed to analyze text",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCustomQuestion = async () => {
    if (!customQuestion.trim()) {
      toast({
        title: "Error",
        description: "Please enter a question",
        variant: "destructive"
      })
      return
    }

    setSelectedAction('custom')
    setIsLoading(true)

    try {
      const response = await fetch('/api/reading/analyze-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedText,
          prompt: customQuestion,
          pageNumber,
          documentTitle,
          actionType: 'custom'
        }),
      })

      const data = await response.json()

      if (data.success) {
        setAiResponse(data.response)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to get AI response",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Failed to get AI response:', error)
      toast({
        title: "Error",
        description: "Failed to get AI response", 
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedAction(null)
    setCustomQuestion('')
    setAiResponse('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div 
        className="bg-card rounded-xl shadow-lg w-full max-w-4xl max-h-[85vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-primary/10 to-primary/5">
          <div>
            <h2 className="text-2xl font-semibold text-card-foreground">AI Text Analysis</h2>
            <p className="text-muted-foreground mt-1">
              Analyzing text from {documentTitle ? `"${documentTitle}"` : 'document'} 
              {pageNumber && ` (Page ${pageNumber})`}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* Selected Text */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-gray-900">Selected Text</h3>
              <Badge variant="secondary" className="text-xs">
                {selectedText.length} characters
              </Badge>
            </div>
            <div className="bg-muted rounded-lg p-4 border border-border">
              <p className="text-foreground leading-relaxed italic">
                "{selectedText}"
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          {!selectedAction && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickActions.map((action) => (
                  <Card 
                    key={action.id}
                    className="cursor-pointer hover:shadow-md transition-all duration-200 border hover:border-blue-300"
                    onClick={() => handleQuickAction(action.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${action.color} ${action.hoverColor} transition-colors`}>
                          <action.icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {action.title}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {action.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Custom Question */}
          {!selectedAction && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-green-600" />
                Ask Your Own Question
              </h3>
              <div className="flex gap-3">
                <Textarea
                  placeholder="Ask a specific question about the selected text..."
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  className="flex-1 resize-none"
                  rows={3}
                />
                <Button 
                  onClick={handleCustomQuestion}
                  disabled={!customQuestion.trim() || isLoading}
                  className="px-6"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="py-4">
              <LoadingFacts 
                isLoading={true}
                loadingType="analyzing"
                className="mb-0"
              />
            </div>
          )}

          {/* AI Response */}
          {aiResponse && !isLoading && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium text-gray-900">AI Response</h3>
                <Badge variant="outline" className="text-xs">
                  {selectedAction === 'custom' ? 'Custom Question' : 
                   quickActions.find(a => a.id === selectedAction)?.title}
                </Badge>
              </div>
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="p-4">
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {aiResponse}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedAction(null)
                    setAiResponse('')
                    setCustomQuestion('')
                  }}
                >
                  Ask Another Question
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(aiResponse)
                    toast({
                      title: "Copied!",
                      description: "Response copied to clipboard"
                    })
                  }}
                >
                  Copy Response
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

