"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

// Study modes configuration
const studyModes: StudyMode[] = [
  {
    id: "full-length",
    title: "Full-Length Exam Prep",
    description:
      "Comprehensive exam prep with pattern analysis and intelligent question generation.",
    icon: BookOpen,
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    id: "quiz",
    title: "Interactive Quiz",
    description: "Test your knowledge with AI-generated questions",
    icon: Brain,
    gradient: "from-blue-400 to-blue-600",
  },
  {
    id: "flashcards",
    title: "Smart Flashcards",
    description: "Master concepts with spaced repetition",
    icon: FileText,
    gradient: "from-green-400 to-green-600",
  },
  {
    id: "meme",
    title: "Memory Memes",
    description: "Learn through humor and visual memory",
    icon: Smile,
    gradient: "from-purple-400 to-purple-600",
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

const StudyModeCard = ({ mode, isSelected, onSelect }) => {
  const Icon = mode.icon;
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -5, boxShadow: "0px 10px 20px rgba(0,0,0,0.1)" }}
      onClick={() => onSelect(mode.id)}
      className={`cursor-pointer rounded-2xl overflow-hidden relative border-2 transition-all duration-300 ${
        isSelected
          ? "border-blue-500 shadow-xl ring-4 ring-blue-200"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <Card className="h-full">
        <CardContent className="p-6 text-center flex flex-col items-center justify-center h-full">
          <motion.div
            className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${mode.gradient} mb-4 flex items-center justify-center`}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <Icon className="w-8 h-8 text-white" />
          </motion.div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">{mode.title}</h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            {mode.description}
          </p>
        </CardContent>
      </Card>
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-3 right-3 bg-blue-500 rounded-full p-1"
          >
            <CheckCircle2 className="w-5 h-5 text-white" />
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

  const handleModeSelect = (mode: StudyMode["id"]) => {
    setSelectedMode(mode);
  };

  const handleStartStudy = async () => {
    if (!selectedMode) return;
    if (selectedMode !== 'full-length' && !context.trim()) return;


    setIsLoading(true);

    if (selectedMode === "full-length") {
      router.push("/exam-prep/full-length");
      return;
    }

    // Navigate to the specific mode with context
    const params = new URLSearchParams({
      mode: selectedMode,
      topic: context.trim(),
    });

    // Navigate to the study session
    router.push(`/exam-prep/session?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
              Choose Your Study Method
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Select how you'd like to study and provide context about your
              topic
            </p>
          </motion.div>

          {/* Study Mode Cards */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10"
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
                <Card className="mb-8 shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Provide Context
                    </h3>
                    <Textarea
                      placeholder="Enter your study topic, specific concepts, or any context that will help generate better content. For example: 'JavaScript promises and async/await', 'Calculus derivatives', or 'World War II causes'..."
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      rows={4}
                      className="resize-none text-base"
                    />
                    <p className="text-sm text-slate-500 mt-2">
                      The more specific you are, the better your study
                      materials will be!
                    </p>
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
                    (selectedMode !== "full-length" && !context.trim())
                  }
                  size="lg"
                  className="w-full sm:w-auto px-10 py-6 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-300 transform hover:scale-105"
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


