import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Bug,
  Clock,
  CloudRain,
  CloudSun,
  Droplets,
  HeartPulse,
  Leaf,
  Map,
  ShieldAlert,
  Sprout,
  TestTube,
  TrendingUp,
  Wind,
} from 'lucide-react';
import {
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
import { ART } from '../assets/art';
import { useApi } from '../hooks';
import {
  Async,
  Card,
  EmptyState,
  FlushCard,
  StatCard,
  formatClock,
  num,
  prettyLabel,
  relativeTime,
} from '../components/ui';

const FEATURES = [
  {
    to: '/disease',
    icon: Leaf,
    title: 'Disease Detection',
    img: ART.disease,
    desc: 'Identify crop diseases from leaf images',
  },
  {
    to: '/pests',
    icon: Bug,
    title: 'Pest Detection',
    img: ART.pest,
    desc: 'Detect and count pests using AI',
  },
  {
    to: '/sensors',
    icon: Activity,
    title: 'Sensor Analytics',
    img: ART.sensor,
    desc: 'View soil and environmental data',
  },
  {
    to: '/nutrients',
    icon: TestTube,
    title: 'Nutrient Health',
    img: ART.nutrient,
    desc: 'Check soil nutrients and NPK status',
  },
  {
    to: '/fertilizer',
    icon: Sprout,
    title: 'Fertilizer Recommendation',
    img: ART.fertilizer,
    desc: 'Get AI-based fertilizer suggestions',
  },
];

function WeatherCard({ weather }) {
  if (!weather) return null;
  return (
    <div className="weather-card">
      <div>
        <div className="weather-top">
          <CloudSun size={34} color="#f59e0b" />
          <div>
            <div className="weather-temp">{num(weather.temperature, 0, '°C')}</div>
            <div className="weather-cond">{weather.condition}</div>
          </div>
        </div>
        <div className="weather-loc">
          <Map size={11} /> {weather.location}
          {weather.source === 'mock' && <span className="faint">· simulated</span>}
        </div>
      </div>

      <div className="weather-stats">
        <div>
          <div className="weather-stat-label">Humidity</div>
          <div className="weather-stat-value">{num(weather.humidity, 0, '%')}</div>
        </div>
        <div>
          <div className="weather-stat-label">
            <Wind size={9} style={{ verticalAlign: -1 }} /> Wind
          </div>
          <div className="weather-stat-value">{num(weather.wind_kph, 0, ' km/h')}</div>
        </div>
        <div>
          <div className="weather-stat-label">
            <CloudRain size={9} style={{ verticalAlign: -1 }} /> Rain
          </div>
          <div className="weather-stat-value">{num(weather.rain_mm, 0, ' mm')}</div>
        </div>
      </div>
    </div>
  );
}

function HealthChart() {
  const history = useApi(() => api.history(DEFAULT_FIELD_ID, 14), []);

  return (
    <FlushCard title="Field Health Overview" icon={<TrendingUp size={16} />}>
      <div className="card-body">
        <Async
          state={history}
          empty={<EmptyState title="No history yet" hint="Run the monitoring simulation to collect data." />}
        >
          {(data) => {
            const points = (data.points || []).map((p) => ({
              time: formatClock(p.timestamp),
              Temperature: p.temperature,
              Humidity: p.humidity,
              'Soil Moisture': p.soil_moisture,
              Nitrogen: p.nitrogen,
            }));

            if (points.length === 0) {
              return (
                <EmptyState
                  title="No observations in the last 14 days"
                  hint="Open Continuous Monitoring and start the simulation."
                />
              );
            }

            return (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={points} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#93a69c' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#93a69c' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: '1px solid #e6ebe8',
                      fontSize: 12,
                      boxShadow: '0 4px 12px rgba(16,40,28,0.08)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} iconType="circle" iconSize={7} />
                  <Line type="monotone" dataKey="Temperature" stroke="#f97316" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Humidity" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Soil Moisture" stroke="#16a34a" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Nitrogen" stroke="#a855f7" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            );
          }}
        </Async>
      </div>
    </FlushCard>
  );
}

function RecentDetections() {
  const detections = useApi(() => api.recentDetections(6), []);

  return (
    <FlushCard title="Recent Detections" icon={<Activity size={16} />}>
      <Async
        state={detections}
        empty={<EmptyState title="No detections yet" />}
      >
        {(items) =>
          items.length === 0 ? (
            <EmptyState
              title="No detections yet"
              hint="Upload a leaf or field image to run the models."
            />
          ) : (
            <div className="row-list">
              {items.map((item, index) => (
                <div className="row-item" key={`${item.name}-${index}`}>
                  <div className={`row-icon ${item.type === 'pest' ? 'amber' : 'red'}`}>
                    {item.type === 'pest' ? <Bug size={15} /> : <Leaf size={15} />}
                  </div>
                  <div className="grow">
                    <div className="row-title">{prettyLabel(item.name)}</div>
                    <div className="row-sub">
                      {item.type === 'pest'
                        ? `Pest · ${item.count} detected`
                        : `Disease · ${num((item.confidence ?? 0) * 100, 0, '%')} confidence`}
                    </div>
                  </div>
                  <div className="row-meta">{relativeTime(item.timestamp)}</div>
                </div>
              ))}
            </div>
          )
        }
      </Async>
    </FlushCard>
  );
}

export default function Dashboard() {
  const overview = useApi(() => api.overview(), []);

  return (
    <div className="stack">
      <div className="grid split">
        <div className="hero">
          <div>
            <h2>Welcome back, Farmer!</h2>
            <p>
              Your smart farming assistant is here to help you monitor your crops,
              detect risks early, and get recommendations for a higher yield.
            </p>
          </div>
        </div>
        <WeatherCard weather={overview.data?.weather} />
      </div>

      <Async state={overview} loadingLabel="Loading farm overview…">
        {(data) => (
          <div className="grid cols-4">
            <StatCard
              icon={<Map size={20} />}
              label="Total Fields"
              value={data.total_fields}
              tone="green"
            />
            <StatCard
              icon={<ShieldAlert size={20} />}
              label="Active Alerts"
              value={data.active_alerts}
              tone={data.active_alerts > 0 ? 'red' : 'green'}
            />
            <StatCard
              icon={<HeartPulse size={20} />}
              label="Overall Field Health"
              value={data.field_health}
              tone={data.field_health === 'Good' ? 'green' : 'amber'}
            />
            <StatCard
              icon={<Clock size={20} />}
              label="Last Updated"
              value={relativeTime(data.last_updated)}
              tone="blue"
            />
          </div>
        )}
      </Async>

      <div className="grid cols-5">
        {FEATURES.map(({ to, icon: Icon, title, desc, img }) => (
          <Link to={to} key={to} className="feature-card">
            <img src={img} alt="" className="feature-img" loading="lazy" />
            <div className="feature-body">
              <div className="feature-title">
                <Icon size={14} />
                {title}
              </div>
              <div className="feature-desc">{desc}</div>
              <span className="feature-link">
                Go to <ArrowRight size={12} />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid split">
        <HealthChart />
        <div className="stack">
          <RecentDetections />
          <Card title="Quick Actions" icon={<Droplets size={16} />}>
            <div className="row wrap">
              <Link to="/live" className="btn btn-primary sm">
                Start monitoring
              </Link>
              <Link to="/disease" className="btn btn-outline sm">
                Scan a leaf
              </Link>
              <Link to="/reports" className="btn btn-outline sm">
                View report
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
