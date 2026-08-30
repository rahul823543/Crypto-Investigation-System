"""
tests/conftest.py
─────────────────
Shared pytest fixtures for Phase 1 (schema + API tests).

The `minimal_valid_payload` fixture is the canonical reference request —
share this with Role B as the smoke-test body for intelligence.client.ts.

Phase 5 will extend this file with synthetic laundering scenario fixtures
loaded from tests/fixtures/*.json.
"""
from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import create_app

# ---------------------------------------------------------------------------
# ASGI test client
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def client():
    """
    In-process ASGI test client — no network, no port, instant startup.
    Uses a fresh app instance per test to avoid state bleed.
    """
    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as ac:
        yield ac


# ---------------------------------------------------------------------------
# Canonical minimal valid payload
# (share with Role B as the intelligence.client.ts smoke-test body)
# ---------------------------------------------------------------------------

MINIMAL_VALID_PAYLOAD: dict = {
    "caseId": "case_phase1_test",
    "analysisRequestId": "req_001",
    "rootAddress": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "maxDepth": 2,
    "nodes": [
        {
            "id": "wallet:0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "address": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "type": "wallet",
            "labels": ["root"],
            "riskLevel": "medium",
            "totalInUsd": 5000.0,
            "totalOutUsd": 4500.0,
        },
        {
            "id": "wallet:0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            "address": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            "type": "wallet",
            "labels": [],
            "riskLevel": "low",
            "totalInUsd": 2500.0,
            "totalOutUsd": 0.0,
        },
    ],
    "edges": [
        {
            "id": "edge:0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab:0",
            "from": "wallet:0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "to": "wallet:0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            "transactionHash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
            "asset": "USDC",
            "amount": "2500.00",
            "amountUsd": 2500.0,
            "timestamp": "2026-08-21T10:00:00.000Z",
            "hopDepth": 1,
            "riskLevel": "medium",
        }
    ],
    "transactions": [
        {
            "id": "tx_001",
            "caseId": "case_phase1_test",
            "hash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
            "chainId": 80002,
            "blockNumber": 123456,
            "from": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "to": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            "asset": "USDC",
            "tokenAddress": "0x1234567890123456789012345678901234567890",
            "amount": "2500.00",
            "amountUsd": 2500.0,
            "timestamp": "2026-08-21T10:00:00.000Z",
            "transferType": "erc20",
            "method": "transfer",
        }
    ],
    "basicFindings": [],
}


@pytest.fixture
def minimal_valid_payload() -> dict:
    """A complete, structurally-valid POST /v1/analyze payload."""
    import copy
    return copy.deepcopy(MINIMAL_VALID_PAYLOAD)
