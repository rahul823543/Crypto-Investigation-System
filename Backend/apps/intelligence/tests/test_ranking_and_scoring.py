"""
tests/test_ranking_and_scoring.py
───────────────────────────────────
Unit tests for:
  - app/ranking/path_ranker.py
  - app/scoring/risk_score.py
"""
from __future__ import annotations

import pytest

from app.ranking.path_ranker import _WEIGHTS, rank_paths
from app.schemas.response import CircularFlow, SuspiciousPath
from app.scoring.risk_score import compute_risk_score


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_path(pid: str, reason_codes: list[str]) -> SuspiciousPath:
    return SuspiciousPath(
        id=pid,
        rank=1,   # ge=1 enforced by Pydantic; ranker overwrites this
        score=0,
        nodeIds=["wallet:0x111", "wallet:0x222"],
        edgeIds=["edge_001"],
        reasonCodes=reason_codes,
        summary="test path",
    )


def _make_cycle(cid: str) -> CircularFlow:
    return CircularFlow(
        id=cid,
        nodeIds=["wallet:0x111", "wallet:0x222"],
        edgeIds=["edge_001"],
        cycleLength=2,
        summary="test cycle",
    )


# ---------------------------------------------------------------------------
# TestRankPaths
# ---------------------------------------------------------------------------


class TestRankPaths:
    def test_empty_input_returns_empty(self):
        assert rank_paths([]) == []

    def test_single_path_gets_rank_1(self):
        paths = [_make_path("p1", ["dex_touchpoint"])]
        result = rank_paths(paths)
        assert result[0].rank == 1

    def test_score_computed_from_weights(self):
        paths = [_make_path("p1", ["mixer_touchpoint", "rapid_movement"])]
        result = rank_paths(paths)
        expected = min(100, _WEIGHTS["mixer_touchpoint"] + _WEIGHTS["rapid_movement"])
        assert result[0].score == expected

    def test_higher_score_gets_lower_rank(self):
        paths = [
            _make_path("p1", ["dex_touchpoint"]),          # score=5
            _make_path("p2", ["mixer_touchpoint"]),         # score=40
            _make_path("p3", ["rapid_movement"]),           # score=25
        ]
        result = rank_paths(paths)
        assert result[0].id == "p2"  # highest score → rank 1
        assert result[1].id == "p3"
        assert result[2].id == "p1"

    def test_ranks_are_contiguous_from_1(self):
        paths = [_make_path(f"p{i}", ["dex_touchpoint"]) for i in range(5)]
        result = rank_paths(paths)
        assert [p.rank for p in result] == [1, 2, 3, 4, 5]

    def test_unknown_reason_code_contributes_zero(self):
        paths = [_make_path("p1", ["totally_unknown_signal"])]
        result = rank_paths(paths)
        assert result[0].score == 0

    def test_score_clamped_to_100(self):
        """All signals together could exceed 100; must clamp."""
        all_codes = list(_WEIGHTS.keys())
        paths = [_make_path("p1", all_codes)]
        result = rank_paths(paths)
        assert result[0].score <= 100

    def test_score_never_negative(self):
        paths = [_make_path("p1", [])]
        result = rank_paths(paths)
        assert result[0].score >= 0

    def test_original_paths_not_mutated(self):
        """rank_paths should return new objects, not mutate in place."""
        original = _make_path("p1", ["dex_touchpoint"])
        rank_paths([original])
        assert original.rank == 1   # initial placeholder unchanged
        assert original.score == 0


# ---------------------------------------------------------------------------
# TestComputeRiskScore
# ---------------------------------------------------------------------------


class TestComputeRiskScore:
    def test_no_signals_returns_zero_low(self):
        score, level = compute_risk_score([], [], [])
        assert score == 0
        assert level == "low"

    def test_level_low_threshold(self):
        _, level = compute_risk_score([], [], [])
        assert level == "low"

    def test_level_critical_from_top_path(self):
        """A path with score=100 contributes 60 points → level high or critical."""
        top_path = _make_path("p1", list(_WEIGHTS.keys()))  # clamped to 100
        ranked = rank_paths([top_path])
        score, level = compute_risk_score(ranked, [], [])
        assert score >= 50
        assert level in {"high", "critical"}

    def test_circular_flows_add_points(self):
        base_score, _ = compute_risk_score([], [], [])
        cycle_score, _ = compute_risk_score([], [_make_cycle("c1")], [])
        assert cycle_score > base_score

    def test_circular_flows_capped_at_30(self):
        """Even 10 cycles should not add more than 30 points."""
        cycles = [_make_cycle(f"c{i}") for i in range(10)]
        score, _ = compute_risk_score([], cycles, [])
        assert score <= 30

    def test_high_severity_finding_adds_points(self):
        base_score, _ = compute_risk_score([], [], [])
        finding_score, _ = compute_risk_score(
            [], [], [{"severity": "high"}]
        )
        assert finding_score > base_score

    def test_low_severity_finding_does_not_add_points(self):
        base_score, _ = compute_risk_score([], [], [])
        finding_score, _ = compute_risk_score(
            [], [], [{"severity": "low"}]
        )
        assert finding_score == base_score

    def test_findings_capped_at_10_points(self):
        """Even 20 high-severity findings should not add more than 10 points."""
        many_findings = [{"severity": "critical"} for _ in range(20)]
        score, _ = compute_risk_score([], [], many_findings)
        assert score <= 10

    def test_score_always_in_range(self):
        """Score must always be in [0, 100] regardless of inputs."""
        cycles = [_make_cycle(f"c{i}") for i in range(100)]
        findings = [{"severity": "critical"} for _ in range(100)]
        paths_input = [_make_path(f"p{i}", list(_WEIGHTS.keys())) for i in range(10)]
        ranked = rank_paths(paths_input)
        score, _ = compute_risk_score(ranked, cycles, findings)
        assert 0 <= score <= 100

    def test_level_thresholds_are_correct(self):
        # We can't set score directly, but we can verify threshold mapping
        # by constructing inputs that produce known score ranges.
        # Score = 0 → low
        score, level = compute_risk_score([], [], [])
        assert level == "low"

    def test_result_is_deterministic(self):
        """Same inputs must always produce the same output."""
        cycles = [_make_cycle("c1")]
        findings = [{"severity": "high"}]
        paths_input = [_make_path("p1", ["dex_touchpoint"])]
        ranked = rank_paths(paths_input)
        r1 = compute_risk_score(ranked, cycles, findings)
        r2 = compute_risk_score(ranked, cycles, findings)
        assert r1 == r2
