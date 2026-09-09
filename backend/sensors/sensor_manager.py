"""Sensor manager/factory to provide the active sensor implementation."""

from __future__ import annotations

from functools import lru_cache

from backend.sensors.base_sensor import SensorProvider
from backend.sensors.mock_sensor import MockSensor


@lru_cache
def get_sensor_provider() -> SensorProvider:
    """
    Returns the active sensor provider. 
    Currently hardcoded to MockSensor for the software-first prototype.
    Later, this can be configured via environment variables to return
    Esp32Sensor, RpiSensor, etc.
    """
    return MockSensor()
