import React from 'react';
import {
  Bug,
  CloudSun,
  Droplets,
  Leaf,
  RefreshCw,
  ShieldAlert,
  TestTube,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

import { api, DEFAULT_FIELD_ID } from '../api';
import { useApi } from '../hooks';
import { PageHead } from '../components/Layout';
import { Async, Badge, Card, Meter, formatTime, levelTone } from '../components/ui';

const FACTORS = [
  { key: 'pest_pressure', label: 'Pest Pressure', icon: Bug },
  { key: 'water_stress', label: 'Water Stress', icon: Droplets },
  { key: 'nutrient_deficiency', label: 'Nutrient Deficiency', icon: TestTube },
  { key: 'disease_pressure', label: 'Disease Pressure', icon: Leaf },
  { key: 'weather_impact', label: 'Weather Impact', icon: CloudSun },
];

const RISK_COLOR = {
  low: '#16a34a',
  moderate: '#d97706',
  high: '#dc2626',
  critical: '#dc2626',
  neutral: '#93a69c',
};

function RiskCard({ icon, label, level }) {
  return (
    <div className="stat-card">
      <div
        className={`stat-icon ${
          levelTone(level) === 'high' || levelTone(level) === 'critical'
            ? 'red'
            : levelTone(level) === 'moderate'
              ? 'amber'
              : 'green'
        }`}
      >
        {icon}
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value sm">{level || '—'}</div>
      </div>
    </div>
  );
}

export default function RiskAnalytics() {
  const risk = useApi(() => api.risk(DEFAULT_FIELD_ID), []);

  return (
    <div className="stack">
      <PageHead
        icon={<ShieldAlert size={20} />}
        title="Risk Analytics"
        subtitle="View detailed risk assessment for your field"
        actions={
          <button className="btn btn-outline sm" onClick={() => risk.reload()}>
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      <Async state={risk} loadingLabel="Scoring field risk…">
        {(data) => {
          const tone = levelTone(data.overall_risk);
          const color = RISK_COLOR[tone] || RISK_COLOR.neutral;
          const gauge = [
            { name: 'risk', value: data.overall_score },
            { name: 'rest', value: 100 - data.overall_score },
          ];

          return (
            <div className="stack">
              <div className="grid cols-4">
                <RiskCard icon={<Leaf size={19} />} label="Disease Risk" level={data.disease_risk} />
                <RiskCard icon={<Bug size={19} />} label="Pest Risk" level={data.pest_risk} />
                <RiskCard icon={<Droplets size={19} />} label="Water Stress" level={data.water_stress} />
                <RiskCard icon={<ShieldAlert size={19} />} label="Overall Risk" level={data.overall_risk} />
              </div>

              <div className="grid split-even">
                <Card title="Overall Agricultural Risk" icon={<ShieldAlert size={16} />}>
                  <div style={{ position: 'relative' }}>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={gauge}
                          dataKey="value"
                          startAngle={210}
                          endAngle={-30}
                          innerRadius={62}
                          outerRadius={84}
                          paddingAngle={0}
                          stroke="none"
                        >
                          <Cell fill={color} />
                          <Cell fill="#eef2f0" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'grid',
                        placeItems: 'center',
                        pointerEvents: 'none',
                      }}
                    >
                      <div className="center">
                        <div style={{ fontSize: 28, fontWeight: 700, color }}>
                          {data.overall_score}%
                        </div>
                        <Badge level={data.overall_risk}>{data.overall_risk}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="small muted center">
                    Assessed {formatTime(data.timestamp)}
                  </div>
                </Card>

                <Card title="Risk Factors" icon={<ShieldAlert size={16} />}>
                  <div className="stack" style={{ gap: 13 }}>
                    {FACTORS.map(({ key, label, icon: Icon }) => {
                      const value = data.factors?.[key] ?? 0;
                      return (
                        <div key={key}>
                          <div className="row between small">
                            <span className="row" style={{ gap: 6 }}>
                              <Icon size={13} className="muted" />
                              <span className="strong">{label}</span>
                            </span>
                            <span className="muted">{value}%</span>
                          </div>
                          <div style={{ marginTop: 4 }}>
                            <Meter value={value} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="callout info" style={{ marginTop: 16 }}>
                    <ShieldAlert size={15} />
                    <span>
                      Risk scores come from a rule-based prototype engine. Treat them as an
                      early-warning signal, not a validated agronomic assessment.
                    </span>
                  </div>
                </Card>
              </div>
            </div>
          );
        }}
      </Async>
    </div>
  );
}
