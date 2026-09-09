import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Bug, CloudRain, Droplets, Leaf, Sun, Thermometer } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [latestRes, historyRes] = await Promise.all([
          fetch('http://localhost:8000/api/monitoring/latest/1'),
          fetch('http://localhost:8000/api/monitoring/history/1')
        ]);
        
        let hasData = false;
        
        if (latestRes.ok) {
          const latestData = await latestRes.json();
          setData({
            field: { name: "Tomato Field A", crop: "Tomato" },
            disease: latestData.disease || { detected: false, name: "None", confidence: 0 },
            pests: latestData.pests || { detected: false, total: 0, counts: {}, pressure: "LOW" },
            environment: latestData.environment || { temperature: 0, humidity: 0, soil_moisture: 0, rainfall: 0, light: 0 },
            risk: latestData.risk || { overall_risk: "LOW", disease_risk: "LOW", pest_risk: "LOW", water_stress: "NORMAL" },
            advisory: latestData.advisory || { priority: "LOW", messages: ["No recent advisories."] }
          });
          hasData = true;
        } else {
          // If 404, the DB is empty. Provide default state.
          setData({
            field: { name: "Tomato Field A", crop: "Tomato" },
            disease: { detected: false, name: "No Data", confidence: 0 },
            pests: { detected: false, total: 0, counts: {}, pressure: "LOW" },
            environment: { temperature: 0, humidity: 0, soil_moisture: 0, rainfall: 0, light: 0 },
            risk: { overall_risk: "LOW", disease_risk: "LOW", pest_risk: "LOW", water_stress: "NORMAL" },
            advisory: { priority: "LOW", messages: ["No data in database yet. Upload an image to generate data!"] }
          });
        }
        
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          // Format the history for the Recharts graph
          if (historyData.timestamps && historyData.timestamps.length > 0) {
            const formattedHistory = historyData.timestamps.map((ts, idx) => {
              const date = new Date(ts);
              return {
                time: `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`,
                temp: historyData.temperatures[idx],
                moisture: historyData.soil_moistures[idx],
                pests: historyData.pest_totals[idx]
              };
            });
            setHistory(formattedHistory);
          } else {
             setHistory([]);
          }
        } else {
          setHistory([]);
        }
      } catch (err) {
        console.error("Failed to fetch analytics", err);
        // Fallback to dummy data if network fails completely (backend off)
        setData({
          field: { name: "Tomato Field A", crop: "Tomato" },
          disease: { detected: true, name: "Early Blight", confidence: 0.93 },
          pests: { detected: true, total: 16, counts: { Aphid: 12, Whitefly: 4 }, pressure: "HIGH" },
          environment: { temperature: 29.2, humidity: 81.0, soil_moisture: 34.0, rainfall: 0.0, light: 600.0 },
          risk: { overall_risk: "HIGH", disease_risk: "MODERATE", pest_risk: "HIGH", water_stress: "MODERATE (DRY)" },
          advisory: { 
            priority: "HIGH", 
            messages: [
              "Warning: Backend server not running. Showing demo data."
            ] 
          }
        });
        setHistory([
          { time: '10:00', temp: 25, moisture: 45, pests: 2 },
          { time: '11:00', temp: 27, moisture: 42, pests: 5 }
        ]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Overview</h1>
        <p>{data.field.name} | Crop: {data.field.crop}</p>
      </div>

      <div className="grid">
        {/* Risk Panel */}
        <div className="card" style={{ gridColumn: 'span 4' }}>
          <h2><Activity size={20} /> Overall Risk</h2>
          <div className={`badge ${data.risk.overall_risk.toLowerCase().split(' ')[0]}`} style={{marginTop: '10px', marginBottom: '20px', fontSize: '1.2rem', padding: '10px 20px'}}>
            {data.risk.overall_risk}
          </div>
          <div style={{ lineHeight: '2' }}>
            <div>Disease Risk: <strong style={{float: 'right'}}>{data.risk.disease_risk}</strong></div>
            <div>Pest Pressure: <strong style={{float: 'right'}}>{data.risk.pest_risk}</strong></div>
            <div>Water Stress: <strong style={{float: 'right'}}>{data.risk.water_stress}</strong></div>
          </div>
        </div>

        {/* Advisory Panel */}
        <div className="card" style={{ gridColumn: 'span 8', background: data.advisory.priority === 'HIGH' ? '#fef2f2' : 'white', border: data.advisory.priority === 'HIGH' ? '1px solid #fecaca' : 'none' }}>
          <h2 style={{color: data.advisory.priority === 'HIGH' ? '#dc2626' : '#333'}}><AlertTriangle size={20} /> Advisory & Actions</h2>
          <ul style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#444' }}>
            {data.advisory.messages.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>

        {/* Environment Panel */}
        <div className="card" style={{ gridColumn: 'span 6' }}>
          <h2>Environment Sensors</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '20px 0' }}>
            <div style={{display: 'flex', alignItems: 'center', gap:'10px', fontSize:'1.2rem'}}><Thermometer color="#f59e0b" /> {data.environment.temperature}°C</div>
            <div style={{display: 'flex', alignItems: 'center', gap:'10px', fontSize:'1.2rem'}}><Droplets color="#3b82f6" /> {data.environment.humidity}% RH</div>
            <div style={{display: 'flex', alignItems: 'center', gap:'10px', fontSize:'1.2rem'}}><CloudRain color="#64748b" /> {data.environment.rainfall} mm</div>
            <div style={{display: 'flex', alignItems: 'center', gap:'10px', fontSize:'1.2rem'}}><Sun color="#eab308" /> {data.environment.light} lux</div>
          </div>
          <div>
            <h3 style={{fontSize: '1rem', color: '#666', marginBottom: '8px'}}>Soil Moisture</h3>
            <div style={{ background: '#e2e8f0', borderRadius: '10px', height: '20px', overflow: 'hidden' }}>
              <div style={{ width: `${data.environment.soil_moisture}%`, background: data.environment.soil_moisture < 40 ? '#ef4444' : '#22c55e', height: '100%', color: 'white', textAlign: 'right', paddingRight: '10px', fontSize: '0.85rem', fontWeight: 'bold', lineHeight: '20px' }}>
                {data.environment.soil_moisture}%
              </div>
            </div>
          </div>
        </div>

        {/* Disease/Pest Quick Stats */}
        <div className="card" style={{ gridColumn: 'span 3' }}>
          <h2><Leaf size={20} /> Disease Status</h2>
          {data.disease.detected ? (
             <div style={{marginTop: '20px'}}>
               <h3 style={{color: '#dc2626', fontSize: '1.4rem', margin: '0 0 10px 0'}}>{data.disease.name}</h3>
               <p style={{color: '#666', margin: 0}}>Confidence: <strong>{(data.disease.confidence * 100).toFixed(1)}%</strong></p>
             </div>
          ) : (
            <h3 style={{color: '#16a34a'}}>Crop is Healthy</h3>
          )}
        </div>

        <div className="card" style={{ gridColumn: 'span 3' }}>
          <h2><Bug size={20} /> Pest Status</h2>
          <h3 style={{fontSize: '1.4rem', margin: '20px 0 10px 0'}}>Total Detected: {data.pests.total}</h3>
          <ul style={{paddingLeft: '20px', color: '#666'}}>
            {Object.entries(data.pests.counts).map(([name, count]) => (
              <li key={name}>{name}: <strong>{count}</strong></li>
            ))}
          </ul>
        </div>
        
        {/* Chart */}
        <div className="card" style={{ gridColumn: 'span 12' }}>
          <h2>Analytics Trend</h2>
          <div style={{ height: 300, width: '100%', marginTop: '20px' }}>
            <ResponsiveContainer>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" />
                <Line yAxisId="left" type="monotone" dataKey="temp" name="Temp (°C)" stroke="#f59e0b" strokeWidth={3} dot={{r:4}} activeDot={{r:6}} />
                <Line yAxisId="left" type="monotone" dataKey="moisture" name="Soil Moist. (%)" stroke="#3b82f6" strokeWidth={3} dot={{r:4}} activeDot={{r:6}} />
                <Line yAxisId="right" type="monotone" dataKey="pests" name="Pest Count" stroke="#ef4444" strokeWidth={3} dot={{r:4}} activeDot={{r:6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
