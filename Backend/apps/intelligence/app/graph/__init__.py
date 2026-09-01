"""
app/graph/__init__.py
─────────────────────
Public API for the graph module.
"""
from app.graph.builder import build_graph, get_root_node_id

__all__ = ["build_graph", "get_root_node_id"]
