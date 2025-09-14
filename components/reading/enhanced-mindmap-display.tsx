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
  BackgroundVariant
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
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClickSpark } from '@/components/react-bits/click-spark';
import { FadeContent } from '@/components/react-bits/fade-content';

// Constants from the enhanced mindmap
const nodeWidth = 220;
const nodeHeight = 56;
const FADE_MS = 420;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const BRANCH_PALETTES = [
  ["#a855f7", "#ec4899", "#a855f7"], // purple/pink
  ["#3b82f6", "#60a5fa", "#3b82f6"], // blue
  ["#0ea5e9", "#22d3ee", "#0ea5e9"], // cyan
  ["#10b981", "#34d399", "#10b981"], // emerald
  ["#f59e0b", "#f97316", "#f59e0b"], // amber
];

const randId = () => Math.random().toString(36).slice(2, 9);
const pickPalette = () => BRANCH_PALETTES[Math.floor(Math.random() * BRANCH_PALETTES.length)];

// Layout helper using dagre
function layout(nodes = [], edges = [], direction = "LR") {
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  const safeEdges = Array.isArray(edges) ? edges : [];
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: 54, ranksep: 100, marginx: 80, marginy: 80 });
  g.setDefaultEdgeLabel(() => ({}));
  safeNodes.forEach((n) => g.setNode(n.id, { width: nodeWidth, height: nodeHeight }));
  safeEdges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return safeNodes.map((n) => {
    const pos = g.node(n.id) || { x: 0, y: 0 };
    return {
      ...n,
      position: { x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2 },
      targetPosition: "left",
      sourcePosition: "right",
    };
  });
}

// Visibility helper for collapsible tree
function computeVisibility(nodes = [], edges = [], collapsedIds = new Set()) {
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  const safeEdges = Array.isArray(edges) ? edges : [];
  const collapsed = collapsedIds instanceof Set ? collapsedIds : new Set(collapsedIds || []);

  const childrenMap = safeEdges.reduce((acc, e) => {
    (acc[e.source] ||= []).push(e.target);
    return acc;
  }, {});

  const hidden = new Set();
  const stack = [...collapsed];
  while (stack.length) {
    const cur = stack.pop();
    (childrenMap[cur] || []).forEach((ch) => {
      if (!hidden.has(ch)) {
        hidden.add(ch);
        stack.push(ch);
      }
    });
  }

  const nextNodes = safeNodes.map((n) => ({ ...n, hidden: hidden.has(n.id) }));
  const nextEdges = safeEdges.map((e) => ({
    ...e,
    hidden: hidden.has(e.source) || hidden.has(e.target) || collapsed.has(e.source),
  }));
  return { nodes: nextNodes, edges: nextEdges };
}

function diffHidden(currentNodes, targetNodes) {
  const cur = new Map(currentNodes.map((n) => [n.id, !!n.hidden]));
  const tgt = new Map(targetNodes.map((n) => [n.id, !!n.hidden]));
  const toHide = [], toShow = [];
  for (const n of targetNodes) {
    const c = cur.get(n.id) || false;
    const t = tgt.get(n.id) || false;
    if (c !== t) (t ? toHide : toShow).push(n.id);
  }
  return { toHide, toShow };
}

