import React from 'react';
import { Droplets, AlertCircle } from 'lucide-react';

export default function IrrigationAdvisory() {
  return (
    <div>
      <div className="page-header">
        <h1>Irrigation & Rule-Based Advisory</h1>
        <p>Current recommendations based on the Fusion Risk Engine.</p>
      </div>

      <div className="grid">
        <div className="card" style={{ gridColumn: 'span 8' }}>
          <h2><Droplets size={20} /> Current Irrigation Requirement</h2>
          <div className="result-card" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
            <h3 style={{ color: '#dc2626', marginTop: 0 }}>Status: NEEDS WATER</h3>
            <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
              Soil moisture is currently at <strong>34%</strong> while temperature is elevated (29.2°C). 
              The rule-based risk engine has flagged the field as experiencing <strong>MODERATE (DRY)</strong> stress.
            </p>
            <div style={{ marginTop: '20px', padding: '15px', background: 'white', borderRadius: '8px' }}>
              <strong>Recommendation:</strong> Initiate drip irrigation for 45 minutes to restore optimal soil moisture levels (target &gt;40%).
            </div>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 4' }}>
          <h2><AlertCircle size={20} /> Field Alerts</h2>
          <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
            <li>High pest activity detected.</li>
            <li>No rainfall expected in the next 24h.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
