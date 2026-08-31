# Intelligence Service

Python FastAPI microservice for the On-Chain Forensic Triage Engine.

## Quick Start

```bash
cp .env.example .env
poetry install
poetry run uvicorn app.main:app --port 8001 --reload
```

## Run Tests

```bash
poetry run pytest tests/ -v
```

## Endpoints

- `GET /health` — liveness check
- `POST /v1/analyze` — forensic graph analysis
- `GET /docs` — interactive Swagger UI
