"""FastAPI application entry point."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes_detection import router as detection_router
from backend.api.routes_health import router as health_router
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

    try:
        get_disease_model_loader().load()
        logger.info("Disease model pre-loaded at startup")
    except FileNotFoundError as exc:
        logger.warning("Disease model not loaded at startup: %s", exc)

    yield
    logger.info("Shutting down backend")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Smart Farming Assistant API",
        description="SIH 2026 — crop disease detection and field monitoring",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(detection_router)
    
    from backend.api.routes_monitoring import router as monitoring_router
    app.include_router(monitoring_router)
    
    from backend.api.routes_nutrients import router as nutrient_router
    app.include_router(nutrient_router)

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
