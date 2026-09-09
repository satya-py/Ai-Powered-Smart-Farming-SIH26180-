import React, { useState } from 'react';
import { UploadCloud, Leaf } from 'lucide-react';

export default function DiseaseDetection() {
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
      const response = await fetch('http://localhost:8000/api/disease/detect', {
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
      alert("Failed to detect disease. Make sure the backend server is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Disease Detection</h1>
        <p>Upload a leaf image to run the ProtoPNet model.</p>
      </div>

      <div className="grid">
        <div className="card" style={{ gridColumn: 'span 6' }}>
          <h2><UploadCloud size={20} /> Upload Image</h2>
          <div className={`upload-container ${file ? 'active' : ''}`}>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              id="file-upload" 
              style={{display: 'none'}} 
            />
            <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <UploadCloud size={48} color={file ? '#4ade80' : '#ccc'} />
              <span style={{fontSize: '1.2rem', color: '#555'}}>{file ? file.name : "Click to select a leaf image"}</span>
            </label>
            
            {preview && <img src={preview} alt="Preview" className="preview-image" />}
            
            <button 
              className="upload-btn" 
              onClick={handleUpload} 
              disabled={!file || loading}
            >
              {loading ? "Analyzing..." : "Run Detection"}
            </button>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 6' }}>
          <h2><Leaf size={20} /> Analysis Result</h2>
          {loading ? (
            <div className="loading-spinner"></div>
          ) : result ? (
            <div className="result-card">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <span style={{fontSize: '1.2rem', fontWeight: 'bold'}}>Status:</span>
                <div className={`badge ${result.disease.detected ? 'critical' : 'normal'}`}>
                  {result.disease.detected ? "Disease Detected" : "Healthy"}
                </div>
              </div>
              
              {result.disease.detected && (
                <>
                  <div style={{marginBottom: '15px'}}>
                    <div style={{color: '#666', fontSize: '0.9rem'}}>Disease Classification</div>
                    <div style={{fontSize: '1.5rem', color: '#dc2626', fontWeight: 'bold'}}>{result.disease.class_name}</div>
                  </div>
                  <div style={{marginBottom: '15px'}}>
                    <div style={{color: '#666', fontSize: '0.9rem'}}>Confidence</div>
                    <div style={{fontSize: '1.2rem'}}>{(result.disease.confidence * 100).toFixed(2)}%</div>
                  </div>
                </>
              )}
              
              <div style={{marginTop: '30px', paddingTop: '15px', borderTop: '1px solid #e2e8f0', color: '#666', fontSize: '0.9rem'}}>
                Inference Time: {result.inference_ms}ms
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
              Upload an image to see results.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
