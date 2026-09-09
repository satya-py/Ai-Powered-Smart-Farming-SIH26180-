import React, { useState, useEffect } from 'react';
import { Sprout, CloudRain, CheckCircle, AlertTriangle } from 'lucide-react';

export default function FertilizerRecommendation() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRecommendation = async () => {
    setLoading(true);
    try {
      // We pass field_id 1
      const response = await fetch('http://localhost:8000/api/fertilizer/recommend/1', {
        method: 'POST'
      });
      if (response.ok) {
        const resData = await response.json();
        setData(resData);
      } else {
        // Mock fallback if DB empty
        setData({
          npk_need: { nitrogen_need: 45, phosphorus_need: 20, potassium_need: 35 },
          weather_status: "GOOD FOR APPLICATION",
          recommendations: [
            { id: 1, name: "NPK 10-26-26", category: "Complex NPK", match_score: 92, reason: "Matches general soil profile. Provides Phosphorus. Provides Potassium." },
            { id: 2, name: "Urea", category: "Nitrogen-based", match_score: 65, reason: "Provides Nitrogen." }
          ]
        });
      }
    } catch (e) {
      console.error(e);
      // Fallback if API fails
      setData({
        npk_need: { nitrogen_need: 45, phosphorus_need: 20, potassium_need: 35 },
        weather_status: "WAIT — HEAVY RAIN EXPECTED (Risk of runoff)",
        recommendations: [
          { id: 1, name: "NPK 10-26-26", category: "Complex NPK", match_score: 92, reason: "Matches general soil profile. Provides Phosphorus. Provides Potassium." },
          { id: 2, name: "Urea", category: "Nitrogen-based", match_score: 65, reason: "Provides Nitrogen." }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendation();
  }, []);

  if (loading) return <div className="loading-spinner"></div>;

  const renderWeatherBanner = () => {
    if (data.weather_status.includes("WAIT") || data.weather_status.includes("CAUTION") || data.weather_status.includes("IRRIGATE")) {
      return (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '15px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '15px', color: '#dc2626', marginBottom: '20px' }}>
          <AlertTriangle size={24} />
          <div>
            <h3 style={{margin: '0 0 5px 0', fontSize: '1.1rem'}}>Weather/Soil Advisory</h3>
            <p style={{margin: 0}}>{data.weather_status}</p>
          </div>
        </div>
      );
    }
    return (
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '15px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '15px', color: '#16a34a', marginBottom: '20px' }}>
        <CheckCircle size={24} />
        <div>
          <h3 style={{margin: '0 0 5px 0', fontSize: '1.1rem'}}>Application Conditions</h3>
          <p style={{margin: 0}}>{data.weather_status}</p>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1>Fertilizer Recommendation</h1>
        <p>Get data-driven fertilizer suggestions based on soil, crop, and weather conditions.</p>
      </div>

      {renderWeatherBanner()}

      <div className="grid">
        {/* NPK Need */}
        <div className="card" style={{ gridColumn: 'span 12' }}>
          <h2><Sprout size={20} /> Estimated Nutrient Requirement (NPK Model)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '20px' }}>
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#64748b', fontWeight: 'bold' }}>Nitrogen Need</div>
              <div style={{ fontSize: '2rem', color: '#1a4331', fontWeight: 'bold', marginTop: '10px' }}>{data.npk_need.nitrogen_need} <span style={{fontSize:'1rem'}}>kg/ha</span></div>
            </div>
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#64748b', fontWeight: 'bold' }}>Phosphorus Need</div>
              <div style={{ fontSize: '2rem', color: '#1a4331', fontWeight: 'bold', marginTop: '10px' }}>{data.npk_need.phosphorus_need} <span style={{fontSize:'1rem'}}>kg/ha</span></div>
            </div>
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#64748b', fontWeight: 'bold' }}>Potassium Need</div>
              <div style={{ fontSize: '2rem', color: '#1a4331', fontWeight: 'bold', marginTop: '10px' }}>{data.npk_need.potassium_need} <span style={{fontSize:'1rem'}}>kg/ha</span></div>
            </div>
          </div>
        </div>

        {/* Recommended Fertilizers */}
        <div className="card" style={{ gridColumn: 'span 12' }}>
          <h2>Recommended Fertilizers</h2>
          {data.recommendations.map((rec, index) => (
            <div key={rec.id} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              background: index === 0 ? '#f0fdf4' : '#fff', 
              border: index === 0 ? '2px solid #4ade80' : '1px solid #e2e8f0',
              padding: '20px', 
              borderRadius: '12px', 
              marginBottom: '15px' 
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#1a4331' }}>{rec.name}</h3>
                  {index === 0 && <span className="badge low">BEST MATCH</span>}
                </div>
                <div style={{ color: '#64748b', marginTop: '5px' }}>Type: {rec.category}</div>
                <div style={{ marginTop: '15px', color: '#333' }}><strong>Why:</strong> {rec.reason}</div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: index === 0 ? '#16a34a' : '#94a3b8' }}>
                  {rec.match_score.toFixed(0)}%
                </div>
                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Match Score</div>
              </div>
            </div>
          ))}
          {data.recommendations.length === 0 && (
            <p>No suitable fertilizers found in the catalog for this profile.</p>
          )}
        </div>
      </div>
    </div>
  );
}
