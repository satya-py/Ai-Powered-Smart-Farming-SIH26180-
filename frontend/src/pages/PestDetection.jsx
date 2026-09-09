import React, { useState } from 'react';
import { UploadCloud, Bug } from 'lucide-react';

export default function PestDetection() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const response = await fetch('http://localhost:8000/api/pests/detect', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Failed to detect pests. Make sure the backend server is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Pest Detection</h1>
        <p>Upload an image to run the YOLO11 multi-object pest detector.</p>
      </div>

      <div className="grid">
        <div className="card" style={{ gridColumn: 'span 6' }}>
          <h2><UploadCloud size={20} /> Upload Image</h2>
          <div className={`upload-container ${file ? 'active' : ''}`}>
            <input type="file" accept="image/*" onChange={handleFileChange} id="pest-upload" style={{display: 'none'}} />
            <label htmlFor="pest-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <UploadCloud size={48} color={file ? '#4ade80' : '#ccc'} />
              <span style={{fontSize: '1.2rem', color: '#555'}}>{file ? file.name : "Click to select a field image"}</span>
            </label>
            {preview && <img src={preview} alt="Preview" className="preview-image" />}
            <button className="upload-btn" onClick={handleUpload} disabled={!file || loading}>
              {loading ? "Scanning..." : "Detect Pests"}
            </button>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 6' }}>
          <h2><Bug size={20} /> Detection Result</h2>
          {loading ? (
            <div className="loading-spinner"></div>
          ) : result ? (
            <div className="result-card">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <span style={{fontSize: '1.2rem', fontWeight: 'bold'}}>Pest Pressure:</span>
                <div className={`badge ${result.pest_pressure === 'HIGH' ? 'critical' : result.pest_pressure === 'MODERATE' ? 'moderate' : 'normal'}`}>
                  {result.pest_pressure}
                </div>
              </div>
              
              <div style={{marginBottom: '15px'}}>
                <div style={{color: '#666', fontSize: '0.9rem'}}>Total Insects Detected</div>
                <div style={{fontSize: '2rem', fontWeight: 'bold'}}>{result.total_pests}</div>
              </div>
              
              <div style={{marginBottom: '15px'}}>
                <div style={{color: '#666', fontSize: '0.9rem', marginBottom: '8px'}}>Counts by Type</div>
                <ul style={{ background: '#fff', borderRadius: '8px', padding: '15px 30px', border: '1px solid #e2e8f0' }}>
                  {Object.entries(result.pest_counts).map(([name, count]) => (
                    <li key={name} style={{fontSize: '1.1rem', marginBottom: '8px'}}>
                      {name}: <strong>{count}</strong>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div style={{marginTop: '30px', paddingTop: '15px', borderTop: '1px solid #e2e8f0', color: '#666', fontSize: '0.9rem'}}>
                Inference Time: {result.inference_ms}ms
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
              Upload an image to identify pests.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
