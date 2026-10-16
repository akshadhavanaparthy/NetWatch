import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Server,
  Layers,
  FileCheck,
  FileX,
  AlertOctagon,
  ArrowRight,
  TrendingUp,
  Activity,
  Play
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { api } from '../services/api';

export default function DashboardPage({ dataRevision, onDatasetChanged }) {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDashboard();
      setDashboard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [dataRevision]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <AlertOctagon size={18} />
        <div>
          <strong>Error loading dashboard metrics:</strong> {error}
        </div>
      </div>
    );
  }

  const isEmpty = !dashboard || dashboard.status === 'empty' || dashboard.valid_records === 0;

  if (isEmpty) {
    return (
      <div className="card empty-state">
        <Server className="empty-icon" />
        <h2 className="empty-title">No Network Traffic Analyzed Yet</h2>
        <p className="empty-text">
          To detect anomalies, upload a network-flow CSV file or immediately load our synthetic dataset
          simulating multi-stage attacks and benign baseline traffic.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => navigate('/upload')}>
            Upload Network Flows CSV
          </button>
          <button
            className="btn btn-outline-cyan"
            onClick={async () => {
              await api.loadSampleDataset();
              if (onDatasetChanged) await onDatasetChanged();
              navigate('/baseline');
            }}
          >
            Load Synthetic Sample & Start
          </button>
        </div>
      </div>
    );
  }

  const sevDist = dashboard.severity_distribution || { Low: 0, Medium: 0, High: 0, Critical: 0 };
  const scoreThresholds = dashboard.severity_score_thresholds || {
    Low: 35,
    Medium: 65,
    High: 85,
    Critical: 100
  };
  const severityRanges = {
    Critical: `${scoreThresholds.High + 1}-${scoreThresholds.Critical}`,
    High: `${scoreThresholds.Medium + 1}-${scoreThresholds.High}`,
    Medium: `${scoreThresholds.Low + 1}-${scoreThresholds.Medium}`,
    Low: `0-${scoreThresholds.Low}`
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Activity color="#38bdf8" /> Network Anomaly Dashboard
          </h1>
          <p className="page-subtitle">
            Active Dataset: <strong style={{ color: '#fff' }}>{dashboard.dataset_name}</strong> &bull;{' '}
            {dashboard.valid_records?.toLocaleString()} verified flow records
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/upload')}>
            Dataset Mapping
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/baseline')}>
            <Play size={14} /> Baseline & Detection
          </button>
        </div>
      </div>

      <div className={`alert ${dashboard.analysis_complete ? 'alert-info' : 'alert-warning'}`} style={{ marginBottom: 20 }}>
        <Activity size={18} />
        <div style={{ flex: 1 }}>
          <strong>{dashboard.analysis_complete ? 'Dataset analysis complete' : 'Traffic loaded; anomaly analysis pending'}</strong>
          <div style={{ fontSize: 13, marginTop: 3 }}>
            {dashboard.analysis_message || 'Build a baseline and run detection to calculate findings and incident severity.'}
            {dashboard.analysis_complete && dashboard.evaluation_start && (
              <span> Evaluation: {dashboard.evaluation_start} to {dashboard.evaluation_end} ({dashboard.evaluation_records?.toLocaleString()} flows).</span>
            )}
          </div>
        </div>
        {!dashboard.analysis_complete && (
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/baseline')}>
            Build Baseline & Detect
          </button>
        )}
      </div>

      {/* Top Stats Cards */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-header">
            <span>Observed Hosts</span>
            <Server size={18} color="#38bdf8" />
          </div>
          <div className="stat-value">{dashboard.total_hosts}</div>
          <div className="stat-desc">Distinct source or destination IP addresses</div>
        </div>

        <div className="stat-box">
          <div className="stat-header">
            <span>Valid Flow Records</span>
            <FileCheck size={18} color="#10b981" />
          </div>
          <div className="stat-value">{dashboard.valid_records?.toLocaleString()}</div>
          <div className="stat-desc">
            {dashboard.rejected_records > 0 ? (
              <span style={{ color: '#f59e0b' }}>{dashboard.rejected_records} rejected</span>
            ) : (
              '0 rejected rows'
            )}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-header">
            <span>Anomaly Findings</span>
            <AlertOctagon size={18} color="#f59e0b" />
          </div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>
            {dashboard.total_findings}
          </div>
          <div className="stat-desc">{dashboard.analysis_complete ? 'Rule deviations in the evaluation period' : 'Awaiting baseline and evaluation'}</div>
        </div>

        <div className="stat-box">
          <div className="stat-header">
            <span>Correlated Incidents</span>
            <ShieldAlert size={18} color="#ef4444" />
          </div>
          <div className="stat-value" style={{ color: '#ef4444' }}>
            {dashboard.total_incidents}
          </div>
          <div className="stat-desc">{dashboard.analysis_complete ? 'Correlated from detected findings' : 'Awaiting anomaly analysis'}</div>
        </div>
      </div>

      {/* Severity Breakdown Bar */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">
          <span>Incident Severity Breakdown</span>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>Deterministic Risk Scoring</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: 14, borderRadius: 8 }}>
            <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 13 }}>CRITICAL (Score {severityRanges.Critical})</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{sevDist.Critical || 0}</div>
          </div>
          <div style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.3)', padding: 14, borderRadius: 8 }}>
            <div style={{ color: '#f97316', fontWeight: 700, fontSize: 13 }}>HIGH (Score {severityRanges.High})</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{sevDist.High || 0}</div>
          </div>
          <div style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', padding: 14, borderRadius: 8 }}>
            <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: 13 }}>MEDIUM (Score {severityRanges.Medium})</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{sevDist.Medium || 0}</div>
          </div>
          <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: 14, borderRadius: 8 }}>
            <div style={{ color: '#38bdf8', fontWeight: 700, fontSize: 13 }}>LOW (Score {severityRanges.Low})</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{sevDist.Low || 0}</div>
          </div>
        </div>
      </div>

      {/* Traffic Chart */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">
          <span>Traffic Volume Over Time (Bytes Sent vs Received)</span>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/traffic')}>
            Deep Analytics <ArrowRight size={14} />
          </button>
        </div>
        <div style={{ height: 260, width: '100%' }}>
          {dashboard.traffic_overview && dashboard.traffic_overview.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboard.traffic_overview}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorRecv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => (val ? val.split(' ')[1] || val : '')}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(bytes) =>
                    bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)}M` : `${(bytes / 1024).toFixed(0)}K`
                  }
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8 }}
                  formatter={(val) => [`${(val / 1024).toFixed(1)} KB`, '']}
                />
                <Area type="monotone" dataKey="bytes_sent" name="Bytes Sent" stroke="#38bdf8" fillOpacity={1} fill="url(#colorSent)" />
                <Area type="monotone" dataKey="bytes_received" name="Bytes Received" stroke="#6366f1" fillOpacity={1} fill="url(#colorRecv)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', paddingTop: 80, color: '#64748b' }}>No time series data</div>
          )}
        </div>
      </div>

      {/* Grid: Most Active Hosts & Recent Incidents */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
        {/* Top Talkers */}
        <div className="card">
          <div className="card-title">
            <span>Top Active Hosts</span>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/hosts')}>
              View All
            </button>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Host IP</th>
                  <th>Total Volume</th>
                  <th>Connections</th>
                  <th>Destinations</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.top_talkers && dashboard.top_talkers.length > 0 ? (
                  dashboard.top_talkers.map((h, i) => (
                    <tr key={i} style={{ cursor: 'pointer' }} onClick={() => navigate(`/hosts?host=${h.host}`)}>
                      <td className="mono" style={{ color: '#38bdf8', fontWeight: 600 }}>{h.host}</td>
                      <td>{(h.total_bytes / 1024).toFixed(1)} KB</td>
                      <td>{h.connections}</td>
                      <td>{h.distinct_destinations}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>No hosts recorded</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Incidents */}
        <div className="card">
          <div className="card-title">
            <span>High-Priority Incidents</span>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/incidents')}>
              All Incidents ({dashboard.total_incidents})
            </button>
          </div>
          {dashboard.recent_incidents && dashboard.recent_incidents.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dashboard.recent_incidents.map((inc) => {
                const sevBadge =
                  inc.severity === 'Critical'
                    ? 'badge-critical'
                    : inc.severity === 'High'
                    ? 'badge-high'
                    : inc.severity === 'Medium'
                    ? 'badge-medium'
                    : 'badge-low';

                return (
                  <div
                    key={inc.incident_id}
                    style={{
                      background: 'rgba(30, 41, 59, 0.4)',
                      border: '1px solid #1e293b',
                      borderRadius: 8,
                      padding: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate(`/incidents/${inc.incident_id}`)}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="mono" style={{ fontWeight: 700, color: '#f8fafc', fontSize: 13 }}>
                          {inc.incident_id}
                        </span>
                        <span className={`badge ${sevBadge}`}>{inc.severity}</span>
                        {inc.is_approved_activity && (
                          <span className="badge badge-approved">Approved</span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>
                        {inc.title}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8' }}>
                        {inc.score}
                        <span style={{ fontSize: 11, color: '#64748b' }}>/100</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        {inc.findings_count} finding(s)
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              No incidents generated yet. Run detection from the Baseline page.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
