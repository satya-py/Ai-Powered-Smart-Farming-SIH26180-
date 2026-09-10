import React, { useState } from 'react';
import { Download, FileBarChart, Leaf, ShieldAlert } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { api, DEFAULT_FIELD_ID } from '../api';
import { useApi } from '../hooks';
import { PageHead } from '../components/Layout';
import { Async, Card, EmptyState, FlushCard, StatCard, Tabs, num } from '../components/ui';

const RISK_COLORS = {
  LOW: '#16a34a',
  MODERATE: '#d97706',
  HIGH: '#dc2626',
  CRITICAL: '#991b1b',
};

const AVERAGES = [
  ['Temperature', 'temperature', '°C'],
  ['Humidity', 'humidity', '%'],
  ['Soil Moisture', 'soil_moisture', '%'],
  ['Nitrogen', 'nitrogen', 'mg/kg'],
  ['Phosphorus', 'phosphorus', 'mg/kg'],
  ['Potassium', 'potassium', 'mg/kg'],
  ['pH', 'ph', ''],
];

function downloadJson(report) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `field-${report.field.id}-report-${report.period_days}d.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [days, setDays] = useState(7);
  const report = useApi(() => api.report(DEFAULT_FIELD_ID, days), [days]);

  return (
    <div className="stack">
      <PageHead
        icon={<FileBarChart size={20} />}
        title="Reports"
        subtitle="Summary of field conditions over time"
        actions={
          <>
            <Tabs
              tabs={[
                { id: 7, label: '7 days' },
                { id: 30, label: '30 days' },
                { id: 90, label: '90 days' },
              ]}
              value={days}
              onChange={setDays}
            />
            {report.data && (
              <button className="btn btn-outline sm" onClick={() => downloadJson(report.data)}>
                <Download size={13} /> Export
              </button>
            )}
          </>
        }
      />

      <Async state={report} loadingLabel="Compiling report…">
        {(data) => {
          const riskData = Object.entries(data.risk_distribution || {}).map(
            ([level, count]) => ({ level, count }),
          );
          const hasRiskData = riskData.some((r) => r.count > 0);

          return (
            <div className="stack">
              <div className="grid cols-4">
                <StatCard
                  icon={<FileBarChart size={19} />}
                  label="Observations"
                  value={data.observations}
                  tone="blue"
                />
                <StatCard
                  icon={<Leaf size={19} />}
                  label="Disease Events"
                  value={data.disease_events}
                  tone={data.disease_events > 0 ? 'red' : 'green'}
                />
                <StatCard
                  icon={<ShieldAlert size={19} />}
                  label="Total Pests"
                  value={data.total_pests}
                  tone={data.total_pests > 0 ? 'amber' : 'green'}
                />
                <StatCard
                  icon={<Leaf size={19} />}
                  label="Crop"
                  value={data.field.crop || '—'}
                  tone="green"
                />
              </div>

              {data.observations === 0 ? (
                <Card>
                  <EmptyState
                    title="No observations in this period"
                    hint="Run Continuous Monitoring to collect data, then come back."
                  />
                </Card>
              ) : (
                <div className="grid split-even">
                  <FlushCard title={`Average Conditions — ${data.field.name}`}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Measurement</th>
                          <th style={{ width: 140 }}>Average</th>
                          <th style={{ width: 120 }}>Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {AVERAGES.map(([label, key, unit]) => (
                          <tr key={key}>
                            <td className="strong">{label}</td>
                            <td>{num(data.averages?.[key], 1)}</td>
                            <td className="muted">{unit || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </FlushCard>

                  <Card title="Risk Distribution" icon={<ShieldAlert size={16} />}>
                    {hasRiskData ? (
                      <ResponsiveContainer width="100%" height={230}>
                        <BarChart data={riskData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" vertical={false} />
                          <XAxis dataKey="level" tick={{ fontSize: 10, fill: '#93a69c' }} tickLine={false} axisLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#93a69c' }} tickLine={false} axisLine={false} />
                          <Tooltip
                            cursor={{ fill: '#f4f7f5' }}
                            contentStyle={{ borderRadius: 10, border: '1px solid #e6ebe8', fontSize: 12 }}
                          />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                            {riskData.map((entry) => (
                              <Cell key={entry.level} fill={RISK_COLORS[entry.level] || '#93a69c'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyState title="No risk data recorded" />
                    )}

                    {Object.keys(data.disease_breakdown || {}).length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div className="small muted strong">Diseases observed</div>
                        <div className="row wrap" style={{ marginTop: 7 }}>
                          {Object.entries(data.disease_breakdown).map(([name, count]) => (
                            <span className="badge-pill moderate" key={name}>
                              {name} × {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </div>
          );
        }}
      </Async>
    </div>
  );
}
