"""Detection response schemas."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field


class TopKPrediction(BaseModel):
    class_index: int
    class_name: str
    crop: str
    confidence: float
    healthy: bool


class DiseaseResult(BaseModel):
    detected: bool
    crop: str
    disease: str
    class_name: str
    class_index: int
    confidence: float
    healthy: bool
    severity: Optional[str] = None
    causal: Optional[str] = None
    scientific: Optional[str] = None


class DiseaseDetectionResponse(BaseModel):
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    model_version: str = "POWER-ProtoPNet-v8"
    inference_ms: float
    disease: DiseaseResult
    top_k: list[TopKPrediction]


class PestDetectionItem(BaseModel):
    name: str
    confidence: float
    bbox: list[int]


class PestDetectionResponse(BaseModel):
    inference_ms: float
    pests: list[PestDetectionItem]
    total_pests: int
    pest_counts: dict[str, int]
    pest_pressure: str


class FieldInfo(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    crop: Optional[str] = None


class DiseaseSummary(BaseModel):
    detected: bool
    name: str
    confidence: float
    severity: Optional[str] = None


class PestSummary(BaseModel):
    detected: bool
    total: int
    counts: dict[str, int]
    pressure: str


class EnvironmentSummary(BaseModel):
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    soil_moisture: Optional[float] = None
    light: Optional[float] = None
    rainfall: Optional[float] = None
    leaf_wetness: Optional[float] = None


class RiskSummary(BaseModel):
    disease_risk: Optional[str] = None
    pest_risk: Optional[str] = None
    water_stress: Optional[str] = None
    overall_risk: Optional[str] = None


class AdvisorySummary(BaseModel):
    priority: Optional[str] = None
    messages: list[str] = Field(default_factory=list)


class FarmObservationResponse(BaseModel):
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    field: FieldInfo
    disease: DiseaseSummary
    pests: PestSummary
    environment: EnvironmentSummary
    risk: RiskSummary
    advisory: AdvisorySummary