// Edge gradient helpers
function hexToRgb(hex) {
  let h = (hex || "#94A3B8").replace('#','');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
function rgba(hex, a) { const { r, g, b } = hexToRgb(hex); return `rgba(${r}, ${g}, ${b}, ${a})`; }

// Enhanced Edge Component
function MindEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const fading = data?.fade;
  const opacity = fading === "out" || fading === "pre-in" ? 0 : 1;
  const stroke = data?.stroke || "#8B5CF6";
  const gid = `grad-${data?.edgeId || id}`;
  const width = data?.width || 6;
  return (
    <g style={{ transition: `opacity ${FADE_MS}ms ${EASE}`, opacity }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={rgba(stroke, 0.35)} />
          <stop offset="100%" stopColor={stroke} />
        </linearGradient>
      </defs>
      <path d={edgePath} fill="none" stroke={`url(#${gid})`} strokeWidth={width} strokeLinecap="round" />
    </g>
  );
}

// Enhanced Node Component
function MindNode({ id, data, selected }) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(null);

  const stop = (e) => e.stopPropagation();
  const onKeyDown = (e) => { if (e.key === "Enter") { e.preventDefault(); inputRef.current?.blur(); } };

  const isRoot = data?.level === 0 || data?.category === 'central';
  const fading = data?.fade;
  const opacity = fading === "out" || fading === "pre-in" ? 0 : 1;
  const scale = fading === "out" ? 0.96 : 1;

  return (
    <div
      className={`relative select-none ${selected ? "ring-2 ring-indigo-400" : ""}`}
      style={{ width: nodeWidth, transition: `opacity ${FADE_MS}ms ${EASE}, transform ${FADE_MS}ms ${EASE}`, opacity, transform: `scale(${scale})` }}
      onDoubleClick={(e) => { stop(e); if (!data?.isEdit) return; setEditing(true); setTimeout(() => inputRef.current?.select?.(), 0); }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />

      {data.hasChildren && (
        <button
          onPointerDown={(e) => { e.stopPropagation(); }}
          onMouseDown={(e) => { e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); data.onToggle(id); }}
          className={`absolute -right-4 top-1/2 -translate-y-1/2 h-9 w-9 z-20 rounded-full shadow hover:scale-105 active:scale-95 grid place-items-center ${data?.isDark ? 'bg-slate-800 text-slate-100 ring-1 ring-slate-700' : 'bg-white text-slate-900 ring-1 ring-slate-200'}`}
          style={{ pointerEvents: 'auto' }}
          title={data.isCollapsed ? "Expand" : "Collapse"}
        >
          <span className="text-lg leading-none font-bold select-none">{data.isCollapsed ? "+" : "−"}</span>
        </button>
      )}

      <div
        className={`${isRoot ? (data?.isDark ? 'rounded-2xl bg-slate-800 text-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.6)] border border-slate-700' : 'rounded-2xl bg-white text-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.12)] border border-slate-200') : (data?.isDark ? 'rounded-full bg-slate-800 text-slate-100 shadow border border-slate-700' : 'rounded-full bg-white text-slate-800 shadow border border-slate-200')} px-4 py-3`}
        style={{ filter: isRoot ? "none" : `drop-shadow(0 6px 18px ${data.stroke || "#8B5CF6"}${data?.isDark ? "66" : "44"})` }}
        onClick={(e) => { if (!data?.isEdit && data.hasChildren) { e.stopPropagation(); data.onToggle(id); } }}
      >
        {editing ? (
          <input
            ref={inputRef}
            className={`w-full outline-none rounded-xl px-2 py-1 ${data?.isDark ? 'bg-slate-700 text-slate-100' : 'bg-slate-100'}`}
            defaultValue={data.label}
            onClick={stop}
            onKeyDown={onKeyDown}
            onBlur={(e) => { data.onRename && data.onRename(id, e.target.value.trim() || data.label); setEditing(false); }}
          />
        ) : (
          <div className={`font-medium ${isRoot ? "text-lg" : "text-sm"}`}>{data.label}</div>
        )}
        {!!data.description && <div className="text-xs mt-1 opacity-80">{data.description}</div>}
      </div>
    </div>
  );
}

const nodeTypes = { mind: MindNode };
const edgeTypes = { mind: MindEdge };

