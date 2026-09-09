import React from 'react';
import { Activity, Thermometer, Droplets, Sun, CloudRain } from 'lucide-react';

export default function SensorAnalysis() {
  return (
    <div>
      <div className="page-header">
        <h1>Sensor Analysis</h1>
        <p>Detailed view of simulated hardware telemetry (Temp, Humidity, Soil, Light).</p>
      </div>
      
      <div className="grid">
        <div className="card" style={{ gridColumn: 'span 12', textAlign: 'center', padding: '60px' }}>
          <Activity size={48} color="#94a3b8" />
          <h2 style={{color: '#64748b', marginTop: '20px'}}>Live Sensor Data Stream</h2>
          <p style={{color: '#94a3b8', maxWidth: '500px', margin: '0 auto'}}>
            Currently displaying data from MockSensor logic. Once physical IoT hardware (ESP32/Raspberry Pi) is connected via the SensorProvider interface, live telemetry will stream here automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
