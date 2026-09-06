"""
app/traversal/confidence.py
---------------------------
v3 Phase 4: Confidence-decay formulas per BACKEND_PLAN_v3 §7.

Two formulas, one place:

  1. confidence_at_hop(n) = base_confidence * (decay_factor ** n)
     n = hops from signal origin (not root wallet).
     Default decayFactor 0.65 => stops naturally around hop 4-5,
     making hardCeilingDepth a safety valve that is rarely hit.

  2. combine_confidences([c1, c2, ...]) = 1 - prod(1 - ci)
     Noisy-OR: never exceeds 1.0, never discards weak corroboration.

Pure functions. No graph, I/O, or config dependency.
O(1) time and space per call.
"""
from __future__ import annotations

from functools import reduce


def confidence_at_hop(
    base_confidence: float,
    decay_factor: float,
    hop: int,
) -> float:
    """Return confidence at a given hop distance from the signal origin.

    confidence_at_hop(n) = base_confidence * (decay_factor ** n)

    Args:
        base_confidence: Starting confidence in [0.0, 1.0].
        decay_factor:    Per-hop retention fraction in [0.0, 1.0].
        hop:             Hops from signal origin (0 = origin node).

    Returns:
        Confidence in [0.0, base_confidence].

    Raises:
        ValueError: If any argument is out of its valid range.
    """
    if hop < 0:
        raise ValueError(f"hop must be >= 0, got {hop}")
    if not (0.0 <= base_confidence <= 1.0):
        raise ValueError(f"base_confidence must be in [0, 1], got {base_confidence}")
    if not (0.0 <= decay_factor <= 1.0):
        raise ValueError(f"decay_factor must be in [0, 1], got {decay_factor}")

    return base_confidence * (decay_factor**hop)


def combine_confidences(confidences: list[float]) -> float:
    """Combine independent confidence scores via Noisy-OR.

    combined = 1 - product(1 - ci)

    - Never exceeds 1.0 (unlike naive sum).
    - Preserves corroborating weak signals (unlike max).
    - Empty list -> 0.0.

    Args:
        confidences: Values in [0.0, 1.0].

    Returns:
        Combined confidence in [0.0, 1.0].

    Raises:
        ValueError: If any value is outside [0.0, 1.0].
    """
    if not confidences:
        return 0.0
    for i, c in enumerate(confidences):
        if not (0.0 <= c <= 1.0):
            raise ValueError(
                f"All confidences must be in [0, 1]. Got {c!r} at index {i}."
            )
    complement_product = reduce(lambda acc, c: acc * (1.0 - c), confidences, 1.0)
    return 1.0 - complement_product


def is_below_threshold(
    base_confidence: float,
    decay_factor: float,
    hop: int,
    min_confidence: float,
) -> bool:
    """Return True when decayed confidence falls below min_confidence.

    This is the primary traversal stopping condition in the v3 loop.
    True  -> stop expanding this path.
    False -> continue traversal.
    """
    return confidence_at_hop(base_confidence, decay_factor, hop) < min_confidence
