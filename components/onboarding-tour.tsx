'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { X, ArrowRight, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TourStep {
  targetSelector: string
  title: string
  description: string
  position?: 'left' | 'right' | 'top' | 'bottom'
}

const tourSteps: TourStep[] = [
  {
    targetSelector: '[data-tour="dashboard"]',
    title: 'Dashboard 🏠',
    description: 'Your central hub for all learning activities. Get an overview of your progress, upcoming tasks, and quick access to all features.',
    position: 'right'
  },
  {
    targetSelector: '[data-tour="reading"]',
    title: 'Reading 📚',
    description: 'Upload your lecture slides, PDFs, or notes and instantly get summaries, notes, flashcards, quizzes, mind maps, and funny memes to make studying fun. You can also ask anything in the chat part related to the uploaded document.',
    position: 'right'
  },
  {
    targetSelector: '[data-tour="writing"]',
    title: 'Writing ✍️',
    description: 'Polish your essays and writings with grammar & AI checks, paraphrasing, and humanized rewrites. One click makes your writing clearer and more professional. It also gives full authority over your writing.',
    position: 'right'
  },
  {
    targetSelector: '[data-tour="search"]',
    title: 'Search 🔎',
    description: 'Ask questions to any of your preferred AI models, including GPT,  Gemini, Claude, DeepSeek, etc., and get insights, answers, and examples. No more endless scrolling — find answers instantly.',
    position: 'right'
  },
  {
    targetSelector: '[data-tour="exam-prep"]',
    title: 'Exam Prep 🧠',
    description: 'Turn your class materials into professor-style practice exams (both PDF and online quizzes), track your progress, and build confidence before test day. Our users show over 150% confidence and grade improvement by using the exam prep part.',
    position: 'right'
  },
  {
    targetSelector: '[data-tour="calendar"]',
    title: 'Calendar 📅',
    description: 'Upload your course syllabus or any other documents and get an instantly organized schedule for the entire semester. Stay organized with auto-synced deadlines and personalize your study dashboard to fit your learning style.',
    position: 'right'
  }
]

interface OnboardingTourProps {
  isOpen: boolean
  onClose: () => void
}

export function OnboardingTour({ isOpen, onClose }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [targetPosition, setTargetPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0)
      return
    }

    const updatePosition = () => {
      const step = tourSteps[currentStep]
      const target = document.querySelector(step.targetSelector)
      
      if (target) {
        const rect = target.getBoundingClientRect()
        setTargetPosition({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        })
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [currentStep, isOpen])

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onClose()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    onClose()
  }

  if (!isOpen || !targetPosition) return null

  const step = tourSteps[currentStep]
  const tooltipPosition = step.position || 'right'

  // Calculate tooltip position
  const getTooltipStyle = () => {
    const padding = 20
    const tooltipWidth = 360

    switch (tooltipPosition) {
      case 'right':
        return {
          top: targetPosition.top + targetPosition.height / 2,
          left: targetPosition.left + targetPosition.width + padding,
          transform: 'translateY(-50%)'
        }
      case 'left':
        return {
          top: targetPosition.top + targetPosition.height / 2,
          left: targetPosition.left - tooltipWidth - padding,
          transform: 'translateY(-50%)'
        }
      case 'top':
        return {
          top: targetPosition.top - padding,
          left: targetPosition.left + targetPosition.width / 2,
          transform: 'translate(-50%, -100%)'
        }
      case 'bottom':
        return {
          top: targetPosition.top + targetPosition.height + padding,
          left: targetPosition.left + targetPosition.width / 2,
          transform: 'translateX(-50%)'
        }
      default:
        return {
          top: targetPosition.top,
          left: targetPosition.left + targetPosition.width + padding
        }
    }
  }

  const getArrowStyle = () => {
    const size = 12 // square size; visual arrow size ~ size/1.3
    switch (tooltipPosition) {
      case 'right':
        return {
          top: '50%',
          left: -size / 2,
          transform: 'translateY(-50%) rotate(45deg)'
        } as React.CSSProperties
      case 'left':
        return {
          top: '50%',
          right: -size / 2,
          transform: 'translateY(-50%) rotate(45deg)'
        } as React.CSSProperties
      case 'top':
        return {
          bottom: -size / 2,
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)'
        } as React.CSSProperties
      case 'bottom':
      default:
        return {
          top: -size / 2,
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)'
        } as React.CSSProperties
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay with spotlight effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] pointer-events-none"
            style={{
              background: `radial-gradient(circle at ${targetPosition.left + targetPosition.width / 2}px ${
                targetPosition.top + targetPosition.height / 2
              }px, transparent 0px, transparent ${Math.max(targetPosition.width, targetPosition.height) / 2 + 20}px, rgba(0, 0, 0, 0.7) ${
                Math.max(targetPosition.width, targetPosition.height) / 2 + 60
              }px)`
            }}
          />

          {/* Highlight ring around target */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="fixed z-[9999] pointer-events-none"
            style={{
              top: targetPosition.top - 8,
              left: targetPosition.left - 8,
              width: targetPosition.width + 16,
              height: targetPosition.height + 16,
              borderRadius: '12px',
              border: '3px solid #3b82f6',
              boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.2), 0 0 20px rgba(59, 130, 246, 0.4)'
            }}
          />

          {/* Tooltip bubble */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="fixed z-[10000] bg-white rounded-2xl shadow-2xl p-6 max-w-sm pointer-events-auto border-2 border-blue-100"
            style={getTooltipStyle()}
          >
            {/* Arrow pointer */}
            <div
              className="absolute w-3 h-3 bg-white border border-blue-100"
              style={getArrowStyle()}
            />
            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close tour"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Top dots */}
            <div className="flex justify-center gap-2 mb-4 mt-1">
              {tourSteps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all duration-300',
                    index === currentStep
                      ? 'bg-blue-600 w-6'
                      : index < currentStep
                        ? 'bg-blue-300'
                        : 'bg-gray-300'
                  )}
                  aria-label={`Go to step ${index + 1}`}
                />
              ))}
            </div>

            {/* Content */}
            <div className="mb-5">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
            </div>
            {/* Footer with Prev/Next */}
            <div className="bg-gray-50 px-5 py-3 mt-4 -mb-4 -mx-6 rounded-b-2xl border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className={cn(
                  'flex items-center gap-2 text-sm font-medium transition-colors px-2 py-1.5 rounded-md',
                  currentStep === 0
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                <ArrowLeft className="h-4 w-4" />
                Prev
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
