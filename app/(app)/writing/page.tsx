"use client"

import dynamic from 'next/dynamic'

// Dynamic import with no SSR to avoid window/document issues
const WritingPageClient = dynamic(() => import('@/components/writing/writing-page-client'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading Writing Assistant...</p>
      </div>
    </div>
  )
})

export default function WritingPage() {
  return <WritingPageClient />
}
