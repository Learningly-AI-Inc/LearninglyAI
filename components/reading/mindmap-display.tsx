"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  addEdge,
  useEdgesState,
  useNodesState,
  getBezierPath,
  BackgroundVariant,
  ConnectionMode
} from "reactflow";
import dagre from "@dagrejs/dagre";
import "reactflow/dist/style.css";

import { 
  Brain, 
  Download, 
  RotateCcw, 
  Sparkles,
  Target,
  Network,
  Plus,
  Minus,
  Maximize,
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ClickSpark } from '@/components/react-bits/click-spark';
import { FadeContent } from '@/components/react-bits/fade-content';

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

interface MindmapDisplayProps {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
  metadata?: {
    documentId: string;
    title: string;
    nodeCount: number;
    edgeCount: number;
    style: string;
    complexity: string;
    model: string;
    tokensUsed: number;
  };
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

// Custom Node Component with Expand/Collapse
const CustomNode = ({ 
  data, 
  selected, 
  id 
}: { 
  data: any; 
  selected: boolean; 
  id: string;
}) => {
  const getNodeStyle = (category: string, level: number) => {
    const baseStyle = "px-4 py-2 rounded-lg shadow-md transition-all duration-200 min-w-32 max-w-56 relative";
    
    switch (category) {
      case 'central':
        return `${baseStyle} bg-gradient-to-br from-blue-500 to-blue-700 text-white border-2 border-blue-800 text-lg font-bold`;
      case 'primary':
        return `${baseStyle} bg-gradient-to-br from-purple-500 to-purple-700 text-white border-2 border-purple-800 text-base font-semibold`;
      case 'secondary':
        return `${baseStyle} bg-gradient-to-br from-green-500 to-green-700 text-white border-2 border-green-800 text-sm font-medium`;
      case 'detail':
        return `${baseStyle} bg-gradient-to-br from-orange-400 to-orange-600 text-white border-2 border-orange-700 text-sm`;
      default:
        return `${baseStyle} bg-gradient-to-br from-gray-400 to-gray-600 text-white border-2 border-gray-700 text-sm`;
    }
  };

  const hasChildren = data.hasChildren || false;
  const isExpanded = data.isExpanded || false;

  return (
    <div 
      className={`${getNodeStyle(data.category, data.level)} ${
        selected ? 'ring-4 ring-blue-300 scale-105' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 text-left">
          <div className="font-medium break-words">{data.label}</div>
          {data.description && (
            <div className="text-xs opacity-80 mt-1 break-words">{data.description}</div>
          )}
        </div>
        
        {hasChildren && (
          <button
            className="ml-2 p-1 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              if (data.onToggle) {
                data.onToggle(id);
              }
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
      </div>
      
      {hasChildren && (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white/30 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold">{data.childCount || 0}</span>
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  central: CustomNode,
  primary: CustomNode,
  secondary: CustomNode,
  detail: CustomNode,
  default: CustomNode,
};

export function MindmapDisplay({ 
  nodes: initialNodes, 
  edges: initialEdges, 
  metadata, 
  onRegenerate, 
  isRegenerating = false 
}: MindmapDisplayProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showBackground, setShowBackground] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [nodeHierarchy, setNodeHierarchy] = useState<Map<string, string[]>>(new Map());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Build node hierarchy using the original edges
  const buildNodeHierarchy = useMemo(() => {
    const hierarchy = new Map<string, string[]>();
    const nodeParents = new Map<string, string>();
    const rootNodes: string[] = [];
    
    // Build parent-child relationships from edges
    edges.forEach(edge => {
      const parentId = edge.source;
      const childId = edge.target;
      
      // Track parent relationship
      nodeParents.set(childId, parentId);
      
      // Add to hierarchy
      if (!hierarchy.has(parentId)) {
        hierarchy.set(parentId, []);
      }
      hierarchy.get(parentId)!.push(childId);
    });
    
    // Find root nodes (nodes that are not targets of any edge)
    nodes.forEach(node => {
      if (!nodeParents.has(node.id)) {
        rootNodes.push(node.id);
      }
    });
    
    // If no edges exist, use level-based hierarchy
    if (edges.length === 0) {
      const levelGroups = new Map<number, string[]>();
      nodes.forEach(node => {
        const level = node.data.level || 0;
        if (!levelGroups.has(level)) {
          levelGroups.set(level, []);
        }
        levelGroups.get(level)!.push(node.id);
      });
      
      // Create hierarchy from levels
      const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);
      sortedLevels.forEach((level, index) => {
        const nodesAtLevel = levelGroups.get(level)!;
        
        if (index === 0) {
          // Root level
          rootNodes.push(...nodesAtLevel);
        } else {
          // Child level - connect to previous level nodes
          const parentLevel = sortedLevels[index - 1];
          const parentNodes = levelGroups.get(parentLevel)!;
          
          nodesAtLevel.forEach((childId, childIndex) => {
            const parentId = parentNodes[childIndex % parentNodes.length];
            if (!hierarchy.has(parentId)) {
              hierarchy.set(parentId, []);
            }
            hierarchy.get(parentId)!.push(childId);
          });
        }
      });
    }
    
    hierarchy.set('root', rootNodes);
    return hierarchy;
  }, [nodes, edges]);

  // Get visible nodes based on expanded state
  const visibleNodes = useMemo(() => {
    const visible = new Set<string>();
    
    const addVisibleNodes = (nodeIds: string[]) => {
      nodeIds.forEach(nodeId => {
        visible.add(nodeId);
        if (expandedNodes.has(nodeId) && buildNodeHierarchy.has(nodeId)) {
          addVisibleNodes(buildNodeHierarchy.get(nodeId)!);
        }
      });
    };

    if (buildNodeHierarchy.has('root')) {
      addVisibleNodes(buildNodeHierarchy.get('root')!);
    }

    return visible;
  }, [buildNodeHierarchy, expandedNodes]);

  // Calculate tree positions
  const calculateTreePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    let currentY = 100;
    const levelSpacing = 200;
    const nodeSpacing = 150;

    const positionNodes = (nodeIds: string[], x: number, parentY: number = 0) => {
      let y = parentY;
      
      nodeIds.forEach((nodeId, index) => {
        if (visibleNodes.has(nodeId)) {
          y = currentY;
          positions.set(nodeId, { x, y });
          currentY += nodeSpacing;

          // Position children if expanded
          if (expandedNodes.has(nodeId) && buildNodeHierarchy.has(nodeId)) {
            const children = buildNodeHierarchy.get(nodeId)!;
            positionNodes(children, x + levelSpacing, y);
          }
        }
      });
    };

    if (buildNodeHierarchy.has('root')) {
      positionNodes(buildNodeHierarchy.get('root')!, 100);
    }

    return positions;
  }, [buildNodeHierarchy, expandedNodes, visibleNodes]);

  // Toggle node expansion
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  // Prepare nodes for React Flow with tree positioning and expand/collapse data
  const reactFlowNodes = useMemo(() => {
    return nodes
      .filter(node => visibleNodes.has(node.id))
      .map(node => {
        const position = calculateTreePositions.get(node.id) || { x: 0, y: 0 };
        const children = buildNodeHierarchy.get(node.id) || [];
        const hasChildren = children.length > 0;
        const isExpanded = expandedNodes.has(node.id);

        return {
          ...node,
          position,
          type: node.type || 'default',
          draggable: false, // Disable dragging for tree layout
          selectable: true,
          data: {
            ...node.data,
            hasChildren,
            isExpanded,
            childCount: children.length,
            onToggle: toggleNode
          }
        };
      });
  }, [nodes, visibleNodes, calculateTreePositions, buildNodeHierarchy, expandedNodes, toggleNode]);

  // Generate tree edges between parent and child nodes
  const reactFlowEdges = useMemo(() => {
    const treeEdges: any[] = [];
    
    // Create edges between visible parent-child relationships
    buildNodeHierarchy.forEach((children, parentId) => {
      if (parentId !== 'root' && visibleNodes.has(parentId)) {
        children.forEach(childId => {
          if (visibleNodes.has(childId)) {
            treeEdges.push({
              id: `edge-${parentId}-${childId}`,
              source: parentId,
              target: childId,
              type: 'smoothstep',
              animated: false,
              style: {
                stroke: '#8B5CF6',
                strokeWidth: 2,
              }
            });
          }
        });
      }
      // Handle root level connections
      if (parentId === 'root') {
        children.forEach(childId => {
          if (visibleNodes.has(childId)) {
            // Root nodes don't need edges from 'root', they're independent
            // But if there are multiple root nodes, we could connect them
          }
        });
      }
    });

    return treeEdges;
  }, [buildNodeHierarchy, visibleNodes]);

  const onConnect = useCallback((params: any) => {
    // Optional: Allow users to create custom connections
    console.log('Connection attempt:', params);
  }, []);

  const exportMindmap = () => {
    // Create a simplified export of the mindmap
    const exportData = {
      nodes: nodes.map(n => ({
        id: n.id,
        label: n.data.label,
        category: n.data.category,
        level: n.data.level,
        position: n.position
      })),
      edges: edges.map(e => ({
        source: e.source,
        target: e.target
      })),
      metadata,
      expandedNodes: Array.from(expandedNodes)
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindmap-tree-${metadata?.title || 'document'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const expandAll = () => {
    const allNodeIds = new Set(['root', ...nodes.map(n => n.id)]);
    setExpandedNodes(allNodeIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set(['root']));
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  if (!nodes.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Brain className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            No mindmap available
          </h3>
          <p className="text-xs text-gray-600">
            Generate a mindmap to visualize document concepts
          </p>
        </div>
      </div>
    );
  }

  // Fullscreen Canvas Modal
  const FullscreenCanvas = () => (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col">
      {/* Fullscreen Header */}
      <div className="bg-black bg-opacity-80 p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
            <Brain className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Knowledge Canvas</h2>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Badge variant="outline" className="border-gray-400 text-gray-300">
                {metadata?.nodeCount} concepts
              </Badge>
              <Badge variant="outline" className="border-gray-400 text-gray-300">
                {metadata?.edgeCount} connections
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <ClickSpark>
            <Button
              onClick={expandAll}
              size="sm"
              variant="outline"
              className="text-xs border-gray-400 text-gray-300 hover:bg-gray-800"
              title="Expand All"
            >
              <Plus className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Expand</span>
            </Button>
          </ClickSpark>
          <ClickSpark>
            <Button
              onClick={collapseAll}
              size="sm"
              variant="outline"
              className="text-xs border-gray-400 text-gray-300 hover:bg-gray-800"
              title="Collapse All"
            >
              <Minus className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Collapse</span>
            </Button>
          </ClickSpark>
          <ClickSpark>
            <Button
              onClick={exportMindmap}
              size="sm"
              variant="outline"
              className="text-xs border-gray-400 text-gray-300 hover:bg-gray-800"
              title="Export"
            >
              <Download className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Export</span>
            </Button>
          </ClickSpark>
          <ClickSpark>
            <Button
              onClick={toggleFullscreen}
              size="sm"
              variant="outline"
              className="text-xs border-red-400 text-red-300 hover:bg-red-900"
              title="Exit Fullscreen"
            >
              <X className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Exit</span>
            </Button>
          </ClickSpark>
        </div>
      </div>

      {/* Fullscreen Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={reactFlowNodes}
          edges={reactFlowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{
            padding: 0.05,
            includeHiddenNodes: false,
            maxZoom: 2,
          }}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={0.1}
          maxZoom={4}
          className="bg-gradient-to-br from-gray-900 to-black"
        >
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={30} 
            size={2}
            color="#374151"
          />
          
          <MiniMap 
            zoomable 
            pannable
            nodeColor={(node) => {
              switch (node.data?.category) {
                case 'central': return '#3B82F6';
                case 'primary': return '#8B5CF6';
                case 'secondary': return '#10B981';
                case 'detail': return '#F59E0B';
                default: return '#6B7280';
              }
            }}
            className="!bg-gray-800 !border-2 !border-gray-600 !rounded-lg"
          />
          
          <Controls 
            className="!bg-gray-800 !border-2 !border-gray-600 !rounded-lg [&>button]:!border-gray-600 [&>button]:hover:!bg-gray-700 [&>button]:!text-gray-300"
          />
        </ReactFlow>

        {/* Floating Canvas Info */}
        <div className="absolute bottom-6 left-6 bg-black bg-opacity-60 backdrop-blur-sm rounded-lg p-3 text-white">
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              <Target className="h-3 w-3" />
              <span>{metadata?.style} layout</span>
            </div>
            <div className="flex items-center gap-2">
              <Network className="h-3 w-3" />
              <span>{metadata?.complexity} complexity</span>
            </div>
            <div className="text-gray-400">
              "{metadata?.title}"
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isFullscreen) {
    return <FullscreenCanvas />;
  }

  return (
    <FadeContent className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Knowledge Mindmap</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {metadata?.nodeCount} concepts
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {metadata?.edgeCount} connections
                </Badge>
                {metadata?.complexity && (
                  <Badge className="text-xs bg-purple-100 text-purple-700">
                    {metadata.complexity}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ClickSpark>
              <Button
                onClick={expandAll}
                size="sm"
                variant="outline"
                className="text-xs"
                title="Expand All"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </ClickSpark>
            <ClickSpark>
              <Button
                onClick={collapseAll}
                size="sm"
                variant="outline"
                className="text-xs"
                title="Collapse All"
              >
                <Minus className="h-3 w-3" />
              </Button>
            </ClickSpark>
            <ClickSpark>
              <Button
                onClick={exportMindmap}
                size="sm"
                variant="outline"
                className="text-xs"
                title="Export"
              >
                <Download className="h-3 w-3" />
              </Button>
            </ClickSpark>
            <ClickSpark>
              <Button
                onClick={toggleFullscreen}
                size="sm"
                variant="outline"
                className="text-xs"
                title="Fullscreen Canvas"
              >
                <Maximize className="h-3 w-3" />
              </Button>
            </ClickSpark>
            {onRegenerate && (
              <ClickSpark>
                <Button
                  onClick={onRegenerate}
                  disabled={isRegenerating}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  title="Regenerate"
                >
                  {isRegenerating ? (
                    <Sparkles className="h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3 w-3" />
                  )}
                </Button>
              </ClickSpark>
            )}
          </div>
        </div>
      </div>

      {/* Mindmap Container */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={reactFlowNodes}
          edges={reactFlowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{
            padding: 0.1,
            includeHiddenNodes: false,
            maxZoom: 1.2,
          }}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          minZoom={0.3}
          maxZoom={2}
          className="bg-gradient-to-br from-gray-50 to-gray-100"
        >
          {showBackground && (
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={1}
              color="#e5e7eb"
            />
          )}
          
          {showMiniMap && (
            <MiniMap 
              zoomable 
              pannable
              nodeColor={(node) => {
                switch (node.data?.category) {
                  case 'central': return '#3B82F6';
                  case 'primary': return '#8B5CF6';
                  case 'secondary': return '#10B981';
                  case 'detail': return '#F59E0B';
                  default: return '#6B7280';
                }
              }}
              className="!bg-white !border-2 !border-gray-200 !rounded-lg"
            />
          )}
          
          {showControls && (
            <Controls 
              className="!bg-white !border-2 !border-gray-200 !rounded-lg [&>button]:!border-gray-200 [&>button]:hover:!bg-gray-50"
            />
          )}
        </ReactFlow>

        {/* View Controls */}
        <div className="absolute top-4 right-4 bg-white rounded-lg border border-gray-200 shadow-lg p-3 space-y-3 z-10">
          <div className="flex items-center space-x-2">
            <Switch
              id="minimap"
              checked={showMiniMap}
              onCheckedChange={setShowMiniMap}
            />
            <Label htmlFor="minimap" className="text-xs">Mini Map</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="controls"
              checked={showControls}
              onCheckedChange={setShowControls}
            />
            <Label htmlFor="controls" className="text-xs">Controls</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="background"
              checked={showBackground}
              onCheckedChange={setShowBackground}
            />
            <Label htmlFor="background" className="text-xs">Grid</Label>
          </div>
        </div>
      </div>

      {/* Footer */}
      {metadata && (
        <div className="p-3 border-t border-gray-200 bg-white">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                {metadata.style}
              </span>
              <span className="flex items-center gap-1">
                <Network className="h-3 w-3" />
                {metadata.complexity}
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {metadata.tokensUsed} tokens
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Generated from "{metadata.title}"
            </p>
          </div>
        </div>
      )}
    </FadeContent>
  );
}
