import React, { useState } from 'react';
import {
  Activity,
  CloudRain,
  Droplets,
  FlaskConical,
  Gauge,
  RefreshCw,
  Sun,
  Thermometer,
  TrendingUp,
  Waves,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { api, DEFAULT_FIELD_ID } from '../api';
import { useApi, usePolling } from '../hooks';
import { PageHead } from '../components/Layout';
import {
  Async,
  Card,
  EmptyState,
  FlushCard,
  Tabs,
  formatClock,
  num,
} from '../components/ui';

const TABS = [
  { id: 'live', label: 'Live Data', icon: <Activity size={13} /> },
  { id: 'history', label: 'Historical Data', icon: <TrendingUp size={13} /> },
  { id: 'trends', label: 'Trends', icon: <Gauge size={13} /> },
];

const METRICS = [
  { key: 'temperature', label: 'Temperature', icon: Thermometer, unit: '°C', tone: 'red', group: 'environment' },
  { key: 'humidity', label: 'Humidity', icon: Droplets, unit: '%', tone: 'blue', group: 'environment' },
  { key: 'soil_moisture', label: 'Soil Moisture', icon: Waves, unit: '%', tone: 'green', group: 'environment' },
  { key: 'light', label: 'Light', icon: Sun, unit: ' lux', tone: 'amber', group: 'environment' },
  { key: 'rainfall', label: 'Rainfall', icon: CloudRain, unit: ' mm', tone: 'blue', group: 'environment' },
  { key: 'ph', label: 'pH', icon: FlaskConical, unit: '', tone: 'green', group: 'nutrients' },
];

function MetricTile({ metric, value }) {
  const Icon = metric.icon;
  return (
    <div className="stat-card">
      <div className={`stat-icon ${metric.tone}`}>
        <Icon size={19} />
      </div>
      <div>
        <div className="stat-label">{metric.label}</div>
        <div className="stat-value">
          {num(value, metric.key === 'ph' ? 2 : 1, metric.unit)}
        </div>
      </div>
    </div>
  );
}

function LiveTab() {
  const sensors = useApi(() => api.sensors(), []);
  usePolling(() => sensors.reload(true), 5000, true);

  return (
    <div className="stack">
      <Async state={sensors} loadingLabel="Reading sensors…">
        {(data) => (
          <>
            <div className="grid cols-3">
              {METRICS.map((metric) => (
                <MetricTile
                  key={metric.key}
                  metric={metric}
                  value={data[metric.group]?.[metric.key]}
                />
              ))}
            </div>

            <FlushCard
              title="Latest Soil Nutrients"
              icon={<FlaskConical size={16} />}
              actions={
                <button className="btn btn-outline sm" onClick={() => sensors.reload()}>
                  <RefreshCw size={13} /> Refresh
                </button>
              }
            >
              <table className="table">
                <thead>
                  <tr>
                    <th>Reading</th>
                    <th style={{ width: 140 }}>Value</th>
                    <th style={{ width: 160 }}>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Nitrogen (N)', data.nutrients?.nitrogen, 'mg/kg'],
                    ['Phosphorus (P)', data.nutrients?.phosphorus, 'mg/kg'],
                    ['Potassium (K)', data.nutrients?.potassium, 'mg/kg'],
                    ['pH', data.nutrients?.ph, ''],
                    ['Organic Carbon', data.nutrients?.organic_carbon, '%'],
                    ['Electrical Conductivity', data.nutrients?.ec, 'dS/m'],
                    ['Leaf Wetness', data.environment?.leaf_wetness, '%'],
                  ].map(([label, value, unit]) => (
                    <tr key={label}>
                      <td className="strong">{label}</td>
                      <td>{num(value, 2)}</td>
                      <td className="muted">{unit || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </FlushCard>

            <div className="small muted">
              {data.connected
                ? 'Sensor bridge connected — readings refresh every 5 seconds.'
                : 'Sensor bridge is offline.'}
            </div>
          </>
        )}
      </Async>
    </div>
  );
}

function HistoryTab() {
  const [days, setDays] = useState(7);
  const history = useApi(() => api.history(DEFAULT_FIELD_ID, days), [days]);

  return (
    <FlushCard
      title="Historical Readings"
      icon={<TrendingUp size={16} />}
      actions={
        <Tabs
          tabs={[
            { id: 1, label: '24h' },
            { id: 7, label: '7 days' },
            { id: 30, label: '30 days' },
          ]}
          value={days}
          onChange={setDays}
        />
      }
    >
      <div className="card-body">
        <Async state={history}>
          {(data) => {
            const points = (data.points || []).map((p) => ({
              time: formatClock(p.timestamp),
              Temperature: p.temperature,
              Humidity: p.humidity,
              'Soil Moisture': p.soil_moisture,
            }));

            if (points.length === 0) {
              return (
                <EmptyState
                  title="No readings in this window"
                  hint="Run the simulation from Continuous Monitoring to build history."
                />
              );
            }

            return (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={points} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#93a69c' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#93a69c' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e6ebe8', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={7} />
                  <Line type="monotone" dataKey="Temperature" stroke="#f97316" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Humidity" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Soil Moisture" stroke="#16a34a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            );
          }}
        </Async>
      </div>
    </FlushCard>
  );
}

function TrendsTab() {
  const history = useApi(() => api.history(DEFAULT_FIELD_ID, 30), []);

  const SERIES = [
    { key: 'nitrogen', label: 'Nitrogen', color: '#a855f7' },
    { key: 'phosphorus', label: 'Phosphorus', color: '#0ea5e9' },
    { key: 'potassium', label: 'Potassium', color: '#f59e0b' },
    { key: 'soil_moisture', label: 'Soil Moisture', color: '#16a34a' },
  ];

  return (
    <Async state={history}>
      {(data) => {
        const points = (data.points || []).map((p) => ({
          time: formatClock(p.timestamp),
          ...p,
        }));

        if (points.length === 0) {
          return (
            <Card>
              <EmptyState title="No trend data yet" hint="Collect observations first." />
            </Card>
          );
        }

        return (
          <div className="grid cols-2">
            {SERIES.map((series) => (
              <Card key={series.key} title={series.label} icon={<TrendingUp size={16} />}>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={points} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`g-${series.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={series.color} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={series.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#93a69c' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#93a69c' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e6ebe8', fontSize: 12 }} />
                    <Area
                      type="monotone"
                      dataKey={series.key}
                      stroke={series.color}
                      strokeWidth={2}
                      fill={`url(#g-${series.key})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            ))}
          </div>
        );
      }}
    </Async>
  );
}

export default function SensorAnalysis() {
  const [tab, setTab] = useState('live');

  return (
    <div className="stack">
      <PageHead
        icon={<Activity size={20} />}
        title="Sensor Analytics"
        subtitle="Monitor soil and environmental conditions"
        actions={<Tabs tabs={TABS} value={tab} onChange={setTab} />}
      />

      {tab === 'live' && <LiveTab />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'trends' && <TrendsTab />}
    </div>
  );
}
