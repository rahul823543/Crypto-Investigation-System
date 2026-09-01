# tests/fixtures/
# Phase 5 synthetic laundering scenario payloads go here.
# Each file is a complete valid POST /v1/analyze JSON body.
#
# Files added in Phase 5:
#   simple_fanout.json      — root → 5 wallets, fan-out laundering
#   circular_flow.json      — funds loop root → mixer → dex → root
#   dex_bridge_hop.json     — multi-hop through DEX then bridge
#   empty_graph.json        — zero nodes/edges edge case
