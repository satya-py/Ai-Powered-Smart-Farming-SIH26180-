import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FlaskConical,
  Info,
  Leaf,
  Loader2,
  Microscope,
  ScanLine,
} from 'lucide-react';

import { api } from '../api';
import { PageHead } from '../components/Layout';
import {
  Card,
  ImageUpload,
  Meter,
  num,
  prettyLabel,
} from '../components/ui';

function InfoRow({ label, value }) {
  return (
    <div className="row" style={{ alignItems: 'flex-start', padding: '7px 0' }}>
      <span className="small muted" style={{ width: 128, flexShrink: 0 }}>
        {label}
      </span>
      <span className="small strong grow">{value || '—'}</span>
    </div>
  );
}

export default function DiseaseDetection() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleSelect = (picked) => {
    setFile(picked);
    setResult(null);
    setError(null);
  };

  const analyze = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await api.detectDisease(file));
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  const disease = result?.disease;
  const healthy = disease?.healthy;

  return (
    <div className="stack">
      <PageHead
        icon={<Leaf size={20} />}
        title="Disease Detection"
        subtitle="Upload a leaf image to detect crop disease or a healthy condition"
      />

      <div className="grid split-even">
        <Card title="Upload Leaf Image" icon={<ScanLine size={16} />}>
          <ImageUpload
            file={file}
            previewUrl={previewUrl}
            onSelect={handleSelect}
            disabled={busy}
            hint="A clear, well-lit close-up of a single leaf gives the best result"
          />

          <button
            className="btn btn-primary block"
            style={{ marginTop: 14 }}
            disabled={!file || busy}
            onClick={analyze}
          >
            {busy ? <Loader2 size={15} className="spin" /> : <ScanLine size={15} />}
            {busy ? 'Analyzing…' : 'Detect Disease'}
          </button>

          {error && (
            <div className="callout danger" style={{ marginTop: 12 }}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}
        </Card>

        <Card title="Prediction Result" icon={<Microscope size={16} />}>
          {!result && !busy && (
            <div className="state">
              <Microscope size={24} />
              <div className="state-title">No analysis yet</div>
              <span>Upload a leaf image and run detection to see the prediction.</span>
            </div>
          )}

          {busy && (
            <div className="state">
              <Loader2 size={22} className="spin" />
              <span>Running the ProtoPNet model…</span>
            </div>
          )}

          {result && disease && (
            <div className="stack" style={{ gap: 14 }}>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Analyzed leaf"
                    style={{
                      width: 84,
                      height: 84,
                      objectFit: 'cover',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                    }}
                  />
                )}
                <div className="grow">
                  <div className="strong" style={{ fontSize: 15 }}>
                    {disease.crop} — {prettyLabel(disease.disease)}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    {healthy ? (
                      <span className="badge-pill good">
                        <CheckCircle2 size={12} /> Healthy
                      </span>
                    ) : (
                      <span className="badge-pill high">
                        <AlertCircle size={12} /> Disease detected
                      </span>
                    )}
                    {disease.severity && disease.severity !== 'None' && (
                      <span className="badge-pill moderate" style={{ marginLeft: 6 }}>
                        Severity: {disease.severity}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="row between small muted">
                  <span>Confidence</span>
                  <span className="strong" style={{ color: 'var(--text)' }}>
                    {num(disease.confidence * 100, 1, '%')}
                  </span>
                </div>
                <div style={{ marginTop: 5 }}>
                  <Meter value={disease.confidence * 100} tone={disease.confidence > 0.7 ? '' : 'amber'} />
                </div>
                {disease.confidence < 0.5 && (
                  <div className="callout warning" style={{ marginTop: 10 }}>
                    <Info size={15} />
                    <span>
                      Low confidence. Retake the photo with the leaf filling the frame,
                      in even lighting, against a plain background.
                    </span>
                  </div>
                )}
              </div>

              <div className="small muted">
                Inference time: {num(result.inference_ms, 0, ' ms')} · Model:{' '}
                {result.model_version}
              </div>
            </div>
          )}
        </Card>
      </div>

      {result && disease && (
        <div className="grid split-even">
          <Card title="Disease Information" icon={<FlaskConical size={16} />}>
            <InfoRow label="Crop" value={disease.crop} />
            <InfoRow label="Class" value={prettyLabel(disease.class_name)} />
            <InfoRow label="Scientific name" value={disease.scientific} />
            <InfoRow label="Causal agent" value={disease.causal} />
            <InfoRow label="Severity" value={disease.severity} />

            {!healthy && (
              <div className="callout info" style={{ marginTop: 12 }}>
                <Info size={15} />
                <span>
                  Remove and destroy affected leaves, avoid overhead watering, and
                  consult your local agricultural officer before applying any treatment.
                </span>
              </div>
            )}
          </Card>

          <Card title="Top Predictions" icon={<Microscope size={16} />}>
            <div className="stack" style={{ gap: 11 }}>
              {result.top_k.map((item) => (
                <div key={item.class_index}>
                  <div className="row between small">
                    <span className="strong">{prettyLabel(item.class_name)}</span>
                    <span className="muted">{num(item.confidence * 100, 1, '%')}</span>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Meter value={item.confidence * 100} tone={item.healthy ? '' : 'amber'} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
