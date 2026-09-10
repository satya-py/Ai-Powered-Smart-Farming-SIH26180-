"""Smoke tests covering the API surface the dashboard depends on.

These run without the ML checkpoints — they exercise routing, the database,
the sensor mock and the rule engines.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.main import create_app


@pytest.fixture(scope="module")
def client():
    with TestClient(create_app()) as c:
        # Guarantee at least one observation exists for the seeded field.
        c.post("/api/monitoring/simulate/1")
        yield c


def test_health(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert body["database_reachable"] is True


def test_seeded_field_exists(client):
    fields = client.get("/api/fields").json()
    assert any(f["id"] == 1 for f in fields)


@pytest.mark.parametrize(
    "path",
    [
        "/api/fields",
        "/api/overview",
        "/api/overview/recent-detections",
        "/api/sensors/current",
        "/api/weather/current",
        "/api/weather/forecast",
        "/api/monitoring/latest/1",
        "/api/monitoring/history/1",
        "/api/risk/1",
        "/api/alerts/1",
        "/api/irrigation/1",
        "/api/reports/1",
        "/api/nutrients/latest/1",
        "/api/fertilizer/catalog",
        "/api/models/status",
    ],
)
def test_get_endpoints_ok(client, path):
    assert client.get(path).status_code == 200


def test_simulate_persists_observation(client):
    before = client.get("/api/monitoring/history/1").json()["total_records"]
    assert client.post("/api/monitoring/simulate/1").status_code == 200
    after = client.get("/api/monitoring/history/1").json()["total_records"]
    assert after == before + 1


def test_field_crud(client):
    created = client.post("/api/fields", json={"name": "Test Field", "crop": "Wheat"})
    assert created.status_code == 201
    field_id = created.json()["id"]

    updated = client.patch(f"/api/fields/{field_id}", json={"crop": "Rice"})
    assert updated.json()["crop"] == "Rice"

    assert client.delete(f"/api/fields/{field_id}").status_code == 204
    assert client.get(f"/api/risk/{field_id}").status_code == 404


def test_unknown_field_is_404(client):
    for path in ("/api/risk/9999", "/api/alerts/9999", "/api/monitoring/latest/9999"):
        assert client.get(path).status_code == 404


def test_history_rejects_bad_window(client):
    assert client.get("/api/monitoring/history/1?days=0").status_code == 422
    assert client.get("/api/monitoring/history/1?days=999").status_code == 422


def test_manual_fertilizer_recommendation(client):
    resp = client.post(
        "/api/fertilizer/recommend-manual",
        json={"crop": "Tomato", "nitrogen": 20, "phosphorus": 15, "potassium": 30},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["npk_need"]["nitrogen_need"] > 0
    assert len(body["recommendations"]) > 0


def test_manual_input_reports_deficiencies(client):
    """Low N and K with an acidic pH must all be flagged."""
    resp = client.post(
        "/api/fertilizer/recommend-manual",
        json={
            "crop": "Tomato",
            "nitrogen": 15,
            "phosphorus": 48,
            "potassium": 25,
            "ph": 5.1,
            "field_size": 2.5,
        },
    )
    assert resp.status_code == 200
    body = resp.json()

    assert body["deficient_count"] == 3
    assert set(body["deficient"]) == {"Nitrogen", "Potassium", "Soil pH"}
    assert body["nutrients"]["nitrogen"]["status"] == "DEFICIENT"
    assert body["nutrients"]["phosphorus"]["deficient"] is False
    # Total need scales with field size.
    n = body["nutrients"]["nitrogen"]
    assert n["total_need"] == pytest.approx(n["need_per_acre"] * 2.5, rel=1e-3)


def test_manual_input_all_adequate(client):
    resp = client.post(
        "/api/fertilizer/recommend-manual",
        json={"crop": "Tomato", "nitrogen": 90, "phosphorus": 55, "potassium": 160, "ph": 6.5},
    )
    body = resp.json()
    assert body["deficient_count"] == 0
    assert body["deficient"] == []


@pytest.mark.parametrize(
    "payload",
    [
        {"nitrogen": -5, "phosphorus": 1, "potassium": 1},
        {"nitrogen": 1, "phosphorus": 1, "potassium": 1, "ph": 99},
        {"nitrogen": 1, "phosphorus": 1, "potassium": 1, "field_size": 0},
    ],
)
def test_manual_input_rejects_out_of_range(client, payload):
    assert client.post("/api/fertilizer/recommend-manual", json=payload).status_code == 422


def test_upload_rejects_non_image(client):
    resp = client.post(
        "/api/disease/detect",
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert resp.status_code == 415


def test_upload_rejects_empty_file(client):
    resp = client.post(
        "/api/disease/detect",
        files={"file": ("empty.jpg", b"", "image/jpeg")},
    )
    assert resp.status_code == 400
