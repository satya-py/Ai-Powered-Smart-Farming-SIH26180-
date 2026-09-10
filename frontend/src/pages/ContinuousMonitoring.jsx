import React, { useCallback, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Bell,
  History,
  Pause,
  Play,
  Radio,
  TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid,
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
  Badge,
  Card,
  EmptyState,
  FlushCard,
  Tabs,
  formatClock,
  formatTime,
  num,
} from '../components/ui';

const TABS = [
  { id: 'trends', label: 'Trends', icon: <TrendingUp size={13} /> },
  { id: 'history', label: 'History', icon: <History size={13} /> },
  { id: 'alerts', label: 'Alerts', icon: <Bell size={13} /> },
];

const SPARKS = [
  { key: 'temperature', label: 'Temperature', color: '#f97316', unit: '°C' },
  { key: 'soil_moisture', label: 'Soil Moisture', color: '#16a34a', unit: '%' },
  { key: 'humidity', label: 'Humidity', color: '#3b82f6', unit: '%' },
  { key: 'nitrogen', label: 'Nitrogen Level', color: '#a855f7', unit: '' },
];

const POLL_MS = 3000;

export default function ContinuousMonitoring() {
  const [tab, setTab] = useState('trends');
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [series, setSeries] = useState([]);
  const [latest, setLatest] = useState(null);
  const [error, setError] = useState(null);

  const alerts = useApi(() => api.alerts(DEFAULT_FIELD_ID), []);
  const history = useApi(() => api.history(DEFAULT_FIELD_ID, 7), []);

  const tick = useCallback(async () => {
    try {
      const data = await api.simulate(DEFAULT_FIELD_ID);
      setError(null);
      setLatest(data);

      const time = formatClock(data.timestamp);
      setLogs((prev) =>
        [
          `[${time}] Observation #${data.id} — temp ${num(data.environment.temperature, 1, '°C')}, ` +
            `moisture ${num(data.environment.soil_moisture, 1, '%')}, N ${num(data.nutrients.nitrogen, 1)}, ` +
            `risk ${data.risk.overall_risk}`,
          ...prev,
        ].slice(0, 12),
      );

      setSeries((prev) =>
        [
          ...prev,
          {
            time,
            temperature: data.environment.temperature,
            humidity: data.environment.humidity,
            soil_moisture: data.environment.soil_moisture,
            nitrogen: data.nutrients.nitrogen,
          },
        ].slice(-20),
      );

      alerts.reload(true);
    } catch (err) {
      setError(err.message);
      setRunning(false);
    }
  }, [alerts]);

  usePolling(tick, POLL_MS, running);

  const toggle = () => {
    if (!running) tick();
    setRunning((v) => !v);
  };

  return (
    <div className="stack">
      <PageHead
        icon={<Radio size={20} />}
        title="Continuous Monitoring"
        subtitle="Track trends and get early warnings"
        actions={
          <>
            <Tabs tabs={TABS} value={tab} onChange={setTab} />
            <button
              className={`btn ${running ? 'btn-danger' : 'btn-primary'} sm`}
              onClick={toggle}
            >
              {running ? <Pause size={14} /> : <Play size={14} />}
              {running ? 'Stop' : 'Start'} monitoring
            </button>
          </>
        }
      />

      {error && (
        <div className="callout danger">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {running && (
        <div className="callout success">
          <span className="status-dot" />
          <span>
            Live — polling the field every {POLL_MS / 1000} seconds. Each tick reads the
            sensors, scores risk and stores an observation.
          </span>
        </div>
      )}

      {tab === 'trends' && (
        <div className="stack">
          <div className="grid cols-4">
            {SPARKS.map((spark) => (
              <Card key={spark.key} title={spark.label} icon={<Activity size={15} />}>
                <div className="stat-value" style={{ marginBottom: 6 }}>
                  {num(series.at(-1)?.[spark.key], 1, spark.unit)}
                </div>
                {series.length > 1 ? (
                  <ResponsiveContainer width="100%" height={70}>
                    <LineChart data={series} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: '1px solid #e6ebe8', fontSize: 11 }}
                      />
                      <Line
                        type="monotone"
                        dataKey={spark.key}
                        stroke={spark.color}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="small faint">Start monitoring to plot this metric.</div>
                )}
              </Card>
            ))}
          </div>

          <div className="grid split">
            <Card title="Live Log" icon={<Radio size={16} />}>
              {logs.length === 0 ? (
                <EmptyState
                  title="Monitoring is idle"
                  hint="Press Start monitoring to begin the observation loop."
                />
              ) : (
                <div className="log-console">
                  {logs.map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Latest Observation" icon={<Activity size={16} />}>
              {!latest ? (
                <EmptyState title="No observation yet" />
              ) : (
                <div className="stack" style={{ gap: 11 }}>
                  <div className="row between">
                    <span className="small muted">Overall risk</span>
                    <Badge level={latest.risk.overall_risk}>{latest.risk.overall_risk}</Badge>
                  </div>
                  {[
                    ['Disease risk', latest.risk.disease_risk],
                    ['Pest risk', latest.risk.pest_risk],
                    ['Water stress', latest.risk.water_stress],
                  ].map(([label, value]) => (
                    <div className="row between" key={label}>
                      <span className="small muted">{label}</span>
                      <Badge level={value}>{value}</Badge>
                    </div>
                  ))}

                  <div className="callout info">
                    <AlertCircle size={15} />
                    <div>
                      {(latest.advisory?.messages || []).map((msg, index) => (
                        <div key={index} style={{ marginBottom: 4 }}>
                          {msg}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <FlushCard title="Stored Observations (7 days)" icon={<History size={16} />}>
          <div className="card-body">
            <Async state={history}>
              {(data) => {
                const points = (data.points || []).map((p) => ({
                  time: formatClock(p.timestamp),
                  Temperature: p.temperature,
                  'Soil Moisture': p.soil_moisture,
                  Nitrogen: p.nitrogen,
                }));

                if (points.length === 0) {
                  return <EmptyState title="No stored observations yet" />;
                }

                return (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={points} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" vertical={false} />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#93a69c' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#93a69c' }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e6ebe8', fontSize: 12 }} />
                      <Line type="monotone" dataKey="Temperature" stroke="#f97316" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Soil Moisture" stroke="#16a34a" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Nitrogen" stroke="#a855f7" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                );
              }}
            </Async>
          </div>
        </FlushCard>
      )}

      {tab === 'alerts' && (
        <FlushCard title="Alerts from Monitoring" icon={<Bell size={16} />}>
          <Async state={alerts}>
            {(data) =>
              data.alerts.length === 0 ? (
                <EmptyState title="No active alerts" hint="Field conditions look stable." />
              ) : (
                <div className="row-list">
                  {data.alerts.map((alert) => (
                    <div className="row-item" key={alert.id}>
                      <div className={`row-icon ${alert.severity === 'HIGH' ? 'red' : 'amber'}`}>
                        <Bell size={15} />
                      </div>
                      <div className="grow">
                        <div className="row-title">{alert.title}</div>
                        <div className="row-sub">{alert.detail}</div>
                      </div>
                      <Badge level={alert.severity}>{alert.severity}</Badge>
                      <div className="row-meta">{formatTime(alert.timestamp)}</div>
                    </div>
                  ))}
                </div>
              )
            }
          </Async>
        </FlushCard>
      )}
    </div>
  );
}
