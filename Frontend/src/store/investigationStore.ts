import { create } from 'zustand';

interface InvestigationUiState {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  selectedFindingId: string | null;
  selectedPathId: string | null;
  selectedCircularFlowId: string | null;
  highlightMode: 'default' | 'path' | 'loop' | null;
  highlightedElementIds: string[];
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  selectFinding: (findingId: string | null, relatedIds?: string[]) => void;
  selectPath: (pathId: string | null, elementIds?: string[]) => void;
  selectCircularFlow: (flowId: string | null, elementIds?: string[]) => void;
  clearSelection: () => void;
}

export const useInvestigationStore = create<InvestigationUiState>((set) => ({
  selectedNodeId: null,
  selectedEdgeId: null,
  selectedFindingId: null,
  selectedPathId: null,
  selectedCircularFlowId: null,
  highlightMode: null,
  highlightedElementIds: [],
  selectNode: (nodeId) =>
    set({
      selectedNodeId: nodeId,
      selectedEdgeId: null,
      selectedFindingId: null,
      selectedPathId: null,
      selectedCircularFlowId: null,
      highlightMode: null,
      highlightedElementIds: nodeId ? [nodeId] : [],
    }),
  selectEdge: (edgeId) =>
    set({
      selectedEdgeId: edgeId,
      selectedNodeId: null,
      selectedFindingId: null,
      selectedPathId: null,
      selectedCircularFlowId: null,
      highlightMode: null,
      highlightedElementIds: edgeId ? [edgeId] : [],
    }),
  selectFinding: (findingId, relatedIds = []) =>
    set({
      selectedFindingId: findingId,
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedPathId: null,
      selectedCircularFlowId: null,
      highlightMode: 'default',
      highlightedElementIds: relatedIds,
    }),
  selectPath: (pathId, elementIds = []) =>
    set({
      selectedPathId: pathId,
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedFindingId: null,
      selectedCircularFlowId: null,
      highlightMode: 'path',
      highlightedElementIds: elementIds,
    }),
  selectCircularFlow: (flowId, elementIds = []) =>
    set({
      selectedCircularFlowId: flowId,
      selectedPathId: null,
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedFindingId: null,
      highlightMode: 'loop',
      highlightedElementIds: elementIds,
    }),
  clearSelection: () =>
    set({
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedFindingId: null,
      selectedPathId: null,
      selectedCircularFlowId: null,
      highlightMode: null,
      highlightedElementIds: [],
    }),
}));
