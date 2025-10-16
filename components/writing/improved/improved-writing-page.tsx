"use client"

import * as React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { UsageProgressBar } from "@/components/ui/usage-progress-bar"
import { useUsageLimits } from "@/hooks/use-usage-limits"
import { PencilRuler } from "lucide-react"

interface ImprovedWritingPageProps {
  header?: React.ReactNode // Optional since we're building header internally
  draftsManager: React.ReactNode
  writingToolbar: React.ReactNode
  richTextEditor: React.ReactNode
  wordCounter: React.ReactNode
  aiSuggestionsPanel: React.ReactNode
}

export function ImprovedWritingPage({
  header,
  draftsManager,
  writingToolbar,
  richTextEditor,
  wordCounter,
  aiSuggestionsPanel,
}: ImprovedWritingPageProps) {
  const [isMobile, setIsMobile] = React.useState(false)
  const { getCurrentUsage, getCurrentLimit, isLoading: usageLoading } = useUsageLimits()

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const checkSize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkSize()
    window.addEventListener("resize", checkSize)
    return () => window.removeEventListener("resize", checkSize)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <div className="p-3 border-b bg-background">
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <PencilRuler className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg text-foreground">Writing Assistant</span>
          </div>

          {!usageLoading && (
            <div className="flex-1 max-w-md mx-auto">
              <UsageProgressBar
                current={getCurrentUsage('writing_words')}
                limit={getCurrentLimit('writing_words')}
                label="Words Written"
                unit="words"
                size="sm"
                showValues={true}
              />
            </div>
          )}

          <div className="flex items-center gap-4">
            {header}
            {draftsManager}
          </div>
        </div>
      </div>

      <div className="flex-grow p-4 overflow-hidden">
        {isMobile ? (
          <div className="h-full flex flex-col gap-3">
            <Card className="flex-1 flex flex-col shadow-sm">
              <CardHeader className="p-0">
                {writingToolbar}
              </CardHeader>
              <Separator />
              <CardContent className="p-0 flex-1 relative overflow-hidden">
                {richTextEditor}
              </CardContent>
              <Separator />
              <div className="p-3 bg-background border-t">
                {wordCounter}
              </div>
            </Card>
            <div className="h-[40%]">
              {aiSuggestionsPanel}
            </div>
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-full min-h-0 gap-3">
            <ResizablePanel defaultSize={65} minSize={40} className="min-h-0">
              <Card className="h-full flex flex-col shadow-sm">
                <CardHeader className="p-0">
                  {writingToolbar}
                </CardHeader>
                <Separator />
                <CardContent className="p-0 flex-1 relative overflow-hidden">
                  {richTextEditor}
                </CardContent>
                <Separator />
                <div className="p-3 bg-background border-t">
                  {wordCounter}
                </div>
              </Card>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={35} minSize={24} className="min-h-0">
              <div className="h-full min-h-0">
                {aiSuggestionsPanel}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  )
}
