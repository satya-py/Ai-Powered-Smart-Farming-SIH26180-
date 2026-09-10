import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CloudSun,
  FlaskConical,
  Loader2,
  Package,
  RotateCcw,
  Settings2,
} from 'lucide-react';

import { api } from '../api';
import { useApi } from '../hooks';
import { PageHead } from '../components/Layout';
import { Badge, Card, EmptyState, FlushCard, Meter, num } from '../components/ui';

const CROPS = ['Tomato', 'Potato', 'Corn', 'Wheat', 'Rice', 'Cotton', 'Pepper', 'Grape'];

/** Inputs the model reads, grouped so the form reads like a soil test report. */
const SOIL_FIELDS = [
  { key: 'nitrogen', label: 'Nitrogen (N)', unit: 'mg/kg', step: 1, min: 0, max: 1000 },
  { key: 'phosphorus', label: 'Phosphorus (P)', unit: 'mg/kg', step: 1, min: 0, max: 1000 },
  { key: 'potassium', label: 'Potassium (K)', unit: 'mg/kg', step: 1, min: 0, max: 1000 },
  { key: 'ph', label: 'Soil pH', unit: '', step: 0.1, min: 0, max: 14 },
];

const CONDITION_FIELDS = [
  { key: 'soil_moisture', label: 'Soil Moisture', unit: '%', step: 1, min: 0, max: 100 },
  { key: 'temperature', label: 'Temperature', unit: '°C', step: 0.5, min: -20, max: 60 },
  { key: 'rainfall', label: 'Rainfall', unit: 'mm', step: 0.5, min: 0, max: 500 },
  { key: 'field_size', label: 'Field Size', unit: 'acres', step: 0.1, min: 0.1, max: 10000 },
];

const ALL_FIELDS = [...SOIL_FIELDS, ...CONDITION_FIELDS];

const INITIAL = {
  crop: 'Tomato',
  nitrogen: 35,
  phosphorus: 48,
  potassium: 28,
  ph: 6.5,
  soil_moisture: 40,
  temperature: 25,
  rainfall: 0,
  field_size: 1,
};

const MAX_BY_NUTRIENT = { nitrogen: 150, phosphorus: 100, potassium: 200, ph: 14 };

const STATUS_ICON = {
  DEFICIENT: AlertTriangle,
  LOW: AlertTriangle,
  HIGH: AlertCircle,
  ADEQUATE: CheckCircle2,
};

/** One nutrient's verdict: measured value, status, and how much is short. */
function NutrientVerdict({ nutrient }) {
  const base = String(nutrient.status).split(' ')[0];
  const Icon = STATUS_ICON[base] || AlertCircle;
  const tone = nutrient.deficient ? (base === 'DEFICIENT' ? 'red' : 'amber') : 'green';

  return (
    <div className="row-item" style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
      <div className={`row-icon ${tone === 'green' ? '' : tone}`}>
        <Icon size={15} />
      </div>

      <div className="grow">
        <div className="row-title">{nutrient.label}</div>
        <div className="row-sub">
          Measured {num(nutrient.measured, 1)} {nutrient.unit}
          {/* Only a deficient reading is "short"; an adequate one just gets a top-up. */}
          {nutrient.need_per_acre > 0 &&
            (nutrient.deficient
              ? ` · short by ${num(nutrient.need_per_acre, 1)} kg/acre`
              : ` · optional top-up ${num(nutrient.need_per_acre, 1)} kg/acre`)}
        </div>
        {nutrient.symbol !== 'pH' && (
          <div style={{ marginTop: 5, maxWidth: 220 }}>
            <Meter
              value={nutrient.measured}
              max={MAX_BY_NUTRIENT[nutrient.label.toLowerCase()] || 150}
              tone={nutrient.deficient ? 'red' : ''}
            />
          </div>
        )}
      </div>

      <Badge level={nutrient.status}>{nutrient.status}</Badge>
    </div>
  );
}

