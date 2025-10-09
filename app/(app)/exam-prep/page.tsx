"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentProvider } from "@/components/reading/document-context";
import { FileUploaderComponent } from "@/components/reading/file-uploader";
import { OptimizedFileUploader } from "@/components/reading/optimized-file-uploader";
import { StudyMaterialsUploader } from "@/components/exam-prep/study-materials-uploader";
import { UpgradeModal } from "@/components/ui/upgrade-modal";
import { useUsageLimits } from "@/hooks/use-usage-limits";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface GeneratedExam {
  examTitle: string
  instructions: string
  duration: number
  questions: Array<{ id: string; question: string; options: string[]; correctAnswer: string; explanation?: string }>
}

export default function ExamPrepPage() {
  const router = useRouter();
  const { checkUsageLimit } = useUsageLimits();
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ documentId?: string; name?: string }>>([])
  const [count, setCount] = useState(20)
  const [duration, setDuration] = useState(60)
  const [title, setTitle] = useState('Practice Exam')
  const [isGenerating, setIsGenerating] = useState(false)
  const [mode, setMode] = useState<'online' | 'pdf'>('online')
  const [quizMode, setQuizMode] = useState<'rapid-fire' | 'scheduled'>('rapid-fire')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [instructions, setInstructions] = useState('Choose the best answer for each question.')
  const [sampleQuestions, setSampleQuestions] = useState<Array<{ documentId?: string; name?: string }>>([])
  const [showSampleUploader, setShowSampleUploader] = useState(false)
  const [showStudyMaterialsUploader, setShowStudyMaterialsUploader] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeModalConfig, setUpgradeModalConfig] = useState<{
    title?: string;
    message?: string;
    limitType?: 'documents_uploaded' | 'exam_sessions';
  }>({})

  async function generate() {
    try {
      setIsGenerating(true)

      // Check usage limit before generating
      const limitCheck = await checkUsageLimit('exam_sessions', 1)
      if (!limitCheck.canProceed) {
        setUpgradeModalConfig({
          title: 'Exam Session Limit Reached',
          message: limitCheck.message || 'You\'ve reached your monthly exam generation limit. Upgrade to Premium to generate unlimited exams.',
          limitType: 'exam_sessions'
        })
        setShowUpgradeModal(true)
        setIsGenerating(false)
        return
      }

      const documentIds = uploadedDocs.map(d => d.documentId!).filter(Boolean)
      console.log('uploadedDocs', uploadedDocs)
      console.log('documentIds', documentIds)

      const sampleQuestionIds = sampleQuestions.map(d => d.documentId!).filter(Boolean)

      if (mode === 'pdf') {
        // Route to full-length PDF builder page for richer PDF generation flows
        router.push('/exam-prep/full-length')
        return
      }

      const res = await fetch('/api/exam-prep/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds,
          sampleQuestionIds,
          count,
          durationMinutes: duration,
          title,
          difficulty,
          instructions,
          quizMode
        })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))

        // Handle limit errors specifically
        if (res.status === 429 && err.needsUpgrade) {
          setUpgradeModalConfig({
            title: err.error || 'Limit Reached',
            message: err.message || 'You\'ve reached your plan limit.',
            limitType: err.limitType || 'exam_sessions'
          })
          setShowUpgradeModal(true)
          setIsGenerating(false)
          return
        }

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

  // Check upload limit before opening uploader
  const handleOpenUploader = async () => {
    const limitCheck = await checkUsageLimit('documents_uploaded', 1)
    if (!limitCheck.canProceed) {
      setUpgradeModalConfig({
        title: 'Upload Limit Reached',
        message: limitCheck.message || 'You\'ve reached your monthly document upload limit. Upgrade to Premium to upload more documents.',
        limitType: 'documents_uploaded'
      })
      setShowUpgradeModal(true)
      return
    }
    setShowStudyMaterialsUploader(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Exam Prep</h1>
          <p className="text-sm text-slate-600 mt-1">Generate full-length PDF exams or online quizzes from your study materials.</p>
        </header>

        <Card className="mb-6">
          <CardHeader className="p-6 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Study Materials</CardTitle>
                <CardDescription>Upload PDF, DOCX, or TXT files. Drag & drop multiple files or click to browse.</CardDescription>
              </div>
              <Badge variant={uploadedDocs.length > 0 ? "secondary" : "outline"}>
                {uploadedDocs.length > 0 ? `${uploadedDocs.length} file${uploadedDocs.length > 1 ? 's' : ''}` : 'No files'}
              </Badge>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-700">Upload single or multiple files (up to 10 files, 100MB each).</p>
                <p className="text-xs text-slate-500 mt-1">Drag & drop multiple files for faster uploads, or click to browse.</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenUploader}
              >
                Upload Files
              </Button>
            </div>
            <div className="text-sm text-slate-600">
              {uploadedDocs.length === 0 ? 'No study materials uploaded yet.' : `${uploadedDocs.length} study material(s) ready.`}
            </div>
            {uploadedDocs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Uploaded study materials:</p>
                <div className="space-y-1">
                  {uploadedDocs.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white border rounded text-sm">
                      <span className="text-slate-700">{doc.name || `Document ${index + 1}`}</span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setUploadedDocs(prev => prev.filter((_, i) => i !== index))}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              <Input id="count" type="number" min={5} max={50} value={count} onChange={(e)=>setCount(Math.max(5, Math.min(50, parseInt(e.target.value || '0') || 0)))} />
              <p className="text-xs text-slate-500">Tip: 10–30 works well for focused practice.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input id="duration" type="number" min={10} max={240} value={duration} onChange={(e)=>setDuration(Math.max(10, Math.min(240, parseInt(e.target.value || '0') || 0)))} />
              <p className="text-xs text-slate-500">Set a realistic timebox to mimic test pace.</p>
            </div>
            <div className="space-y-2 sm:col-span-3">
              <Label>Exam Type</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    mode === 'online' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setMode('online')}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      mode === 'online' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                    }`}>
                      {mode === 'online' && <div className="w-2 h-2 bg-white rounded-full m-0.5" />}
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">Online Quiz</h3>
                      <p className="text-sm text-slate-600">Interactive quiz with real-time feedback</p>
                    </div>
                  </div>
                </div>
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    mode === 'pdf' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setMode('pdf')}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      mode === 'pdf' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                    }`}>
                      {mode === 'pdf' && <div className="w-2 h-2 bg-white rounded-full m-0.5" />}
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">PDF Exam</h3>
                      <p className="text-sm text-slate-600">Downloadable exam for offline practice</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {mode === 'online' 
                  ? 'Choose between rapid-fire questions or scheduled format below.' 
                  : 'Opens the advanced PDF builder for comprehensive exam generation.'
                }
              </p>
            </div>
            {mode === 'online' && (
              <>
                <div className="space-y-2 sm:col-span-3">
                  <Label>Quiz Mode</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        quizMode === 'rapid-fire' 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setQuizMode('rapid-fire')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          quizMode === 'rapid-fire' ? 'border-green-500 bg-green-500' : 'border-gray-300'
                        }`}>
                          {quizMode === 'rapid-fire' && <div className="w-2 h-2 bg-white rounded-full m-0.5" />}
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">Rapid Fire Round</h3>
                          <p className="text-sm text-slate-600">Questions appear one by one</p>
                        </div>
                      </div>
                    </div>
                    <div 
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        quizMode === 'scheduled' 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setQuizMode('scheduled')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          quizMode === 'scheduled' ? 'border-green-500 bg-green-500' : 'border-gray-300'
                        }`}>
                          {quizMode === 'scheduled' && <div className="w-2 h-2 bg-white rounded-full m-0.5" />}
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">Scheduled Quiz</h3>
                          <p className="text-sm text-slate-600">All questions visible from top to bottom</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {quizMode === 'rapid-fire' 
                      ? 'Perfect for quick practice sessions with immediate feedback.' 
                      : 'Ideal for comprehensive review with ability to navigate between questions.'
                    }
                  </p>
                </div>
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
                <div className="space-y-2 sm:col-span-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Sample questions (optional)</Label>
                      <p className="text-xs text-slate-500 mt-1">Upload up to 5 sample questions from your professor for better exam generation</p>
                    </div>
                    <Badge variant={sampleQuestions.length > 0 ? "secondary" : "outline"}>
                      {sampleQuestions.length > 0 ? `${sampleQuestions.length}/5 files` : 'No files'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-dashed border-slate-300 rounded-lg bg-slate-50/50">
                    <div className="text-sm text-slate-600">
                      {sampleQuestions.length === 0 ? 'No sample questions uploaded yet.' : `${sampleQuestions.length} sample question file(s) ready.`}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setShowSampleUploader(true)}
                      disabled={sampleQuestions.length >= 5}
                    >
                      {sampleQuestions.length >= 5 ? 'Max 5 files' : 'Upload Sample'}
                    </Button>
                  </div>
                  {sampleQuestions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">Uploaded sample questions:</p>
                      <div className="space-y-1">
                        {sampleQuestions.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-white border rounded text-sm">
                            <span className="text-slate-700">{file.name || `Sample Question ${index + 1}`}</span>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => setSampleQuestions(prev => prev.filter((_, i) => i !== index))}
                              className="text-red-600 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="p-6 pt-0 flex items-center justify-between">
            <p className="text-xs text-slate-500">You can adjust settings anytime before generating.</p>
            <Button onClick={generate} disabled={uploadedDocs.length === 0 || isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                mode === 'pdf'
                  ? 'Open PDF Builder' 
                  : `Generate ${quizMode === 'rapid-fire' ? 'Rapid Fire' : 'Scheduled'} Quiz`
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>


      {showSampleUploader && (
        <DocumentProvider>
          <FileUploaderComponent
            onClose={() => setShowSampleUploader(false)}
            onUploaded={(result) => {
              setSampleQuestions(prev => [...prev, { documentId: result.documentId, name: result.title || 'Sample Question' }])
              setShowSampleUploader(false)
            }}
          />
        </DocumentProvider>
      )}

      {showStudyMaterialsUploader && (
        <StudyMaterialsUploader
          onClose={() => setShowStudyMaterialsUploader(false)}
          onUploaded={(results) => {
            setUploadedDocs(prev => [...prev, ...results.map(r => ({ documentId: r.documentId, name: r.title }))])
            setShowStudyMaterialsUploader(false)
          }}
          maxFiles={10}
        />
      )}

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title={upgradeModalConfig.title}
        message={upgradeModalConfig.message}
        limitType={upgradeModalConfig.limitType}
      />
    </div>
  );
}

