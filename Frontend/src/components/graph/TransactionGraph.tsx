import React, { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape, { type Core, type LayoutOptions } from 'cytoscape';
import { Maximize2, Minimize2 } from 'lucide-react';
import { mapGraphToCytoscapeElements } from '@/utils/graphMapping';
import { graphStyles } from '@/utils/graphStyles';
import { useInvestigationStore } from '@/store/investigationStore';
import { GraphToolbar, type GraphLayoutType } from './GraphToolbar';
import { GraphLegend } from './GraphLegend';
import type { CaseGraph, GraphNode, GraphEdge } from '@/types';

export interface TransactionGraphProps {
  graph: CaseGraph;
  onNodeSelect?: (node: GraphNode | null) => void;
  onEdgeSelect?: (edge: GraphEdge | null) => void;
  className?: string;
}

export const TransactionGraph: React.FC<TransactionGraphProps> = ({
  graph,
  onNodeSelect,
  onEdgeSelect,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [layoutType, setLayoutType] = useState<GraphLayoutType>('breadthfirst');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const {
    selectedNodeId,
    selectedEdgeId,
    highlightedElementIds,
    highlightMode,
    selectNode,
    selectEdge,
    clearSelection,
  } = useInvestigationStore();

  // Re-render and resize Cytoscape whenever fullscreen toggles (after transition)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (cyRef.current) {
        cyRef.current.resize();
        cyRef.current.fit(undefined, 40);
      }
    }, 100);

    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Support ESC key to collapse fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Get layout config based on type
  const getLayoutOptions = useCallback((type: GraphLayoutType): LayoutOptions => {
    switch (type) {
      case 'breadthfirst':
        return {
          name: 'breadthfirst',
          directed: true,
          padding: 40,
          spacingFactor: 1.4,
          animate: true,
          animationDuration: 400,
        } as any;
      case 'cose':
        return {
          name: 'cose',
          animate: true,
          animationDuration: 500,
          padding: 40,
          nodeOverlap: 20,
          idealEdgeLength: 100,
          edgeElasticity: 100,
          nestingFactor: 5,
        } as any;
      case 'concentric':
        return {
          name: 'concentric',
          animate: true,
          animationDuration: 400,
          padding: 40,
          concentric: (node: any) => (node.data('isRoot') ? 10 : 10 - (node.data('hopDepth') || 1)),
          levelWidth: () => 2,
        } as any;
      case 'circle':
        return {
          name: 'circle',
          animate: true,
          animationDuration: 400,
          padding: 40,
        } as any;
    }
  }, []);

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    const elements = mapGraphToCytoscapeElements(graph.nodes, graph.edges);

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: graphStyles,
      layout: getLayoutOptions(layoutType),
      boxSelectionEnabled: false,
      autounselectify: false,
      wheelSensitivity: 0.25,
      minZoom: 0.3,
      maxZoom: 3.0,
    });

    cyRef.current = cy;

    // Node click
    cy.on('tap', 'node', (e) => {
      const target = e.target;
      const nodeId = target.id();
      selectNode(nodeId);
      const foundNode = graph.nodes.find((n) => n.id === nodeId);
      if (onNodeSelect && foundNode) onNodeSelect(foundNode);
    });

    // Edge click
    cy.on('tap', 'edge', (e) => {
      const target = e.target;
      const edgeId = target.id();
      selectEdge(edgeId);
      const foundEdge = graph.edges.find((edge) => edge.id === edgeId);
      if (onEdgeSelect && foundEdge) onEdgeSelect(foundEdge);
    });

    // Background click (deselect)
    cy.on('tap', (e) => {
      if (e.target === cy) {
        clearSelection();
        if (onNodeSelect) onNodeSelect(null);
        if (onEdgeSelect) onEdgeSelect(null);
      }
    });

    // Resize observer
    const handleResize = () => {
      cy.resize();
      cy.fit(undefined, 40);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cy.destroy();
      cyRef.current = null;
    };
  }, [graph, layoutType, getLayoutOptions, onNodeSelect, onEdgeSelect, selectNode, selectEdge, clearSelection]);

  // Layout change handler
  const handleLayoutChange = (newLayout: GraphLayoutType) => {
    setLayoutType(newLayout);
    if (cyRef.current) {
      const layout = cyRef.current.layout(getLayoutOptions(newLayout));
      layout.run();
    }
  };

  // Synchronize highlights & selection with Cytoscape elements
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.batch(() => {
      // Clear previous classes
      cy.elements().removeClass(
        'highlighted dimmed selected path-highlight circular-flow loop-highlight'
      );

      if (highlightedElementIds.length > 0) {
        // Dim all elements first
        cy.elements().addClass('dimmed');

        // Determine which highlight class to apply
        let activeHighlightClass = 'highlighted';
        if (highlightMode === 'path') {
          activeHighlightClass = 'path-highlight';
        } else if (highlightMode === 'loop') {
          activeHighlightClass = 'circular-flow loop-highlight';
        }

        // Highlight specific elements
        highlightedElementIds.forEach((id) => {
          const el = cy.getElementById(id);
          if (el.nonempty()) {
            el.removeClass('dimmed').addClass(activeHighlightClass);
          }
        });
      }

      // Mark single selection
      if (selectedNodeId) {
        cy.getElementById(selectedNodeId).addClass('selected');
      }
      if (selectedEdgeId) {
        cy.getElementById(selectedEdgeId).addClass('selected');
      }
    });
  }, [highlightedElementIds, highlightMode, selectedNodeId, selectedEdgeId]);

  // Camera Actions
  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom({
        level: cyRef.current.zoom() * 1.25,
        renderedPosition: {
          x: cyRef.current.width() / 2,
          y: cyRef.current.height() / 2,
        },
      });
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom({
        level: cyRef.current.zoom() * 0.8,
        renderedPosition: {
          x: cyRef.current.width() / 2,
          y: cyRef.current.height() / 2,
        },
      });
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.animate({
        fit: { eles: cyRef.current.elements(), padding: 40 },
        duration: 400,
      });
    }
  };

  const handleReset = () => {
    if (cyRef.current) {
      clearSelection();
      const layout = cyRef.current.layout(getLayoutOptions(layoutType));
      layout.run();
      cyRef.current.fit(undefined, 40);
    }
  };

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen bg-slate-950/40 backdrop-blur-sm flex flex-col p-3 sm:p-5'
          : `relative w-full rounded-3xl bg-white border border-slate-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col ${className || ''}`
      }
    >
      <div
        className={
          isFullscreen
            ? 'relative w-full h-full rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col'
            : 'contents'
        }
      >
        {/* Top Floating Toolbar & Maximize/Collapse Controls */}
        <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex items-center justify-between gap-3">
          <div className="pointer-events-auto">
            <GraphToolbar
              layout={layoutType}
              onLayoutChange={handleLayoutChange}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onFit={handleFit}
              onReset={handleReset}
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
            />
          </div>

          {/* Corner Expand/Collapse Toggle Button */}
          <div className="pointer-events-auto hidden sm:flex items-center gap-2">
            {isFullscreen ? (
              <button
                onClick={() => setIsFullscreen(false)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-lg transition-all cursor-pointer border border-slate-700"
                title="Exit Fullscreen (Esc)"
              >
                <Minimize2 className="h-4 w-4 text-slate-300" />
                <span>Exit Fullscreen</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">ESC</kbd>
              </button>
            ) : (
              <button
                onClick={() => setIsFullscreen(true)}
                className="flex items-center gap-1.5 p-2 rounded-2xl bg-white/95 hover:bg-white text-slate-600 hover:text-slate-900 text-xs font-medium backdrop-blur-md shadow-md transition-all cursor-pointer border border-slate-200/80"
                title="Expand Graph Fullscreen"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Cytoscape Canvas Viewport */}
        <div
          ref={containerRef}
          className={
            isFullscreen
              ? 'w-full flex-1 h-full min-h-0 bg-gradient-to-b from-[#FAFAFD] via-white to-purple-50/20 cursor-grab active:cursor-grabbing'
              : 'w-full h-[540px] sm:h-[620px] bg-gradient-to-b from-[#FAFAFD] via-white to-purple-50/20 cursor-grab active:cursor-grabbing'
          }
        />

        {/* Bottom Floating Legend */}
        <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none">
          <div className="pointer-events-auto flex justify-between items-center">
            <GraphLegend />
            {isFullscreen && (
              <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300 text-xs font-mono">
                <span>Fullscreen Mode</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
