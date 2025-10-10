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
        // Generate and download PDF
        const pdfBlob = await generatePDF(data.exam)
        const url = URL.createObjectURL(pdfBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'exam'}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            📚 Exam Prep
          </h1>
          <p className="text-slate-600">Generate full-length PDF exams or online quizzes from your study materials.</p>
        </header>

        <Card className="mb-6 shadow-lg border-l-4 border-blue-500">
          <CardHeader className="p-6 pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-blue-700">📄 Study Materials</CardTitle>
                <CardDescription>Upload PDF, DOCX, or TXT files. Drag & drop multiple files or click to browse.</CardDescription>
              </div>
              <Badge variant={uploadedDocs.length > 0 ? "secondary" : "outline"} className={uploadedDocs.length > 0 ? "bg-blue-100 text-blue-700" : ""}>
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
                onClick={handleOpenUploader}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                📤 Upload Files
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

        <Card className="mb-6 shadow-lg border-l-4 border-purple-500">
          <CardHeader className="p-6 pb-3 bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-purple-700">⚙️ Exam Settings</CardTitle>
                <CardDescription>Adjust to fit your study session.</CardDescription>
              </div>
              <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">Simple</Badge>
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
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    mode === 'online'
                      ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 shadow-md'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setMode('online')}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      mode === 'online' ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                    }`}>
                      {mode === 'online' && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">💻 Online Quiz</h3>
                      <p className="text-sm text-slate-600">Interactive quiz with real-time feedback</p>
                    </div>
                  </div>
                </div>
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    mode === 'pdf'
                      ? 'border-pink-500 bg-gradient-to-br from-pink-50 to-orange-50 shadow-md'
                      : 'border-gray-200 hover:border-pink-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setMode('pdf')}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      mode === 'pdf' ? 'border-pink-500 bg-pink-500' : 'border-gray-300'
                    }`}>
                      {mode === 'pdf' && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">📄 PDF Exam</h3>
                      <p className="text-sm text-slate-600">Downloadable exam for offline practice</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {mode === 'online'
                  ? 'Choose between rapid-fire questions or scheduled format below.'
                  : 'Generates and downloads a PDF exam with questions and answer key.'
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
            {mode === 'online' && (
              <>
                <div className="space-y-2 sm:col-span-3">
                  <Label>Quiz Mode</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        quizMode === 'rapid-fire'
                          ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-md'
                          : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setQuizMode('rapid-fire')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          quizMode === 'rapid-fire' ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
                        }`}>
                          {quizMode === 'rapid-fire' && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">⚡ Rapid Fire</h3>
                          <p className="text-sm text-slate-600">Questions appear one by one</p>
                        </div>
                      </div>
                    </div>
                    <div
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        quizMode === 'scheduled'
                          ? 'border-cyan-500 bg-gradient-to-br from-cyan-50 to-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-cyan-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setQuizMode('scheduled')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          quizMode === 'scheduled' ? 'border-cyan-500 bg-cyan-500' : 'border-gray-300'
                        }`}>
                          {quizMode === 'scheduled' && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">📋 Scheduled</h3>
                          <p className="text-sm text-slate-600">All questions visible top to bottom</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {quizMode === 'rapid-fire'
                      ? 'Perfect for quick practice sessions with immediate feedback.'
                      : 'Ideal for comprehensive review with ability to scroll through all questions.'
                    }
                  </p>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="p-6 pt-0 flex items-center justify-between">
            <p className="text-xs text-slate-500">You can adjust settings anytime before generating.</p>
            <Button
              onClick={generate}
              disabled={uploadedDocs.length === 0 || isGenerating}
              className={`${
                mode === 'pdf'
                  ? 'bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700'
                  : quizMode === 'rapid-fire'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700'
              } text-white shadow-md`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                mode === 'pdf'
                  ? '✨ Generate PDF Exam'
                  : quizMode === 'rapid-fire'
                  ? '⚡ Generate Rapid Fire Quiz'
                  : '📋 Generate Scheduled Quiz'
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

