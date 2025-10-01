"use client"

import * as React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"

interface ImprovedWritingPageProps {
  header: React.ReactNode
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
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Slim header: remove large title space; keep drafts on the right */}
      {(header || draftsManager) && (
        <div className="p-2 border-b bg-white">
          <div className="flex justify-between items-center">
            {/* Intentionally keep left side minimal to maximize editor space */}
            {header}
            {draftsManager}
          </div>
        </div>
      )}

      <div className="flex-grow p-4 overflow-hidden">
        {isMobile ? (
          <div className="h-full flex flex-col gap-3">
            <Card className="h-[60%] flex flex-col shadow-sm">
              <CardHeader className="p-0">
                {writingToolbar}
              </CardHeader>
              <Separator />
              <CardContent className="p-0 flex-grow relative">
                {richTextEditor}
              </CardContent>
              <Separator />
              <div className="p-2 bg-gray-50">
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
                <CardContent className="p-0 flex-grow relative min-h-0">
                  {richTextEditor}
                </CardContent>
                <Separator />
                <div className="p-2 bg-gray-50">
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
