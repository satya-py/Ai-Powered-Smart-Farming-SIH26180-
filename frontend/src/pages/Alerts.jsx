import React, { useState } from 'react';
import {
  Bell,
  Bug,
  CheckCircle2,
  CloudSun,
  Droplets,
  Leaf,
  RefreshCw,
  TestTube,
} from 'lucide-react';

import { api, DEFAULT_FIELD_ID } from '../api';
import { useApi } from '../hooks';
import { PageHead } from '../components/Layout';
import { Async, Badge, EmptyState, FlushCard, Tabs, formatTime } from '../components/ui';

const CATEGORY_ICON = {
  disease: Leaf,
  pest: Bug,
  water: Droplets,
  weather: CloudSun,
  nutrient: TestTube,
};

const SEVERITY_TONE = { HIGH: 'red', MODERATE: 'amber', LOW: 'blue' };

export default function Alerts() {
  const [tab, setTab] = useState('active');
  const [resolved, setResolved] = useState(() => new Set());
  const alerts = useApi(() => api.alerts(DEFAULT_FIELD_ID), []);

  const toggleResolved = (id) =>
    setResolved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="stack">
      <PageHead
        icon={<Bell size={20} />}
        title="Alerts"
        subtitle="Important notifications and warnings"
        actions={
          <>
            <Tabs
              tabs={[
                { id: 'active', label: 'Active Alerts' },
                { id: 'resolved', label: 'Resolved' },
              ]}
              value={tab}
              onChange={setTab}
            />
            <button className="btn btn-outline sm" onClick={() => alerts.reload()}>
              <RefreshCw size={13} /> Refresh
            </button>
          </>
        }
      />

      <Async state={alerts} loadingLabel="Checking field alerts…">
        {(data) => {
          const visible = (data.alerts || []).filter((a) =>
            tab === 'resolved' ? resolved.has(a.id) : !resolved.has(a.id),
          );

          if (visible.length === 0) {
            return (
              <FlushCard>
                <EmptyState
                  title={tab === 'resolved' ? 'Nothing resolved yet' : 'No active alerts'}
                  hint={
                    tab === 'resolved'
                      ? 'Alerts you mark as handled will appear here.'
                      : 'Field conditions are within normal ranges.'
                  }
                />
              </FlushCard>
            );
          }

          return (
            <FlushCard title={tab === 'resolved' ? 'Resolved Alerts' : 'Active Alerts'}>
              <div className="row-list">
                {visible.map((alert) => {
                  const Icon = CATEGORY_ICON[alert.category] || Bell;
                  return (
                    <div className="row-item" key={alert.id}>
                      <div className={`row-icon ${SEVERITY_TONE[alert.severity] || 'blue'}`}>
                        <Icon size={15} />
                      </div>
                      <div className="grow">
                        <div className="row-title">{alert.title}</div>
                        <div className="row-sub">{alert.detail}</div>
                      </div>
                      <Badge level={alert.severity}>{alert.severity}</Badge>
                      <div className="row-meta">{formatTime(alert.timestamp)}</div>
                      <button
                        className="btn btn-ghost sm"
                        onClick={() => toggleResolved(alert.id)}
                        title={tab === 'resolved' ? 'Reopen alert' : 'Mark as resolved'}
                      >
                        <CheckCircle2 size={14} />
                        {tab === 'resolved' ? 'Reopen' : 'Resolve'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </FlushCard>
          );
        }}
      </Async>

      <div className="small muted">
        Resolving an alert hides it for this session. Alerts are recomputed from the
        latest observation each time the field is measured.
      </div>
    </div>
  );
}
