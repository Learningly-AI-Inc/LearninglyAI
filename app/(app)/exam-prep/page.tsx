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
import jsPDF from 'jspdf';

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
  const [loadingFact, setLoadingFact] = useState('')
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [generatedExamData, setGeneratedExamData] = useState<GeneratedExam | null>(null)

  const loadingFacts = [
    "💡 Did you know? The average person forgets 50% of what they learn within an hour!",
    "🧠 Studies show that testing yourself is more effective than re-reading notes.",
    "📚 The spacing effect: Learning over time beats cramming every time!",
    "✨ Practice exams can boost your retention by up to 30%!",
    "🎯 Active recall is proven to strengthen memory connections in your brain.",
    "⏰ Taking breaks during study sessions improves long-term retention.",
    "🌟 Self-testing helps identify knowledge gaps you didn't know existed.",
    "💪 Regular practice with varied questions builds exam confidence.",
    "🔄 Reviewing mistakes is the fastest path to improvement.",
    "🎓 Spaced repetition can help you remember information for years!",
    "🚀 The testing effect: Retrieving info makes it stick better than reviewing.",
    "💯 Students who practice with exams score 10-20% higher on average.",
  ]

  // Rotate loading facts while generating
  useEffect(() => {
    if (isGenerating) {
      setLoadingFact(loadingFacts[Math.floor(Math.random() * loadingFacts.length)])
      const interval = setInterval(() => {
        setLoadingFact(loadingFacts[Math.floor(Math.random() * loadingFacts.length)])
      }, 4000) // Change fact every 4 seconds
      return () => clearInterval(interval)
    }
  }, [isGenerating])

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

      if (mode === 'pdf') {
        // Generate PDF and show in modal with preview
        const blob = await generatePDF(data.exam)
        setPdfBlob(blob)
        setGeneratedExamData(data.exam)
        setShowPdfModal(true)
      } else {
        // Online quiz mode - save to localStorage and redirect
        localStorage.setItem('generatedExam', JSON.stringify(data.exam))
        router.push('/exam-prep/take')
      }
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

  // PDF Generation Function
  const generatePDF = async (examData: GeneratedExam): Promise<Blob> => {
    const doc = new jsPDF()

    doc.setProperties({
      title: examData.examTitle || 'Generated Exam',
      subject: 'AI-Generated Exam',
      author: 'Learningly AI',
      creator: 'Learningly AI Exam Generator'
    })

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(examData.examTitle || 'Generated Exam', 20, 30)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Duration: ${examData.duration} minutes`, 20, 45)
    doc.text(`Questions: ${examData.questions.length}`, 20, 55)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Instructions:', 20, 75)
    doc.setFont('helvetica', 'normal')

    const instructions = examData.instructions || 'Please read each question carefully and select the best answer.'
    const instructionLines = doc.splitTextToSize(instructions, 170)
    doc.text(instructionLines, 20, 85)

    let yPosition = 105
    const questions = examData.questions || []

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]

      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(`Question ${i + 1}:`, 20, yPosition)
      yPosition += 10

      doc.setFont('helvetica', 'normal')
      const questionLines = doc.splitTextToSize(question.question, 170)
      doc.text(questionLines, 20, yPosition)
      yPosition += questionLines.length * 5 + 5

      if (question.options && Array.isArray(question.options)) {
        question.options.forEach((option: string, optIndex: number) => {
          if (yPosition > 250) {
            doc.addPage()
            yPosition = 20
          }
          const cleanOption = option.replace(/^[A-D][).]\s*/i, '').trim()
          doc.text(`${String.fromCharCode(65 + optIndex)}. ${cleanOption}`, 30, yPosition)
          yPosition += 6
        })
      }

      yPosition += 10
    }

    // Add Answer Key
    doc.addPage()
    yPosition = 20

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('ANSWER KEY', 20, yPosition)
    yPosition += 20

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Correct answers and explanations:', 20, yPosition)
    yPosition += 15

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]

      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(`Question ${i + 1}:`, 20, yPosition)
      yPosition += 10

      doc.setFont('helvetica', 'normal')
      const answerText = `Answer: ${question.correctAnswer}`
      const answerLines = doc.splitTextToSize(answerText, 170)
      doc.text(answerLines, 30, yPosition)
      yPosition += answerLines.length * 5 + 5

      if (question.explanation) {
        doc.setFont('helvetica', 'bold')
        doc.text('Explanation:', 30, yPosition)
        yPosition += 8

        doc.setFont('helvetica', 'normal')
        const explanationLines = doc.splitTextToSize(question.explanation, 160)
        doc.text(explanationLines, 30, yPosition)
        yPosition += explanationLines.length * 5 + 10
      } else {
        yPosition += 5
      }
    }

    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Generated by Learningly AI', 20, 290)
      doc.text(`Page ${i} of ${pageCount}`, 170, 290)
    }

    return doc.output('blob')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-muted/40">
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">Exam Prep</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate full-length PDF exams or online quizzes from your study materials.</p>
        </header>

        <Card className="mb-6 shadow-lg border-l-4 border-blue-500 dark:border-blue-400 dark:bg-gray-800">
          <CardHeader className="p-6 pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-blue-700 dark:text-blue-300">📄 Study Materials</CardTitle>
                <CardDescription className="dark:text-slate-400">Upload PDF, DOCX, or TXT files. Drag & drop multiple files or click to browse.</CardDescription>
              </div>
              <Badge variant={uploadedDocs.length > 0 ? "secondary" : "outline"} className={uploadedDocs.length > 0 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" : "dark:border-gray-600 dark:text-gray-400"}>
                {uploadedDocs.length > 0 ? `${uploadedDocs.length} file${uploadedDocs.length > 1 ? 's' : ''}` : 'No files'}
              </Badge>
            </div>
          </CardHeader>
          <Separator className="dark:bg-gray-700" />
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Upload single or multiple files (up to 10 files, 100MB each).</p>
                <p className="text-xs text-muted-foreground mt-1">Drag & drop multiple files for faster uploads, or click to browse.</p>
              </div>
              <Button
                size="sm"
                onClick={handleOpenUploader}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                📤 Upload Files
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {uploadedDocs.length === 0 ? 'No study materials uploaded yet.' : `${uploadedDocs.length} study material(s) ready.`}
            </div>
            {uploadedDocs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Uploaded study materials:</p>
                <div className="space-y-1">
                  {uploadedDocs.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-card border rounded text-sm">
                      <span className="text-card-foreground">{doc.name || `Document ${index + 1}`}</span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setUploadedDocs(prev => prev.filter((_, i) => i !== index))}
                        className="text-destructive hover:text-destructive/80"
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

        <Card className="mb-6 shadow-lg border-l-4 border-blue-500 dark:border-blue-400 dark:bg-gray-800">
          <CardHeader className="p-6 pb-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-blue-700 dark:text-blue-300">⚙️ Exam Settings</CardTitle>
                <CardDescription className="dark:text-slate-400">Adjust to fit your study session.</CardDescription>
              </div>
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700">Simple</Badge>
            </div>
          </CardHeader>
          <Separator className="dark:bg-gray-700" />
          <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="e.g. Biology Midterm Practice" />
              <p className="text-xs text-muted-foreground">A clear title keeps sessions organized.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="count">Questions</Label>
              <Input id="count" type="number" min={5} max={50} value={count} onChange={(e)=>setCount(Math.max(5, Math.min(50, parseInt(e.target.value || '0') || 0)))} />
              <p className="text-xs text-muted-foreground">Tip: 10–30 works well for focused practice.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input id="duration" type="number" min={10} max={240} value={duration} onChange={(e)=>setDuration(Math.max(10, Math.min(240, parseInt(e.target.value || '0') || 0)))} />
              <p className="text-xs text-muted-foreground">Set a realistic timebox to mimic test pace.</p>
            </div>
            <div className="space-y-2 sm:col-span-3">
              <Label className="dark:text-slate-200">Exam Type</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    mode === 'online' 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-border/80'
                  }`}
                  onClick={() => setMode('online')}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      mode === 'online' ? 'border-primary bg-primary' : 'border-muted-foreground'
                    }`}>
                      {mode === 'online' && <div className="w-2 h-2 bg-primary-foreground rounded-full m-0.5" />}
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Online Quiz</h3>
                      <p className="text-sm text-muted-foreground">Interactive quiz with real-time feedback</p>
                    </div>
                  </div>
                </div>
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    mode === 'pdf' 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-border/80'
                  }`}
                  onClick={() => setMode('pdf')}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      mode === 'pdf' ? 'border-primary bg-primary' : 'border-muted-foreground'
                    }`}>
                      {mode === 'pdf' && <div className="w-2 h-2 bg-primary-foreground rounded-full m-0.5" />}
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">PDF Exam</h3>
                      <p className="text-sm text-muted-foreground">Downloadable exam for offline practice</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {mode === 'online' 
                  ? 'Choose between rapid-fire questions or scheduled format below.' 
                  : 'Opens the advanced PDF builder for comprehensive exam generation.'
                }
              </p>
            </div>
            <div className="space-y-2">
              <Label className="dark:text-slate-200">Difficulty</Label>
              <Select value={difficulty} onValueChange={(v)=>setDifficulty(v as any)}>
                <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-slate-200"><SelectValue placeholder="Select difficulty" /></SelectTrigger>
                <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                  <SelectItem value="easy" className="dark:text-slate-200 dark:hover:bg-gray-600">Easy</SelectItem>
                  <SelectItem value="medium" className="dark:text-slate-200 dark:hover:bg-gray-600">Medium</SelectItem>
                  <SelectItem value="hard" className="dark:text-slate-200 dark:hover:bg-gray-600">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mode === 'online' && (
              <>
                <div className="space-y-2 sm:col-span-3">
                  <Label className="dark:text-slate-200">Quiz Mode</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        quizMode === 'rapid-fire' 
                          ? 'border-green-500 bg-green-500/10' 
                          : 'border-border hover:border-border/80'
                      }`}
                      onClick={() => setQuizMode('rapid-fire')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          quizMode === 'rapid-fire' ? 'border-green-500 bg-green-500' : 'border-muted-foreground'
                        }`}>
                          {quizMode === 'rapid-fire' && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">Rapid Fire Round</h3>
                          <p className="text-sm text-muted-foreground">Questions appear one by one</p>
                        </div>
                      </div>
                    </div>
                    <div 
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        quizMode === 'scheduled' 
                          ? 'border-green-500 bg-green-500/10' 
                          : 'border-border hover:border-border/80'
                      }`}
                      onClick={() => setQuizMode('scheduled')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          quizMode === 'scheduled' ? 'border-green-500 bg-green-500' : 'border-muted-foreground'
                        }`}>
                          {quizMode === 'scheduled' && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">Scheduled Quiz</h3>
                          <p className="text-sm text-muted-foreground">All questions visible from top to bottom</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
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
                      <p className="text-xs text-muted-foreground mt-1">Upload up to 5 sample questions from your professor for better exam generation</p>
                    </div>
                    <Badge variant={sampleQuestions.length > 0 ? "secondary" : "outline"}>
                      {sampleQuestions.length > 0 ? `${sampleQuestions.length}/5 files` : 'No files'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-dashed border-border rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">
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
                      <p className="text-xs text-muted-foreground">Uploaded sample questions:</p>
                      <div className="space-y-1">
                        {sampleQuestions.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-card border rounded text-sm">
                            <span className="text-card-foreground">{file.name || `Sample Question ${index + 1}`}</span>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => setSampleQuestions(prev => prev.filter((_, i) => i !== index))}
                              className="text-destructive hover:text-destructive/80"
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
            <p className="text-xs text-muted-foreground">You can adjust settings anytime before generating.</p>
            <Button onClick={generate} disabled={uploadedDocs.length === 0 || isGenerating}>
              {isGenerating ? 'Generating…' : (
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

      {/* Loading Modal with Random Facts */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl p-8 animate-in fade-in duration-300">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full mb-4">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Generating Your {mode === 'pdf' ? 'PDF Exam' : 'Quiz'}...</h3>
              <p className="text-gray-600 dark:text-gray-300">This may take a moment. Hang tight!</p>
            </div>

            {loadingFact && (
              <div className="bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50 dark:from-blue-900/20 dark:via-blue-800/20 dark:to-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-6 shadow-inner">
                <div className="flex items-start gap-4">
                  <div className="text-4xl animate-pulse">💭</div>
                  <div className="flex-1">
                    <p className="text-lg font-medium text-gray-800 dark:text-gray-100 leading-relaxed">{loadingFact}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-3 h-3 bg-blue-700 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal - Larger Size */}
      {showPdfModal && pdfBlob && generatedExamData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPdfModal(false)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b dark:border-gray-700 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">🎉 Your Exam is Ready!</h2>
                  <p className="text-blue-100 text-sm mt-1">{generatedExamData.examTitle}</p>
                </div>
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* PDF Preview - Much Larger */}
            <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900 p-6">
              <iframe
                src={URL.createObjectURL(pdfBlob)}
                className="w-full h-full rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-lg"
                title="PDF Preview"
              />
            </div>

            {/* Footer with actions */}
            <div className="p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-xl flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <p className="font-medium">{generatedExamData.questions.length} questions • {generatedExamData.duration} minutes</p>
                  <p className="text-xs mt-1">Preview the exam above, then download when ready</p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowPdfModal(false)}
                    className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      const url = URL.createObjectURL(pdfBlob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'exam'}.pdf`
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      URL.revokeObjectURL(url)
                      setShowPdfModal(false)
                    }}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
                  >
                    📥 Download PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

