import React, { useState, useEffect } from 'react';
import { TestTube, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function NutrientHealth() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNutrients() {
      try {
        const response = await fetch('http://localhost:8000/api/nutrients/latest/1');
        if (response.ok) {
          const resData = await response.json();
          setData(resData);
        } else {
          // Dummy data for presentation if DB is empty
          setData({
            soil: { nitrogen: 32, phosphorus: 48, potassium: 28, ph: 6.3, ec: 1.1, organic_carbon: 0.8 },
            nutrients: {
              nitrogen: { status: "LOW", trend: "DECREASING" },
              phosphorus: { status: "ADEQUATE", trend: "STABLE" },
              potassium: { status: "LOW", trend: "DECREASING" }
            }
          });
        }
      } catch (e) {
        console.error(e);
        setData({
          soil: { nitrogen: 32, phosphorus: 48, potassium: 28, ph: 6.3, ec: 1.1, organic_carbon: 0.8 },
          nutrients: {
            nitrogen: { status: "LOW", trend: "DECREASING" },
            phosphorus: { status: "ADEQUATE", trend: "STABLE" },
            potassium: { status: "LOW", trend: "DECREASING" }
          }
        });
      } finally {
        setLoading(false);
      }
    }
    fetchNutrients();
  }, []);

  if (loading) return <div className="loading-spinner"></div>;

  const renderBadge = (status) => {
    const cls = status.includes("LOW") || status.includes("DEFICIENT") ? "critical" : 
                status.includes("HIGH") ? "moderate" : "normal";
    return <span className={`badge ${cls}`}>{status}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Nutrient Health</h1>
        <p>Monitor soil nutrients and identify possible deficiencies.</p>
      </div>

      <div className="grid">
        {/* NPK Summary */}
        <div className="card" style={{ gridColumn: 'span 4' }}>
          <h2 style={{color: '#666', fontSize: '1.2rem', marginBottom: '5px'}}>NITROGEN (N)</h2>
          <div style={{fontSize: '2.5rem', fontWeight: 'bold'}}>{data.soil.nitrogen} <span style={{fontSize: '1rem', color: '#999'}}>mg/kg</span></div>
          <div style={{marginTop: '10px'}}>{renderBadge(data.nutrients.nitrogen.status)}</div>
        </div>
        <div className="card" style={{ gridColumn: 'span 4' }}>
          <h2 style={{color: '#666', fontSize: '1.2rem', marginBottom: '5px'}}>PHOSPHORUS (P)</h2>
          <div style={{fontSize: '2.5rem', fontWeight: 'bold'}}>{data.soil.phosphorus} <span style={{fontSize: '1rem', color: '#999'}}>mg/kg</span></div>
          <div style={{marginTop: '10px'}}>{renderBadge(data.nutrients.phosphorus.status)}</div>
        </div>
        <div className="card" style={{ gridColumn: 'span 4' }}>
          <h2 style={{color: '#666', fontSize: '1.2rem', marginBottom: '5px'}}>POTASSIUM (K)</h2>
          <div style={{fontSize: '2.5rem', fontWeight: 'bold'}}>{data.soil.potassium} <span style={{fontSize: '1rem', color: '#999'}}>mg/kg</span></div>
          <div style={{marginTop: '10px'}}>{renderBadge(data.nutrients.potassium.status)}</div>
        </div>

        {/* Other Soil Conditions */}
        <div className="card" style={{ gridColumn: 'span 6' }}>
          <h2><TestTube size={20} /> Soil Conditions</h2>
          <ul style={{ listStyle: 'none', padding: 0, fontSize: '1.2rem', lineHeight: '2' }}>
            <li style={{display: 'flex', justifyContent: 'space-between'}}>
              <span>pH Level:</span> <strong>{data.soil.ph}</strong>
            </li>
            <li style={{display: 'flex', justifyContent: 'space-between'}}>
              <span>Organic Carbon:</span> <strong>{data.soil.organic_carbon}%</strong>
            </li>
            <li style={{display: 'flex', justifyContent: 'space-between'}}>
              <span>Electrical Cond. (EC):</span> <strong>{data.soil.ec} mS/cm</strong>
            </li>
          </ul>
        </div>

        {/* Status Breakdown */}
        <div className="card" style={{ gridColumn: 'span 6' }}>
          <h2>Nutrient Overview</h2>
          <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{borderBottom: '2px solid #eee', color: '#666'}}>
                <th style={{padding: '10px'}}>Nutrient</th>
                <th style={{padding: '10px'}}>Status</th>
                <th style={{padding: '10px'}}>Trend</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{padding: '15px 10px'}}>Nitrogen</td>
                <td>{renderBadge(data.nutrients.nitrogen.status)}</td>
                <td style={{color: '#ef4444'}}><TrendingDown size={18} style={{verticalAlign:'middle'}}/> Decreasing</td>
              </tr>
              <tr>
                <td style={{padding: '15px 10px'}}>Phosphorus</td>
                <td>{renderBadge(data.nutrients.phosphorus.status)}</td>
                <td style={{color: '#94a3b8'}}><Minus size={18} style={{verticalAlign:'middle'}}/> Stable</td>
              </tr>
              <tr>
                <td style={{padding: '15px 10px'}}>Potassium</td>
                <td>{renderBadge(data.nutrients.potassium.status)}</td>
                <td style={{color: '#ef4444'}}><TrendingDown size={18} style={{verticalAlign:'middle'}}/> Decreasing</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
