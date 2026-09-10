"""Application configuration loaded from environment / .env file."""

from __future__ import annotations

from pathlib import Path
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Paths ─────────────────────────────────────────────────────────────────
    disease_model_ckpt: Path = (
        PROJECT_ROOT / "checkpoints" / "checkpoint" / "V8_Full_POWER-ProtoPNet_s42.pth"
    )
    classes_json: Path = PROJECT_ROOT / "classes.json"

    # ── Inference ─────────────────────────────────────────────────────────────
    device: str = "auto"  # auto | cpu | cuda | mps
    img_size: int = 224
    imagenet_mean: list[float] = [0.485, 0.456, 0.406]
    imagenet_std: list[float] = [0.229, 0.224, 0.225]
    top_k: int = 5
    pest_conf_threshold: float = 0.25
    pest_iou_threshold: float = 0.45

    # ── API ───────────────────────────────────────────────────────────────────
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    max_upload_mb: int = 20
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    # ── Database (reserved for later phases) ──────────────────────────────────
    database_url: str = f"sqlite:///{PROJECT_ROOT / 'data' / 'farm.db'}"

    # ── Risk & Environment Thresholds ─────────────────────────────────────────
    # These are not scientifically validated, just placeholders for the prototype
    high_temp_threshold: float = 35.0
    low_soil_moisture_threshold: float = 30.0
    high_humidity_threshold: float = 85.0
    high_rainfall_threshold: float = 50.0
    pest_high_pressure_threshold: int = 10
    pest_mod_pressure_threshold: int = 4
    disease_conf_threshold: float = 0.70
    target_soil_moisture: float = 45.0
    waterlogging_soil_moisture_threshold: float = 75.0

    # ── Weather (OpenWeatherMap) ─────────────────────────────────────
    # Leave WEATHER_API_KEY empty to run on simulated weather data.
    weather_api_key: str = ""
    weather_lat: float = 18.5204   # Pune, Maharashtra
    weather_lon: float = 73.8567
    weather_location: str = "Pune, Maharashtra"

    @field_validator("disease_model_ckpt", "classes_json", mode="before")
    @classmethod
    def resolve_project_paths(cls, value):
        path = Path(value)
        if not path.is_absolute():
            path = PROJECT_ROOT / path
        return path

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
