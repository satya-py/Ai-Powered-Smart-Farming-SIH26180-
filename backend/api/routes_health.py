"""Health check endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from backend.models.disease_model import get_disease_model_loader
from backend.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/api/health")
def health_check():
    settings = get_settings()
    loader = get_disease_model_loader()
    return {
        "status": "ok",
        "service": "Smart Farming Assistant",
        "disease_model_loaded": loader.is_loaded,
        "device": str(loader.device),
        "checkpoint": str(settings.disease_model_ckpt),
        "checkpoint_exists": settings.disease_model_ckpt.exists(),
    }
