"""Monitoring and history endpoints."""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.database.models import Observation, Field

router = APIRouter(tags=["monitoring"])

@router.get("/api/monitoring/latest/{field_id}")
def get_latest_observation(field_id: int, db: Session = Depends(get_db)):
    obs = db.query(Observation).filter(Observation.field_id == field_id).order_by(Observation.timestamp.desc()).first()
    if not obs:
        raise HTTPException(status_code=404, detail="No observations found for this field.")
    
    return {
        "timestamp": obs.timestamp,
        "disease": {
            "detected": obs.disease_detected,
            "name": obs.disease_name,
            "confidence": obs.disease_confidence
        },
        "pests": {
            "detected": obs.pest_detected,
            "total": obs.total_pests,
            "pressure": obs.pest_pressure,
            "counts": json.loads(obs.pest_counts_json) if obs.pest_counts_json else {}
        },
        "environment": {
            "temperature": obs.temperature,
            "humidity": obs.humidity,
            "soil_moisture": obs.soil_moisture,
            "light": obs.light,
            "rainfall": obs.rainfall
        },
        "risk": {
            "overall_risk": obs.overall_risk
        },
        "advisory": json.loads(obs.advisory_json) if obs.advisory_json else {}
    }


@router.get("/api/monitoring/history/{field_id}")
def get_history(field_id: int, days: int = 7, db: Session = Depends(get_db)):
    cutoff = datetime.utcnow() - timedelta(days=days)
    observations = db.query(Observation).filter(
        Observation.field_id == field_id,
        Observation.timestamp >= cutoff
    ).order_by(Observation.timestamp.asc()).all()
    
    # Format for charting
    timestamps = []
    temperatures = []
    humidities = []
    soil_moistures = []
    pest_totals = []
    
    for obs in observations:
        timestamps.append(obs.timestamp.isoformat())
        temperatures.append(obs.temperature)
        humidities.append(obs.humidity)
        soil_moistures.append(obs.soil_moisture)
        pest_totals.append(obs.total_pests)
        
    return {
        "timestamps": timestamps,
        "temperatures": temperatures,
        "humidities": humidities,
        "soil_moistures": soil_moistures,
        "pest_totals": pest_totals,
        "total_records": len(observations)
    }
from backend.sensors.sensor_manager import get_sensor_manager
from backend.services.nutrient_service import get_nutrient_service

@router.post("/api/monitoring/simulate/{field_id}")
def simulate_observation(field_id: int, db: Session = Depends(get_db)):
    """Simulates a time tick: reads sensors, generates a new observation, saves it."""
    sm = get_sensor_manager()
    env_data = sm.read_environment()
    nutrients = sm.primary_sensor.read_nutrients()
    
    new_obs = Observation(
        field_id=field_id,
        timestamp=datetime.utcnow(),
        temperature=env_data.get("temperature"),
        humidity=env_data.get("humidity"),
        soil_moisture=env_data.get("soil_moisture"),
        rainfall=env_data.get("rainfall"),
        nitrogen=nutrients.get("nitrogen", 30),
        phosphorus=nutrients.get("phosphorus", 30),
        potassium=nutrients.get("potassium", 30),
        ph=nutrients.get("ph", 6.5)
    )
    db.add(new_obs)
    db.commit()
    db.refresh(new_obs)
    
    return {"message": "Simulation tick complete", "id": new_obs.id, "environment": env_data, "nutrients": nutrients}
