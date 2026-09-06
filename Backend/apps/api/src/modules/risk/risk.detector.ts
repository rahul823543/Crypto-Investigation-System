import type { RiskFinding } from "@sih/shared-types";
import { detectFanOut, type DetectorInput } from "./fanOut.detector.js";
import { detectDexInteractions } from "./dex.detector.js";
import { detectBridgeInteractions } from "./bridge.detector.js";
import { detectRiskyAddresses } from "./riskyAddress.detector.js";
import { detectMixerInteractions } from "./mixer.detector.js";
import { detectVaspDirectTouch } from "./vaspDirectTouch.detector.js";

/**
 * Run all six basic risk detectors and aggregate their findings.
 */
export function runRiskDetectors(input: DetectorInput): RiskFinding[] {
  const findings: RiskFinding[] = [
    ...detectFanOut(input),
    ...detectDexInteractions(input),
    ...detectBridgeInteractions(input),
    ...detectRiskyAddresses(input),
    ...detectMixerInteractions(input),
    ...detectVaspDirectTouch(input),
  ];

  return findings;
}

export * from "./fanOut.detector.js";
export * from "./dex.detector.js";
export * from "./bridge.detector.js";
export * from "./riskyAddress.detector.js";
export * from "./mixer.detector.js";
export * from "./vaspDirectTouch.detector.js";
export * from "./riskScore.js";
