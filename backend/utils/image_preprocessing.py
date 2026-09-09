"""Image preprocessing for disease inference (training-aligned pipeline)."""

from __future__ import annotations

import io
from pathlib import Path

import torch
from PIL import Image
from torchvision import transforms

from backend.config import get_settings


def _inference_transform() -> transforms.Compose:
    s = get_settings()
    return transforms.Compose([
        transforms.Resize(int(s.img_size * 256 / 224)),
        transforms.CenterCrop(s.img_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=s.imagenet_mean, std=s.imagenet_std),
    ])


def load_pil_from_bytes(data: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(data))
    if img.mode != "RGB":
        img = img.convert("RGB")
    return img


def load_pil_from_path(path: str | Path) -> Image.Image:
    img = Image.open(path)
    if img.mode != "RGB":
        img = img.convert("RGB")
    return img


def preprocess_image(image: Image.Image, device: torch.device) -> torch.Tensor:
    tensor = _inference_transform()(image).unsqueeze(0).to(device)
    return tensor


def preprocess_bytes(raw: bytes, device: torch.device) -> tuple[torch.Tensor, Image.Image]:
    pil = load_pil_from_bytes(raw)
    return preprocess_image(pil, device), pil
