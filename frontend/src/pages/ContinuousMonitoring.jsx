import React, { useState, useEffect } from 'react';
import { Radio, Video, Activity, Loader } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ContinuousMonitoring() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    let interval;
    if (running) {
      interval = setInterval(async () => {
        try {
          const res = await fetch('http://localhost:8000/api/monitoring/simulate/1', {
            method: 'POST'
          });
          if (res.ok) {
            const data = await res.json();
            const now = new Date();
            const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
            
            const logMsg = `[${timeStr}] Observation #${data.id} - Temp: ${data.environment.temperature}°C, N: ${data.nutrients.nitrogen}`;
            setLogs(prev => [logMsg, ...prev].slice(0, 10)); // keep last 10
            
            setChartData(prev => {
              const newChart = [...prev, {
                time: timeStr,
                temp: data.environment.temperature,
                nitrogen: data.nutrients.nitrogen
              }];
              return newChart.slice(-15); // keep last 15 points
            });
          }
        } catch (e) {
          console.error(e);
        }
      }, 3000); // Poll every 3 seconds to simulate time
    }
    return () => clearInterval(interval);
  }, [running]);

  return (
    <div>
      <div className="page-header">
        <h1>Continuous Live Monitoring</h1>
        <p>Automated investigation loop tracking crop state over time.</p>
      </div>

      <div className="grid">
        <div className="card" style={{ gridColumn: 'span 12', textAlign: 'center', padding: running ? '30px' : '60px' }}>
          {running ? (
            <Activity size={48} color="#10b981" className="pulse-animation" />
          ) : (
            <Video size={48} color="#94a3b8" />
          )}
          <h2 style={{color: running ? '#10b981' : '#64748b', marginTop: '20px'}}>
            {running ? "Simulation Loop Active" : "Live Camera Feed Offline"}
          </h2>
          <p style={{color: '#94a3b8', maxWidth: '500px', margin: '0 auto'}}>
            {running 
              ? "The system is autonomously simulating hardware sensor readings and AI visual evaluations every 3 seconds. Watch the live dashboard." 
              : "Continuous monitoring loop is ready. Connect a hardware camera (e.g. Raspberry Pi Camera Module) via the CameraProvider interface to begin capturing frames at configured intervals."}
          </p>
          <button 
            onClick={() => setRunning(!running)}
            className="upload-btn" 
            style={{marginTop: '30px', background: running ? '#ef4444' : '#3b82f6'}}
          >
            {running ? "Stop Simulation" : "Start Software Simulation Loop"}
          </button>
        </div>

        {running && (
          <>
            <div className="card" style={{ gridColumn: 'span 8', height: '300px' }}>
              <h3>Live Sensor Feed (Temp & N)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="temp" stroke="#ef4444" name="Temperature (°C)" />
                  <Line yAxisId="right" type="monotone" dataKey="nitrogen" stroke="#3b82f6" name="Nitrogen (mg/kg)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="card" style={{ gridColumn: 'span 4', height: '300px', overflowY: 'auto' }}>
              <h3>System Event Log</h3>
              <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#334155', fontFamily: 'monospace' }}>
                {logs.map((log, i) => (
                  <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>{log}</div>
                ))}
                {logs.length === 0 && <div>Waiting for first tick...</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
