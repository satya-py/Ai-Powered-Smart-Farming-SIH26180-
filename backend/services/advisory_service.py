"""Advisory engine for farmer-friendly recommendations."""

from __future__ import annotations

import logging
from functools import lru_cache

from backend.schemas.detection import DiseaseSummary, PestSummary, EnvironmentSummary, RiskSummary, AdvisorySummary

logger = logging.getLogger(__name__)


class AdvisoryService:
    """
    Generates farmer-friendly advice based on the calculated risk state.
    """

    def generate_advisory(
        self,
        disease: DiseaseSummary,
        pests: PestSummary,
        env: EnvironmentSummary,
        risk: RiskSummary
    ) -> AdvisorySummary:
        messages = []
        priority = "LOW"

        # Water Advisory
        if "DROUGHT" in (risk.water_stress or "") or "DRY" in (risk.water_stress or ""):
            messages.append("Irrigation Status: NEEDS ATTENTION. Low soil moisture detected. Consider irrigating the field soon.")
            priority = "HIGH" if "DROUGHT" in (risk.water_stress or "") else "MODERATE"
        elif "WATERLOGGING" in (risk.water_stress or ""):
            messages.append("Drainage Status: NEEDS ATTENTION. High rainfall detected. Check field for waterlogging to prevent root rot.")
            priority = "HIGH"

        # Disease Advisory
        if risk.disease_risk in ["HIGH", "MODERATE"]:
            msg = f"Disease Alert: {disease.name} detected."
            if env.humidity is not None and env.humidity > 80:
                msg += " High humidity is accelerating disease spread. Consider improving ventilation or applying appropriate fungicide."
            else:
                msg += " Monitor the affected plants closely."
            messages.append(msg)
            if risk.disease_risk == "HIGH":
                priority = "HIGH"
            elif priority == "LOW":
                priority = "MODERATE"

        # Pest Advisory
        if risk.pest_risk in ["HIGH", "MODERATE"]:
            msg = f"Pest Alert: {pests.total} pests detected (Pressure: {risk.pest_risk})."
            if risk.pest_risk == "HIGH":
                msg += " Immediate intervention recommended to prevent crop damage."
                priority = "HIGH"
            else:
                msg += " Monitor pest populations over the next few days."
            messages.append(msg)

        # General Health
        if not messages:
            messages.append("Field conditions appear stable. Continue regular monitoring.")

        return AdvisorySummary(
            priority=priority,
            messages=messages
        )


@lru_cache
def get_advisory_service() -> AdvisoryService:
    return AdvisoryService()
