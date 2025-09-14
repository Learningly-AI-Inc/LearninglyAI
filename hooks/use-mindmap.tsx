"use client"

import { useState, useCallback } from 'react';

interface MindmapNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    category: string;
    level: number;
  };
  style?: {
    background?: string;
    color?: string;
    border?: string;
  };
}

interface MindmapEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  style?: {
    stroke?: string;
    strokeWidth?: number;
  };
}

interface MindmapGenerationOptions {
  style?: 'hierarchical' | 'radial' | 'network';
  complexity?: 'simple' | 'medium' | 'complex';
}

interface MindmapGenerationResult {
  mindmap: {
    nodes: MindmapNode[];
    edges: MindmapEdge[];
  };
  metadata: {
    documentId: string;
    title: string;
    nodeCount: number;
    edgeCount: number;
    style: string;
    complexity: string;
    model: string;
    tokensUsed: number;
    contextChunks: number;
    originalTextLength: number;
  };
}

interface UseMindmapReturn {
  generateMindmap: (
    documentId: string, 
    options?: MindmapGenerationOptions
  ) => Promise<MindmapGenerationResult | null>;
  isLoading: boolean;
  error: string | null;
}

export function useMindmap(): UseMindmapReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateMindmap = useCallback(async (
    documentId: string, 
    options: MindmapGenerationOptions = {}
  ): Promise<MindmapGenerationResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🧠 Starting mindmap generation:', { documentId, options });

      const response = await fetch('/api/reading/mindmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          style: options.style || 'hierarchical',
          complexity: options.complexity || 'medium',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate mindmap');
      }

      const data = await response.json();
      console.log('✅ Mindmap generated successfully:', {
        nodeCount: data.mindmap.nodes.length,
        edgeCount: data.mindmap.edges.length,
        tokensUsed: data.metadata.tokensUsed,
        model: data.metadata.model
      });

      return data;
    } catch (err: any) {
      console.error('❌ Error generating mindmap:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    generateMindmap,
    isLoading,
    error
  };
}
