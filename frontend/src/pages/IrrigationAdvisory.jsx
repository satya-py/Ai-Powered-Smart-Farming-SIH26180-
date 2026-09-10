import React from 'react';
import {
  CalendarClock,
  CloudRain,
  CloudSun,
  Droplets,
  Lightbulb,
  RefreshCw,
} from 'lucide-react';

import { api, DEFAULT_FIELD_ID } from '../api';
import { useApi } from '../hooks';
import { PageHead } from '../components/Layout';
import { Async, Card, Meter, num } from '../components/ui';

const STATUS_TONE = {
  'IRRIGATE NOW': 'danger',
  'IRRIGATE SOON': 'warning',
  'DO NOT IRRIGATE': 'info',
  'NO ACTION NEEDED': 'success',
  UNKNOWN: 'info',
};

function dayLabel(iso, index) {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? `Day ${index + 1}`
    : date.toLocaleDateString(undefined, { weekday: 'short' });
}

export default function IrrigationAdvisory() {
  const advice = useApi(() => api.irrigation(DEFAULT_FIELD_ID), []);

  return (
    <div className="stack">
      <PageHead
        icon={<Droplets size={20} />}
        title="Irrigation & Advisory"
        subtitle="Get smart irrigation and farming guidance"
        actions={
          <button className="btn btn-outline sm" onClick={() => advice.reload()}>
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      <Async state={advice} loadingLabel="Calculating irrigation need…">
        {(data) => {
          const irrigation = data.irrigation || {};
          const forecast = data.weather?.forecast || [];
          const tone = STATUS_TONE[irrigation.status] || 'info';

          return (
            <div className="stack">
              <div className="grid split-even">
                <Card title="Irrigation Recommendation" icon={<Droplets size={16} />}>
                  <div className={`callout ${tone}`}>
                    <Droplets size={15} />
                    <div>
                      <strong>{irrigation.status}</strong>
                      <div style={{ marginTop: 3 }}>{irrigation.reason}</div>
                    </div>
                  </div>

                  <div className="grid cols-2" style={{ marginTop: 16 }}>
                    <div>
                      <div className="stat-label">Water Needed</div>
                      <div className="stat-value">{num(irrigation.water_mm, 1, ' mm')}</div>
                    </div>
                    <div>
                      <div className="stat-label">
                        <CalendarClock size={10} style={{ verticalAlign: -1 }} /> Next Irrigation
                      </div>
                      <div className="stat-value sm">{irrigation.next_irrigation}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <div className="row between small muted">
                      <span>Soil moisture</span>
                      <span>
                        {num(irrigation.soil_moisture, 1, '%')} of{' '}
                        {num(irrigation.target_soil_moisture, 0, '%')} target
                      </span>
                    </div>
                    <div style={{ marginTop: 5 }}>
                      <Meter
                        value={irrigation.soil_moisture}
                        max={Math.max(irrigation.target_soil_moisture || 45, 100)}
                        tone={
                          irrigation.soil_moisture < (irrigation.target_soil_moisture || 45)
                            ? 'amber'
                            : ''
                        }
                      />
                    </div>
                  </div>

                  {irrigation.rainfall_forecast_mm > 0 && (
                    <div className="callout info" style={{ marginTop: 14 }}>
                      <CloudRain size={15} />
                      <span>
                        {num(irrigation.rainfall_forecast_mm, 1, ' mm')} of rain forecast over
                        the next 3 days — already factored into the figure above.
                      </span>
                    </div>
                  )}
                </Card>

                <Card title="Key Recommendations" icon={<Lightbulb size={16} />}>
                  <div className="stack" style={{ gap: 11 }}>
                    {(irrigation.recommendations || []).map((text, index) => (
                      <div className="row" key={index} style={{ alignItems: 'flex-start' }}>
                        <div className="row-icon" style={{ width: 26, height: 26 }}>
                          <Lightbulb size={13} />
                        </div>
                        <span className="small grow">{text}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <Card
                title="Weather Forecast"
                icon={<CloudSun size={16} />}
                actions={
                  data.weather?.source === 'mock' ? (
                    <span className="badge-pill neutral">Simulated data</span>
                  ) : (
                    <span className="badge-pill good">Live</span>
                  )
                }
              >
                <div className="grid cols-5">
                  {forecast.map((day, index) => (
                    <div className="gauge" key={day.date}>
                      <div className="gauge-name">{dayLabel(day.date, index)}</div>
                      <CloudSun size={26} color="#f59e0b" />
                      <div className="strong">{num(day.temp_max, 0, '°C')}</div>
                      <div className="small muted">
                        {num(day.temp_min, 0, '°')} · {num(day.rain_mm, 1, 'mm')}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          );
        }}
      </Async>
    </div>
  );
}
