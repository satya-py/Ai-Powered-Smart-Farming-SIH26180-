"""Field management, dashboard overview, alerts, risk, weather and irrigation."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field as PydanticField
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.database.database import get_db
from backend.database.models import Farm, Field, Observation
from backend.schemas.detection import (
    DiseaseSummary,
    EnvironmentSummary,
    PestSummary,
)
from backend.services.alert_service import get_alert_service
from backend.services.irrigation_service import get_irrigation_service
from backend.services.risk_service import get_risk_service
from backend.services.weather_service import get_weather_service
from backend.sensors.sensor_manager import get_sensor_provider

logger = logging.getLogger(__name__)

router = APIRouter(tags=["field"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _latest(db: Session, field_id: int) -> Optional[Observation]:
    return (
        db.query(Observation)
        .filter(Observation.field_id == field_id)
        .order_by(Observation.timestamp.desc())
        .first()
    )


def _require_field(db: Session, field_id: int) -> Field:
    field = db.query(Field).filter(Field.id == field_id).first()
    if field is None:
        raise HTTPException(status_code=404, detail=f"Field {field_id} not found")
    return field


def _loads(raw: Optional[str], default):
    if not raw:
        return default
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return default


def _risk_from_observation(obs: Optional[Observation]):
    """Recompute the risk breakdown from a stored observation."""
    if obs is None:
        return None
    disease = DiseaseSummary(
        detected=bool(obs.disease_detected),
        name=obs.disease_name or "None",
        confidence=obs.disease_confidence or 0.0,
    )
    pests = PestSummary(
        detected=bool(obs.pest_detected),
        total=obs.total_pests or 0,
        counts=_loads(obs.pest_counts_json, {}),
        pressure=obs.pest_pressure or "LOW",
    )
    env = EnvironmentSummary(
        temperature=obs.temperature,
        humidity=obs.humidity,
        soil_moisture=obs.soil_moisture,
        light=obs.light,
        rainfall=obs.rainfall,
    )
    return get_risk_service().calculate_risk(disease=disease, pests=pests, env=env)


# ── Fields ────────────────────────────────────────────────────────────────────

class FieldCreate(BaseModel):
    name: str = PydanticField(min_length=1, max_length=100)
    crop: str = PydanticField(min_length=1, max_length=100)
    farm_id: Optional[int] = None


class FieldUpdate(BaseModel):
    name: Optional[str] = PydanticField(default=None, min_length=1, max_length=100)
    crop: Optional[str] = PydanticField(default=None, min_length=1, max_length=100)


def _field_payload(db: Session, field: Field) -> Dict[str, Any]:
    obs = _latest(db, field.id)
    return {
        "id": field.id,
        "name": field.name,
        "crop": field.crop,
        "farm_id": field.farm_id,
        "last_updated": obs.timestamp.isoformat() if obs and obs.timestamp else None,
        "overall_risk": obs.overall_risk if obs else None,
        "soil_moisture": obs.soil_moisture if obs else None,
        "temperature": obs.temperature if obs else None,
        "alerts": len(get_alert_service().build_alerts(obs)),
    }


@router.get("/api/fields")
def list_fields(db: Session = Depends(get_db)):
    fields = db.query(Field).order_by(Field.id.asc()).all()
    return [_field_payload(db, f) for f in fields]


@router.post("/api/fields", status_code=201)
def create_field(payload: FieldCreate, db: Session = Depends(get_db)):
    farm_id = payload.farm_id
    if farm_id is None:
        farm = db.query(Farm).order_by(Farm.id.asc()).first()
        if farm is None:
            farm = Farm(name="Demo Farm", location="Smart Farm HQ")
            db.add(farm)
            db.commit()
            db.refresh(farm)
        farm_id = farm.id
    elif db.query(Farm).filter(Farm.id == farm_id).first() is None:
        raise HTTPException(status_code=404, detail=f"Farm {farm_id} not found")

    field = Field(farm_id=farm_id, name=payload.name, crop=payload.crop)
    db.add(field)
    db.commit()
    db.refresh(field)
    return _field_payload(db, field)


@router.patch("/api/fields/{field_id}")
def update_field(field_id: int, payload: FieldUpdate, db: Session = Depends(get_db)):
    field = _require_field(db, field_id)
    if payload.name is not None:
        field.name = payload.name
    if payload.crop is not None:
        field.crop = payload.crop
    db.commit()
    db.refresh(field)
    return _field_payload(db, field)


@router.delete("/api/fields/{field_id}", status_code=204)
def delete_field(field_id: int, db: Session = Depends(get_db)):
    field = _require_field(db, field_id)
    db.query(Observation).filter(Observation.field_id == field_id).delete()
    db.delete(field)
    db.commit()
    return None


# ── Dashboard overview ────────────────────────────────────────────────────────

@router.get("/api/overview")
def farm_overview(db: Session = Depends(get_db)):
    """Aggregate summary powering the dashboard landing page."""
    fields = db.query(Field).order_by(Field.id.asc()).all()
    alert_service = get_alert_service()

    total_alerts = 0
    risk_rank = {"LOW": 0, "MODERATE": 1, "HIGH": 2, "CRITICAL": 3}
    worst = "LOW"
    last_updated: Optional[datetime] = None

    for field in fields:
        obs = _latest(db, field.id)
        total_alerts += len(alert_service.build_alerts(obs))
        if obs:
            if risk_rank.get(obs.overall_risk or "LOW", 0) > risk_rank.get(worst, 0):
                worst = obs.overall_risk or worst
            if obs.timestamp and (last_updated is None or obs.timestamp > last_updated):
                last_updated = obs.timestamp

    health_by_risk = {
        "LOW": "Good",
        "MODERATE": "Fair",
        "HIGH": "Poor",
        "CRITICAL": "Critical",
    }

    return {
        "total_fields": len(fields),
        "active_alerts": total_alerts,
        "overall_risk": worst,
        "field_health": health_by_risk.get(worst, "Unknown"),
        "last_updated": last_updated.isoformat() if last_updated else None,
        "weather": get_weather_service().current(),
    }


@router.get("/api/overview/recent-detections")
def recent_detections(limit: int = 5, db: Session = Depends(get_db)):
    """Most recent observations that carried a disease or pest finding."""
    limit = max(1, min(limit, 50))
    rows = (
        db.query(Observation)
        .filter((Observation.disease_detected == True) | (Observation.total_pests > 0))  # noqa: E712
        .order_by(Observation.timestamp.desc())
        .limit(limit)
        .all()
    )

    detections: List[Dict[str, Any]] = []
    for obs in rows:
        if obs.disease_detected and obs.disease_name:
            detections.append(
                {
                    "type": "disease",
                    "name": obs.disease_name,
                    "confidence": obs.disease_confidence,
                    "timestamp": obs.timestamp.isoformat() if obs.timestamp else None,
                }
            )
        for pest_name, count in _loads(obs.pest_counts_json, {}).items():
            detections.append(
                {
                    "type": "pest",
                    "name": pest_name,
                    "count": count,
                    "timestamp": obs.timestamp.isoformat() if obs.timestamp else None,
                }
            )
    return detections[:limit]


# ── Risk ──────────────────────────────────────────────────────────────────────

@router.get("/api/risk/{field_id}")
def get_risk(field_id: int, db: Session = Depends(get_db)):
    _require_field(db, field_id)
    obs = _latest(db, field_id)
    risk = _risk_from_observation(obs)
    if risk is None:
        raise HTTPException(status_code=404, detail="No observations found for this field.")

    settings = get_settings()

    def pct(value: Optional[float], threshold: float, invert: bool = False) -> int:
        if value is None:
            return 0
        ratio = (threshold - value) / threshold if invert else value / threshold
        return int(max(0.0, min(1.0, ratio)) * 100)

    factors = {
        "pest_pressure": pct(obs.total_pests, settings.pest_high_pressure_threshold),
        "water_stress": pct(obs.soil_moisture, settings.target_soil_moisture, invert=True),
        "nutrient_deficiency": pct(obs.nitrogen, 100.0, invert=True),
        "disease_pressure": int((obs.disease_confidence or 0.0) * 100)
        if obs.disease_detected
        else 0,
        "weather_impact": pct(obs.temperature, settings.high_temp_threshold),
    }

    score_by_level = {"LOW": 25, "MODERATE": 50, "HIGH": 72, "CRITICAL": 90}

    return {
        "timestamp": obs.timestamp.isoformat() if obs.timestamp else None,
        **risk.model_dump(),
        "overall_score": score_by_level.get(risk.overall_risk or "LOW", 25),
        "factors": factors,
    }


# ── Alerts ────────────────────────────────────────────────────────────────────

@router.get("/api/alerts/{field_id}")
def get_alerts(field_id: int, db: Session = Depends(get_db)):
    _require_field(db, field_id)
    obs = _latest(db, field_id)
    alerts = get_alert_service().build_alerts(obs)
    return {
        "field_id": field_id,
        "total": len(alerts),
        "alerts": alerts,
    }


# ── Sensors ───────────────────────────────────────────────────────────────────

@router.get("/api/sensors/current")
def current_sensors():
    """Live sensor snapshot without touching the database."""
    sensor = get_sensor_provider()
    return {
        "connected": sensor.is_connected(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": sensor.read_all(),
        "nutrients": sensor.read_nutrients(),
    }


# ── Weather ───────────────────────────────────────────────────────────────────

@router.get("/api/weather/current")
def weather_current():
    return get_weather_service().current()


@router.get("/api/weather/forecast")
def weather_forecast(days: int = 5):
    return get_weather_service().forecast(days)


# ── Irrigation ────────────────────────────────────────────────────────────────

@router.get("/api/irrigation/{field_id}")
def irrigation_advice(field_id: int, db: Session = Depends(get_db)):
    _require_field(db, field_id)
    obs = _latest(db, field_id)
    if obs is None:
        raise HTTPException(status_code=404, detail="No observations found for this field.")

    forecast = get_weather_service().forecast(3)
    upcoming_rain = sum(day.get("rain_mm", 0.0) for day in forecast["forecast"])

    advice = get_irrigation_service().recommend(
        soil_moisture=obs.soil_moisture,
        temperature=obs.temperature,
        humidity=obs.humidity,
        rainfall_forecast_mm=upcoming_rain,
    )
    return {"irrigation": advice, "weather": forecast}


# ── Reports ───────────────────────────────────────────────────────────────────

@router.get("/api/reports/{field_id}")
def field_report(field_id: int, days: int = 7, db: Session = Depends(get_db)):
    """Summary statistics over a window, for the Reports page."""
    if days < 1 or days > 365:
        raise HTTPException(status_code=422, detail="days must be between 1 and 365")

    field = _require_field(db, field_id)
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)

    rows = (
        db.query(Observation)
        .filter(Observation.field_id == field_id, Observation.timestamp >= cutoff)
        .order_by(Observation.timestamp.asc())
        .all()
    )

    def average(attr: str) -> Optional[float]:
        values = [getattr(r, attr) for r in rows if getattr(r, attr) is not None]
        return round(sum(values) / len(values), 1) if values else None

    disease_rows = [r for r in rows if r.disease_detected and r.disease_name]
    disease_counts: Dict[str, int] = {}
    for row in disease_rows:
        disease_counts[row.disease_name] = disease_counts.get(row.disease_name, 0) + 1

    return {
        "field": {"id": field.id, "name": field.name, "crop": field.crop},
        "period_days": days,
        "observations": len(rows),
        "averages": {
            "temperature": average("temperature"),
            "humidity": average("humidity"),
            "soil_moisture": average("soil_moisture"),
            "nitrogen": average("nitrogen"),
            "phosphorus": average("phosphorus"),
            "potassium": average("potassium"),
            "ph": average("ph"),
        },
        "disease_events": len(disease_rows),
        "disease_breakdown": disease_counts,
        "total_pests": sum(r.total_pests or 0 for r in rows),
        "risk_distribution": {
            level: sum(1 for r in rows if (r.overall_risk or "LOW") == level)
            for level in ("LOW", "MODERATE", "HIGH", "CRITICAL")
        },
    }
