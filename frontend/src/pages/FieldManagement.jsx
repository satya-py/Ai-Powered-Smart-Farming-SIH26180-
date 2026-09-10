import React, { useState } from 'react';
import {
  AlertCircle,
  Loader2,
  Map,
  Plus,
  RefreshCw,
  Sprout,
  Trash2,
} from 'lucide-react';

import { api } from '../api';
import { useApi } from '../hooks';
import { PageHead } from '../components/Layout';
import { Async, Badge, Card, EmptyState, num, relativeTime } from '../components/ui';

const CROPS = ['Tomato', 'Potato', 'Corn', 'Wheat', 'Rice', 'Cotton', 'Pepper', 'Grape'];

export default function FieldManagement() {
  const fields = useApi(() => api.fields(), []);
  const [form, setForm] = useState({ name: '', crop: 'Tomato' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const addField = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Give the field a name.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.createField({ name: form.name.trim(), crop: form.crop });
      setForm({ name: '', crop: 'Tomato' });
      fields.reload(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeField = async (field) => {
    if (!window.confirm(`Delete "${field.name}" and all of its observations?`)) return;
    setError(null);
    try {
      await api.deleteField(field.id);
      fields.reload(true);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="stack">
      <PageHead
        icon={<Map size={20} />}
        title="Field Management"
        subtitle="Manage your fields, crops and locations"
        actions={
          <button className="btn btn-outline sm" onClick={() => fields.reload()}>
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      {error && (
        <div className="callout danger">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid split">
        <div className="stack">
          <Async state={fields} loadingLabel="Loading fields…">
            {(items) =>
              items.length === 0 ? (
                <Card>
                  <EmptyState
                    title="No fields yet"
                    hint="Add your first field using the form beside this list."
                  />
                </Card>
              ) : (
                <div className="grid cols-2">
                  {items.map((field) => (
                    <Card key={field.id}>
                      <div className="row between" style={{ alignItems: 'flex-start' }}>
                        <div className="row" style={{ alignItems: 'flex-start' }}>
                          <div className="stat-icon green">
                            <Sprout size={19} />
                          </div>
                          <div>
                            <div className="strong">{field.name}</div>
                            <div className="small muted">{field.crop}</div>
                          </div>
                        </div>
                        <button
                          className="btn btn-ghost sm"
                          onClick={() => removeField(field)}
                          title="Delete field"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="grid cols-2" style={{ marginTop: 14, gap: 10 }}>
                        <div>
                          <div className="stat-label">Soil Moisture</div>
                          <div className="strong">{num(field.soil_moisture, 1, '%')}</div>
                        </div>
                        <div>
                          <div className="stat-label">Temperature</div>
                          <div className="strong">{num(field.temperature, 1, '°C')}</div>
                        </div>
                      </div>

                      <div className="row between" style={{ marginTop: 14 }}>
                        {field.overall_risk ? (
                          <Badge level={field.overall_risk}>{field.overall_risk} risk</Badge>
                        ) : (
                          <span className="badge-pill neutral">No data</span>
                        )}
                        {field.alerts > 0 ? (
                          <span className="badge-pill high">
                            {field.alerts} alert{field.alerts > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="badge-pill good">Healthy</span>
                        )}
                      </div>

                      <div className="small faint" style={{ marginTop: 9 }}>
                        Updated {relativeTime(field.last_updated)}
                      </div>
                    </Card>
                  ))}
                </div>
              )
            }
          </Async>
        </div>

        <Card title="Add Field" icon={<Plus size={16} />}>
          <form className="stack" style={{ gap: 14 }} onSubmit={addField}>
            <div className="field">
              <label htmlFor="field-name">Field Name</label>
              <input
                id="field-name"
                value={form.name}
                placeholder="e.g. North Plot"
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="field">
              <label htmlFor="field-crop">Crop</label>
              <select
                id="field-crop"
                value={form.crop}
                onChange={(e) => setForm((f) => ({ ...f, crop: e.target.value }))}
              >
                {CROPS.map((crop) => (
                  <option key={crop}>{crop}</option>
                ))}
              </select>
            </div>

            <button className="btn btn-primary block" type="submit" disabled={busy}>
              {busy ? <Loader2 size={15} className="spin" /> : <Plus size={15} />}
              Add Field
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
