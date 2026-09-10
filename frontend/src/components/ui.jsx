import React, { useCallback, useRef, useState } from 'react';
import {
  AlertCircle,
  Inbox,
  Loader2,
  RefreshCw,
  UploadCloud,
} from 'lucide-react';

/* ── Cards ─────────────────────────────────────────────────────────────── */

export function Card({ title, icon, actions, children, bodyClass = '', className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          {icon}
          {title && <h3>{title}</h3>}
          {actions && <div className="card-head-actions">{actions}</div>}
        </header>
      )}
      <div className={`card-body ${bodyClass}`}>{children}</div>
    </section>
  );
}

/** Card whose body has no padding — for tables and row lists. */
export function FlushCard({ title, icon, actions, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          {icon}
          {title && <h3>{title}</h3>}
          {actions && <div className="card-head-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatCard({ icon, label, value, tone = 'green' }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div>
        <div className="stat-label">{label}</div>
        <div className={`stat-value ${String(value).length > 12 ? 'sm' : ''}`}>{value}</div>
      </div>
    </div>
  );
}

/* ── States ────────────────────────────────────────────────────────────── */

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="state">
      <Loader2 size={22} className="spin" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state">
      <AlertCircle size={24} />
      <div className="state-title">Could not load this</div>
      <span>{message}</span>
      {onRetry && (
        <button className="btn btn-outline sm" onClick={() => onRetry()}>
          <RefreshCw size={13} /> Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', hint, action }) {
  return (
    <div className="state">
      <Inbox size={24} />
      <div className="state-title">{title}</div>
      {hint && <span>{hint}</span>}
      {action}
    </div>
  );
}

/**
 * Renders children only once data has loaded, showing loading/error/empty
 * states otherwise. Keeps every page's fetch handling consistent.
 */
export function Async({ state, children, empty, loadingLabel }) {
  if (state.loading) return <Loading label={loadingLabel} />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  if (!state.data) return empty || <EmptyState />;
  return children(state.data);
}

/* ── Badges & meters ───────────────────────────────────────────────────── */

const TONE_BY_LEVEL = {
  LOW: 'low',
  NORMAL: 'low',
  GOOD: 'good',
  ADEQUATE: 'good',
  MODERATE: 'moderate',
  MEDIUM: 'moderate',
  FAIR: 'moderate',
  HIGH: 'high',
  CRITICAL: 'critical',
  DEFICIENT: 'high',
  POOR: 'high',
};

export function levelTone(level) {
  if (!level) return 'neutral';
  const key = String(level).toUpperCase();
  const match = Object.keys(TONE_BY_LEVEL).find((k) => key.startsWith(k));
  return match ? TONE_BY_LEVEL[match] : 'neutral';
}

export function Badge({ level, children }) {
  return <span className={`badge-pill ${levelTone(level)}`}>{children ?? level}</span>;
}

export function Meter({ value, max = 100, tone }) {
  const pct = Math.max(0, Math.min(100, (Number(value) / max) * 100 || 0));
  const auto = pct > 70 ? 'red' : pct > 40 ? 'amber' : '';
  return (
    <div className="meter">
      <div className={`meter-fill ${tone ?? auto}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ── Tabs ──────────────────────────────────────────────────────────────── */

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs">
      {tabs.map((tab) => {
        const id = typeof tab === 'string' ? tab : tab.id;
        const label = typeof tab === 'string' ? tab : tab.label;
        return (
          <button
            key={id}
            className={`tab ${value === id ? 'active' : ''}`}
            onClick={() => onChange(id)}
          >
            {typeof tab === 'object' && tab.icon}
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Image upload ──────────────────────────────────────────────────────── */

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export function ImageUpload({ onSelect, file, previewUrl, disabled, hint }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState(null);

  const accept = useCallback(
    (picked) => {
      if (!picked) return;
      if (!picked.type.startsWith('image/')) {
        setLocalError('Please choose an image file (JPG, PNG, WEBP or BMP).');
        return;
      }
      if (picked.size > MAX_UPLOAD_BYTES) {
        setLocalError('Image is larger than the 20 MB upload limit.');
        return;
      }
      setLocalError(null);
      onSelect(picked);
    },
    [onSelect],
  );

  return (
    <div>
      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) accept(e.dataTransfer.files?.[0]);
        }}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Selected upload preview" className="preview-img" />
        ) : (
          <>
            <div className="dropzone-icon">
              <UploadCloud size={22} />
            </div>
            <div className="dropzone-title">Click to upload an image, or drag and drop</div>
            <div className="dropzone-hint">{hint || 'Supports JPG, PNG, WEBP and BMP up to 20 MB'}</div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            accept(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>

      {file && (
        <div className="row small muted" style={{ marginTop: 8 }}>
          <span className="grow">
            {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
          </span>
          <button className="btn btn-ghost sm" onClick={() => onSelect(null)}>
            Remove
          </button>
        </div>
      )}

      {localError && (
        <div className="callout danger" style={{ marginTop: 10 }}>
          <AlertCircle size={15} />
          <span>{localError}</span>
        </div>
      )}
    </div>
  );
}

/* ── Formatting helpers ────────────────────────────────────────────────── */

export function formatTime(value) {
  if (!value) return '—';
  const date = new Date(value.endsWith?.('Z') || value.includes?.('+') ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatClock(value) {
  if (!value) return '—';
  const date = new Date(value.endsWith?.('Z') || value.includes?.('+') ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function relativeTime(value) {
  if (!value) return '—';
  const date = new Date(value.endsWith?.('Z') || value.includes?.('+') ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return '—';
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export const num = (value, digits = 1, suffix = '') =>
  value === null || value === undefined || Number.isNaN(Number(value))
    ? '—'
    : `${Number(value).toFixed(digits)}${suffix}`;

export const pct = (value, digits = 0) =>
  value === null || value === undefined ? '—' : `${(Number(value) * 100).toFixed(digits)}%`;

/** Turns "Tomato___Early_blight" or "healthy(Cherry)" into readable text. */
export function prettyLabel(name) {
  if (!name) return '—';
  return String(name)
    .replace(/_{2,}/g, ' — ')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}
