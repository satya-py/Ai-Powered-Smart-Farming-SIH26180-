import React, { useState } from 'react';
import { Settings2, Sprout, AlertTriangle, CheckCircle } from 'lucide-react';

export default function ManualNutrientInput() {
  const [formData, setFormData] = useState({
    crop: 'Tomato',
    nitrogen: 30,
    phosphorus: 30,
    potassium: 30,
    ph: 6.5,
    soil_moisture: 40,
    temperature: 25,
    rainfall: 0
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'crop' ? value : Number(value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/fertilizer/recommend-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Failed to reach the backend model. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Manual Model Input</h1>
        <p>Directly test the AI models by inputting soil and weather values manually.</p>
      </div>

      <div className="grid">
        {/* Input Form */}
        <div className="card" style={{ gridColumn: 'span 5' }}>
          <h2><Settings2 size={20} /> Input Parameters</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
            <div>
              <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Crop Type</label>
              <select name="crop" value={formData.crop} onChange={handleChange} style={{width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc'}}>
                <option value="Tomato">Tomato</option>
                <option value="Potato">Potato</option>
                <option value="Corn">Corn</option>
                <option value="Wheat">Wheat</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Nitrogen</label>
                <input type="number" name="nitrogen" value={formData.nitrogen} onChange={handleChange} style={{width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Phosphorus</label>
                <input type="number" name="phosphorus" value={formData.phosphorus} onChange={handleChange} style={{width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Potassium</label>
                <input type="number" name="potassium" value={formData.potassium} onChange={handleChange} style={{width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc'}} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Soil pH</label>
                <input type="number" step="0.1" name="ph" value={formData.ph} onChange={handleChange} style={{width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Soil Moisture (%)</label>
                <input type="number" name="soil_moisture" value={formData.soil_moisture} onChange={handleChange} style={{width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Temperature (°C)</label>
                <input type="number" name="temperature" value={formData.temperature} onChange={handleChange} style={{width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Rainfall (mm)</label>
                <input type="number" name="rainfall" value={formData.rainfall} onChange={handleChange} style={{width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc'}} />
              </div>
            </div>
            
            <button type="submit" disabled={loading} style={{
              marginTop: '10px', padding: '15px', background: '#1a4331', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem'
            }}>
              {loading ? 'Running AI Models...' : 'Analyze & Recommend'}
            </button>
          </form>
        </div>

        {/* Results */}
        <div style={{ gridColumn: 'span 7' }}>
          {!result && !loading && (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
              <p>Enter parameters and submit to see model output.</p>
            </div>
          )}

          {loading && (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div className="loading-spinner"></div>
            </div>
          )}

          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Nutrient Deficiencies */}
              <div className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{color: '#666', fontWeight: 'bold'}}>Nitrogen Status</div>
                  <div style={{fontSize: '1.2rem', color: result.nutrients_status.nitrogen.includes('LOW') ? '#dc2626' : '#16a34a'}}>{result.nutrients_status.nitrogen}</div>
                </div>
                <div>
                  <div style={{color: '#666', fontWeight: 'bold'}}>Phosphorus Status</div>
                  <div style={{fontSize: '1.2rem', color: result.nutrients_status.phosphorus.includes('LOW') ? '#dc2626' : '#16a34a'}}>{result.nutrients_status.phosphorus}</div>
                </div>
                <div>
                  <div style={{color: '#666', fontWeight: 'bold'}}>Potassium Status</div>
                  <div style={{fontSize: '1.2rem', color: result.nutrients_status.potassium.includes('LOW') ? '#dc2626' : '#16a34a'}}>{result.nutrients_status.potassium}</div>
                </div>
              </div>

              {/* NPK Model Output */}
              <div className="card">
                <h2><Sprout size={20} /> Model Estimated Requirement</h2>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '15px' }}>
                  <div style={{textAlign: 'center'}}>
                    <div style={{color: '#64748b'}}>N Need</div>
                    <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#1a4331'}}>{result.npk_need.nitrogen_need}</div>
                  </div>
                  <div style={{textAlign: 'center'}}>
                    <div style={{color: '#64748b'}}>P Need</div>
                    <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#1a4331'}}>{result.npk_need.phosphorus_need}</div>
                  </div>
                  <div style={{textAlign: 'center'}}>
                    <div style={{color: '#64748b'}}>K Need</div>
                    <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#1a4331'}}>{result.npk_need.potassium_need}</div>
                  </div>
                </div>
              </div>

              {/* Weather Status */}
              <div style={{ 
                background: result.weather_status.includes('WAIT') || result.weather_status.includes('CAUTION') || result.weather_status.includes('IRRIGATE') ? '#fef2f2' : '#f0fdf4', 
                border: result.weather_status.includes('WAIT') || result.weather_status.includes('CAUTION') || result.weather_status.includes('IRRIGATE') ? '1px solid #fecaca' : '1px solid #bbf7d0', 
                padding: '15px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '15px', 
                color: result.weather_status.includes('WAIT') || result.weather_status.includes('CAUTION') || result.weather_status.includes('IRRIGATE') ? '#dc2626' : '#16a34a' 
              }}>
                {result.weather_status.includes('GOOD') ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                <div>
                  <h3 style={{margin: '0 0 5px 0', fontSize: '1.1rem'}}>Application Condition</h3>
                  <p style={{margin: 0}}>{result.weather_status}</p>
                </div>
              </div>

              {/* Fertilizer Rankings */}
              <div className="card">
                <h2>Recommended Fertilizers</h2>
                {result.recommendations.map((rec, i) => (
                  <div key={i} style={{ padding: '15px', borderBottom: i !== result.recommendations.length - 1 ? '1px solid #eee' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{fontWeight: 'bold', fontSize: '1.2rem', color: '#1a4331'}}>{rec.name}</div>
                      <div style={{fontWeight: 'bold', color: i === 0 ? '#16a34a' : '#94a3b8'}}>{rec.match_score.toFixed(0)}% Match</div>
                    </div>
                    <div style={{color: '#666', marginTop: '5px'}}>{rec.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
