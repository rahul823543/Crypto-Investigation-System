import type { StylesheetStyle } from 'cytoscape';

/**
 * Cytoscape stylesheet tailored to the Antigravity Forensic Intelligence aesthetic.
 */
export const graphStyles: StylesheetStyle[] = [
  // ─── Base Node ─────────────────────────────────────────────────────────────
  {
    selector: 'node',
    style: {
      'shape': 'ellipse',
      'width': 46,
      'height': 46,
      'background-color': '#FFFFFF',
      'border-width': 2.5,
      'border-color': '#CBD5E1',
      'label': 'data(label)',
      'font-family': 'Plus Jakarta Sans, sans-serif',
      'font-size': '11px',
      'font-weight': 600,
      'text-valign': 'bottom',
      'text-margin-y': 7,
      'color': '#0F172A',
      'text-background-color': '#FFFFFF',
      'text-background-opacity': 0.85,
      'text-background-padding': '2px',
      'text-background-shape': 'roundrectangle',
      'transition-property': 'background-color, border-color, width, height, opacity',
      'transition-duration': 200,
    } as any,
  },

  // ─── Root Subject Node ────────────────────────────────────────────────────
  {
    selector: 'node[?isRoot]',
    style: {
      'width': 58,
      'height': 58,
      'border-width': 4,
      'border-color': '#4F46E5',
      'background-color': '#EEF2FF',
      'color': '#4338CA',
      'font-size': '12px',
      'font-weight': 700,
      'z-index': 100,
    } as any,
  },

  // ─── Node Types ────────────────────────────────────────────────────────────
  {
    selector: 'node[nodeType = "dex"]',
    style: {
      'shape': 'round-rectangle',
      'width': 48,
      'height': 48,
      'background-color': '#FAF5FF',
      'border-color': '#7E22CE',
      'border-width': 3,
      'color': '#6B21A8',
    } as any,
  },
  {
    selector: 'node[nodeType = "bridge"]',
    style: {
      'shape': 'round-diamond',
      'width': 50,
      'height': 50,
      'background-color': '#F0FDF4',
      'border-color': '#10B981',
      'border-width': 3,
      'color': '#065F46',
    } as any,
  },
  {
    selector: 'node[nodeType = "mixer"], node[nodeType = "risky_address"]',
    style: {
      'shape': 'hexagon',
      'width': 50,
      'height': 50,
      'background-color': '#FEF2F2',
      'border-color': '#EF4444',
      'border-width': 3.5,
      'color': '#991B1B',
    } as any,
  },

  // ─── Node Risk Levels ──────────────────────────────────────────────────────
  {
    selector: 'node[riskLevel = "high"], node[riskLevel = "critical"]',
    style: {
      'border-color': '#EF4444',
      'background-color': '#FEF2F2',
    } as any,
  },
  {
    selector: 'node[riskLevel = "medium"]',
    style: {
      'border-color': '#F59E0B',
      'background-color': '#FFFBEB',
    } as any,
  },
  {
    selector: 'node[riskLevel = "low"]',
    style: {
      'border-color': '#10B981',
      'background-color': '#F0FDF4',
    } as any,
  },

  // ─── Base Edge ─────────────────────────────────────────────────────────────
  {
    selector: 'edge',
    style: {
      'curve-style': 'bezier',
      'target-arrow-shape': 'triangle',
      'target-arrow-color': '#94A3B8',
      'line-color': '#CBD5E1',
      'width': 2.2,
      'arrow-scale': 1.1,
      'label': 'data(label)',
      'font-family': 'Inter, monospace',
      'font-size': '10px',
      'font-weight': 500,
      'color': '#475569',
      'text-background-color': '#FFFFFF',
      'text-background-opacity': 0.9,
      'text-background-padding': '2px',
      'text-background-shape': 'roundrectangle',
      'text-rotation': 'autorotate',
      'text-margin-y': -6,
      'transition-property': 'line-color, target-arrow-color, width, opacity',
      'transition-duration': 200,
    } as any,
  },

  // ─── Edge Risk Levels ──────────────────────────────────────────────────────
  {
    selector: 'edge[riskLevel = "high"], edge[riskLevel = "critical"]',
    style: {
      'line-color': '#F87171',
      'target-arrow-color': '#EF4444',
      'width': 3.5,
      'color': '#B91C1C',
    } as any,
  },
  {
    selector: 'edge[riskLevel = "medium"]',
    style: {
      'line-color': '#FCD34D',
      'target-arrow-color': '#F59E0B',
      'width': 2.6,
      'color': '#B45309',
    } as any,
  },
  {
    selector: 'edge[riskLevel = "low"]',
    style: {
      'line-color': '#6EE7B7',
      'target-arrow-color': '#10B981',
      'width': 2.0,
      'color': '#047857',
    } as any,
  },

  // ─── Selected State ────────────────────────────────────────────────────────
  {
    selector: 'node:selected, node.selected',
    style: {
      'border-width': 4.5,
      'border-color': '#4F46E5',
      'background-color': '#EEF2FF',
      'z-index': 999,
    } as any,
  },
  {
    selector: 'edge:selected, edge.selected',
    style: {
      'line-color': '#4F46E5',
      'target-arrow-color': '#4F46E5',
      'width': 4.5,
      'z-index': 999,
    } as any,
  },

  // ─── Highlighted Finding Path ──────────────────────────────────────────────
  {
    selector: 'node.highlighted',
    style: {
      'border-width': 4.5,
      'border-color': '#7E22CE',
      'background-color': '#FAF5FF',
      'z-index': 900,
    } as any,
  },
  {
    selector: 'edge.highlighted',
    style: {
      'line-color': '#7E22CE',
      'target-arrow-color': '#7E22CE',
      'width': 4,
      'z-index': 900,
    } as any,
  },

  // ─── Suspicious Path Route Highlighting ────────────────────────────────────
  {
    selector: 'node.path-highlight',
    style: {
      'border-width': 4.5,
      'border-color': '#4F46E5',
      'background-color': '#EEF2FF',
      'color': '#3730A3',
      'z-index': 950,
    } as any,
  },
  {
    selector: 'edge.path-highlight',
    style: {
      'line-color': '#4F46E5',
      'target-arrow-color': '#4F46E5',
      'width': 4.5,
      'arrow-scale': 1.3,
      'z-index': 950,
    } as any,
  },

  // ─── Circular Flow / Loop Highlighting ─────────────────────────────────────
  {
    selector: 'node.circular-flow, node.loop-highlight',
    style: {
      'border-width': 5,
      'border-color': '#D946EF',
      'background-color': '#FDF4FF',
      'color': '#86198F',
      'font-weight': 700,
      'z-index': 960,
    } as any,
  },
  {
    selector: 'edge.circular-flow, edge.loop-highlight',
    style: {
      'line-color': '#D946EF',
      'target-arrow-color': '#C026D3',
      'width': 4.8,
      'arrow-scale': 1.4,
      'line-style': 'dashed',
      'line-dash-pattern': [8, 4],
      'color': '#86198F',
      'font-weight': 700,
      'z-index': 960,
    } as any,
  },

  // ─── Dimmed Unrelated Elements ─────────────────────────────────────────────
  {
    selector: 'node.dimmed',
    style: {
      'opacity': 0.22,
    } as any,
  },
  {
    selector: 'edge.dimmed',
    style: {
      'opacity': 0.12,
    } as any,
  },
];

