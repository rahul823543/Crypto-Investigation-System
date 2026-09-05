import type { RiskFinding } from "@sih/shared-types";
import { detectFanOut, type DetectorInput } from "./fanOut.detector.js";
import { detectDexInteractions } from "./dex.detector.js";
import { detectBridgeInteractions } from "./bridge.detector.js";
import { detectRiskyAddresses } from "./riskyAddress.detector.js";

/**
 * Run all four basic risk detectors and aggregate their findings.
 */
export function runRiskDetectors(input: DetectorInput): RiskFinding[] {
  const findings: RiskFinding[] = [
    ...detectFanOut(input),
    ...detectDexInteractions(input),
    ...detectBridgeInteractions(input),
    ...detectRiskyAddresses(input),
  ];

  return findings;
}

export * from "./fanOut.detector.js";
export * from "./dex.detector.js";
export * from "./bridge.detector.js";
export * from "./riskyAddress.detector.js";
export * from "./riskScore.js";
