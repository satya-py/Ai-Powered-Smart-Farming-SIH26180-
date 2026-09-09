"""Base interfaces for hardware abstraction."""

from __future__ import annotations

import abc
from typing import Dict, Any


class SensorProvider(abc.ABC):
    """
    Abstract interface for agricultural sensors.
    This guarantees that the core software remains completely decoupled 
    from the underlying edge hardware (e.g. Raspberry Pi, ESP32, Qualcomm Edge).
    """

    @abc.abstractmethod
    def read_all(self) -> Dict[str, float]:
        """
        Reads all available environmental sensors and returns a dictionary of values.
        Expected keys (if available):
          - temperature
          - humidity
          - soil_moisture
          - light
          - rainfall
          - leaf_wetness
        """
        pass
        
    @abc.abstractmethod
    def read_nutrients(self) -> Dict[str, float]:
        """
        Reads all available soil nutrient sensors.
        Expected keys:
          - nitrogen
          - phosphorus
          - potassium
          - ph
          - organic_carbon
          - ec
        """
        pass

    @abc.abstractmethod
    def is_connected(self) -> bool:
        """Returns True if the sensor hardware is currently reachable."""
        pass
