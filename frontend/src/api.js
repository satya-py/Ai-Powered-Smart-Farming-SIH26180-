/**
 * Thin API client for the Smart Farm AI backend.
 * Override the base URL with VITE_API_BASE in a .env file if the API is not on :8000.
 */

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

/** Field the demo dashboard reads from — seeded by the backend on startup. */
export const DEFAULT_FIELD_ID = 1;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function parse(res) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON responses (e.g. 204) are fine.
  }

  if (!res.ok) {
    const detail =
      (body && (body.detail || body.message)) || `Request failed (${res.status})`;
    throw new ApiError(
      typeof detail === 'string' ? detail : JSON.stringify(detail),
      res.status,
    );
  }
  return body;
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new ApiError(
      'Cannot reach the backend. Start it with: python -m backend.main',
      0,
    );
  }
  return parse(res);
}

const get = (path) => request(path);

const post = (path, body) =>
  request(path, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

function upload(path, file) {
  const form = new FormData();
  form.append('file', file);
  return request(path, { method: 'POST', body: form });
}

export const api = {
  health: () => get('/api/health'),

  // Dashboard
  overview: () => get('/api/overview'),
  recentDetections: (limit = 5) =>
    get(`/api/overview/recent-detections?limit=${limit}`),

  // Fields
  fields: () => get('/api/fields'),
  createField: (data) => post('/api/fields', data),
  updateField: (id, data) =>
    request(`/api/fields/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  deleteField: (id) => request(`/api/fields/${id}`, { method: 'DELETE' }),

  // Detection
  detectDisease: (file) => upload('/api/disease/detect', file),
  detectPests: (file) => upload('/api/pests/detect?annotated=true', file),
  detectCombined: (file, fieldId) =>
    upload(
      fieldId ? `/api/detect/image?field_id=${fieldId}` : '/api/detect/image',
      file,
    ),

  // Sensors & monitoring
  sensors: () => get('/api/sensors/current'),
  latest: (fieldId) => get(`/api/monitoring/latest/${fieldId}`),
  history: (fieldId, days = 7) =>
    get(`/api/monitoring/history/${fieldId}?days=${days}`),
  simulate: (fieldId) => post(`/api/monitoring/simulate/${fieldId}`),

  // Analysis
  risk: (fieldId) => get(`/api/risk/${fieldId}`),
  alerts: (fieldId) => get(`/api/alerts/${fieldId}`),
  irrigation: (fieldId) => get(`/api/irrigation/${fieldId}`),
  report: (fieldId, days = 7) => get(`/api/reports/${fieldId}?days=${days}`),

  // Nutrients & fertilizer
  nutrients: (fieldId) => get(`/api/nutrients/latest/${fieldId}`),
  fertilizerCatalog: () => get('/api/fertilizer/catalog'),
  recommendFertilizer: (fieldId) => post(`/api/fertilizer/recommend/${fieldId}`),
  recommendManual: (data) => post('/api/fertilizer/recommend-manual', data),
  modelStatus: () => get('/api/models/status'),

  // Weather
  weather: () => get('/api/weather/current'),
  forecast: (days = 5) => get(`/api/weather/forecast?days=${days}`),
};
