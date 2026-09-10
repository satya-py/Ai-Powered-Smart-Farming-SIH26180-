import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Bug, Loader2, ScanLine, Sigma } from 'lucide-react';

import { api } from '../api';
import { PageHead } from '../components/Layout';
import {
  Card,
  FlushCard,
  ImageUpload,
  Meter,
  StatCard,
  num,
  prettyLabel,
} from '../components/ui';

export default function PestDetection() {
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
      setResult(await api.detectPests(file));
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  /** Group detections by species with a mean confidence. */
  const species = useMemo(() => {
    if (!result) return [];
    const grouped = new Map();
    for (const pest of result.pests) {
      const entry = grouped.get(pest.name) || { name: pest.name, count: 0, total: 0 };
      entry.count += 1;
      entry.total += pest.confidence;
      grouped.set(pest.name, entry);
    }
    return [...grouped.values()]
      .map((e) => ({ ...e, confidence: e.total / e.count }))
      .sort((a, b) => b.count - a.count);
  }, [result]);

  return (
    <div className="stack">
      <PageHead
        icon={<Bug size={20} />}
        title="Pest Detection"
        subtitle="Upload a field image to detect and count pests"
      />

      <div className="grid split-even">
        <Card title="Upload Field Image" icon={<ScanLine size={16} />}>
          <ImageUpload
            file={file}
            previewUrl={previewUrl}
            onSelect={handleSelect}
            disabled={busy}
            hint="A wide shot of the leaf surface or trap works best for counting"
          />

          <button
            className="btn btn-primary block"
            style={{ marginTop: 14 }}
            disabled={!file || busy}
            onClick={analyze}
          >
            {busy ? <Loader2 size={15} className="spin" /> : <ScanLine size={15} />}
            {busy ? 'Detecting…' : 'Detect Pests'}
          </button>

          {error && (
            <div className="callout danger" style={{ marginTop: 12 }}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}
        </Card>

        <Card title="Detection Results" icon={<Bug size={16} />}>
          {!result && !busy && (
            <div className="state">
              <Bug size={24} />
              <div className="state-title">No analysis yet</div>
              <span>Upload a field image and run detection to see pest counts.</span>
            </div>
          )}

          {busy && (
            <div className="state">
              <Loader2 size={22} className="spin" />
              <span>Running the YOLO11 pest model…</span>
            </div>
          )}

          {result && (
            <div className="stack" style={{ gap: 12 }}>
              {result.annotated_image ? (
                <img
                  src={result.annotated_image}
                  alt="Detected pests with bounding boxes"
                  className="preview-img"
                />
              ) : (
                previewUrl && <img src={previewUrl} alt="Analyzed field" className="preview-img" />
              )}

              <div className="grid cols-2">
                <StatCard
                  icon={<Sigma size={18} />}
                  label="Total Pests"
                  value={result.total_pests}
                  tone={result.total_pests > 0 ? 'amber' : 'green'}
                />
                <StatCard
                  icon={<AlertCircle size={18} />}
                  label="Pest Pressure"
                  value={result.pest_pressure}
                  tone={
                    result.pest_pressure === 'HIGH'
                      ? 'red'
                      : result.pest_pressure === 'MODERATE'
                        ? 'amber'
                        : 'green'
                  }
                />
              </div>

              <div className="small muted">
                Inference time: {num(result.inference_ms, 0, ' ms')}
              </div>
            </div>
          )}
        </Card>
      </div>

      {result && (
        <FlushCard title="Detected Pests" icon={<Bug size={16} />}>
          {species.length === 0 ? (
            <div className="state">
              <div className="state-title">No pests detected</div>
              <span>The model found nothing above the confidence threshold in this image.</span>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Pest Name</th>
                  <th style={{ width: 90 }}>Count</th>
                  <th style={{ width: 200 }}>Avg. Confidence</th>
                </tr>
              </thead>
              <tbody>
                {species.map((item) => (
                  <tr key={item.name}>
                    <td className="strong">{prettyLabel(item.name)}</td>
                    <td>{item.count}</td>
                    <td>
                      <div className="row">
                        <Meter value={item.confidence * 100} tone="" />
                        <span className="small muted">{num(item.confidence, 2)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </FlushCard>
      )}
    </div>
  );
}
