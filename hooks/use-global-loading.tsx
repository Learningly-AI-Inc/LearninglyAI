'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface GlobalLoadingState {
  isGenerating: boolean
  generationProgress: number
  generationStep: string
  generationSessionId: string | null
}

interface GlobalLoadingContextType {
  loadingState: GlobalLoadingState
  setGenerating: (isGenerating: boolean, sessionId?: string) => void
  updateProgress: (progress: number, step: string) => void
  clearGeneration: () => void
}

const GlobalLoadingContext = createContext<GlobalLoadingContextType | undefined>(undefined)

const initialState: GlobalLoadingState = {
  isGenerating: false,
  generationProgress: 0,
  generationStep: '',
  generationSessionId: null
}

export function GlobalLoadingProvider({ children }: { children: ReactNode }) {
  const [loadingState, setLoadingState] = useState<GlobalLoadingState>(initialState)

  const setGenerating = (isGenerating: boolean, sessionId?: string) => {
    setLoadingState(prev => ({
      ...prev,
      isGenerating,
      generationSessionId: sessionId || null,
      generationProgress: isGenerating ? 0 : 100,
      generationStep: isGenerating ? 'Starting generation...' : ''
    }))
  }

  const updateProgress = (progress: number, step: string) => {
    setLoadingState(prev => ({
      ...prev,
      generationProgress: progress,
      generationStep: step
    }))
  }

  const clearGeneration = () => {
    setLoadingState(initialState)
  }

  const value: GlobalLoadingContextType = {
    loadingState,
    setGenerating,
    updateProgress,
    clearGeneration
  }

  return (
    <GlobalLoadingContext.Provider value={value}>
      {children}
    </GlobalLoadingContext.Provider>
  )
}

export function useGlobalLoading() {
  const context = useContext(GlobalLoadingContext)
  if (context === undefined) {
    throw new Error('useGlobalLoading must be used within a GlobalLoadingProvider')
  }
  return context
}
