import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Leaf, Bug, Activity, Droplets, Radio, TestTube, Sprout, Settings2 } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import DiseaseDetection from './pages/DiseaseDetection';
import PestDetection from './pages/PestDetection';
import SensorAnalysis from './pages/SensorAnalysis';
import IrrigationAdvisory from './pages/IrrigationAdvisory';
import ContinuousMonitoring from './pages/ContinuousMonitoring';
import NutrientHealth from './pages/NutrientHealth';
import FertilizerRecommendation from './pages/FertilizerRecommendation';
import ManualNutrientInput from './pages/ManualNutrientInput';
import './App.css';

function Sidebar() {
  const location = useLocation();
  const navItems = [
    { path: '/', name: 'Overview', icon: <LayoutDashboard size={20} /> },
    { path: '/disease', name: 'Disease Detection', icon: <Leaf size={20} /> },
    { path: '/pests', name: 'Pest Detection', icon: <Bug size={20} /> },
    { path: '/nutrients', name: 'Nutrient Health', icon: <TestTube size={20} /> },
    { path: '/fertilizer', name: 'Fertilizer Advice', icon: <Sprout size={20} /> },
    { path: '/manual-input', name: 'Manual Input Model', icon: <Settings2 size={20} /> },
    { path: '/sensors', name: 'Sensor Analytics', icon: <Activity size={20} /> },
    { path: '/irrigation', name: 'Irrigation & Advisory', icon: <Droplets size={20} /> },
    { path: '/live', name: 'Continuous Monitoring', icon: <Radio size={20} /> },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Smart Farm</h2>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <Link 
            key={item.path} 
            to={item.path} 
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/disease" element={<DiseaseDetection />} />
            <Route path="/pests" element={<PestDetection />} />
            <Route path="/nutrients" element={<NutrientHealth />} />
            <Route path="/fertilizer" element={<FertilizerRecommendation />} />
            <Route path="/manual-input" element={<ManualNutrientInput />} />
            <Route path="/sensors" element={<SensorAnalysis />} />
            <Route path="/irrigation" element={<IrrigationAdvisory />} />
            <Route path="/live" element={<ContinuousMonitoring />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
export default App;
