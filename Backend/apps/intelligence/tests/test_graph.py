"""
tests/test_graph.py
───────────────────
Phase 2: Unit tests for app/graph/builder.py.

Tests are organised into four classes:
  TestBuildGraphStructure    — node/edge counts, graph type, metadata
  TestBuildGraphAttributes   — node and edge attribute fidelity
  TestBuildGraphRootNode     — get_root_node_id helper
  TestBuildGraphSeededCase   — end-to-end parse of the seeded demo fixture
                               from Backend/apps/api/datasets/seeded-case.json

These tests run WITHOUT starting the HTTP server — they exercise the graph
layer in isolation. Fast (< 0.1 s) and deterministic.
"""
from __future__ import annotations

import json
from pathlib import Path

import networkx as nx
import pytest
from pydantic import ValidationError

from app.graph.builder import build_graph, get_root_node_id
from app.schemas.request import AnalysisRequest
from tests.conftest import MINIMAL_VALID_PAYLOAD

# ---------------------------------------------------------------------------
# Seeded fixture helpers
# ---------------------------------------------------------------------------

_SEEDED_CASE_PATH = (
    Path(__file__).parents[2]
    / "api"
    / "datasets"
    / "seeded-case.json"
)


def _load_seeded_request() -> AnalysisRequest:
    """Load seeded-case.json and return it as a validated AnalysisRequest."""
    with _SEEDED_CASE_PATH.open(encoding="utf-8") as f:
        data = json.load(f)
    return AnalysisRequest.model_validate(
        {
            "caseId": data["case"]["id"],
            "analysisRequestId": "seed_req_phase2",
            "rootAddress": data["case"]["rootAddress"],
            "maxDepth": 2,
            "nodes": data["graph"]["nodes"],
            "edges": data["graph"]["edges"],
            "transactions": data["transactions"],
            "basicFindings": data["basicFindings"],
        }
    )


# ---------------------------------------------------------------------------
# TestBuildGraphStructure
# ---------------------------------------------------------------------------


class TestBuildGraphStructure:
    def test_returns_digraph(self):
        """build_graph must return a directed graph."""
        req = AnalysisRequest.model_validate(MINIMAL_VALID_PAYLOAD)
        G = build_graph(req)
        assert isinstance(G, nx.DiGraph)

    def test_node_count_matches_request(self):
        req = AnalysisRequest.model_validate(MINIMAL_VALID_PAYLOAD)
        G = build_graph(req)
        assert G.number_of_nodes() == len(req.nodes)

    def test_edge_count_matches_request(self):
        req = AnalysisRequest.model_validate(MINIMAL_VALID_PAYLOAD)
        G = build_graph(req)
        assert G.number_of_edges() == len(req.edges)

    def test_empty_graph_produces_empty_digraph(self):
        """Empty nodes/edges must not raise — returns a valid empty DiGraph."""
        payload = {
            **MINIMAL_VALID_PAYLOAD,
            "nodes": [],
            "edges": [],
            "transactions": [],
        }
        req = AnalysisRequest.model_validate(payload)
        G = build_graph(req)
        assert G.number_of_nodes() == 0
        assert G.number_of_edges() == 0

    def test_graph_metadata_case_id(self):
        req = AnalysisRequest.model_validate(MINIMAL_VALID_PAYLOAD)
        G = build_graph(req)
        assert G.graph["case_id"] == req.case_id

    def test_graph_metadata_root_address(self):
        req = AnalysisRequest.model_validate(MINIMAL_VALID_PAYLOAD)
        G = build_graph(req)
        # root_address is normalised to lowercase by the schema validator
        assert G.graph["root_address"] == req.root_address

    def test_graph_metadata_max_depth(self):
        req = AnalysisRequest.model_validate(MINIMAL_VALID_PAYLOAD)
        G = build_graph(req)
        assert G.graph["max_depth"] == req.max_depth

    def test_node_ids_are_stable_role_c_format(self):
        """All node IDs must follow the 'type:0x...' stable-ID format."""
        req = AnalysisRequest.model_validate(MINIMAL_VALID_PAYLOAD)
        G = build_graph(req)
        for node_id in G.nodes:
            assert ":" in node_id, f"Node ID {node_id!r} missing ':' separator"

    def test_graph_is_directed(self):
        """Edges must be directed (from_node → to_node)."""
        req = AnalysisRequest.model_validate(MINIMAL_VALID_PAYLOAD)
        G = build_graph(req)
        # Add a reverse edge check — original edge direction must exist
        from_id = req.edges[0].from_node
        to_id = req.edges[0].to_node
        assert G.has_edge(from_id, to_id)
        # DiGraph does NOT auto-create the reverse edge
        assert not G.has_edge(to_id, from_id)


