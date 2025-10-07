/**
 * Dynamic Loading Facts Component
 * Shows interesting facts while AI is processing
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Zap, BookOpen, Lightbulb, Globe } from 'lucide-react';

interface LoadingFactsProps {
  isLoading: boolean;
  loadingType?: 'thinking' | 'summarizing' | 'generating' | 'analyzing';
  className?: string;
}

const FACTS = [
  {
    icon: Brain,
    text: "The human brain contains approximately 86 billion neurons",
    category: "science"
  },
  {
    icon: Globe,
    text: "Earth's oceans contain 97% of the planet's water",
    category: "nature"
  },
  {
    icon: BookOpen,
    text: "The oldest known written text is over 5,000 years old",
    category: "history"
  },
  {
    icon: Zap,
    text: "Lightning can reach temperatures of 30,000°C (54,000°F)",
    category: "science"
  },
  {
    icon: Lightbulb,
    text: "The first light bulb lasted only 13.5 hours",
    category: "technology"
  },
  {
    icon: Brain,
    text: "Your brain uses 20% of your body's total energy",
    category: "science"
  },
  {
    icon: Globe,
    text: "Antarctica is the driest continent on Earth",
    category: "geography"
  },
  {
    icon: BookOpen,
    text: "The Library of Congress contains over 170 million items",
    category: "knowledge"
  },
  {
    icon: Zap,
    text: "A single cloud can weigh more than a million pounds",
    category: "nature"
  },
  {
    icon: Lightbulb,
    text: "The internet processes 2.5 quintillion bytes of data daily",
    category: "technology"
  },
  {
    icon: Brain,
    text: "Neurons can transmit signals at speeds up to 120 m/s",
    category: "science"
  },
  {
    icon: Globe,
    text: "Mount Everest grows about 4mm taller each year",
    category: "geography"
  },
  {
    icon: BookOpen,
    text: "The word 'set' has the most definitions in English (464)",
    category: "language"
  },
  {
    icon: Zap,
    text: "A bolt of lightning contains enough energy to power a home for a week",
    category: "science"
  },
  {
    icon: Lightbulb,
    text: "The first computer bug was an actual bug (a moth) in 1947",
    category: "technology"
  },
  {
    icon: Brain,
    text: "Your brain processes information 200,000 times faster than a computer",
    category: "science"
  },
  {
    icon: Globe,
    text: "The Great Wall of China is not visible from space with the naked eye",
    category: "myth"
  },
  {
    icon: BookOpen,
    text: "Shakespeare invented over 1,700 words still used today",
    category: "language"
  },
  {
    icon: Zap,
    text: "A hummingbird's heart beats up to 1,260 times per minute",
    category: "nature"
  },
  {
    icon: Lightbulb,
    text: "The first email was sent in 1971",
    category: "technology"
  }
];

const LOADING_MESSAGES = {
  thinking: "AI is thinking...",
  summarizing: "Summarizing document...",
  generating: "Generating content...",
  analyzing: "Analyzing text..."
};

export function LoadingFacts({ isLoading, loadingType = 'thinking', className = '' }: LoadingFactsProps) {
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
    
    // Rotate facts every 3 seconds
    const interval = setInterval(() => {
      setCurrentFactIndex((prev) => (prev + 1) % FACTS.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading || !isVisible) return null;

  const currentFact = FACTS[currentFactIndex];
  const IconComponent = currentFact.icon;
  const loadingMessage = LOADING_MESSAGES[loadingType];

  return (
    <div className={`flex justify-start mb-6 ${className}`}>
      <div className="max-w-[95%] rounded-2xl px-4 py-3 bg-white border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600 font-medium">
                {loadingMessage}
              </span>
            </div>
            
            {/* Fact Display */}
            <div className="flex items-start space-x-2">
              <IconComponent className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-700 leading-relaxed">
                  <span className="font-medium text-blue-600">Did you know?</span> {currentFact.text}
                </p>
                <div className="flex items-center mt-1">
                  <div className="flex space-x-1">
                    {FACTS.map((_, index) => (
                      <div
                        key={index}
                        className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                          index === currentFactIndex ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoadingFacts;
