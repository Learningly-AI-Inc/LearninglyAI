"use client"

import React, { useState } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  Target, 
  Brain, 
  FileText, 
  Lightbulb,
  Settings,
  X,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { ClickSpark } from '@/components/react-bits/click-spark';
import { FadeContent } from '@/components/react-bits/fade-content';

interface FlashcardSettings {
  count: number;
  difficulty: 'easy' | 'medium' | 'hard';
  focus: 'comprehensive' | 'key-concepts' | 'definitions' | 'facts' | 'examples';
}

interface FlashcardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (settings: FlashcardSettings) => void;
  isGenerating: boolean;
  documentTitle?: string;
}

const difficultyOptions = [
  {
    value: 'easy' as const,
    label: 'Easy',
    description: 'Basic concepts and simple recall',
    icon: <BookOpen className="h-4 w-4" />,
    color: 'bg-green-100 text-green-700 border-green-200'
  },
  {
    value: 'medium' as const,
    label: 'Medium',
    description: 'Moderate complexity with analysis',
    icon: <Target className="h-4 w-4" />,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200'
  },
  {
    value: 'hard' as const,
    label: 'Hard',
    description: 'Complex concepts requiring synthesis',
    icon: <Brain className="h-4 w-4" />,
    color: 'bg-red-100 text-red-700 border-red-200'
  }
];

const focusOptions = [
  {
    value: 'comprehensive' as const,
    label: 'Comprehensive',
    description: 'Covers all major topics and concepts',
    icon: <FileText className="h-4 w-4" />
  },
  {
    value: 'key-concepts' as const,
    label: 'Key Concepts',
    description: 'Main ideas and central themes',
    icon: <Lightbulb className="h-4 w-4" />
  },
  {
    value: 'definitions' as const,
    label: 'Definitions',
    description: 'Terms, vocabulary, and meanings',
    icon: <BookOpen className="h-4 w-4" />
  },
  {
    value: 'facts' as const,
    label: 'Facts & Data',
    description: 'Specific information and details',
    icon: <Target className="h-4 w-4" />
  },
  {
    value: 'examples' as const,
    label: 'Examples',
    description: 'Case studies and practical applications',
    icon: <Sparkles className="h-4 w-4" />
  }
];

export function FlashcardSettingsModal({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
  documentTitle
}: FlashcardSettingsModalProps) {
  const [settings, setSettings] = useState<FlashcardSettings>({
    count: 8,
    difficulty: 'medium',
    focus: 'comprehensive'
  });

  const handleGenerate = () => {
    onGenerate(settings);
  };

  const selectedDifficulty = difficultyOptions.find(opt => opt.value === settings.difficulty);
  const selectedFocus = focusOptions.find(opt => opt.value === settings.focus);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Generate Flashcards
          </DialogTitle>
          <DialogDescription>
            Customize your flashcard generation settings for "{documentTitle}"
          </DialogDescription>
        </DialogHeader>

        <FadeContent className="space-y-6 mt-4">
          {/* Card Count */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Number of Cards
              </CardTitle>
              <CardDescription>
                How many flashcards would you like to generate?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="count-slider" className="text-sm font-medium">
                    Cards: {settings.count}
                  </Label>
                  <Badge variant="outline" className="text-xs">
                    {settings.count <= 5 ? 'Quick' : settings.count <= 10 ? 'Standard' : 'Comprehensive'}
                  </Badge>
                </div>
                <Slider
                  id="count-slider"
                  min={3}
                  max={20}
                  step={1}
                  value={[settings.count]}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, count: value[0] }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>3 (Minimal)</span>
                  <span>20 (Maximum)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Difficulty Level */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Difficulty Level
              </CardTitle>
              <CardDescription>
                Choose the complexity level for your flashcards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={settings.difficulty}
                onValueChange={(value) => setSettings(prev => ({ 
                  ...prev, 
                  difficulty: value as FlashcardSettings['difficulty'] 
                }))}
                className="space-y-3"
              >
                {difficultyOptions.map((option) => (
                  <div key={option.value} className="flex items-start space-x-3">
                    <RadioGroupItem 
                      value={option.value} 
                      id={option.value}
                      className="mt-0.5"
                    />
                    <ClickSpark>
                      <label 
                        htmlFor={option.value}
                        className="flex-1 cursor-pointer"
                      >
                        <div className={`p-3 rounded-lg border-2 transition-all ${
                          settings.difficulty === option.value 
                            ? option.color 
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            {option.icon}
                            <span className="font-medium text-sm">{option.label}</span>
                          </div>
                          <p className="text-xs text-gray-600">{option.description}</p>
                        </div>
                      </label>
                    </ClickSpark>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Focus Area */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Focus Area
              </CardTitle>
              <CardDescription>
                What type of content should the flashcards emphasize?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.focus}
                onValueChange={(value) => setSettings(prev => ({ 
                  ...prev, 
                  focus: value as FlashcardSettings['focus'] 
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select focus area" />
                </SelectTrigger>
                <SelectContent>
                  {focusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.icon}
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 mb-2">Generation Summary</h4>
                  <div className="space-y-1 text-sm text-blue-700">
                    <p>• Creating <strong>{settings.count} flashcards</strong></p>
                    <p>• Difficulty: <strong>{selectedDifficulty?.label}</strong></p>
                    <p>• Focus: <strong>{selectedFocus?.label}</strong></p>
                    <p>• Estimated time: <strong>30-60 seconds</strong></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            
            <ClickSpark>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Flashcards
                  </>
                )}
              </Button>
            </ClickSpark>
          </div>
        </FadeContent>
      </DialogContent>
    </Dialog>
  );
}
