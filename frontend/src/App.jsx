import React, { useCallback, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import Alerts from './pages/Alerts';
import ContinuousMonitoring from './pages/ContinuousMonitoring';
import Dashboard from './pages/Dashboard';
import DiseaseDetection from './pages/DiseaseDetection';
import FertilizerRecommendation from './pages/FertilizerRecommendation';
import FieldManagement from './pages/FieldManagement';
import IrrigationAdvisory from './pages/IrrigationAdvisory';
import Login from './pages/Login';
import ManualNutrientInput from './pages/ManualNutrientInput';
import NutrientHealth from './pages/NutrientHealth';
import PestDetection from './pages/PestDetection';
import Reports from './pages/Reports';
import RiskAnalytics from './pages/RiskAnalytics';
import SensorAnalysis from './pages/SensorAnalysis';

import './theme.css';

const SESSION_KEY = 'smartfarm.user';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  });

  const signIn = useCallback((name) => {
    try {
      sessionStorage.setItem(SESSION_KEY, name);
    } catch {
      // Private browsing — keep the session in memory only.
    }
    setUser(name);
  }, []);

  const signOut = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore storage failures.
    }
    setUser(null);
  }, []);

  if (!user) return <Login onSignIn={signIn} />;

  return (
    <BrowserRouter>
      <Layout onLogout={signOut}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/disease" element={<DiseaseDetection />} />
          <Route path="/pests" element={<PestDetection />} />
          <Route path="/sensors" element={<SensorAnalysis />} />
          <Route path="/nutrients" element={<NutrientHealth />} />
          <Route path="/fertilizer" element={<FertilizerRecommendation />} />
          <Route path="/manual-input" element={<ManualNutrientInput />} />
          <Route path="/irrigation" element={<IrrigationAdvisory />} />
          <Route path="/live" element={<ContinuousMonitoring />} />
          <Route path="/risk" element={<RiskAnalytics />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/fields" element={<FieldManagement />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
