"""
app/main.py
───────────
FastAPI application factory.

`create_app()` is kept separate from the module-level `app` instance so
tests can call `create_app()` directly if they need a fresh application
instance with overridden settings.

The module-level `app = create_app()` is what Uvicorn loads when you run:
    uvicorn app.main:app --reload
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import settings


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    application = FastAPI(
        title="Forensic Intelligence Service",
        description=(
            "Python microservice for advanced on-chain forensic graph analysis. "
            "Accepts normalised wallet transaction graphs from the Fastify backend "
            "and returns ranked suspicious paths, circular-flow candidates, and a "
            "deterministic composite risk score."
        ),
        version=settings.engine_version,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # ------------------------------------------------------------------
    # CORS — allow the Fastify backend and React dev servers to call us
    # ------------------------------------------------------------------
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=False,
        allow_methods=["POST", "GET", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )

    # ------------------------------------------------------------------
    # Routers
    # ------------------------------------------------------------------
    application.include_router(router)

    return application


# Module-level app instance — entry point for Uvicorn
app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.intelligence_port,
        reload=True,
        log_level="info",
    )
