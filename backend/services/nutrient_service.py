"""Nutrient status engine."""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Dict, Any

logger = logging.getLogger(__name__)

class NutrientService:
    """
    Evaluates raw nutrient values into agricultural statuses.
    """
    
    def evaluate_status(self, nutrient: str, value: float, crop: str = "Tomato") -> Dict[str, str]:
        """
        Returns status (DEFICIENT, LOW, ADEQUATE, HIGH) and trend (placeholder for now).
        """
        # Configurable thresholds for prototype
        thresholds = {
            "nitrogen": {"deficient": 20, "low": 40, "adequate": 80},
            "phosphorus": {"deficient": 15, "low": 30, "adequate": 60},
            "potassium": {"deficient": 40, "low": 80, "adequate": 150},
        }
        
        # pH is special
        if nutrient == "ph":
            if value < 5.5: return {"status": "LOW (ACIDIC)", "trend": "STABLE"}
            if value > 7.5: return {"status": "HIGH (ALKALINE)", "trend": "STABLE"}
            return {"status": "ADEQUATE", "trend": "STABLE"}

        # EC is special
        if nutrient == "ec":
            if value > 2.0: return {"status": "HIGH", "trend": "STABLE"}
            return {"status": "ADEQUATE", "trend": "STABLE"}
            
        t = thresholds.get(nutrient, {"deficient": 20, "low": 40, "adequate": 80})
        
        status = "UNKNOWN"
        if value < t["deficient"]:
            status = "DEFICIENT"
        elif value < t["low"]:
            status = "LOW"
        elif value <= t["adequate"]:
            status = "ADEQUATE"
        else:
            status = "HIGH"
            
        return {
            "status": status,
            "trend": "STABLE" # For now, actual trend calculated in history API
        }


@lru_cache
def get_nutrient_service() -> NutrientService:
    return NutrientService()
