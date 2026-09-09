"""Mock sensor implementation for the software prototype phase."""

from __future__ import annotations

import random
from typing import Dict

from backend.sensors.base_sensor import SensorProvider


class MockSensor(SensorProvider):
    """
    Simulates agricultural sensor readings.
    Used before real hardware (ESP32/Rpi/Qualcomm) is connected.
    """

    def __init__(self):
        # Baseline values for random walk
        self._temp = 25.0
        self._hum = 60.0
        self._soil = 45.0
        self._light = 500.0
        self._rain = 0.0
        self._leaf = 20.0
        
        # Nutrient baselines
        self._n = 35.0
        self._p = 48.0
        self._k = 28.0
        self._ph = 6.5
        self._oc = 0.8
        self._ec = 1.2

    def _walk(self, current: float, delta_max: float, min_val: float, max_val: float) -> float:
        delta = random.uniform(-delta_max, delta_max)
        return max(min_val, min(max_val, current + delta))

    def read_all(self) -> Dict[str, float]:
        # Perform a random walk to simulate changing environmental conditions
        self._temp = self._walk(self._temp, 0.5, 10.0, 45.0)
        self._hum = self._walk(self._hum, 2.0, 30.0, 100.0)
        self._soil = self._walk(self._soil, 1.0, 10.0, 80.0)
        self._light = self._walk(self._light, 50.0, 0.0, 1200.0)
        
        # Rainfall is sparse
        if random.random() > 0.95:
            self._rain = self._walk(self._rain, 2.0, 0.0, 15.0)
        else:
            self._rain = max(0.0, self._rain - 0.5)
            
        self._leaf = self._walk(self._leaf, 1.5, 0.0, 100.0)

        return {
            "temperature": round(self._temp, 1),
            "humidity": round(self._hum, 1),
            "soil_moisture": round(self._soil, 1),
            "light": round(self._light, 1),
            "rainfall": round(self._rain, 1),
            "leaf_wetness": round(self._leaf, 1),
        }
        
    def read_nutrients(self) -> Dict[str, float]:
        self._n = self._walk(self._n, 0.5, 0.0, 150.0)
        self._p = self._walk(self._p, 0.5, 0.0, 100.0)
        self._k = self._walk(self._k, 0.5, 0.0, 100.0)
        self._ph = self._walk(self._ph, 0.05, 4.0, 9.0)
        self._oc = self._walk(self._oc, 0.01, 0.1, 3.0)
        self._ec = self._walk(self._ec, 0.05, 0.1, 4.0)
        
        return {
            "nitrogen": round(self._n, 1),
            "phosphorus": round(self._p, 1),
            "potassium": round(self._k, 1),
            "ph": round(self._ph, 2),
            "organic_carbon": round(self._oc, 2),
            "ec": round(self._ec, 2)
        }

    def is_connected(self) -> bool:
        return True
