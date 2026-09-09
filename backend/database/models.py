"""SQLAlchemy models for the SQLite database."""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
import datetime

from backend.database.database import Base

class Farm(Base):
    __tablename__ = "farms"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    location = Column(String)
    
    fields = relationship("Field", back_populates="farm")


class Field(Base):
    __tablename__ = "fields"
    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"))
    name = Column(String, index=True)
    crop = Column(String)
    
    farm = relationship("Farm", back_populates="fields")
    observations = relationship("Observation", back_populates="field")


class Observation(Base):
    """Combines DetectionEvent and SensorReading for a given timestamp."""
    __tablename__ = "observations"
    
    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Disease
    disease_detected = Column(Boolean, default=False)
    disease_name = Column(String, nullable=True)
    disease_confidence = Column(Float, nullable=True)
    
    # Pests
    pest_detected = Column(Boolean, default=False)
    total_pests = Column(Integer, default=0)
    pest_pressure = Column(String, nullable=True)
    
    # Environment
    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)
    soil_moisture = Column(Float, nullable=True)
    light = Column(Float, nullable=True)
    rainfall = Column(Float, nullable=True)
    
    # Nutrients
    nitrogen = Column(Float, nullable=True)
    phosphorus = Column(Float, nullable=True)
    potassium = Column(Float, nullable=True)
    ph = Column(Float, nullable=True)
    organic_carbon = Column(Float, nullable=True)
    ec = Column(Float, nullable=True)
    
    # Risk
    overall_risk = Column(String, nullable=True)
    
    # JSON strings for complex nested data (counts, advisories)
    pest_counts_json = Column(Text, nullable=True)
    advisory_json = Column(Text, nullable=True)

    field = relationship("Field", back_populates="observations")


class Fertilizer(Base):
    __tablename__ = "fertilizers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    category = Column(String)
    n_percent = Column(Float, default=0.0)
    p_percent = Column(Float, default=0.0)
    k_percent = Column(Float, default=0.0)
    suitable_crops = Column(Text, nullable=True)  # JSON string list
    notes = Column(Text, nullable=True)


class FertilizerRecommendation(Base):
    __tablename__ = "fertilizer_recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    nitrogen_need = Column(Float, nullable=True)
    phosphorus_need = Column(Float, nullable=True)
    potassium_need = Column(Float, nullable=True)
    
    recommended_fertilizer_id = Column(Integer, ForeignKey("fertilizers.id"), nullable=True)
    match_score = Column(Float, nullable=True)
    reason = Column(String, nullable=True)
    
    weather_status = Column(String, nullable=True)
    
    field = relationship("Field")
    fertilizer = relationship("Fertilizer")
