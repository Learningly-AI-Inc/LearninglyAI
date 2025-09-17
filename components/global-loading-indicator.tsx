'use client'

import React from 'react'
import { useGlobalLoading } from '@/hooks/use-global-loading'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Bot, Sparkles } from 'lucide-react'

export function GlobalLoadingIndicator() {
  const { loadingState } = useGlobalLoading()

  if (!loadingState.isGenerating) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border/50 shadow-sm">
      <div className="max-w-4xl mx-auto p-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-blue-600">
                <Bot className="h-5 w-5 animate-pulse" />
                <Sparkles className="h-4 w-4 animate-spin" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800">
                    Generating Exam...
                  </span>
                  <span className="text-sm text-blue-600">
                    {loadingState.generationProgress}%
                  </span>
                </div>
                
                <Progress 
                  value={loadingState.generationProgress} 
                  className="h-2 bg-blue-100"
                />
                
                {loadingState.generationStep && (
                  <p className="text-xs text-blue-600 mt-1">
                    {loadingState.generationStep}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
