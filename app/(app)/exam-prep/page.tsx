"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentProvider } from "@/components/reading/document-context";
import { FileUploaderComponent } from "@/components/reading/file-uploader";

interface GeneratedExam {
  examTitle: string
  instructions: string
  duration: number
  questions: Array<{ id: string; question: string; options: string[]; correctAnswer: string; explanation?: string }>
}

export default function ExamPrepPage() {
  const router = useRouter();
  const [showUploader, setShowUploader] = useState(false)
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ documentId?: string }>>([])
  const [count, setCount] = useState(20)
  const [duration, setDuration] = useState(60)
  const [title, setTitle] = useState('Practice Exam')
  const [isGenerating, setIsGenerating] = useState(false)

  async function generate() {
    try {
      setIsGenerating(true)
      const documentIds = uploadedDocs.map(d => d.documentId!).filter(Boolean)
      const res = await fetch('/api/exam-prep/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds, count, durationMinutes: duration, title })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || res.statusText)
      }
      const data = await res.json() as { success: boolean; exam: GeneratedExam }
      localStorage.setItem('generatedExam', JSON.stringify(data.exam))
      router.push('/exam-prep/take')
    } catch (e: any) {
      alert(`Generation failed: ${e?.message || e}`)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Exam Prep</h1>

        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Upload study materials (PDF, DOCX, TXT)</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowUploader(true)}>Upload</Button>
            </div>
            <div className="text-sm text-slate-700">
              {uploadedDocs.length === 0 ? 'No documents uploaded yet.' : `${uploadedDocs.length} document(s) ready.`}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e)=>setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="count">Questions</Label>
              <Input id="count" type="number" min={5} max={50} value={count} onChange={(e)=>setCount(parseInt(e.target.value || '0'))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input id="duration" type="number" min={10} max={240} value={duration} onChange={(e)=>setDuration(parseInt(e.target.value || '0'))} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={generate} disabled={uploadedDocs.length === 0 || isGenerating}>
            {isGenerating ? 'Generating…' : 'Generate Exam'}
          </Button>
        </div>
      </div>

      {showUploader && (
        <DocumentProvider>
          <FileUploaderComponent
            onClose={() => setShowUploader(false)}
            onUploaded={(result) => {
              setUploadedDocs(prev => [...prev, { documentId: result.documentId }])
              setShowUploader(false)
            }}
          />
        </DocumentProvider>
      )}
    </div>
  );
}

