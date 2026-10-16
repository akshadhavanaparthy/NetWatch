import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';

import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import DataQualityPage from './pages/DataQualityPage';
import BaselinePage from './pages/BaselinePage';
import TrafficAnalyticsPage from './pages/TrafficAnalyticsPage';
import HostAnalysisPage from './pages/HostAnalysisPage';
import PortAnalysisPage from './pages/PortAnalysisPage';
import DnsAnalysisPage from './pages/DnsAnalysisPage';
import NetworkGraphPage from './pages/NetworkGraphPage';
import IncidentsPage from './pages/IncidentsPage';
import IncidentDetailPage from './pages/IncidentDetailPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';

import { api } from './services/api';

function DatasetRequired({ healthData, children }) {
  if (!healthData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    );
  }
  return healthData.dataset_loaded ? children : <Navigate to="/upload" replace />;
}

export default function App() {
  const [healthData, setHealthData] = useState(null);
  const [dataRevision, setDataRevision] = useState(0);

  const refreshHealth = async () => {
    try {
      const data = await api.getHealth();
      setHealthData(data);
    } catch (err) {
      console.warn('API Health Check failed:', err);
    }
  };

  const refreshData = async () => {
    await refreshHealth();
    setDataRevision((revision) => revision + 1);
  };

  useEffect(() => {
    refreshHealth();
  }, []);

  return (
    <Router>
      <div className="app-container">
        <Sidebar healthData={healthData} />
        <div className="main-wrapper">
          <TopBar healthData={healthData} onRefresh={refreshData} />
          <main className="content-viewport">
            <Routes>
              <Route path="/" element={<DatasetRequired healthData={healthData}><DashboardPage dataRevision={dataRevision} onDatasetChanged={refreshData} /></DatasetRequired>} />
              <Route path="/upload" element={<UploadPage onDatasetChanged={refreshData} />} />
              <Route path="/data-quality" element={<DatasetRequired healthData={healthData}><DataQualityPage dataRevision={dataRevision} /></DatasetRequired>} />
              <Route path="/baseline" element={<DatasetRequired healthData={healthData}><BaselinePage onBaselineOrAnalysisChanged={refreshData} /></DatasetRequired>} />
              <Route path="/traffic" element={<DatasetRequired healthData={healthData}><TrafficAnalyticsPage dataRevision={dataRevision} /></DatasetRequired>} />
              <Route path="/hosts" element={<DatasetRequired healthData={healthData}><HostAnalysisPage dataRevision={dataRevision} /></DatasetRequired>} />
              <Route path="/ports" element={<DatasetRequired healthData={healthData}><PortAnalysisPage dataRevision={dataRevision} /></DatasetRequired>} />
              <Route path="/dns" element={<DatasetRequired healthData={healthData}><DnsAnalysisPage dataRevision={dataRevision} /></DatasetRequired>} />
              <Route path="/graph" element={<DatasetRequired healthData={healthData}><NetworkGraphPage dataRevision={dataRevision} /></DatasetRequired>} />
              <Route path="/incidents" element={<DatasetRequired healthData={healthData}><IncidentsPage dataRevision={dataRevision} /></DatasetRequired>} />
              <Route path="/incidents/:id" element={<DatasetRequired healthData={healthData}><IncidentDetailPage dataRevision={dataRevision} /></DatasetRequired>} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/reports" element={<DatasetRequired healthData={healthData}><ReportsPage dataRevision={dataRevision} /></DatasetRequired>} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