export default function ManualNutrientInput() {
  const [form, setForm] = useState(INITIAL);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const models = useApi(() => api.modelStatus(), []);

  const setField = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const reset = () => {
    setForm(INITIAL);
    setResult(null);
    setError(null);
  };

  const submit = async (event) => {
    event.preventDefault();

    // Reject blanks and out-of-range values before hitting the API.
    for (const { key, label, min, max } of ALL_FIELDS) {
      const value = Number(form[key]);
      if (form[key] === '' || Number.isNaN(value)) {
        setError(`Enter a value for ${label}.`);
        return;
      }
      if (value < min || value > max) {
        setError(`${label} must be between ${min} and ${max}.`);
        return;
      }
    }

    setBusy(true);
    setError(null);
    try {
      const payload = { crop: form.crop };
      for (const { key } of ALL_FIELDS) payload[key] = Number(form[key]);
      setResult(await api.recommendManual(payload));
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  const nutrientList = result
    ? ['nitrogen', 'phosphorus', 'potassium', 'ph']
        .map((key) => result.nutrients?.[key])
        .filter(Boolean)
    : [];

  return (
    <div className="stack">
      <PageHead
        icon={<Settings2 size={20} />}
        title="Manual Soil Input"
        subtitle="Enter your N, P, K and soil readings — the model reports which nutrients are deficient"
        actions={
          <button className="btn btn-outline sm" onClick={reset} disabled={busy}>
            <RotateCcw size={13} /> Reset
          </button>
        }
      />

      <div className="grid split-even">
        <Card title="Soil Test Readings" icon={<FlaskConical size={16} />}>
          <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
            <div className="field">
              <label htmlFor="manual-crop">Crop</label>
              <select id="manual-crop" value={form.crop} onChange={setField('crop')}>
                {CROPS.map((crop) => (
                  <option key={crop}>{crop}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="small muted strong" style={{ marginBottom: 8 }}>
                Nutrients
              </div>
              <div className="grid cols-2" style={{ gap: 12 }}>
                {SOIL_FIELDS.map(({ key, label, unit, step, min, max }) => (
                  <div className="field" key={key}>
                    <label htmlFor={`manual-${key}`}>
                      {label} {unit && <span className="faint">({unit})</span>}
                    </label>
                    <input
                      id={`manual-${key}`}
                      type="number"
                      step={step}
                      min={min}
                      max={max}
                      value={form[key]}
                      onChange={setField(key)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="small muted strong" style={{ marginBottom: 8 }}>
                Field & Conditions
              </div>
              <div className="grid cols-2" style={{ gap: 12 }}>
                {CONDITION_FIELDS.map(({ key, label, unit, step, min, max }) => (
                  <div className="field" key={key}>
                    <label htmlFor={`manual-${key}`}>
                      {label} {unit && <span className="faint">({unit})</span>}
                    </label>
                    <input
                      id={`manual-${key}`}
                      type="number"
                      step={step}
                      min={min}
                      max={max}
                      value={form[key]}
                      onChange={setField(key)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <button className="btn btn-primary block" type="submit" disabled={busy}>
              {busy ? <Loader2 size={15} className="spin" /> : <FlaskConical size={15} />}
              {busy ? 'Analyzing…' : 'Analyze Soil'}
            </button>

            {error && (
              <div className="callout danger">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}
          </form>
        </Card>

        <div className="stack">
          <Card title="Deficiency Report" icon={<AlertTriangle size={16} />}>
            {!result && !busy && (
              <EmptyState
                title="No analysis yet"
                hint="Enter your soil readings and press Analyze Soil."
              />
            )}

            {busy && (
              <div className="state">
                <Loader2 size={22} className="spin" />
                <span>Evaluating your soil readings…</span>
              </div>
            )}

            {result && (
              <div className="stack" style={{ gap: 13 }}>
                <div className={`callout ${result.deficient_count > 0 ? 'warning' : 'success'}`}>
                  {result.deficient_count > 0 ? (
                    <AlertTriangle size={15} />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  <div>
                    <strong>{result.summary}</strong>
                    <div style={{ marginTop: 3 }}>
                      {result.deficient_count > 0
                        ? `${result.deficient_count} of ${nutrientList.length} readings need attention for ${result.crop}.`
                        : `All readings look suitable for ${result.crop}.`}
                    </div>
                  </div>
                </div>

                <div className="stack" style={{ gap: 8 }}>
                  {nutrientList.map((nutrient) => (
                    <NutrientVerdict key={nutrient.label} nutrient={nutrient} />
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card title="Model Status" icon={<Settings2 size={16} />}>
            {models.loading && <span className="small muted">Checking models…</span>}
            {models.error && <span className="small muted">{models.error}</span>}
            {models.data && (
              <div className="stack" style={{ gap: 10 }}>
                {Object.values(models.data).map((info) => {
                  const loaded = info.status === 'loaded';
                  return (
                    <div className="row between" key={info.name} style={{ alignItems: 'flex-start' }}>
                      <div className="grow">
                        <div className="small strong">{info.name}</div>
                        {!loaded && (
                          <div className="small faint">
                            Using the built-in rule-based engine instead.
                          </div>
                        )}
                      </div>
                      <span className={`badge-pill ${loaded ? 'good' : 'moderate'}`}>
                        {loaded ? 'Loaded' : 'Fallback'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {result && (
        <div className="grid split-even">
          <FlushCard title="Nutrient Requirement" icon={<Package size={16} />}>
            <table className="table">
              <thead>
                <tr>
                  <th>Nutrient</th>
                  <th>Per acre</th>
                  <th>Total for {num(result.field_size, 1)} acre(s)</th>
                </tr>
              </thead>
              <tbody>
                {nutrientList
                  .filter((n) => n.symbol !== 'pH')
                  .map((nutrient) => (
                    <tr key={nutrient.label}>
                      <td className="strong">{nutrient.label}</td>
                      <td>{num(nutrient.need_per_acre, 1, ' kg')}</td>
                      <td className="strong">{num(nutrient.total_need, 1, ' kg')}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </FlushCard>

          <Card title="Suggested Fertilizers" icon={<Package size={16} />}>
            <div className={`callout ${result.weather_status?.startsWith('GOOD') ? 'success' : 'warning'}`}>
              <CloudSun size={15} />
              <span>{result.weather_status}</span>
            </div>

            <div className="stack" style={{ gap: 8, marginTop: 12 }}>
              {(result.recommendations || []).slice(0, 4).map((rec, index) => (
                <div
                  className="row-item"
                  key={rec.id ?? index}
                  style={{ border: '1px solid var(--border)', borderRadius: 10 }}
                >
                  <div className="row-icon">
                    <Package size={15} />
                  </div>
                  <div className="grow">
                    <div className="row-title">{rec.name}</div>
                    <div className="row-sub">{rec.reason}</div>
                  </div>
                  <span className="badge-pill neutral">{num(rec.match_score, 0)}% match</span>
                </div>
              ))}

              {(result.recommendations || []).length === 0 && (
                <EmptyState title="No fertilizer matched this soil profile" />
              )}
            </div>

            <div className="callout warning" style={{ marginTop: 12 }}>
              <AlertCircle size={15} />
              <span>
                Prototype guidance, not a prescription. Confirm rates with your local
                agricultural extension officer before applying.
              </span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
