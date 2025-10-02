"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentProvider } from "@/components/reading/document-context";
import { FileUploaderComponent } from "@/components/reading/file-uploader";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
  const [mode, setMode] = useState<'online' | 'pdf'>('online')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [instructions, setInstructions] = useState('Choose the best answer for each question.')

  async function generate() {
    try {
      setIsGenerating(true)
      const documentIds = uploadedDocs.map(d => d.documentId!).filter(Boolean)
      if (mode === 'pdf') {
        // Route to full-length PDF builder page for richer PDF generation flows
        router.push('/exam-prep/full-length')
        return
      }

      const res = await fetch('/api/exam-prep/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds, count, durationMinutes: duration, title, difficulty, instructions })
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
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Exam Prep</h1>
          <p className="text-sm text-slate-600 mt-1">Generate a practice exam from your study materials.</p>
        </header>

        <Card className="mb-6">
          <CardHeader className="p-6 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Study Materials</CardTitle>
                <CardDescription>Use high‑quality sources for better question quality.</CardDescription>
              </div>
              <Badge variant={uploadedDocs.length > 0 ? "secondary" : "outline"}>
                {uploadedDocs.length > 0 ? `${uploadedDocs.length} file${uploadedDocs.length > 1 ? 's' : ''}` : 'No files'}
              </Badge>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-700">Upload PDF, DOCX, or TXT files.</p>
              <Button size="sm" variant="outline" onClick={() => setShowUploader(true)}>Upload</Button>
            </div>
            <div className="text-sm text-slate-600">
              {uploadedDocs.length === 0 ? 'No documents uploaded yet.' : `${uploadedDocs.length} document(s) ready.`}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader className="p-6 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Exam Settings</CardTitle>
                <CardDescription>Adjust to fit your study session.</CardDescription>
              </div>
              <Badge variant="outline">Simple</Badge>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="e.g. Biology Midterm Practice" />
              <p className="text-xs text-slate-500">A clear title keeps sessions organized.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="count">Questions</Label>
              <Input id="count" type="number" min={5} max={50} value={count} onChange={(e)=>setCount(parseInt(e.target.value || '0'))} />
              <p className="text-xs text-slate-500">Tip: 10–30 works well for focused practice.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input id="duration" type="number" min={10} max={240} value={duration} onChange={(e)=>setDuration(parseInt(e.target.value || '0'))} />
              <p className="text-xs text-slate-500">Set a realistic timebox to mimic test pace.</p>
            </div>
            <div className="space-y-2 sm:col-span-1">
              <Label>Exam type</Label>
              <Select value={mode} onValueChange={(v)=>setMode(v as any)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Full-length online exam</SelectItem>
                  <SelectItem value="pdf">Full-length PDF exam</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">PDF opens the advanced PDF builder.</p>
            </div>
            {mode === 'online' && (
              <>
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select value={difficulty} onValueChange={(v)=>setDifficulty(v as any)}>
                    <SelectTrigger><SelectValue placeholder="Select difficulty" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Specific instructions (optional)</Label>
                  <Textarea value={instructions} onChange={(e)=>setInstructions(e.target.value)} rows={3} placeholder="Any topics to emphasize, style preferences, or special constraints" />
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="p-6 pt-0 flex items-center justify-between">
            <p className="text-xs text-slate-500">You can adjust settings anytime before generating.</p>
            <Button onClick={generate} disabled={uploadedDocs.length === 0 || isGenerating}>
              {isGenerating ? 'Generating…' : (mode === 'pdf' ? 'Open PDF Builder' : 'Generate Exam')}
            </Button>
          </CardFooter>
        </Card>
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

