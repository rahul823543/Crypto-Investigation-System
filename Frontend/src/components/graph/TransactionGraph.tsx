import React, { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape, { type Core, type LayoutOptions } from 'cytoscape';
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

  const {
    selectedNodeId,
    selectedEdgeId,
    highlightedElementIds,
    highlightMode,
    selectNode,
    selectEdge,
    clearSelection,
  } = useInvestigationStore();

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
      className={`relative w-full rounded-3xl bg-white border border-slate-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col ${className}`}
    >
      {/* Top Floating Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none">
        <div className="pointer-events-auto">
          <GraphToolbar
            layout={layoutType}
            onLayoutChange={handleLayoutChange}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFit={handleFit}
            onReset={handleReset}
          />
        </div>
      </div>

      {/* Cytoscape Canvas Viewport */}
      <div
        ref={containerRef}
        className="w-full h-[540px] sm:h-[620px] bg-gradient-to-b from-[#FAFAFD] via-white to-purple-50/20 cursor-grab active:cursor-grabbing"
      />

      {/* Bottom Floating Legend */}
      <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none">
        <div className="pointer-events-auto flex justify-between items-center">
          <GraphLegend />
        </div>
      </div>
    </div>
  );
};
