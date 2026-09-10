"""Irrigation advisory engine."""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any, Dict, List, Optional

from backend.config import Settings, get_settings

logger = logging.getLogger(__name__)


class IrrigationService:
    """
    Rule-based irrigation guidance. Thresholds are prototype defaults and are not
    scientifically validated for any specific crop or region.
    """

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()

    def recommend(
        self,
        soil_moisture: Optional[float],
        temperature: Optional[float],
        humidity: Optional[float],
        rainfall_forecast_mm: float = 0.0,
    ) -> Dict[str, Any]:
        s = self.settings

        if soil_moisture is None:
            return {
                "status": "UNKNOWN",
                "water_mm": 0.0,
                "next_irrigation": "Unavailable",
                "reason": "No soil moisture reading available.",
                "recommendations": ["Connect or simulate a soil moisture sensor."],
            }

        target = s.target_soil_moisture
        deficit = max(0.0, target - soil_moisture)

        # ~0.4 mm of water per 1% moisture deficit in the root zone (prototype constant).
        water_mm = round(deficit * 0.4, 1)

        # Expected rainfall offsets the requirement.
        water_mm = round(max(0.0, water_mm - rainfall_forecast_mm * 0.6), 1)

        if temperature is not None and temperature > s.high_temp_threshold:
            water_mm = round(water_mm * 1.2, 1)
        if humidity is not None and humidity > s.high_humidity_threshold:
            water_mm = round(water_mm * 0.85, 1)

        if soil_moisture < s.low_soil_moisture_threshold:
            status, urgency = "IRRIGATE NOW", "Within 24 hours"
        elif soil_moisture < target:
            status, urgency = "IRRIGATE SOON", "Within 2 days"
        elif soil_moisture > s.waterlogging_soil_moisture_threshold:
            status, urgency = "DO NOT IRRIGATE", "Field is near saturation"
            water_mm = 0.0
        else:
            status, urgency = "NO ACTION NEEDED", "Re-check in 3 days"
            water_mm = 0.0

        recommendations: List[str] = [
            "Irrigate in the early morning or evening to reduce evaporation loss.",
            "Avoid over-watering — waterlogging encourages root rot.",
            "Monitor soil moisture regularly rather than irrigating on a fixed schedule.",
        ]
        if rainfall_forecast_mm > 5.0:
            recommendations.insert(
                0,
                f"Rain of about {rainfall_forecast_mm:.1f} mm is forecast — "
                "consider delaying irrigation.",
            )
        if temperature is not None and temperature > s.high_temp_threshold:
            recommendations.insert(0, "High temperature increases crop water demand.")

        return {
            "status": status,
            "water_mm": water_mm,
            "next_irrigation": urgency,
            "soil_moisture": soil_moisture,
            "target_soil_moisture": target,
            "rainfall_forecast_mm": round(rainfall_forecast_mm, 1),
            "reason": (
                f"Soil moisture is {soil_moisture:.1f}% against a target of {target:.0f}%."
            ),
            "recommendations": recommendations,
        }


@lru_cache
def get_irrigation_service() -> IrrigationService:
    return IrrigationService()