# ---------------------------------------------------------------------------
# TestBuildGraphAttributes
# ---------------------------------------------------------------------------


class TestBuildGraphAttributes:
    def test_node_address_attribute_preserved(self):
        req = AnalysisRequest.model_validate(MINIMAL_VALID_PAYLOAD)
        G = build_graph(req)
        node = req.nodes[0]
        assert G.nodes[node.id]["address"] == node.address

    def test_node_type_attribute_preserved(self):
        req = AnalysisRequest.model_validate(MINIMAL_VALID_PAYLOAD)
        G = build_graph(req)
        node = req.nodes[0]
        assert G.nodes[node.id]["type"] == node.type

    def test_node_labels_attribute_preserved(self):
        req = AnalysisRequest.model_validate(MINIMAL_VALID_PAYLOAD)
        G = build_graph(req)
        # First node has labels=["root"] in MINIMAL_VALID_PAYLOAD
        root_node = req.nodes[0]
        assert G.nodes[root_node.id]["labels"] == root_node.labels

    def test_node_risk_level_preserved(self):
        req = AnalysisRequest.model_validate(MINIMAL_VALID_PAYLOAD)
        G = build_graph(req)
        node = req.nodes[0]
        assert G.nodes[node.id]["risk_level"] == node.risk_level

    def test_node_total_in_usd_preserved(self):
        req = AnalysisRequest.model_validate(MINIMAL_VALID_PAYLOAD)
        G = build_graph(req)
        node = req.nodes[0]
        assert G.nodes[node.id]["total_in_usd"] == node.total_in_usd

    def test_edge_id_preserved(self):
        req = AnalysisRequest.model_validate(MINIMAL_VALID_PAYLOAD)
        G = build_graph(req)
        edge = req.edges[0]
        assert G.edges[edge.from_node, edge.to_node]["id"] == edge.id

    def test_edge_transaction_hash_preserved(self):
        req = AnalysisRequest.model_validate(MINIMAL_VALID_PAYLOAD)
        G = build_graph(req)
        edge = req.edges[0]
        assert G.edges[edge.from_node, edge.to_node]["transaction_hash"] == edge.transaction_hash

    def test_edge_asset_preserved(self):
        req = AnalysisRequest.model_validate(MINIMAL_VALID_PAYLOAD)
        G = build_graph(req)
        edge = req.edges[0]
        assert G.edges[edge.from_node, edge.to_node]["asset"] == edge.asset

    def test_edge_amount_usd_preserved(self):
        req = AnalysisRequest.model_validate(MINIMAL_VALID_PAYLOAD)
        G = build_graph(req)
        edge = req.edges[0]
        assert G.edges[edge.from_node, edge.to_node]["amount_usd"] == edge.amount_usd

    def test_edge_hop_depth_preserved(self):
        req = AnalysisRequest.model_validate(MINIMAL_VALID_PAYLOAD)
        G = build_graph(req)
        edge = req.edges[0]
        assert G.edges[edge.from_node, edge.to_node]["hop_depth"] == edge.hop_depth


# ---------------------------------------------------------------------------
# TestBuildGraphRootNode
# ---------------------------------------------------------------------------


