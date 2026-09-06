import { create } from 'zustand';

interface InvestigationUiState {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  selectedFindingId: string | null;
  selectedPathId: string | null;
  highlightedElementIds: string[];
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  selectFinding: (findingId: string | null, relatedIds?: string[]) => void;
  selectPath: (pathId: string | null, elementIds?: string[]) => void;
  clearSelection: () => void;
}

export const useInvestigationStore = create<InvestigationUiState>((set) => ({
  selectedNodeId: null,
  selectedEdgeId: null,
  selectedFindingId: null,
  selectedPathId: null,
  highlightedElementIds: [],
  selectNode: (nodeId) =>
    set({
      selectedNodeId: nodeId,
      selectedEdgeId: null,
      selectedFindingId: null,
      selectedPathId: null,
      highlightedElementIds: nodeId ? [nodeId] : [],
    }),
  selectEdge: (edgeId) =>
    set({
      selectedEdgeId: edgeId,
      selectedNodeId: null,
      selectedFindingId: null,
      selectedPathId: null,
      highlightedElementIds: edgeId ? [edgeId] : [],
    }),
  selectFinding: (findingId, relatedIds = []) =>
    set({
      selectedFindingId: findingId,
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedPathId: null,
      highlightedElementIds: relatedIds,
    }),
  selectPath: (pathId, elementIds = []) =>
    set({
      selectedPathId: pathId,
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedFindingId: null,
      highlightedElementIds: elementIds,
    }),
  clearSelection: () =>
    set({
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedFindingId: null,
      selectedPathId: null,
      highlightedElementIds: [],
    }),
}));
