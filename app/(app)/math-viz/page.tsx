"use client"

import React from 'react'
import { ComingSoon } from '@/components/ui/coming-soon'
import { Play } from 'lucide-react'

export default function MathVisualizationPage() {
  const features = [
    "Interactive 3D mathematical visualizations",
    "Real-time equation plotting and graphing",
    "Step-by-step problem solving with visual aids",
    "Customizable animation parameters",
    "Export animations in multiple formats",
    "Collaborative visualization sharing"
  ]

  return (
    <ComingSoon
      title="Math Visualizer"
      description="Transform complex mathematical concepts into beautiful, interactive visualizations that make learning intuitive and engaging."
      icon={Play}
      features={features}
      backUrl="/dashboard"
    />
  )
}