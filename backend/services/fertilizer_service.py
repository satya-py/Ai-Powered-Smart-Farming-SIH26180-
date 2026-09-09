"""Fertilizer matching and weather safety engine."""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Dict, Any

logger = logging.getLogger(__name__)

class FertilizerService:
    """
    Handles fertilizer ranking and weather safety logic.
    """
    
    def check_weather_safety(self, temperature: float, rainfall: float, soil_moisture: float) -> str:
        """
        Evaluates weather conditions for fertilizer application safety.
        """
        if rainfall > 20.0:
            return "WAIT — HEAVY RAIN EXPECTED (Risk of runoff)"
        if temperature > 35.0:
            return "CAUTION — EXTREME HEAT (Risk of fertilizer burn)"
        if soil_moisture < 20.0:
            return "IRRIGATE FIRST — SOIL TOO DRY"
        if soil_moisture > 75.0:
            return "CAUTION — SOIL WATERLOGGED"
            
        return "GOOD FOR APPLICATION"


@lru_cache
def get_fertilizer_service() -> FertilizerService:
    return FertilizerService()
