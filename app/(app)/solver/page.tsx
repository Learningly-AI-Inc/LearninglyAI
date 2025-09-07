"use client"

import React from 'react'
import { ComingSoon } from '@/components/ui/coming-soon'
import { BrainCircuit } from 'lucide-react'

export default function SolverPage() {
  const features = [
    "AI-powered step-by-step problem solving",
    "Support for algebra, calculus, physics, and chemistry",
    "Interactive solution explanations with visual aids",
    "Multiple solution approaches and methods",
    "Problem difficulty assessment and hints",
    "Progress tracking and learning analytics"
  ]

  return (
    <ComingSoon
      title="Problem Solver"
      description="Get instant, detailed solutions to complex math and science problems with AI-powered step-by-step explanations."
      icon={BrainCircuit}
      features={features}
      estimatedLaunch="Q2 2024"
      backUrl="/dashboard"
    />
  )
}
