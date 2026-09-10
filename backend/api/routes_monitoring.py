"""Monitoring, history and simulation endpoints."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.database.models import Field, Observation
from backend.schemas.detection import (
    DiseaseSummary,
    EnvironmentSummary,
    PestSummary,
)
from backend.sensors.sensor_manager import get_sensor_provider
from backend.services.nutrient_service import get_nutrient_service
from backend.services.risk_service import get_risk_service
from backend.services.advisory_service import get_advisory_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["monitoring"])


def _utcnow() -> datetime:
    """Naive UTC timestamp — matches the DateTime columns used by SQLAlchemy."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _require_field(db: Session, field_id: int) -> Field:
    field = db.query(Field).filter(Field.id == field_id).first()
    if field is None:
        raise HTTPException(status_code=404, detail=f"Field {field_id} not found")
    return field


def _loads(raw: str | None, default):
    if not raw:
        return default
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        logger.warning("Could not decode stored JSON column, using default")
        return default


@router.get("/api/monitoring/latest/{field_id}")
def get_latest_observation(field_id: int, db: Session = Depends(get_db)):
    _require_field(db, field_id)

    obs = (
        db.query(Observation)
        .filter(Observation.field_id == field_id)
        .order_by(Observation.timestamp.desc())
        .first()
    )
    if not obs:
        raise HTTPException(
            status_code=404, detail="No observations found for this field."
        )

    return {
        "timestamp": obs.timestamp,
        "disease": {
            "detected": obs.disease_detected,
            "name": obs.disease_name,
            "confidence": obs.disease_confidence,
        },
        "pests": {
            "detected": obs.pest_detected,
            "total": obs.total_pests,
            "pressure": obs.pest_pressure,
            "counts": _loads(obs.pest_counts_json, {}),
        },
        "environment": {
            "temperature": obs.temperature,
            "humidity": obs.humidity,
            "soil_moisture": obs.soil_moisture,
            "light": obs.light,
            "rainfall": obs.rainfall,
        },
        "nutrients": {
            "nitrogen": obs.nitrogen,
            "phosphorus": obs.phosphorus,
            "potassium": obs.potassium,
            "ph": obs.ph,
            "organic_carbon": obs.organic_carbon,
            "ec": obs.ec,
        },
        "risk": {"overall_risk": obs.overall_risk},
        "advisory": _loads(obs.advisory_json, {}),
    }


@router.get("/api/monitoring/history/{field_id}")
def get_history(field_id: int, days: int = 7, db: Session = Depends(get_db)):
    if days < 1 or days > 365:
        raise HTTPException(status_code=422, detail="days must be between 1 and 365")

    _require_field(db, field_id)

    cutoff = _utcnow() - timedelta(days=days)
    observations = (
        db.query(Observation)
        .filter(Observation.field_id == field_id, Observation.timestamp >= cutoff)
        .order_by(Observation.timestamp.asc())
        .all()
    )

    points = [
        {
            "timestamp": obs.timestamp.isoformat() if obs.timestamp else None,
            "temperature": obs.temperature,
            "humidity": obs.humidity,
            "soil_moisture": obs.soil_moisture,
            "rainfall": obs.rainfall,
            "nitrogen": obs.nitrogen,
            "phosphorus": obs.phosphorus,
            "potassium": obs.potassium,
            "ph": obs.ph,
            "total_pests": obs.total_pests,
            "overall_risk": obs.overall_risk,
        }
        for obs in observations
    ]

    return {
        # Flat arrays kept for existing chart components.
        "timestamps": [p["timestamp"] for p in points],
        "temperatures": [p["temperature"] for p in points],
        "humidities": [p["humidity"] for p in points],
        "soil_moistures": [p["soil_moisture"] for p in points],
        "pest_totals": [p["total_pests"] for p in points],
        # Row form is easier to feed straight into Recharts.
        "points": points,
        "total_records": len(points),
    }


@router.post("/api/monitoring/simulate/{field_id}")
def simulate_observation(field_id: int, db: Session = Depends(get_db)):
    """Simulate one monitoring tick: read sensors, score risk, persist an observation."""
    _require_field(db, field_id)

    sensor = get_sensor_provider()
    env_data = sensor.read_all()
    nutrients = sensor.read_nutrients()

    # Carry the most recent vision result forward so risk reflects the known field state.
    previous = (
        db.query(Observation)
        .filter(Observation.field_id == field_id)
        .order_by(Observation.timestamp.desc())
        .first()
    )

    disease = DiseaseSummary(
        detected=bool(previous.disease_detected) if previous else False,
        name=(previous.disease_name if previous else None) or "None",
        confidence=(previous.disease_confidence if previous else 0.0) or 0.0,
    )
    pests = PestSummary(
        detected=bool(previous.pest_detected) if previous else False,
        total=(previous.total_pests if previous else 0) or 0,
        counts=_loads(previous.pest_counts_json, {}) if previous else {},
        pressure=(previous.pest_pressure if previous else None) or "LOW",
    )
    env = EnvironmentSummary(**env_data)

    risk = get_risk_service().calculate_risk(disease=disease, pests=pests, env=env)
    advisory = get_advisory_service().generate_advisory(
        disease=disease, pests=pests, env=env, risk=risk
    )

    new_obs = Observation(
        field_id=field_id,
        timestamp=_utcnow(),
        disease_detected=disease.detected,
        disease_name=previous.disease_name if previous else None,
        disease_confidence=previous.disease_confidence if previous else None,
        pest_detected=pests.detected,
        total_pests=pests.total,
        pest_pressure=pests.pressure,
        pest_counts_json=json.dumps(pests.counts),
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
        overall_risk=risk.overall_risk,
        advisory_json=advisory.model_dump_json(),
    )
    db.add(new_obs)
    db.commit()
    db.refresh(new_obs)

    nutrient_svc = get_nutrient_service()
    nutrient_status = {
        key: nutrient_svc.evaluate_status(key, nutrients.get(key, 0.0))
        for key in ("nitrogen", "phosphorus", "potassium")
    }

    return {
        "message": "Simulation tick complete",
        "id": new_obs.id,
        "timestamp": new_obs.timestamp,
        "environment": env_data,
        "nutrients": nutrients,
        "nutrient_status": nutrient_status,
        "risk": risk.model_dump(),
        "advisory": advisory.model_dump(),
    }
