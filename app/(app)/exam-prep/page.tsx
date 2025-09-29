"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileUploaderComponent } from "@/components/reading/file-uploader";
import { DocumentProvider } from "@/components/reading/document-context";
import {
  Brain,
  FileText,
  Smile,
  Send,
  BookOpen,
  CheckCircle2,
} from "lucide-react";

// Types
interface StudyMode {
  id: "full-length" | "quiz" | "flashcards" | "meme";
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  gradient: string;
}

interface StudyModeCardProps {
  mode: StudyMode;
  isSelected: boolean;
  onSelect: (modeId: StudyMode["id"]) => void;
}

// Study modes configuration
const studyModes: StudyMode[] = [
  {
    id: "full-length",
    title: "Full-Length Exam Prep",
    description:
      "Upload lectures and past papers. We analyze the professor's style and generate 10–20 full PDF exams in that style.",
    icon: BookOpen,
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    id: "quiz",
    title: "Online Exam (Timed Quiz)",
    description: "Upload materials to generate a long, timed quiz you can configure (time & number of questions).",
    icon: Brain,
    gradient: "from-blue-400 to-blue-600",
  },
];

const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
    },
  },
};

const StudyModeCard = ({ mode, isSelected, onSelect }: StudyModeCardProps) => {
  const Icon = mode.icon;
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4, scale: 1.01 }}
      onClick={() => onSelect(mode.id)}
      className={`cursor-pointer rounded-xl overflow-hidden relative transition-all duration-300 bg-white/80 backdrop-blur-sm ${
        isSelected
          ? "shadow-lg border border-blue-500/60"
          : "shadow-sm border border-slate-200 hover:border-slate-300"
      }`}
    >
      <Card className="h-full border-0 shadow-none bg-transparent">
        <CardContent className="p-6 text-center flex flex-col items-center justify-center h-full">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mode.gradient} mb-4 flex items-center justify-center shadow-md`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">{mode.title}</h3>
          <p className="text-slate-600 text-sm leading-relaxed max-w-xs">
            {mode.description}
          </p>
        </CardContent>
      </Card>
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-3 right-3 bg-blue-600 rounded-full p-1.5 shadow"
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};


// Main selection screen component
function ExamPrepSelection() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<StudyMode["id"] | null>(
    null
  );
  const [context, setContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ title?: string; fileUrl?: string; documentId?: string }>>([])

  const handleModeSelect = (mode: StudyMode["id"]) => {
    // Direct navigation per request
    if (mode === 'full-length') {
      router.push('/exam-prep/full-exam');
      return;
    }
    if (mode === 'quiz') {
      router.push('/exam-prep/full-exam?mode=quiz');
      return;
    }
    setSelectedMode(mode);
  };

  const handleStartStudy = async () => {
    if (!selectedMode) return;
    if (selectedMode !== 'full-length' && uploadedFiles.length === 0) return;


    setIsLoading(true);

    // full-length now navigates immediately on card click

    // Navigate to the study session (online exam)
    // Pass a lightweight flag; server-side will fetch uploaded files for the user
    const params = new URLSearchParams({ mode: selectedMode });
    router.push(`/exam-prep/session?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-14">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h1 className="text-4xl md:text-5xl font-extrabold mb-3 tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Take Full Exam Prep with Learningly
            </h1>
            <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
              Choose a streamlined path: go straight into Full-Length PDF prep or start an Online Exam.
            </p>
          </motion.div>

          {/* Study Mode Cards */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
          >
            {studyModes.map((mode) => (
              <StudyModeCard
                key={mode.id}
                mode={mode}
                isSelected={selectedMode === mode.id}
                onSelect={handleModeSelect}
              />
            ))}
          </motion.div>
          <AnimatePresence>
            {selectedMode && selectedMode !== "full-length" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="mb-8 shadow-sm border border-slate-200/80">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold text-slate-900">
                        Online exam setup
                      </h3>
                      <Button size="sm" variant="outline" onClick={() => setShowUploader(true)}>Upload materials</Button>
                    </div>
                    {uploadedFiles.length > 0 && (
                      <div className="mb-3 text-sm text-slate-700">
                        <div className="mb-2 font-medium">Files to include:</div>
                        <ul className="list-disc ml-5 space-y-1">
                          {uploadedFiles.map((f, i) => (
                            <li key={i} className="truncate">
                              {f.title || f.fileUrl || `File ${i+1}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <Textarea
                      placeholder="Brief notes (topics, constraints)…"
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      rows={3}
                      className="resize-none text-base"
                    />
                    <p className="text-xs text-slate-500 mt-2">Next step: choose time and number of questions.</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Start Button */}

          <AnimatePresence>
            {selectedMode && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="text-center"
              >
                <Button
                  onClick={handleStartStudy}
                  disabled={
                    isLoading ||
                    (selectedMode !== "full-length" && uploadedFiles.length === 0)
                  }
                  size="lg"
                  className="w-full sm:w-auto px-10 py-5 text-base md:text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md transition-all duration-200"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Starting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {selectedMode === "full-length"
                        ? "Start Exam Prep"
                        : "Start Studying"}
                      <Send className="w-5 h-5" />
                    </span>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {showUploader && (
        <DocumentProvider>
          <FileUploaderComponent 
            onClose={() => setShowUploader(false)}
            onUploaded={(result) => {
              setUploadedFiles(prev => [...prev, result])
            }}
          />
        </DocumentProvider>
      )}
    </div>
  );
}

// URL parameters based component
function ExamPrepPageContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const topic = searchParams.get("topic");

  // If we have URL params, this means we're coming from the old system
  // For now, redirect to selection screen to maintain clean UX
  if (mode || topic) {
    return <ExamPrepSelection />;
  }

  // Default: show the new selection interface
  return <ExamPrepSelection />;
}

// Main page component
export default function ExamPrepPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-lg text-slate-600">Loading...</div>
        </div>
      }
    >
      <ExamPrepPageContent />
    </Suspense>
  );
}