class TestBuildGraphRootNode:
    def test_root_node_found_in_minimal_payload(self):
        req = AnalysisRequest.model_validate(MINIMAL_VALID_PAYLOAD)
        G = build_graph(req)
        root_id = get_root_node_id(G)
        assert root_id is not None

    def test_root_node_address_matches(self):
        req = AnalysisRequest.model_validate(MINIMAL_VALID_PAYLOAD)
        G = build_graph(req)
        root_id = get_root_node_id(G)
        assert G.nodes[root_id]["address"].lower() == req.root_address.lower()

    def test_root_node_returns_none_for_empty_graph(self):
        """No nodes → root address cannot be found."""
        payload = {
            **MINIMAL_VALID_PAYLOAD,
            "nodes": [],
            "edges": [],
            "transactions": [],
        }
        req = AnalysisRequest.model_validate(payload)
        G = build_graph(req)
        assert get_root_node_id(G) is None

    def test_root_node_lookup_is_case_insensitive(self):
        """Root address is lowercased by the validator — lookup must still work."""
        req = AnalysisRequest.model_validate(MINIMAL_VALID_PAYLOAD)
        G = build_graph(req)
        # Manually uppercase the stored address to test case-insensitive matching
        root_id = get_root_node_id(G)
        G.nodes[root_id]["address"] = G.nodes[root_id]["address"].upper()
        assert get_root_node_id(G) is not None


# ---------------------------------------------------------------------------
# TestBuildGraphSeededCase  (end-to-end with real fixture)
# ---------------------------------------------------------------------------


class TestBuildGraphSeededCase:
    @pytest.fixture(scope="class")
    def seeded_graph(self) -> tuple[nx.DiGraph, AnalysisRequest]:
        req = _load_seeded_request()
        return build_graph(req), req

    def test_seeded_fixture_file_exists(self):
        assert _SEEDED_CASE_PATH.exists(), (
            f"Seeded fixture not found at {_SEEDED_CASE_PATH}. "
            "Ensure the Backend/apps/api/datasets/ directory is present."
        )

    def test_seeded_graph_has_correct_node_count(self, seeded_graph):
        G, req = seeded_graph
        # seeded-case.json has 6 nodes
        assert G.number_of_nodes() == 6
        assert G.number_of_nodes() == len(req.nodes)

    def test_seeded_graph_has_correct_edge_count(self, seeded_graph):
        G, req = seeded_graph
        # seeded-case.json has 5 edges (one per transaction)
        assert G.number_of_edges() == 5
        assert G.number_of_edges() == len(req.edges)

    def test_seeded_root_node_found(self, seeded_graph):
        G, req = seeded_graph
        root_id = get_root_node_id(G)
        assert root_id == "wallet:0x1234567890abcdef1234567890abcdef12345678"

    def test_seeded_root_has_four_direct_successors(self, seeded_graph):
        """Root fans out to 3 wallets + 1 DEX router = 4 outgoing edges."""
        G, _ = seeded_graph
        root_id = get_root_node_id(G)
        assert G.out_degree(root_id) == 4

    def test_seeded_dex_node_classified_correctly(self, seeded_graph):
        G, _ = seeded_graph
        dex_id = "dex:0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff"
        assert G.has_node(dex_id)
        assert G.nodes[dex_id]["type"] == "dex"
        assert "quickswap" in G.nodes[dex_id]["labels"]

    def test_seeded_second_hop_edge_exists(self, seeded_graph):
        """Wallet A → Wallet D is a second-hop edge (hopDepth=2)."""
        G, _ = seeded_graph
        from_id = "wallet:0x2222222222222222222222222222222222222222"
        to_id   = "wallet:0x5555555555555555555555555555555555555555"
        assert G.has_edge(from_id, to_id)
        assert G.edges[from_id, to_id]["hop_depth"] == 2

    def test_seeded_graph_case_id_metadata(self, seeded_graph):
        G, _ = seeded_graph
        assert G.graph["case_id"] == "case_seed_demo"

    def test_seeded_graph_root_address_metadata(self, seeded_graph):
        G, _ = seeded_graph
        assert G.graph["root_address"] == "0x1234567890abcdef1234567890abcdef12345678"
