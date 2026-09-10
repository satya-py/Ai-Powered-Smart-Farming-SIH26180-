"""Health check endpoints."""

from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import text

from backend.config import get_settings
from backend.database.database import engine
from backend.models.disease_model import get_disease_model_loader
from backend.services.weather_service import get_weather_service

router = APIRouter(tags=["health"])


@router.get("/api/health")
def health_check():
    settings = get_settings()
    loader = get_disease_model_loader()

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "status": "ok",
        "service": "Smart Farming Assistant",
        "disease_model_loaded": loader.is_loaded,
        "device": str(loader.device),
        "checkpoint": str(settings.disease_model_ckpt),
        "checkpoint_exists": settings.disease_model_ckpt.exists(),
        "classes_json_exists": settings.classes_json.exists(),
        "database_reachable": db_ok,
        "weather_live": get_weather_service().enabled,
    }
