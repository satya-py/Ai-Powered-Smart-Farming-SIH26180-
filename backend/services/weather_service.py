"""Weather service — OpenWeatherMap when an API key is configured, mock otherwise."""

from __future__ import annotations

import logging
import random
from datetime import date, timedelta
from functools import lru_cache
from typing import Any, Dict, List, Optional

import httpx

from backend.config import Settings, get_settings

logger = logging.getLogger(__name__)

OWM_BASE = "https://api.openweathermap.org/data/2.5"


class WeatherService:
    """
    Provides current conditions and a short forecast.

    Set WEATHER_API_KEY (OpenWeatherMap) in .env to use live data. Without a key
    the service returns deterministic-looking mock data so the UI stays usable.
    """

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()

    @property
    def enabled(self) -> bool:
        return bool(self.settings.weather_api_key)

    # ── Public API ────────────────────────────────────────────────────────────

    def current(self) -> Dict[str, Any]:
        if self.enabled:
            try:
                return self._fetch_current()
            except Exception as exc:  # network, quota, bad key…
                logger.warning("Live weather failed (%s), falling back to mock", exc)
        return self._mock_current()

    def forecast(self, days: int = 5) -> Dict[str, Any]:
        days = max(1, min(days, 5))
        if self.enabled:
            try:
                return self._fetch_forecast(days)
            except Exception as exc:
                logger.warning("Live forecast failed (%s), falling back to mock", exc)
        return self._mock_forecast(days)

    # ── OpenWeatherMap ────────────────────────────────────────────────────────

    def _params(self) -> Dict[str, Any]:
        return {
            "lat": self.settings.weather_lat,
            "lon": self.settings.weather_lon,
            "units": "metric",
            "appid": self.settings.weather_api_key,
        }

    def _fetch_current(self) -> Dict[str, Any]:
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(f"{OWM_BASE}/weather", params=self._params())
            resp.raise_for_status()
            data = resp.json()

        return {
            "source": "openweathermap",
            "location": data.get("name") or self.settings.weather_location,
            "temperature": round(data["main"]["temp"], 1),
            "feels_like": round(data["main"].get("feels_like", data["main"]["temp"]), 1),
            "humidity": data["main"].get("humidity"),
            "wind_kph": round(data.get("wind", {}).get("speed", 0.0) * 3.6, 1),
            "rain_mm": round(data.get("rain", {}).get("1h", 0.0), 1),
            "condition": (data.get("weather") or [{}])[0].get("main", "Unknown"),
            "description": (data.get("weather") or [{}])[0].get("description", ""),
        }

    def _fetch_forecast(self, days: int) -> Dict[str, Any]:
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(f"{OWM_BASE}/forecast", params=self._params())
            resp.raise_for_status()
            data = resp.json()

        # The free endpoint is 3-hourly; collapse it into per-day min/max.
        buckets: Dict[str, Dict[str, Any]] = {}
        for entry in data.get("list", []):
            day = entry["dt_txt"][:10]
            bucket = buckets.setdefault(
                day,
                {
                    "date": day,
                    "temp_min": entry["main"]["temp"],
                    "temp_max": entry["main"]["temp"],
                    "rain_mm": 0.0,
                    "humidity": [],
                    "condition": (entry.get("weather") or [{}])[0].get("main", "Unknown"),
                },
            )
            bucket["temp_min"] = min(bucket["temp_min"], entry["main"]["temp_min"])
            bucket["temp_max"] = max(bucket["temp_max"], entry["main"]["temp_max"])
            bucket["rain_mm"] += entry.get("rain", {}).get("3h", 0.0)
            bucket["humidity"].append(entry["main"].get("humidity", 0))

        forecast = []
        for bucket in list(buckets.values())[:days]:
            humidity = bucket.pop("humidity")
            bucket["humidity"] = round(sum(humidity) / len(humidity)) if humidity else None
            bucket["temp_min"] = round(bucket["temp_min"], 1)
            bucket["temp_max"] = round(bucket["temp_max"], 1)
            bucket["rain_mm"] = round(bucket["rain_mm"], 1)
            forecast.append(bucket)

        return {
            "source": "openweathermap",
            "location": data.get("city", {}).get("name", self.settings.weather_location),
            "forecast": forecast,
        }

    # ── Mock fallback ─────────────────────────────────────────────────────────

    def _mock_current(self) -> Dict[str, Any]:
        temp = round(random.uniform(24.0, 33.0), 1)
        return {
            "source": "mock",
            "location": self.settings.weather_location,
            "temperature": temp,
            "feels_like": round(temp + random.uniform(0.5, 2.5), 1),
            "humidity": round(random.uniform(45.0, 80.0)),
            "wind_kph": round(random.uniform(4.0, 18.0), 1),
            "rain_mm": 0.0,
            "condition": random.choice(["Clear", "Clouds", "Partly Cloudy"]),
            "description": "simulated conditions — set WEATHER_API_KEY for live data",
        }

    def _mock_forecast(self, days: int) -> Dict[str, Any]:
        today = date.today()
        forecast: List[Dict[str, Any]] = []
        for offset in range(days):
            low = round(random.uniform(21.0, 25.0), 1)
            forecast.append(
                {
                    "date": (today + timedelta(days=offset)).isoformat(),
                    "temp_min": low,
                    "temp_max": round(low + random.uniform(4.0, 9.0), 1),
                    "rain_mm": round(max(0.0, random.gauss(1.0, 2.5)), 1),
                    "humidity": round(random.uniform(45.0, 80.0)),
                    "condition": random.choice(["Clear", "Clouds", "Rain"]),
                }
            )
        return {
            "source": "mock",
            "location": self.settings.weather_location,
            "forecast": forecast,
        }


@lru_cache
def get_weather_service() -> WeatherService:
    return WeatherService()