// Props interface
interface MindmapDisplayProps {
  nodes: any[];
  edges: any[];
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

export function EnhancedMindmapDisplay({ 
  nodes: initialNodes, 
  edges: initialEdges, 
  metadata, 
  onRegenerate, 
  isRegenerating = false 
}: MindmapDisplayProps) {
  // Convert API data to mindmap format
  const convertedData = useMemo(() => {
    if (!initialNodes.length) return { nodes: [], edges: [] };

    // Find root node (level 0 or central category)
    const rootNode = initialNodes.find(n => n.data.level === 0 || n.data.category === 'central') || initialNodes[0];
    
    // Convert nodes to mindmap format
    const mindNodes = initialNodes.map(node => {
      const [c0, c1, stroke] = pickPalette();
      const isRoot = node.id === rootNode.id;
      
      return {
        id: node.id,
        type: "mind",
        position: { x: 0, y: 0 },
        data: {
          label: node.data.label,
          description: node.data.description,
          bg: [c0, c1],
          stroke,
          level: node.data.level || 0,
          category: node.data.category,
          onRename: () => {}, // Read-only for now
        }
      };
    });

    // Convert edges to mindmap format
    const mindEdges = initialEdges.map(edge => {
      const targetNode = mindNodes.find(n => n.id === edge.target);
      const stroke = targetNode?.data?.stroke || "#8B5CF6";
      const width = edge.source === rootNode.id ? 8 : 6;
      
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "mind",
        data: { stroke, width, edgeId: edge.id }
      };
    });

    // Apply layout
    const laid = layout(mindNodes, mindEdges);
    const posMap = new Map(laid.map((n) => [n.id, n.position]));
    const finalNodes = mindNodes.map((n) => ({ ...n, position: posMap.get(n.id) || n.position }));

    // Start with only root expanded
    const initialCollapsed = new Set(
      mindEdges.map(e => e.source).filter(id => id !== rootNode.id)
    );
    const vis = computeVisibility(finalNodes, mindEdges, initialCollapsed);
    
    return { 
      nodes: vis.nodes, 
      edges: vis.edges, 
      collapsed: initialCollapsed 
    };
  }, [initialNodes, initialEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(convertedData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(convertedData.edges);
  const [collapsed, setCollapsed] = useState(convertedData.collapsed);
  const [selected, setSelected] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Store latest arrays without triggering renders
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  const getNodesNow = useCallback(() => nodesRef.current || [], []);
  const getEdgesNow = useCallback(() => edgesRef.current || [], []);

  // Animate visibility changes
  const applyVisibility = useCallback((nextCollapsed, baseNodes = getNodesNow(), baseEdges = getEdgesNow()) => {
    const target = computeVisibility(baseNodes, baseEdges, nextCollapsed);
    const { toHide, toShow } = diffHidden(getNodesNow(), target.nodes);

    const curNodes = getNodesNow();
    const curEdges = getEdgesNow();
    const curHidden = new Map(curNodes.map((n) => [n.id, !!n.hidden]));
    const curEdgeHidden = new Map(curEdges.map((e) => [e.id, !!e.hidden]));

    // Step 1: Set pre-in/out flags
    const stepNodes = baseNodes.map((n) => {
      const data = { ...(n.data || {}) };
      if (toShow.includes(n.id)) { data.fade = "pre-in"; return { ...n, hidden: false, data }; }
      if (toHide.includes(n.id)) { data.fade = "out"; return { ...n, hidden: false, data }; }
      return { ...n, hidden: curHidden.get(n.id) || false, data };
    });

    const targetEdgeHidden = new Map(target.edges.map((e) => [e.id, !!e.hidden]));
    const stepEdges = baseEdges.map((e) => {
      const data = { ...(e.data || {}) };
      const willShow = toShow.includes(e.target);
      const willHide = targetEdgeHidden.get(e.id);
      if (willShow) { data.fade = "pre-in"; return { ...e, hidden: false, data }; }
      if (!curEdgeHidden.get(e.id) && willHide) { data.fade = "out"; return { ...e, hidden: false, data }; }
      return { ...e, hidden: curEdgeHidden.get(e.id) || false, data };
    });

    setNodes(stepNodes);
    setEdges(stepEdges);

    // Step 2: Trigger fade-in
    setTimeout(() => {
      setNodes((cur) => cur.map((n) => (n.data?.fade === "pre-in" ? { ...n, data: { ...n.data, fade: "in" } } : n)));
      setEdges((cur) => cur.map((e) => (e.data?.fade === "pre-in" ? { ...e, data: { ...e.data, fade: "in" } } : e)));
    }, 16);

    // Step 3: Finalize
    setTimeout(() => {
      const targetHidden = new Map(target.nodes.map((n) => [n.id, !!n.hidden]));
      const edgeHidden = new Map(target.edges.map((e) => [e.id, !!e.hidden]));
      setNodes((cur) => cur.map((n) => { const d = { ...(n.data || {}) }; delete d.fade; return { ...n, hidden: targetHidden.get(n.id) || false, data: d }; }));
      setEdges((cur) => cur.map((e) => { const d = { ...(e.data || {}) }; delete d.fade; return { ...e, hidden: edgeHidden.get(e.id) || false, data: d }; }));
      setCollapsed(nextCollapsed);
    }, FADE_MS + 30);
  }, [getNodesNow, getEdgesNow]);

  // Enrich node data with UI callbacks
  const withUIData = useCallback((nds) => nds.map((n) => ({
    ...n,
    data: {
      ...n.data,
      isCollapsed: collapsed.has(n.id),
      onRename: (id, label) => setNodes((z) => z.map((m) => (m.id === id ? { ...m, data: { ...m.data, label } } : m))),
      onToggle: (id) => {
        const rootNode = nds.find(node => node.data.level === 0 || node.data.category === 'central');
        if (id === rootNode?.id) return; // don't collapse root
        const next = new Set(collapsed);
        if (next.has(id)) next.delete(id); else next.add(id);
        applyVisibility(next);
      },
      hasChildren: (getEdgesNow() || []).some((e) => e.source === n.id),
      isEdit: false, // View-only mode for now
      isDark,
    },
  })), [collapsed, setNodes, applyVisibility, getEdgesNow, isDark]);

  // Control functions
  const expandAll = useCallback(() => { applyVisibility(new Set()); }, [applyVisibility]);
  const collapseAll = useCallback(() => {
    const parents = new Set((getEdgesNow() || []).map((e) => e.source));
    const rootNode = getNodesNow().find(n => n.data.level === 0 || n.data.category === 'central');
    if (rootNode) parents.delete(rootNode.id);
    applyVisibility(parents);
  }, [applyVisibility, getEdgesNow, getNodesNow]);

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  const exportMindmap = useCallback(() => {
    const payload = { 
      nodes: nodes || [], 
      edges: edges || [], 
      metadata,
      expandedNodes: Array.from(collapsed)
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); 
    a.href = url; 
    a.download = `enhanced-mindmap-${metadata?.title || 'document'}.json`; 
    a.click(); 
    URL.revokeObjectURL(url);
  }, [nodes, edges, metadata, collapsed]);

  // Handle ESC key for fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Fullscreen Canvas
  const FullscreenCanvas = () => (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col">
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
            <Button onClick={expandAll} size="sm" variant="outline" className="text-xs border-gray-400 text-gray-300 hover:bg-gray-800">
              <Plus className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Expand</span>
            </Button>
          </ClickSpark>
          <ClickSpark>
            <Button onClick={collapseAll} size="sm" variant="outline" className="text-xs border-gray-400 text-gray-300 hover:bg-gray-800">
              <Minus className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Collapse</span>
            </Button>
          </ClickSpark>
          <ClickSpark>
            <Button onClick={exportMindmap} size="sm" variant="outline" className="text-xs border-gray-400 text-gray-300 hover:bg-gray-800">
              <Download className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Export</span>
            </Button>
          </ClickSpark>
          <ClickSpark>
            <Button onClick={toggleFullscreen} size="sm" variant="outline" className="text-xs border-red-400 text-red-300 hover:bg-red-900">
              <X className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Exit</span>
            </Button>
          </ClickSpark>
        </div>
      </div>

      <div className="flex-1 relative">
        <ReactFlow
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          nodesFocusable={false}
          selectNodesOnDrag={false}
          panOnDrag={true}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: "mind" }}
          connectionLineType="bezier"
          nodeTypes={nodeTypes}
          nodes={withUIData(nodes.filter(n => !n.hidden))}
          edges={edges.filter(e => !e.hidden)}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          className="bg-gradient-to-br from-gray-900 to-black"
        >
          <Background variant={BackgroundVariant.Dots} gap={30} size={2} color="#374151" />
          <MiniMap nodeColor={(n) => n.data?.stroke || "#8B5CF6"} pannable zoomable className="!bg-gray-800 !border-2 !border-gray-600 !rounded-lg" />
          <Controls className="!bg-gray-800 !border-2 !border-gray-600 !rounded-lg [&>button]:!border-gray-600 [&>button]:hover:!bg-gray-700 [&>button]:!text-gray-300" />
        </ReactFlow>

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
            <div className="text-gray-400">"{metadata?.title}"</div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isFullscreen) {
    return <FullscreenCanvas />;
  }

  if (!nodes.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Brain className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">No mindmap available</h3>
          <p className="text-xs text-gray-600">Generate a mindmap to visualize document concepts</p>
        </div>
      </div>
    );
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
              <h3 className="font-semibold text-gray-900">Enhanced Mindmap</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">{metadata?.nodeCount} concepts</Badge>
                <Badge variant="outline" className="text-xs">{metadata?.edgeCount} connections</Badge>
                {metadata?.complexity && (
                  <Badge className="text-xs bg-purple-100 text-purple-700">{metadata.complexity}</Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ClickSpark>
              <Button onClick={expandAll} size="sm" variant="outline" className="text-xs" title="Expand All">
                <Plus className="h-3 w-3" />
              </Button>
            </ClickSpark>
            <ClickSpark>
              <Button onClick={collapseAll} size="sm" variant="outline" className="text-xs" title="Collapse All">
                <Minus className="h-3 w-3" />
              </Button>
            </ClickSpark>
            <ClickSpark>
              <Button onClick={exportMindmap} size="sm" variant="outline" className="text-xs" title="Export">
                <Download className="h-3 w-3" />
              </Button>
            </ClickSpark>
            <ClickSpark>
              <Button onClick={toggleFullscreen} size="sm" variant="outline" className="text-xs" title="Fullscreen">
                <Maximize className="h-3 w-3" />
              </Button>
            </ClickSpark>
            {onRegenerate && (
              <ClickSpark>
                <Button onClick={onRegenerate} disabled={isRegenerating} size="sm" variant="outline" className="text-xs">
                  {isRegenerating ? <Sparkles className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                </Button>
              </ClickSpark>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Mindmap */}
      <div 
        className={`flex-1 rounded-xl overflow-hidden relative ${isDark ? 'bg-gradient-to-b from-slate-900 to-slate-800' : 'bg-gradient-to-b from-slate-50 to-slate-100'}`}
        tabIndex={0}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ 
            backgroundImage: `radial-gradient(${isDark ? '#47556980' : '#cbd5e180'} 1px, transparent 1px)`, 
            backgroundSize: '20px 20px', 
            opacity: isDark ? 0.6 : 0.4 
          }}
        />

        {/* Theme toggle */}
        <div className={`absolute z-10 right-4 top-4 rounded-xl border shadow backdrop-blur-sm ${isDark ? 'border-slate-600 bg-slate-900/70' : 'border-slate-200 bg-white/80'}`}>
          <button 
            className={`px-3 py-1.5 text-sm ${isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-50'}`} 
            onClick={() => setIsDark((d) => !d)}
          >
            {isDark ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        <ReactFlow
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          nodesFocusable={false}
          selectNodesOnDrag={false}
          panOnDrag={true}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: "mind" }}
          connectionLineType="bezier"
          nodeTypes={nodeTypes}
          nodes={withUIData(nodes.filter(n => !n.hidden))}
          edges={edges.filter(e => !e.hidden)}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          proOptions={{ hideAttribution: true }}
          className="rounded-xl"
        >
          <MiniMap 
            nodeColor={(n) => n.data?.stroke || "#8B5CF6"} 
            pannable 
            zoomable 
            className={isDark ? "!bg-slate-800 !border-slate-600" : "!bg-white !border-slate-200"}
          />
          <Controls 
            position="bottom-right" 
            className={isDark ? "!bg-slate-800 !border-slate-600 [&>button]:!text-slate-300" : "!bg-white !border-slate-200"}
          />
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={28} 
            size={1} 
            color={isDark ? '#334155' : '#cbd5e1'} 
          />
        </ReactFlow>

        <div className={`absolute right-4 bottom-4 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Tips: +/− bubble expands/collapses • Click nodes to explore • Smooth animations
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
            <p className="text-xs text-gray-500 mt-1">Generated from "{metadata.title}"</p>
          </div>
        </div>
      )}
    </FadeContent>
  );
}
