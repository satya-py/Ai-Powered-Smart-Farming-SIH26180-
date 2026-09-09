"""Disease detection service — wraps PowerProtoPNet inference."""

from __future__ import annotations

import json
import logging
import time
from functools import lru_cache
from pathlib import Path
from typing import Optional, Union

import torch
import torch.nn.functional as F
from PIL import Image

from backend.config import Settings, get_settings
from backend.models.disease_model import DiseaseModelLoader, get_disease_model_loader
from backend.schemas.detection import (
    DiseaseDetectionResponse,
    DiseaseResult,
    TopKPrediction,
)
from backend.utils.image_preprocessing import (
    load_pil_from_bytes,
    load_pil_from_path,
    preprocess_image,
)

logger = logging.getLogger(__name__)


class DiseaseService:
    def __init__(
        self,
        settings: Optional[Settings] = None,
        model_loader: Optional[DiseaseModelLoader] = None,
    ):
        self.settings = settings or get_settings()
        self.model_loader = model_loader or get_disease_model_loader()
        self._classes: Optional[list[dict]] = None

    @property
    def classes(self) -> list[dict]:
        if self._classes is None:
            path = self.settings.classes_json
            if not path.exists():
                raise FileNotFoundError(f"classes.json not found: {path}")
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            self._classes = sorted(data["classes"], key=lambda x: x["index"])
            logger.info("Loaded %d classes from %s", len(self._classes), path)
        return self._classes

    @staticmethod
    def _disease_label(class_entry: dict) -> str:
        if class_entry.get("healthy"):
            return "healthy"
        name = class_entry["name"]
        return name.split("(")[0] if "(" in name else name

    def detect_from_bytes(self, raw: bytes) -> DiseaseDetectionResponse:
        pil = load_pil_from_bytes(raw)
        return self.detect_from_image(pil)

    def detect_from_path(self, path: Union[str, Path]) -> DiseaseDetectionResponse:
        pil = load_pil_from_path(path)
        return self.detect_from_image(pil)

    def detect_from_image(self, image: Image.Image) -> DiseaseDetectionResponse:
        t0 = time.perf_counter()
        device = self.model_loader.device
        model = self.model_loader.model

        tensor = preprocess_image(image, device)

        with torch.no_grad():
            logits, _similarities, _activation_maps = model(tensor)

        probabilities = F.softmax(logits, dim=1)[0]
        confidence, predicted_index = torch.max(probabilities, dim=0)
        predicted_index = int(predicted_index.item())
        confidence = float(confidence.item())

        predicted = self.classes[predicted_index]
        disease_label = self._disease_label(predicted)
        inference_ms = round((time.perf_counter() - t0) * 1000, 1)

        top_k = min(self.settings.top_k, len(self.classes))
        top_probs, top_indices = probabilities.topk(top_k)
        top_k_list = [
            TopKPrediction(
                class_index=int(idx.item()),
                class_name=self.classes[int(idx.item())]["name"],
                crop=self.classes[int(idx.item())]["plant"],
                confidence=round(float(prob.item()), 6),
                healthy=bool(self.classes[int(idx.item())]["healthy"]),
            )
            for prob, idx in zip(top_probs, top_indices)
        ]

        result = DiseaseDetectionResponse(
            inference_ms=inference_ms,
            disease=DiseaseResult(
                detected=not predicted["healthy"],
                crop=predicted["plant"],
                disease=disease_label,
                class_name=predicted["name"],
                class_index=predicted_index,
                confidence=round(confidence, 6),
                healthy=bool(predicted["healthy"]),
                severity=predicted.get("severity"),
                causal=predicted.get("causal"),
                scientific=predicted.get("scientific"),
            ),
            top_k=top_k_list,
        )

        logger.info(
            "Disease inference: %.1f ms | %s (%.2f%%)",
            inference_ms,
            result.disease.class_name,
            result.disease.confidence * 100,
        )
        return result


@lru_cache
def get_disease_service() -> DiseaseService:
    return DiseaseService()
