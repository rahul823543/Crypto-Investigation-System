"""
app/scoring/risk_score.py
─────────────────────────
Phase 3: Deterministic composite risk score from analysis signals.

Formula (from Phase 3 plan):
  1. Top-ranked suspicious path score   → up to 60 points
  2. Circular flows                     → +15 each, capped at 30
  3. High-severity basic findings       → +5 each, capped at 10
  4. Clamp to [0, 100]
  5. Level thresholds:
       [0,  25) → "low"
       [25, 50) → "medium"
       [50, 75) → "high"
       [75,100] → "critical"

Design:
  - Pure function: (suspicious_paths, circular_flows, basic_findings) → (int, str)
  - "high-severity" basic findings are those with severity in {"high","critical"}.
  - basic_findings is a list of raw dicts (as received from Fastify in the
    AnalysisRequest) — no Pydantic model required at this layer.
  - All arithmetic is integer; the intermediate path contribution is
    floored after a 60% scaling to avoid floating-point surprises.
"""
from __future__ import annotations

from app.schemas.response import CircularFlow, SuspiciousPath

# Maximum contribution caps per category
_MAX_PATH_CONTRIBUTION = 60
_MAX_CYCLE_CONTRIBUTION = 30
_MAX_FINDING_CONTRIBUTION = 10

# Per-unit contributions
_CYCLE_POINTS = 15
_FINDING_POINTS = 5

# Severities considered high for scoring
_HIGH_SEVERITIES = {"high", "critical"}

# Risk level thresholds
_LEVEL_THRESHOLDS = [
    (75, "critical"),
    (50, "high"),
    (25, "medium"),
    (0,  "low"),
]


def compute_risk_score(
    suspicious_paths: list[SuspiciousPath],
    circular_flows: list[CircularFlow],
    basic_findings: list[dict],
) -> tuple[int, str]:
    """
    Compute the composite risk score and level for an analysis run.

    Args:
        suspicious_paths: Output of rank_paths() — sorted, scored list.
        circular_flows:   Output of detect_circular_flows().
        basic_findings:   Raw basicFindings list from the AnalysisRequest.

    Returns:
        (score: int [0-100], level: str)
    """
    score = 0

    # 1. Top-ranked path contributes up to 60 points (linear scaling).
    if suspicious_paths:
        top_score = suspicious_paths[0].score  # rank_paths sorts desc
        path_contribution = int((top_score / 100) * _MAX_PATH_CONTRIBUTION)
        score += min(path_contribution, _MAX_PATH_CONTRIBUTION)

    # 2. Circular flows — +15 each, capped at 30.
    cycle_pts = len(circular_flows) * _CYCLE_POINTS
    score += min(cycle_pts, _MAX_CYCLE_CONTRIBUTION)

    # 3. High-severity basic findings — +5 each, capped at 10.
    high_findings = [
        f for f in basic_findings
        if f.get("severity") in _HIGH_SEVERITIES
    ]
    finding_pts = len(high_findings) * _FINDING_POINTS
    score += min(finding_pts, _MAX_FINDING_CONTRIBUTION)

    # 4. Clamp.
    score = max(0, min(100, score))

    # 5. Level.
    level = _score_to_level(score)

    return score, level


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def score_to_level(score: int) -> str:
    """Map a 0-100 numeric score to a RiskLevel string."""
    for threshold, level in _LEVEL_THRESHOLDS:
        if score >= threshold:
            return level
    return "low"


# Backwards compatibility alias
_score_to_level = score_to_level

