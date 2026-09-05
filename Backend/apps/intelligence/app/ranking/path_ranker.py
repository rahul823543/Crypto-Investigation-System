"""
app/ranking/path_ranker.py
──────────────────────────
Phase 3: Score and rank suspicious paths by forensic severity.

Design:
  - Pure function: receives a list of SuspiciousPath DTOs (score=0, rank=0)
    and returns the same list with score and rank filled in.
  - Scores are computed from a deterministic weighted table — no ML, no
    randomness, no external state. Same input always produces same output.
  - Paths are sorted descending by score, then ranked 1..N.
  - Weights come directly from the Phase 3 plan; adjusting weights here
    is the single place to tune forensic sensitivity for the MVP demo.

Weight table (from BACKEND_PLAN Phase 3 plan):
  mixer_touchpoint  → +40
  circular_return   → +35  (set by circular_flow detector on overlap paths)
  rapid_movement    → +25
  bridge_touchpoint → +20
  high_value        → +15
  risky_label       → +10
  dex_touchpoint    → +5

Final score is clamped to [0, 100].
"""
from __future__ import annotations

from app.schemas.response import SuspiciousPath

# Weights applied per reason code. Order does not matter.
_WEIGHTS: dict[str, int] = {
    "mixer_touchpoint":  40,
    "circular_return":   35,
    "fan_out_relay":     30,
    "rapid_movement":    25,
    "bridge_touchpoint": 20,
    "high_value":        20,
    "high_value_flow":   20,
    "risky_label":       15,
    "dex_touchpoint":     5,
}


def rank_paths(paths: list[SuspiciousPath]) -> list[SuspiciousPath]:
    """
    Assign a numeric score and rank to every SuspiciousPath.

    Modifies each path's ``score`` and ``rank`` fields in-place on copies
    (Pydantic models are rebuilt via model_copy so the originals are not
    mutated). Returns the sorted, ranked list.

    Args:
        paths: Output of detect_suspicious_paths() — score=0, rank=0.

    Returns:
        New list, sorted descending by score, with rank 1..N assigned.
        Returns [] if paths is empty.
    """
    if not paths:
        return []

    scored = [_score_path(p) for p in paths]
    # Primary sort: descending by score (-score); Secondary sort: ascending by id
    scored.sort(key=lambda p: (-p.score, p.id))

    ranked = []
    for rank_pos, path in enumerate(scored, start=1):
        ranked.append(path.model_copy(update={"rank": rank_pos}))

    return ranked


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _score_path(path: SuspiciousPath) -> SuspiciousPath:
    """Compute score from reason_codes and return a new SuspiciousPath."""
    raw_score = sum(_WEIGHTS.get(code, 0) for code in path.reason_codes)
    clamped = max(0, min(100, raw_score))
    return path.model_copy(update={"score": clamped})
