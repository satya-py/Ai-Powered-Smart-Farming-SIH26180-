"""Nutrient and Fertilizer API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from backend.database.database import get_db
from backend.database.models import Observation, Fertilizer
from backend.services.nutrient_service import get_nutrient_service
from backend.services.fertilizer_service import get_fertilizer_service
from backend.models.npk_needs_model import get_npk_model_provider
from backend.models.fertilizer_model import get_fertilizer_model_provider

router = APIRouter(tags=["nutrients"])

@router.get("/api/models/status")
def get_models_status():
    """Returns the loading status of the Hugging Face models."""
    npk_prov = get_npk_model_provider()
    fert_prov = get_fertilizer_model_provider()
    return {
        "npk_model": npk_prov.get_status(),
        "fertilizer_model": fert_prov.get_status()
    }

@router.get("/api/fertilizer/catalog")
def get_fertilizer_catalog(db: Session = Depends(get_db)):
    """Returns the database catalog of fertilizers."""
    catalog = db.query(Fertilizer).all()
    return catalog

@router.get("/api/nutrients/latest/{field_id}")
def get_latest_nutrients(field_id: int, db: Session = Depends(get_db)):
    """Returns the latest nutrient reading, status, and NPK needs."""
    obs = db.query(Observation).filter(Observation.field_id == field_id).order_by(Observation.timestamp.desc()).first()
    if not obs:
        raise HTTPException(status_code=404, detail="No observations found.")
        
    nutrient_svc = get_nutrient_service()
    
    # Evaluate status
    n_stat = nutrient_svc.evaluate_status("nitrogen", obs.nitrogen or 0)
    p_stat = nutrient_svc.evaluate_status("phosphorus", obs.phosphorus or 0)
    k_stat = nutrient_svc.evaluate_status("potassium", obs.potassium or 0)
    
    # Calculate NPK Need
    npk_prov = get_npk_model_provider()
    npk_need = npk_prov.predict({
        "crop": "Tomato",
        "nitrogen": obs.nitrogen or 0,
        "phosphorus": obs.phosphorus or 0,
        "potassium": obs.potassium or 0
    })
    
    return {
        "timestamp": obs.timestamp,
        "soil": {
            "nitrogen": obs.nitrogen,
            "phosphorus": obs.phosphorus,
            "potassium": obs.potassium,
            "ph": obs.ph,
            "moisture": obs.soil_moisture,
            "organic_carbon": obs.organic_carbon,
            "ec": obs.ec
        },
        "nutrients": {
            "nitrogen": n_stat,
            "phosphorus": p_stat,
            "potassium": k_stat
        },
        "npk_need": npk_need
    }

@router.post("/api/fertilizer/recommend/{field_id}")
def recommend_fertilizer(field_id: int, db: Session = Depends(get_db)):
    """Generates a fertilizer recommendation based on latest observation."""
    obs = db.query(Observation).filter(Observation.field_id == field_id).order_by(Observation.timestamp.desc()).first()
    if not obs:
        raise HTTPException(status_code=404, detail="No observations found.")
        
    # Calculate NPK Need
    npk_prov = get_npk_model_provider()
    npk_need = npk_prov.predict({
        "crop": "Tomato",
        "nitrogen": obs.nitrogen or 0,
        "phosphorus": obs.phosphorus or 0,
        "potassium": obs.potassium or 0
    })
    
    # Get Catalog
    catalog = db.query(Fertilizer).all()
    
    # Rank Fertilizers
    fert_prov = get_fertilizer_model_provider()
    recommendations = fert_prov.predict(npk_need, catalog)
    
    # Weather check
    fert_svc = get_fertilizer_service()
    weather_status = fert_svc.check_weather_safety(
        temperature=obs.temperature or 25,
        rainfall=obs.rainfall or 0,
        soil_moisture=obs.soil_moisture or 40
    )
    
    return {
        "npk_need": npk_need,
        "weather_status": weather_status,
        "recommendations": recommendations
    }

from pydantic import BaseModel, Field as PydanticField


class ManualNutrientInput(BaseModel):
    crop: str = "Tomato"
    nitrogen: float = PydanticField(ge=0, le=1000)
    phosphorus: float = PydanticField(ge=0, le=1000)
    potassium: float = PydanticField(ge=0, le=1000)
    ph: float = PydanticField(default=6.5, ge=0, le=14)
    soil_moisture: float = PydanticField(default=40.0, ge=0, le=100)
    temperature: float = PydanticField(default=25.0, ge=-20, le=60)
    rainfall: float = PydanticField(default=0.0, ge=0, le=500)
    field_size: float = PydanticField(default=1.0, gt=0, le=10000)


# Per-nutrient severity ordering, worst first.
_SEVERITY_RANK = {"DEFICIENT": 0, "LOW": 1, "HIGH": 2, "ADEQUATE": 3}


@router.post("/api/fertilizer/recommend-manual")
def recommend_fertilizer_manual(data: ManualNutrientInput, db: Session = Depends(get_db)):
    """
    Evaluate manually entered soil readings: which nutrients are deficient,
    how much is needed, and which fertilizer closes the gap.
    """
    nutrient_svc = get_nutrient_service()
    npk_prov = get_npk_model_provider()

    npk_need = npk_prov.predict({
        "crop": data.crop,
        "nitrogen": data.nitrogen,
        "phosphorus": data.phosphorus,
        "potassium": data.potassium,
    })

    # Build a full per-nutrient verdict the UI can render directly.
    measured = {
        "nitrogen": data.nitrogen,
        "phosphorus": data.phosphorus,
        "potassium": data.potassium,
    }

    nutrients = {}
    for name, value in measured.items():
        status = nutrient_svc.evaluate_status(name, value, crop=data.crop)["status"]
        need_per_acre = npk_need.get(f"{name}_need", 0.0)
        nutrients[name] = {
            "symbol": name[0].upper(),
            "label": name.capitalize(),
            "measured": value,
            "unit": "mg/kg",
            "status": status,
            "deficient": status in ("DEFICIENT", "LOW"),
            "need_per_acre": need_per_acre,
            "total_need": round(need_per_acre * data.field_size, 1),
        }

    ph_status = nutrient_svc.evaluate_status("ph", data.ph)["status"]
    nutrients["ph"] = {
        "symbol": "pH",
        "label": "Soil pH",
        "measured": data.ph,
        "unit": "",
        "status": ph_status,
        "deficient": ph_status != "ADEQUATE",
        "need_per_acre": 0.0,
        "total_need": 0.0,
    }

    deficient = sorted(
        (n for n in nutrients.values() if n["deficient"]),
        key=lambda n: _SEVERITY_RANK.get(n["status"], 9),
    )

    if not deficient:
        summary = "All measured nutrients are within the adequate range for this crop."
    else:
        names = ", ".join(n["label"] for n in deficient)
        # Neutral wording: pH can be out of range in either direction.
        summary = f"{names} {'needs' if len(deficient) == 1 else 'need'} attention."

    catalog = db.query(Fertilizer).all()
    recommendations = get_fertilizer_model_provider().predict(npk_need, catalog)

    weather_status = get_fertilizer_service().check_weather_safety(
        temperature=data.temperature,
        rainfall=data.rainfall,
        soil_moisture=data.soil_moisture,
    )

    return {
        "crop": data.crop,
        "field_size": data.field_size,
        "summary": summary,
        "deficient_count": len(deficient),
        "deficient": [n["label"] for n in deficient],
        "nutrients": nutrients,
        # Kept for older callers that read the flat status map.
        "nutrients_status": {k: v["status"] for k, v in nutrients.items()},
        "npk_need": npk_need,
        "weather_status": weather_status,
        "recommendations": recommendations,
    }
