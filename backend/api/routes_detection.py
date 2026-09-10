"""Disease, pest and combined detection endpoints."""

from __future__ import annotations

import base64
import io
import json
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.database.database import get_db
from backend.database.models import Field, Observation
from backend.schemas.detection import (
    DiseaseSummary,
    EnvironmentSummary,
    FieldInfo,
    PestSummary,
)
from backend.sensors.sensor_manager import get_sensor_provider
from backend.services.disease_service import get_disease_service
from backend.services.fusion_service import get_fusion_service
from backend.services.pest_service import get_pest_service

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


def _to_data_url(image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=85)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}"


@router.post("/api/disease/detect")
async def detect_disease(file: UploadFile = File(...)):
    """Run crop disease detection on an uploaded leaf image."""
    raw = await _read_validated_image(file)
    try:
        return get_disease_service().detect_from_bytes(raw)
    except FileNotFoundError as exc:
        logger.error("Missing disease model asset: %s", exc)
        raise HTTPException(
            status_code=503,
            detail=(
                "Disease model is unavailable. Place the ProtoPNet checkpoint at the "
                "path configured by DISEASE_MODEL_CKPT and restart the server."
            ),
        ) from exc
    except (OSError, ValueError) as exc:
        logger.warning("Could not decode uploaded image: %s", exc)
        raise HTTPException(status_code=400, detail="Could not decode the uploaded image") from exc
    except Exception as exc:
        logger.exception("Disease detection failed")
        raise HTTPException(status_code=500, detail="Disease detection failed") from exc


@router.post("/api/pests/detect")
async def detect_pests(
    file: UploadFile = File(...),
    annotated: bool = Query(
        False, description="Include the annotated image as a base64 data URL"
    ),
):
    """Run multi-object pest detection on an uploaded image."""
    raw = await _read_validated_image(file)
    try:
        result, annotated_img = get_pest_service().detect_from_bytes(raw)
    except ImportError as exc:
        logger.error("Pest model dependencies missing: %s", exc)
        raise HTTPException(
            status_code=503,
            detail=(
                "Pest model is unavailable. Install its dependencies: "
                "pip install ultralytics huggingface_hub opencv-python"
            ),
        ) from exc
    except (OSError, ValueError) as exc:
        logger.warning("Could not decode uploaded image: %s", exc)
        raise HTTPException(status_code=400, detail="Could not decode the uploaded image") from exc
    except Exception as exc:
        logger.exception("Pest detection failed")
        raise HTTPException(
            status_code=503,
            detail=(
                "Pest detection failed. The YOLO11 weights may not have downloaded — "
                "check the server logs and network access to Hugging Face."
            ),
        ) from exc

    payload = result.model_dump()
    if annotated:
        payload["annotated_image"] = _to_data_url(annotated_img)
    return payload


@router.post("/api/detect/image")
async def detect_combined(
    file: UploadFile = File(...),
    field_id: Optional[int] = Query(
        None, description="Persist the observation against this field"
    ),
    db: Session = Depends(get_db),
):
    """Run disease + pest detection, fuse with sensor data, and return a field state."""
    raw = await _read_validated_image(file)

    # Disease — degrade gracefully so a missing checkpoint does not kill the whole call.
    disease_summary = DiseaseSummary(
        detected=False, name="Unavailable", confidence=0.0, severity=None
    )
    crop = "Unknown"
    try:
        disease_res = get_disease_service().detect_from_bytes(raw)
        disease_summary = DiseaseSummary(
            detected=disease_res.disease.detected,
            name=disease_res.disease.class_name,
            confidence=disease_res.disease.confidence,
            severity=disease_res.disease.severity,
        )
        crop = disease_res.disease.crop
    except FileNotFoundError:
        logger.warning("Disease model unavailable for combined detection")
    except Exception:
        logger.exception("Disease branch of combined detection failed")

    # Pests — same treatment.
    pest_summary = PestSummary(detected=False, total=0, counts={}, pressure="LOW")
    try:
        pest_res, _ = get_pest_service().detect_from_bytes(raw)
        pest_summary = PestSummary(
            detected=pest_res.total_pests > 0,
            total=pest_res.total_pests,
            counts=pest_res.pest_counts,
            pressure=pest_res.pest_pressure,
        )
    except Exception:
        logger.exception("Pest branch of combined detection failed")

    if not disease_summary.detected and pest_summary.total == 0 and crop == "Unknown":
        raise HTTPException(
            status_code=503,
            detail="Both detection models are unavailable. Check the server logs.",
        )

    env_data = get_sensor_provider().read_all()
    env_summary = EnvironmentSummary(**env_data)

    field_name = "Demo Field"
    if field_id is not None:
        field = db.query(Field).filter(Field.id == field_id).first()
        if field is None:
            raise HTTPException(status_code=404, detail=f"Field {field_id} not found")
        field_name = field.name
        crop = field.crop or crop

    observation = get_fusion_service().fuse_observation(
        disease_summary=disease_summary,
        pest_summary=pest_summary,
        env_summary=env_summary,
        field_info=FieldInfo(id=field_id or 1, name=field_name, crop=crop),
    )

    if field_id is not None:
        nutrients = get_sensor_provider().read_nutrients()
        db.add(
            Observation(
                field_id=field_id,
                timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
                disease_detected=disease_summary.detected,
                disease_name=disease_summary.name,
                disease_confidence=disease_summary.confidence,
                pest_detected=pest_summary.detected,
                total_pests=pest_summary.total,
                pest_pressure=pest_summary.pressure,
                pest_counts_json=json.dumps(pest_summary.counts),
                temperature=env_data.get("temperature"),
                humidity=env_data.get("humidity"),
                soil_moisture=env_data.get("soil_moisture"),
                light=env_data.get("light"),
                rainfall=env_data.get("rainfall"),
                nitrogen=nutrients.get("nitrogen"),
                phosphorus=nutrients.get("phosphorus"),
                potassium=nutrients.get("potassium"),
                ph=nutrients.get("ph"),
                organic_carbon=nutrients.get("organic_carbon"),
                ec=nutrients.get("ec"),
                overall_risk=observation.risk.overall_risk,
                advisory_json=observation.advisory.model_dump_json(),
            )
        )
        db.commit()

    return observation
