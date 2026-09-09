"""Pest detection service — wraps Hugging Face YOLO11 inference."""

from __future__ import annotations

import logging
import time
from collections import defaultdict
from functools import lru_cache
from typing import Optional, Union
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

# Import ultralytics and huggingface_hub safely
try:
    from ultralytics import YOLO
    from huggingface_hub import hf_hub_download
except ImportError:
    YOLO = None
    hf_hub_download = None

from backend.config import Settings, get_settings
from backend.schemas.detection import PestDetectionResponse, PestDetectionItem
from backend.utils.image_preprocessing import load_pil_from_bytes, load_pil_from_path

logger = logging.getLogger(__name__)


class PestService:
    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()
        self._model = None
        self._loaded = False
        
    def load(self) -> None:
        if self._loaded:
            return
            
        if YOLO is None or hf_hub_download is None:
            raise ImportError(
                "Missing dependencies for pest service. "
                "Please run: pip install ultralytics huggingface_hub opencv-python-headless"
            )

        logger.info("Downloading/Loading YOLO11 pest model from Hugging Face...")
        
        try:
            # Download the weights from HF hub
            # repo: underdogquality/yolo11s-pest-detection
            model_path = hf_hub_download(
                repo_id="underdogquality/yolo11s-pest-detection", 
                filename="best.pt"
            )
            
            # Load model
            self._model = YOLO(model_path)
            
            # Use configured device if specified, otherwise Ultralytics auto-selects GPU if available
            # YOLO configures CUDA automatically if torch.cuda.is_available() is true
            
            self._loaded = True
            logger.info("Pest model loaded successfully.")
            
        except Exception as e:
            logger.error("Failed to load pest model: %s", e)
            raise
            
    def detect_from_bytes(self, raw: bytes) -> tuple[PestDetectionResponse, Image.Image]:
        pil = load_pil_from_bytes(raw)
        return self.detect_from_image(pil)

    def detect_from_path(self, path: Union[str, Path]) -> tuple[PestDetectionResponse, Image.Image]:
        pil = load_pil_from_path(path)
        return self.detect_from_image(pil)

    def detect_from_image(self, image: Image.Image) -> tuple[PestDetectionResponse, Image.Image]:
        if not self._loaded:
            self.load()
            
        t0 = time.perf_counter()
        
        # Convert PIL to cv2 for YOLO (BGR)
        img_np = np.array(image)
        if len(img_np.shape) == 3 and img_np.shape[2] == 3:
            img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        else:
            img_bgr = img_np
            
        conf_thresh = self.settings.pest_conf_threshold
        iou_thresh = self.settings.pest_iou_threshold
        
        # Run inference
        results = self._model(img_bgr, conf=conf_thresh, iou=iou_thresh, verbose=False)
        result = results[0] # batch size 1
        
        pests = []
        pest_counts = defaultdict(int)
        
        boxes = result.boxes
        if boxes is not None and len(boxes) > 0:
            for box in boxes:
                cls_id = int(box.cls[0].item())
                cls_name = self._model.names[cls_id]
                conf = float(box.conf[0].item())
                
                # xyxy format
                xyxy = box.xyxy[0].tolist()
                bbox = [int(x) for x in xyxy]
                
                pests.append(PestDetectionItem(
                    name=cls_name,
                    confidence=round(conf, 6),
                    bbox=bbox
                ))
                pest_counts[cls_name] += 1
                
        inference_ms = round((time.perf_counter() - t0) * 1000, 1)
        total_pests = len(pests)
        
        # Determine pest pressure
        pressure = "LOW"
        if total_pests >= 10:
            pressure = "HIGH"
        elif total_pests >= 4:
            pressure = "MODERATE"
            
        response = PestDetectionResponse(
            inference_ms=inference_ms,
            pests=pests,
            total_pests=total_pests,
            pest_counts=dict(pest_counts),
            pest_pressure=pressure
        )
        
        # Plotting the annotated image
        annotated_bgr = result.plot()
        annotated_img = Image.fromarray(cv2.cvtColor(annotated_bgr, cv2.COLOR_BGR2RGB))
        
        logger.info(
            "Pest inference: %.1f ms | Found %d pests | Pressure: %s",
            inference_ms,
            total_pests,
            pressure
        )
        
        return response, annotated_img

@lru_cache
def get_pest_service() -> PestService:
    return PestService()
