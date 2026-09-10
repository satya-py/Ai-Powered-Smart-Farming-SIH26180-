"""FastAPI application entry point."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.api.routes_detection import router as detection_router
from backend.api.routes_field import router as field_router
from backend.api.routes_health import router as health_router
from backend.api.routes_monitoring import router as monitoring_router
from backend.api.routes_nutrients import router as nutrient_router
from backend.config import get_settings
from backend.logging_config import setup_logging
from backend.models.disease_model import get_disease_model_loader

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    settings = get_settings()
    logger.info("Starting Smart Farming Assistant backend")
    logger.info("Checkpoint path: %s", settings.disease_model_ckpt)

    # Schema + seed data must exist before any request touches the database.
    try:
        from backend.database.init_db import init_db

        init_db()
    except Exception:
        logger.exception("Database initialization failed — DB endpoints will error")

    try:
        get_disease_model_loader().load()
        logger.info("Disease model pre-loaded at startup")
    except FileNotFoundError as exc:
        logger.warning("Disease model not loaded at startup: %s", exc)
    except Exception:
        logger.exception("Disease model failed to load at startup")

    if not settings.weather_api_key:
        logger.warning(
            "WEATHER_API_KEY is not set — weather endpoints will serve simulated data"
        )

    yield
    logger.info("Shutting down backend")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Smart Farming Assistant API",
        description="SIH 2026 — crop disease detection and field monitoring",
        version="0.2.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        """Return JSON instead of an empty response so the UI can show a message."""
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "path": request.url.path},
        )

    for router in (
        health_router,
        detection_router,
        monitoring_router,
        nutrient_router,
        field_router,
    ):
        app.include_router(router)

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "backend.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=False,
    )
