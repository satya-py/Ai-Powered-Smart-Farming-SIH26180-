"""Fusion engine for aggregating all data streams."""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Optional

from backend.schemas.detection import (
    FarmObservationResponse, 
    FieldInfo, 
    DiseaseSummary, 
    PestSummary,
    EnvironmentSummary
)
from backend.services.risk_service import get_risk_service
from backend.services.advisory_service import get_advisory_service

logger = logging.getLogger(__name__)


class FusionService:
    """
    Fuses vision, sensor, and historical data into a standardized field health state.
    """

    def __init__(self):
        self.risk_service = get_risk_service()
        self.advisory_service = get_advisory_service()

    def fuse_observation(
        self,
        disease_summary: DiseaseSummary,
        pest_summary: PestSummary,
        env_summary: EnvironmentSummary,
        field_info: Optional[FieldInfo] = None
    ) -> FarmObservationResponse:
        
        # Default field info if none provided.
        # DiseaseSummary carries no crop field, so fall back to a neutral label.
        if not field_info:
            field_info = FieldInfo(id=1, name="Demo Field", crop="Unknown")

        # 1. Calculate Risks
        risk_summary = self.risk_service.calculate_risk(
            disease=disease_summary,
            pests=pest_summary,
            env=env_summary
        )

        # 2. Generate Advisory
        advisory_summary = self.advisory_service.generate_advisory(
            disease=disease_summary,
            pests=pest_summary,
            env=env_summary,
            risk=risk_summary
        )

        # 3. Compile Standardized Response
        observation = FarmObservationResponse(
            field=field_info,
            disease=disease_summary,
            pests=pest_summary,
            environment=env_summary,
            risk=risk_summary,
            advisory=advisory_summary
        )
        
        logger.info(
            "Fusion complete | Overall Risk: %s | Advisory Priority: %s", 
            risk_summary.overall_risk, 
            advisory_summary.priority
        )
        
        return observation


@lru_cache
def get_fusion_service() -> FusionService:
    return FusionService()
