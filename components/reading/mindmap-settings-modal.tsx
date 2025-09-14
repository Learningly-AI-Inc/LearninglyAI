"use client"

import React, { useState } from 'react';
import { 
  Brain, 
  Network, 
  Target, 
  Sparkles,
  Settings,
  X,
  Loader2,
  Zap,
  TreePine,
  GitBranch
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClickSpark } from '@/components/react-bits/click-spark';
import { FadeContent } from '@/components/react-bits/fade-content';

interface MindmapSettings {
  style: 'hierarchical' | 'radial' | 'network';
  complexity: 'simple' | 'medium' | 'complex';
}

interface MindmapSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (settings: MindmapSettings) => void;
  isGenerating: boolean;
  documentTitle?: string;
}

const styleOptions = [
  {
    value: 'hierarchical' as const,
    label: 'Hierarchical',
    description: 'Top-down tree structure with clear levels',
    icon: <TreePine className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  {
    value: 'radial' as const,
    label: 'Radial',
    description: 'Central topic with concepts radiating outward',
    icon: <Target className="h-4 w-4" />,
    color: 'bg-purple-100 text-purple-700 border-purple-200'
  },
  {
    value: 'network' as const,
    label: 'Network',
    description: 'Interconnected web of related concepts',
    icon: <Network className="h-4 w-4" />,
    color: 'bg-green-100 text-green-700 border-green-200'
  }
];

const complexityOptions = [
  {
    value: 'simple' as const,
    label: 'Simple',
    description: '8-12 key concepts for quick overview',
    icon: <Zap className="h-4 w-4" />,
    color: 'bg-green-100 text-green-700 border-green-200',
    nodeCount: '8-12 nodes'
  },
  {
    value: 'medium' as const,
    label: 'Medium',
    description: '15-25 concepts with detailed relationships',
    icon: <Target className="h-4 w-4" />,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    nodeCount: '15-25 nodes'
  },
  {
    value: 'complex' as const,
    label: 'Complex',
    description: '30-50 concepts for comprehensive analysis',
    icon: <Brain className="h-4 w-4" />,
    color: 'bg-red-100 text-red-700 border-red-200',
    nodeCount: '30-50 nodes'
  }
];

export function MindmapSettingsModal({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
  documentTitle
}: MindmapSettingsModalProps) {
  const [settings, setSettings] = useState<MindmapSettings>({
    style: 'hierarchical',
    complexity: 'medium'
  });

  const handleGenerate = () => {
    onGenerate(settings);
  };

  const selectedStyle = styleOptions.find(opt => opt.value === settings.style);
  const selectedComplexity = complexityOptions.find(opt => opt.value === settings.complexity);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Generate Mindmap
          </DialogTitle>
          <DialogDescription>
            Create an interactive knowledge visualization for "{documentTitle}"
          </DialogDescription>
        </DialogHeader>

        <FadeContent className="space-y-6 mt-4">
          {/* Style Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Mindmap Style
              </CardTitle>
              <CardDescription>
                Choose how concepts should be organized and connected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={settings.style}
                onValueChange={(value) => setSettings(prev => ({ 
                  ...prev, 
                  style: value as MindmapSettings['style'] 
                }))}
                className="space-y-3"
              >
                {styleOptions.map((option) => (
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
                          settings.style === option.value 
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

          {/* Complexity Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Complexity Level
              </CardTitle>
              <CardDescription>
                How detailed should the mindmap be?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={settings.complexity}
                onValueChange={(value) => setSettings(prev => ({ 
                  ...prev, 
                  complexity: value as MindmapSettings['complexity'] 
                }))}
                className="space-y-3"
              >
                {complexityOptions.map((option) => (
                  <div key={option.value} className="flex items-start space-x-3">
                    <RadioGroupItem 
                      value={option.value} 
                      id={`complexity-${option.value}`}
                      className="mt-0.5"
                    />
                    <ClickSpark>
                      <label 
                        htmlFor={`complexity-${option.value}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className={`p-3 rounded-lg border-2 transition-all ${
                          settings.complexity === option.value 
                            ? option.color 
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {option.icon}
                              <span className="font-medium text-sm">{option.label}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {option.nodeCount}
                            </Badge>
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

          {/* Summary */}
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Brain className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-purple-900 mb-2">Generation Preview</h4>
                  <div className="space-y-1 text-sm text-purple-700">
                    <p>• Style: <strong>{selectedStyle?.label}</strong> - {selectedStyle?.description}</p>
                    <p>• Complexity: <strong>{selectedComplexity?.label}</strong> - {selectedComplexity?.nodeCount}</p>
                    <p>• Features: Interactive nodes, zoom controls, export capability</p>
                    <p>• Estimated time: <strong>45-90 seconds</strong></p>
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
                className="bg-purple-600 hover:bg-purple-700 text-white px-6"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Generate Mindmap
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
