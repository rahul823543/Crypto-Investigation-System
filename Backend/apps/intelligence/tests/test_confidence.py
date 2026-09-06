"""
tests/test_confidence.py
─────────────────────────
Unit tests for app/traversal/confidence.py (v3 Phase 4).
"""
import pytest

from app.traversal.confidence import (
    combine_confidences,
    confidence_at_hop,
    is_below_threshold,
)


class TestConfidenceAtHop:
    def test_zero_hop_returns_base_confidence(self):
        assert confidence_at_hop(0.8, 0.65, 0) == 0.8

    def test_single_hop_decays_by_factor(self):
        assert confidence_at_hop(1.0, 0.65, 1) == 0.65

    def test_multi_hop_exponential_decay(self):
        # 1.0 * (0.65 ** 2) = 0.4225
        assert pytest.approx(confidence_at_hop(1.0, 0.65, 2)) == 0.4225

    def test_negative_hop_raises_value_error(self):
        with pytest.raises(ValueError):
            confidence_at_hop(1.0, 0.65, -1)

    def test_out_of_range_base_confidence_raises_value_error(self):
        with pytest.raises(ValueError):
            confidence_at_hop(1.5, 0.65, 1)
        with pytest.raises(ValueError):
            confidence_at_hop(-0.1, 0.65, 1)

    def test_out_of_range_decay_factor_raises_value_error(self):
        with pytest.raises(ValueError):
            confidence_at_hop(0.8, 1.2, 1)
        with pytest.raises(ValueError):
            confidence_at_hop(0.8, -0.2, 1)


class TestCombineConfidences:
    def test_empty_list_returns_zero(self):
        assert combine_confidences([]) == 0.0

    def test_single_element_returns_identical_value(self):
        assert pytest.approx(combine_confidences([0.7])) == 0.7

    def test_noisy_or_never_exceeds_one(self):
        # Even with multiple high signals, combined <= 1.0
        combined = combine_confidences([0.9, 0.9, 0.9])
        assert combined <= 1.0
        # 1 - (0.1 * 0.1 * 0.1) = 0.999
        assert pytest.approx(combined) == 0.999

    def test_corroboration_increases_score(self):
        c1 = combine_confidences([0.5])
        c2 = combine_confidences([0.5, 0.3])
        assert c2 > c1

    def test_out_of_range_raises_value_error(self):
        with pytest.raises(ValueError):
            combine_confidences([0.5, 1.2])
        with pytest.raises(ValueError):
            combine_confidences([-0.1, 0.5])


class TestIsBelowThreshold:
    def test_above_threshold_returns_false(self):
        # 1.0 * (0.65 ** 1) = 0.65 >= 0.15
        assert is_below_threshold(1.0, 0.65, 1, 0.15) is False

    def test_below_threshold_returns_true(self):
        # 1.0 * (0.65 ** 5) = 0.116 < 0.15
        assert is_below_threshold(1.0, 0.65, 5, 0.15) is True
