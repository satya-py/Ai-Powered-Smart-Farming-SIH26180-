import React, { useState } from 'react';
import {
  AlertCircle,
  CloudSun,
  Droplets,
  Leaf,
  Loader2,
  Package,
  Sprout,
  TrendingUp,
} from 'lucide-react';

import { api, DEFAULT_FIELD_ID } from '../api';
import { PageHead } from '../components/Layout';
import { Card, EmptyState, Meter, num } from '../components/ui';

const CROPS = ['Tomato', 'Potato', 'Corn', 'Wheat', 'Rice', 'Cotton', 'Pepper', 'Grape'];
const STAGES = ['Vegetative', 'Flowering', 'Fruiting', 'Maturity'];

const BENEFITS = [
  { icon: TrendingUp, label: 'Increases growth', tone: 'green' },
  { icon: Sprout, label: 'Improves yield', tone: 'amber' },
  { icon: Leaf, label: 'Better quality', tone: 'blue' },
  { icon: Droplets, label: 'Soil health', tone: 'green' },
];

function weatherTone(status = '') {
  if (status.startsWith('GOOD')) return 'success';
  if (status.startsWith('WAIT')) return 'danger';
  return 'warning';
}

function priorityFor(score) {
  if (score >= 90) return { label: 'High Priority', tone: 'high' };
  if (score >= 60) return { label: 'Medium Priority', tone: 'moderate' };
  return { label: 'Low Priority', tone: 'low' };
}

export default function FertilizerRecommendation() {
  const [form, setForm] = useState({ crop: 'Tomato', stage: 'Vegetative', fieldSize: 2 });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await api.recommendFertilizer(DEFAULT_FIELD_ID));
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  const perAcre = Number(form.fieldSize) || 1;

  return (
    <div className="stack">
      <PageHead
        icon={<Sprout size={20} />}
        title="Fertilizer Recommendation"
        subtitle="Get AI-ranked fertilizer suggestions based on soil, crop and weather"
      />

      <div className="grid split-even">
        <Card title="Recommended Fertilizers" icon={<Package size={16} />}>
          <div className="stack" style={{ gap: 14 }}>
            <div className="field">
              <label htmlFor="crop">Crop</label>
              <select id="crop" value={form.crop} onChange={set('crop')}>
                {CROPS.map((crop) => (
                  <option key={crop}>{crop}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="stage">Growth Stage</label>
              <select id="stage" value={form.stage} onChange={set('stage')}>
                {STAGES.map((stage) => (
                  <option key={stage}>{stage}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="size">Field Size (acres)</label>
              <input
                id="size"
                type="number"
                min="0.1"
                step="0.1"
                value={form.fieldSize}
                onChange={set('fieldSize')}
              />
            </div>

            <button className="btn btn-primary block" onClick={submit} disabled={busy}>
              {busy ? <Loader2 size={15} className="spin" /> : <Sprout size={15} />}
              {busy ? 'Calculating…' : 'Get Recommendation'}
            </button>

            {error && (
              <div className="callout danger">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <div className="callout info">
              <AlertCircle size={15} />
              <span>
                Crop, stage and field size scale the dose shown. Nutrient needs come from
                the latest soil observation for this field.
              </span>
            </div>
          </div>
        </Card>

        <Card title="Recommendation Result" icon={<Package size={16} />}>
          {!result && !busy && (
            <EmptyState
              title="No recommendation yet"
              hint="Fill in the crop details and run the recommendation."
            />
          )}

          {busy && (
            <div className="state">
              <Loader2 size={22} className="spin" />
              <span>Matching fertilizers to your soil profile…</span>
            </div>
          )}

          {result && (
            <div className="stack" style={{ gap: 14 }}>
              <div className={`callout ${weatherTone(result.weather_status)}`}>
                <CloudSun size={15} />
                <div>
                  <strong>Application window: {result.weather_status}</strong>
                </div>
              </div>

              <div>
                <div className="small muted strong" style={{ marginBottom: 8 }}>
                  Nutrient requirement (per acre)
                </div>
                <div className="grid cols-3">
                  {[
                    ['Nitrogen', result.npk_need?.nitrogen_need, 150],
                    ['Phosphorus', result.npk_need?.phosphorus_need, 100],
                    ['Potassium', result.npk_need?.potassium_need, 150],
                  ].map(([label, value, max]) => (
                    <div key={label}>
                      <div className="small muted">{label}</div>
                      <div className="strong">{num(value, 1, ' kg')}</div>
                      <div style={{ marginTop: 4 }}>
                        <Meter value={value} max={max} tone="amber" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="stack" style={{ gap: 9 }}>
                {(result.recommendations || []).slice(0, 4).map((rec, index) => {
                  const priority = priorityFor(rec.match_score);
                  // Rough per-acre dose scaled from the largest matching need.
                  const dose = Math.round(
                    (Math.max(
                      result.npk_need?.nitrogen_need || 0,
                      result.npk_need?.phosphorus_need || 0,
                      result.npk_need?.potassium_need || 0,
                    ) *
                      perAcre) /
                      2,
                  );

                  return (
                    <div className="row-item" key={rec.id ?? index} style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
                      <div className="row-icon">
                        <Package size={15} />
                      </div>
                      <div className="grow">
                        <div className="row-title">{rec.name}</div>
                        <div className="row-sub">
                          {rec.category} · about {dose} kg/acre
                        </div>
                        <div className="row-sub">{rec.reason}</div>
                      </div>
                      <span className={`badge-pill ${priority.tone}`}>{priority.label}</span>
                    </div>
                  );
                })}

                {(result.recommendations || []).length === 0 && (
                  <EmptyState title="No fertilizer matched this soil profile" />
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card title="Nutrient Benefits" icon={<Leaf size={16} />}>
        <div className="grid cols-4">
          {BENEFITS.map(({ icon: Icon, label, tone }) => (
            <div className="gauge" key={label}>
              <div className={`stat-icon ${tone}`}>
                <Icon size={19} />
              </div>
              <div className="gauge-name">{label}</div>
            </div>
          ))}
        </div>
        <div className="callout warning" style={{ marginTop: 14 }}>
          <AlertCircle size={15} />
          <span>
            These are prototype guidance values, not a prescription. Confirm rates with
            your local agricultural extension officer before applying.
          </span>
        </div>
      </Card>
    </div>
  );
}
