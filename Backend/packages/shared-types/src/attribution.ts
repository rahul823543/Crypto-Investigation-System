export interface VaspAttribution {
  attributedVasp: string;
  vaspNodeId: string;
  hopDistance: number;
  confidence: number;
  pathNodeIds: string[];
  pathEdgeIds: string[];
  basis: string;
  secondaryCandidates: VaspAttribution[];
}
