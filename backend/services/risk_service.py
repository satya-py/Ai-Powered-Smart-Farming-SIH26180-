"""Risk engine for calculating agricultural stress levels."""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Optional

from backend.config import Settings, get_settings
from backend.schemas.detection import DiseaseSummary, PestSummary, EnvironmentSummary, RiskSummary

logger = logging.getLogger(__name__)


class RiskService:
    """
    Calculates various risk factors using configurable rule-based logic.
    Note: These rules are for the software prototype and are not scientifically validated.
    """

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()

    def calculate_risk(
        self,
        disease: DiseaseSummary,
        pests: PestSummary,
        env: EnvironmentSummary
    ) -> RiskSummary:
        
        # 1. Disease Risk
        disease_risk = "LOW"
        if disease.detected and disease.confidence >= self.settings.disease_conf_threshold:
            disease_risk = "HIGH"
        elif disease.detected:
            disease_risk = "MODERATE"
            
        # Increase disease risk if humidity is high
        if env.humidity is not None and env.humidity > self.settings.high_humidity_threshold:
            if disease_risk == "MODERATE":
                disease_risk = "HIGH"
            elif disease_risk == "LOW":
                disease_risk = "MODERATE"

        # 2. Pest Risk
        pest_risk = "LOW"
        if pests.total >= self.settings.pest_high_pressure_threshold:
            pest_risk = "HIGH"
        elif pests.total >= self.settings.pest_mod_pressure_threshold:
            pest_risk = "MODERATE"

        # 3. Water Stress (Drought / Waterlogging)
        water_stress = "NORMAL"
        if env.soil_moisture is not None and env.soil_moisture < self.settings.low_soil_moisture_threshold:
            if env.temperature is not None and env.temperature > self.settings.high_temp_threshold:
                water_stress = "HIGH (DROUGHT)"
            else:
                water_stress = "MODERATE (DRY)"
        elif env.rainfall is not None and env.rainfall > self.settings.high_rainfall_threshold:
            water_stress = "HIGH (WATERLOGGING)"

        # 4. Overall Risk Calculation
        risk_scores = {"LOW": 0, "NORMAL": 0, "MODERATE": 1, "MODERATE (DRY)": 1, "HIGH": 2, "HIGH (DROUGHT)": 2, "HIGH (WATERLOGGING)": 2}
        
        total_score = risk_scores.get(disease_risk, 0) + risk_scores.get(pest_risk, 0) + risk_scores.get(water_stress, 0)
        
        overall_risk = "LOW"
        if total_score >= 4:
            overall_risk = "CRITICAL"
        elif total_score >= 2:
            overall_risk = "HIGH"
        elif total_score == 1:
            overall_risk = "MODERATE"

        return RiskSummary(
            disease_risk=disease_risk,
            pest_risk=pest_risk,
            water_stress=water_stress,
            overall_risk=overall_risk
        )


@lru_cache
def get_risk_service() -> RiskService:
    return RiskService()
