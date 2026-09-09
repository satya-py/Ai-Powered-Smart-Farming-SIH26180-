"""Disease and combined detection endpoints."""

from __future__ import annotations

import logging

from fastapi import APIRouter, File, HTTPException, UploadFile

from backend.config import get_settings
from backend.services.disease_service import get_disease_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["detection"])

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/bmp",
}


async def _read_validated_image(file: UploadFile) -> bytes:
    settings = get_settings()

    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported image type: {file.content_type}. "
                   f"Allowed: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}",
        )

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    if len(raw) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Image exceeds {settings.max_upload_mb} MB limit",
        )

    return raw


@router.post("/api/disease/detect")
async def detect_disease(file: UploadFile = File(...)):
    """Run crop disease detection on an uploaded leaf image."""
    try:
        raw = await _read_validated_image(file)
        service = get_disease_service()
        return service.detect_from_bytes(raw)
    except FileNotFoundError as exc:
        logger.error("Missing model asset: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Disease detection failed")
        raise HTTPException(status_code=500, detail="Disease detection failed") from exc


@router.post("/api/pests/detect")
async def detect_pests(file: UploadFile = File(...)):
    """Run multi-object pest detection on an uploaded image."""
    from backend.services.pest_service import get_pest_service
    
    try:
        raw = await _read_validated_image(file)
        service = get_pest_service()
        result, _annotated_img = service.detect_from_bytes(raw)
        return result
    except Exception as exc:
        logger.exception("Pest detection failed")
        raise HTTPException(status_code=500, detail="Pest detection failed") from exc


@router.post("/api/detect/image")
async def detect_combined(file: UploadFile = File(...)):
    """Run combined disease and pest detection on an uploaded image, returning standardized output."""
    from backend.services.pest_service import get_pest_service
    from backend.schemas.detection import (
        FarmObservationResponse, FieldInfo, DiseaseSummary, PestSummary,
        EnvironmentSummary, RiskSummary, AdvisorySummary
    )
    
    try:
        raw = await _read_validated_image(file)
        
        # Run disease detection
        disease_service = get_disease_service()
        disease_res = disease_service.detect_from_bytes(raw)
        
        # Run pest detection
        pest_service = get_pest_service()
        pest_res, _ = pest_service.detect_from_bytes(raw)
        
        # Fetch mock sensor data
        from backend.sensors.sensor_manager import get_sensor_provider
        sensor_provider = get_sensor_provider()
        env_data = sensor_provider.read_all()
        
        # Build component summaries
        disease_summary = DiseaseSummary(
            detected=disease_res.disease.detected,
            name=disease_res.disease.class_name,
            confidence=disease_res.disease.confidence,
            severity=disease_res.disease.severity
        )
        
        pest_summary = PestSummary(
            detected=pest_res.total_pests > 0,
            total=pest_res.total_pests,
            counts=pest_res.pest_counts,
            pressure=pest_res.pest_pressure
        )
        
        env_summary = EnvironmentSummary(
            temperature=env_data.get("temperature"),
            humidity=env_data.get("humidity"),
            soil_moisture=env_data.get("soil_moisture"),
            light=env_data.get("light"),
            rainfall=env_data.get("rainfall"),
            leaf_wetness=env_data.get("leaf_wetness")
        )
        
        field_info = FieldInfo(
            id=1,
            name="Demo Field",
            crop=disease_res.disease.crop if disease_res.disease.detected else "Unknown"
        )
        
        # Run Fusion Engine
        from backend.services.fusion_service import get_fusion_service
        fusion_service = get_fusion_service()
        
        return fusion_service.fuse_observation(
            disease_summary=disease_summary,
            pest_summary=pest_summary,
            env_summary=env_summary,
            field_info=field_info
        )
        
    except Exception as exc:
        logger.exception("Combined detection failed")
        raise HTTPException(status_code=500, detail="Combined detection failed") from exc

