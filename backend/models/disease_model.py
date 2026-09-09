"""Thin wrapper around the existing POWER-ProtoPNet implementation."""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Optional

import torch

from backend.config import Settings, get_settings
from backend.utils.path_setup import ensure_project_root_on_path

logger = logging.getLogger(__name__)


def resolve_device(device_setting: str = "auto") -> torch.device:
    cfg = device_setting.lower()
    if cfg == "auto":
        if torch.cuda.is_available():
            return torch.device("cuda")
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return torch.device("mps")
        return torch.device("cpu")
    return torch.device(cfg)


class DiseaseModelLoader:
    """Lazy-loads PowerProtoPNet once and reuses it for all requests."""

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()
        self._model = None
        self._device: Optional[torch.device] = None
        self._loaded = False

    @property
    def device(self) -> torch.device:
        if self._device is None:
            self._device = resolve_device(self.settings.device)
        return self._device

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def load(self) -> None:
        if self._loaded:
            return

        ensure_project_root_on_path()
        from power_model import PowerProtoPNet  # noqa: WPS433 — intentional legacy import

        ckpt_path = self.settings.disease_model_ckpt
        if not ckpt_path.exists():
            raise FileNotFoundError(f"Disease checkpoint not found: {ckpt_path}")

        logger.info("Loading disease model from %s", ckpt_path)
        logger.info("Inference device: %s", self.device)

        model = PowerProtoPNet()
        ckpt = model.load_checkpoint(str(ckpt_path), device="cpu")
        model.to(self.device)
        model.eval()

        self._model = model
        self._loaded = True

        test_acc = ckpt.get("test_acc")
        logger.info(
            "Disease model loaded (checkpoint test_acc=%s)",
            f"{test_acc:.4f}" if test_acc is not None else "unknown",
        )

    @property
    def model(self):
        if not self._loaded:
            self.load()
        return self._model


@lru_cache
def get_disease_model_loader() -> DiseaseModelLoader:
    return DiseaseModelLoader()
