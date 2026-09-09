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

from pydantic import BaseModel

class ManualNutrientInput(BaseModel):
    crop: str = "Tomato"
    nitrogen: float
    phosphorus: float
    potassium: float
    ph: float = 6.5
    soil_moisture: float = 40.0
    temperature: float = 25.0
    rainfall: float = 0.0

@router.post("/api/fertilizer/recommend-manual")
def recommend_fertilizer_manual(data: ManualNutrientInput, db: Session = Depends(get_db)):
    """Generates a fertilizer recommendation based on direct manual input."""
    # Calculate NPK Need
    npk_prov = get_npk_model_provider()
    npk_need = npk_prov.predict({
        "crop": data.crop,
        "nitrogen": data.nitrogen,
        "phosphorus": data.phosphorus,
        "potassium": data.potassium
    })
    
    # Get Catalog
    catalog = db.query(Fertilizer).all()
    
    # Rank Fertilizers
    fert_prov = get_fertilizer_model_provider()
    recommendations = fert_prov.predict(npk_need, catalog)
    
    # Weather check
    fert_svc = get_fertilizer_service()
    weather_status = fert_svc.check_weather_safety(
        temperature=data.temperature,
        rainfall=data.rainfall,
        soil_moisture=data.soil_moisture
    )
    
    nutrient_svc = get_nutrient_service()
    
    return {
        "nutrients_status": {
            "nitrogen": nutrient_svc.evaluate_status("nitrogen", data.nitrogen).get("status"),
            "phosphorus": nutrient_svc.evaluate_status("phosphorus", data.phosphorus).get("status"),
            "potassium": nutrient_svc.evaluate_status("potassium", data.potassium).get("status")
        },
        "npk_need": npk_need,
        "weather_status": weather_status,
        "recommendations": recommendations
    }
