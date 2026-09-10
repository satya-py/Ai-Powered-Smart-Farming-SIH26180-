import React from 'react';
import {
  AlertTriangle,
  FlaskConical,
  Lightbulb,
  RefreshCw,
  TestTube,
} from 'lucide-react';

import { api, DEFAULT_FIELD_ID } from '../api';
import { useApi } from '../hooks';
import { PageHead } from '../components/Layout';
import {
  Async,
  Badge,
  Card,
  FlushCard,
  Meter,
  num,
} from '../components/ui';

const NUTRIENTS = [
  { key: 'nitrogen', label: 'Nitrogen (N)', symbol: 'N', max: 150 },
  { key: 'phosphorus', label: 'Phosphorus (P)', symbol: 'P', max: 100 },
  { key: 'potassium', label: 'Potassium (K)', symbol: 'K', max: 200 },
];

const RING_TONE = {
  ADEQUATE: 'good',
  HIGH: 'warn',
  LOW: 'warn',
  DEFICIENT: 'bad',
};

function Gauge({ label, value, status, digits = 0 }) {
  const tone = RING_TONE[String(status).split(' ')[0]] || 'good';
  return (
    <div className="gauge">
      <div className={`gauge-ring ${tone}`}>{num(value, digits)}</div>
      <div className="gauge-name">{label}</div>
      <Badge level={status}>{status}</Badge>
    </div>
  );
}

export default function NutrientHealth() {
  const nutrients = useApi(() => api.nutrients(DEFAULT_FIELD_ID), []);

  return (
    <div className="stack">
      <PageHead
        icon={<TestTube size={20} />}
        title="Nutrient Health"
        subtitle="Analyze soil nutrients and identify deficiencies"
        actions={
          <button className="btn btn-outline sm" onClick={() => nutrients.reload()}>
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      <Async state={nutrients} loadingLabel="Reading soil nutrients…">
        {(data) => {
          const deficient = NUTRIENTS.filter((n) =>
            ['LOW', 'DEFICIENT'].includes(data.nutrients?.[n.key]?.status),
          );

          return (
            <div className="stack">
              <div className="grid split">
                <Card title="Soil Nutrient Status" icon={<FlaskConical size={16} />}>
                  <div className="grid cols-4">
                    {NUTRIENTS.map((n) => (
                      <Gauge
                        key={n.key}
                        label={n.symbol}
                        value={data.soil?.[n.key]}
                        status={data.nutrients?.[n.key]?.status}
                      />
                    ))}
                    <Gauge
                      label="pH"
                      value={data.soil?.ph}
                      status={
                        data.soil?.ph == null
                          ? 'UNKNOWN'
                          : data.soil.ph < 5.5
                            ? 'LOW'
                            : data.soil.ph > 7.5
                              ? 'HIGH'
                              : 'ADEQUATE'
                      }
                      digits={1}
                    />
                  </div>

                  <div className="stack" style={{ gap: 12, marginTop: 18 }}>
                    {NUTRIENTS.map((n) => (
                      <div key={n.key}>
                        <div className="row between small">
                          <span className="strong">{n.label}</span>
                          <span className="muted">
                            {num(data.soil?.[n.key], 1, ' mg/kg')} · needs{' '}
                            {num(data.npk_need?.[`${n.key}_need`], 1)}
                          </span>
                        </div>
                        <div style={{ marginTop: 4 }}>
                          <Meter
                            value={data.soil?.[n.key]}
                            max={n.max}
                            tone={
                              ['LOW', 'DEFICIENT'].includes(data.nutrients?.[n.key]?.status)
                                ? 'red'
                                : ''
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <FlushCard title="Nutrient Analysis" icon={<TestTube size={16} />}>
                  <table className="table">
                    <tbody>
                      {[
                        ['Nitrogen (N)', data.soil?.nitrogen, data.nutrients?.nitrogen?.status, 'mg/kg'],
                        ['Phosphorus (P)', data.soil?.phosphorus, data.nutrients?.phosphorus?.status, 'mg/kg'],
                        ['Potassium (K)', data.soil?.potassium, data.nutrients?.potassium?.status, 'mg/kg'],
                        ['pH Level', data.soil?.ph, null, ''],
                        ['Organic Carbon', data.soil?.organic_carbon, null, '%'],
                        ['Soil Moisture', data.soil?.moisture, null, '%'],
                        ['Electrical Conductivity', data.soil?.ec, null, 'dS/m'],
                      ].map(([label, value, status, unit]) => (
                        <tr key={label}>
                          <td className="strong">{label}</td>
                          <td>
                            {num(value, 2)} <span className="muted small">{unit}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {status && <Badge level={status}>{status}</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </FlushCard>
              </div>

              <Card title="Recommendations" icon={<Lightbulb size={16} />}>
                {deficient.length > 0 ? (
                  <div className="callout warning">
                    <AlertTriangle size={15} />
                    <div>
                      <strong>
                        {deficient.map((n) => n.label).join(' and ')}{' '}
                        {deficient.length > 1 ? 'are' : 'is'} below optimal levels.
                      </strong>
                      <div style={{ marginTop: 5 }}>
                        Consider balanced fertilization. Head to Fertilizer Recommendation
                        for a matched product and a safe application window.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="callout success">
                    <Lightbulb size={15} />
                    <span>
                      Soil nutrient levels are within the expected range. Keep monitoring
                      and re-test after the next fertilization cycle.
                    </span>
                  </div>
                )}
              </Card>
            </div>
          );
        }}
      </Async>
    </div>
  );
}
