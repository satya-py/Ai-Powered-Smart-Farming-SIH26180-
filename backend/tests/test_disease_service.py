"""Tests for disease model loading and inference."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.config import PROJECT_ROOT, get_settings
from backend.main import create_app
from backend.models.disease_model import DiseaseModelLoader
from backend.services.disease_service import DiseaseService


TEST_IMAGE = PROJECT_ROOT / "test_image1.jpeg"


@pytest.fixture(scope="module")
def settings():
    return get_settings()


@pytest.fixture(scope="module")
def disease_service():
    loader = DiseaseModelLoader()
    loader.load()
    return DiseaseService(model_loader=loader)


@pytest.mark.skipif(not TEST_IMAGE.exists(), reason="test_image1.jpeg missing")
def test_disease_model_loads(settings):
    loader = DiseaseModelLoader(settings=settings)
    loader.load()
    assert loader.is_loaded
    assert loader.model is not None


@pytest.mark.skipif(not TEST_IMAGE.exists(), reason="test_image1.jpeg missing")
def test_disease_service_inference(disease_service):
    result = disease_service.detect_from_path(TEST_IMAGE)

    assert result.inference_ms > 0
    assert result.disease.class_index >= 0
    assert result.disease.class_index < 38
    assert 0.0 <= result.disease.confidence <= 1.0
    assert result.disease.crop
    assert result.disease.class_name
    assert len(result.top_k) >= 1


@pytest.mark.skipif(not TEST_IMAGE.exists(), reason="test_image1.jpeg missing")
def test_disease_detect_api_endpoint():
    app = create_app()
    client = TestClient(app)

    with open(TEST_IMAGE, "rb") as f:
        response = client.post(
            "/api/disease/detect",
            files={"file": ("test_image1.jpeg", f, "image/jpeg")},
        )

    assert response.status_code == 200
    data = response.json()
    assert "disease" in data
    assert data["disease"]["class_name"]
    assert "confidence" in data["disease"]
    assert "top_k" in data


def test_health_endpoint():
    app = create_app()
    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
