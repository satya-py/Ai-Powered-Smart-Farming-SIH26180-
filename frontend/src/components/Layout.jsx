import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  Bell,
  Bug,
  Droplets,
  FileBarChart,
  LayoutDashboard,
  Leaf,
  LogOut,
  Map,
  Menu,
  Radio,
  Search,
  Settings2,
  ShieldAlert,
  Sprout,
  TestTube,
} from 'lucide-react';

import { api, DEFAULT_FIELD_ID } from '../api';

export const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/disease', label: 'Disease Detection', icon: Leaf },
  { path: '/pests', label: 'Pest Detection', icon: Bug },
  { path: '/sensors', label: 'Sensor Analytics', icon: Activity },
  { path: '/nutrients', label: 'Nutrient Health', icon: TestTube },
  { path: '/fertilizer', label: 'Fertilizer Recommendation', icon: Sprout },
  { path: '/manual-input', label: 'Manual Soil Input', icon: Settings2 },
  { path: '/irrigation', label: 'Irrigation & Advisory', icon: Droplets },
  { path: '/live', label: 'Continuous Monitoring', icon: Radio },
  { path: '/risk', label: 'Risk Analytics', icon: ShieldAlert },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/fields', label: 'Field Management', icon: Map },
  { path: '/reports', label: 'Reports', icon: FileBarChart },
];

function Sidebar({ open, onNavigate, health }) {
  const online = health?.status === 'ok';

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">
          <Leaf size={19} />
        </div>
        <div>
          <div className="sidebar-brand-name">Smart Farm AI</div>
          <div className="sidebar-brand-tag">Smarter Farming, Healthier Tomorrow</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            onClick={onNavigate}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-status">
        <div className="sidebar-status-title">
          <span className={`status-dot ${online ? '' : 'offline'}`} />
          System Status
        </div>
        <div className="sidebar-status-text">
          {online ? 'All systems operational' : 'Backend unreachable'}
        </div>
      </div>
    </aside>
  );
}

function Topbar({ onMenu, alertCount, onLogout }) {
  return (
    <header className="topbar">
      <button className="icon-btn" onClick={onMenu} aria-label="Toggle navigation">
        <Menu size={17} />
      </button>

      <div className="topbar-search">
        <Search size={15} />
        <input placeholder="Search here…" aria-label="Search" />
      </div>

      <div className="topbar-spacer" />

      <Link to="/alerts" className="icon-btn" aria-label="Alerts">
        <Bell size={17} />
        {alertCount > 0 && <span className="badge">{alertCount}</span>}
      </Link>

      <div className="topbar-user">
        <div className="avatar">F</div>
        <div>
          <div className="topbar-user-name">Farmer</div>
          <div className="topbar-user-role">Demo Farmer</div>
        </div>
      </div>

      <button className="icon-btn" onClick={onLogout} aria-label="Sign out" title="Sign out">
        <LogOut size={16} />
      </button>
    </header>
  );
}

export default function Layout({ children, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [health, setHealth] = useState(null);
  const [alertCount, setAlertCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const data = await api.health();
        if (!cancelled) setHealth(data);
      } catch {
        if (!cancelled) setHealth({ status: 'down' });
      }
      try {
        const data = await api.alerts(DEFAULT_FIELD_ID);
        if (!cancelled) setAlertCount(data.total ?? 0);
      } catch {
        if (!cancelled) setAlertCount(0);
      }
    };

    poll();
    const id = setInterval(poll, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [location.pathname]);

  return (
    <div className="app">
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} health={health} />
      <div className="app-main">
        <Topbar
          onMenu={() => setMenuOpen((v) => !v)}
          alertCount={alertCount}
          onLogout={onLogout}
        />
        <div className="app-body">{children}</div>
      </div>
    </div>
  );
}

export function PageHead({ icon, title, subtitle, actions }) {
  return (
    <div className="page-head">
      {icon && <div className="page-head-icon">{icon}</div>}
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-head-actions">{actions}</div>}
    </div>
  );
}
