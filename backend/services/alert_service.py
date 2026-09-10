"""Alert engine — turns an observation into prioritised, farmer-readable alerts."""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any, Dict, List, Optional

from backend.config import Settings, get_settings
from backend.database.models import Observation
from backend.services.nutrient_service import get_nutrient_service

logger = logging.getLogger(__name__)

SEVERITY_ORDER = {"HIGH": 0, "MODERATE": 1, "LOW": 2}


class AlertService:
    """Derives discrete alerts from the stored observation state."""

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()
        self.nutrients = get_nutrient_service()

    def build_alerts(self, obs: Optional[Observation]) -> List[Dict[str, Any]]:
        if obs is None:
            return []

        s = self.settings
        alerts: List[Dict[str, Any]] = []

        def add(category: str, title: str, detail: str, severity: str) -> None:
            alerts.append(
                {
                    "id": f"{category}-{len(alerts)}",
                    "category": category,
                    "title": title,
                    "detail": detail,
                    "severity": severity,
                    "timestamp": obs.timestamp.isoformat() if obs.timestamp else None,
                }
            )

        # ── Disease ───────────────────────────────────────────────────────────
        if obs.disease_detected and obs.disease_name:
            confidence = obs.disease_confidence or 0.0
            add(
                "disease",
                f"Disease detected: {obs.disease_name}",
                f"Detected with {confidence * 100:.0f}% confidence.",
                "HIGH" if confidence >= s.disease_conf_threshold else "MODERATE",
            )

        # ── Pests ─────────────────────────────────────────────────────────────
        total_pests = obs.total_pests or 0
        if total_pests >= s.pest_mod_pressure_threshold:
            add(
                "pest",
                f"High pest pressure ({total_pests} detected)",
                f"Pest pressure is {obs.pest_pressure or 'ELEVATED'} in this field.",
                "HIGH" if total_pests >= s.pest_high_pressure_threshold else "MODERATE",
            )

        # ── Water ─────────────────────────────────────────────────────────────
        if obs.soil_moisture is not None:
            if obs.soil_moisture < s.low_soil_moisture_threshold:
                add(
                    "water",
                    "Soil moisture low",
                    f"Soil moisture at {obs.soil_moisture:.1f}% is below the "
                    f"{s.low_soil_moisture_threshold:.0f}% threshold.",
                    "HIGH",
                )
            elif obs.soil_moisture > s.waterlogging_soil_moisture_threshold:
                add(
                    "water",
                    "Possible waterlogging",
                    f"Soil moisture at {obs.soil_moisture:.1f}% is near saturation.",
                    "MODERATE",
                )

        # ── Weather ───────────────────────────────────────────────────────────
        if obs.temperature is not None and obs.temperature > s.high_temp_threshold:
            add(
                "weather",
                "High temperature",
                f"Field temperature is {obs.temperature:.1f}°C — heat stress risk.",
                "MODERATE",
            )
        if obs.humidity is not None and obs.humidity > s.high_humidity_threshold:
            add(
                "weather",
                "High humidity",
                f"Humidity at {obs.humidity:.0f}% favours fungal disease spread.",
                "MODERATE",
            )

        # ── Nutrients ─────────────────────────────────────────────────────────
        for name, value in (
            ("nitrogen", obs.nitrogen),
            ("phosphorus", obs.phosphorus),
            ("potassium", obs.potassium),
        ):
            if value is None:
                continue
            status = self.nutrients.evaluate_status(name, value)["status"]
            if status in ("DEFICIENT", "LOW"):
                add(
                    "nutrient",
                    f"{name.capitalize()} {status.lower()}",
                    f"Measured {value:.1f} — below the recommended range.",
                    "HIGH" if status == "DEFICIENT" else "MODERATE",
                )

        if obs.ph is not None and (obs.ph < 5.5 or obs.ph > 7.5):
            add(
                "nutrient",
                "Soil pH out of range",
                f"pH is {obs.ph:.1f}; most crops prefer 5.5–7.5.",
                "MODERATE",
            )

        alerts.sort(key=lambda a: SEVERITY_ORDER.get(a["severity"], 3))
        return alerts


@lru_cache
def get_alert_service() -> AlertService:
    return AlertService()
