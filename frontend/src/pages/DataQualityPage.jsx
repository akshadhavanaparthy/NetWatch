import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Copy,
  Clock,
  Globe,
  Flame,
  AlertTriangle,
  Download,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

export default function DataQualityPage({ dataRevision }) {
  const navigate = useNavigate();
  const [quality, setQuality] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getDataQuality()
      .then((data) => setQuality(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [dataRevision]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

  if (!quality || !quality.valid_records) {
    return (
      <div className="card empty-state">
        <ShieldCheck className="empty-icon" />
        <h2 className="empty-title">No Data Quality Report Available</h2>
        <p className="empty-text">
          Upload and map a dataset first to examine data cleanliness, rejected rows, and feature availability.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/upload')}>
          Go to Upload Page
        </button>
      </div>
    );
  }

  const validRate = ((quality.valid_records / quality.total_records) * 100).toFixed(1);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <ShieldCheck color="#10b981" /> Data Quality & Validation Audit
          </h1>
          <p className="page-subtitle">
            Rigorous validation of timestamps, IP formats, port boundaries, and structural anomalies.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a
            href={api.getExportUrl('data-quality')}
            className="btn btn-secondary btn-sm"
            download="netwatch_data_quality_rejections.csv"
          >
            <Download size={14} /> Export Rejections CSV
          </a>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/baseline')}>
            Proceed to Baseline <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-header">
            <span>Total Uploaded</span>
            <Copy size={18} color="#94a3b8" />
          </div>
          <div className="stat-value">{quality.total_records?.toLocaleString()}</div>
          <div className="stat-desc">Raw rows parsed</div>
        </div>

        <div className="stat-box">
          <div className="stat-header">
            <span>Valid Records</span>
            <CheckCircle size={18} color="#10b981" />
          </div>
          <div className="stat-value" style={{ color: '#10b981' }}>
            {quality.valid_records?.toLocaleString()}
          </div>
          <div className="stat-desc">{validRate}% acceptance rate</div>
        </div>

        <div className="stat-box">
          <div className="stat-header">
            <span>Rejected Records</span>
            <XCircle size={18} color="#ef4444" />
          </div>
          <div className="stat-value" style={{ color: quality.rejected_records > 0 ? '#ef4444' : '#10b981' }}>
            {quality.rejected_records}
          </div>
          <div className="stat-desc">Malformed or invalid values</div>
        </div>

        <div className="stat-box">
          <div className="stat-header">
            <span>Duplicate Records</span>
            <AlertTriangle size={18} color="#f59e0b" />
          </div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>
            {quality.duplicate_records}
          </div>
          <div className="stat-desc">Identical flow duplicates</div>
        </div>
      </div>

      {/* Feature Capabilities & Time Bounds */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Capability Flags */}
        <div className="card">
          <div className="card-title">Analysis Capabilities Detected</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'rgba(30, 41, 59, 0.4)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Globe size={18} color={quality.dns_available ? '#10b981' : '#64748b'} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>DNS Query Tracking</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    {quality.dns_available ? 'DNS query column mapped with valid data' : 'DNS column missing or empty'}
                  </div>
                </div>
              </div>
              <span className={`badge ${quality.dns_available ? 'badge-approved' : 'badge-low'}`}>
                {quality.dns_available ? 'Enabled' : 'Unavailable'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'rgba(30, 41, 59, 0.4)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Flame size={18} color={quality.action_available ? '#10b981' : '#64748b'} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Firewall Outcome Tracking</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    {quality.action_available ? 'Firewall action/outcome field present' : 'Action column missing or empty'}
                  </div>
                </div>
              </div>
              <span className={`badge ${quality.action_available ? 'badge-approved' : 'badge-low'}`}>
                {quality.action_available ? 'Enabled' : 'Unavailable'}
              </span>
            </div>
          </div>
        </div>

        {/* Temporal Range */}
        <div className="card">
          <div className="card-title">Dataset Temporal Range</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: 12, background: 'rgba(30, 41, 59, 0.4)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Earliest Observed Flow:</div>
              <div className="mono" style={{ fontSize: 14, color: '#38bdf8', fontWeight: 600, marginTop: 2 }}>
                {quality.min_timestamp || 'N/A'}
              </div>
            </div>
            <div style={{ padding: 12, background: 'rgba(30, 41, 59, 0.4)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Latest Observed Flow:</div>
              <div className="mono" style={{ fontSize: 14, color: '#38bdf8', fontWeight: 600, marginTop: 2 }}>
                {quality.max_timestamp || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rejections Table */}
      <div className="card">
        <div className="card-title">
          <span>Detailed Record Rejections ({quality.total_rejection_count || 0})</span>
          {quality.total_rejection_count > 100 && (
            <span style={{ fontSize: 12, color: '#f59e0b' }}>Showing first 100 rejections</span>
          )}
        </div>
        {quality.rejection_reasons && quality.rejection_reasons.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Row Index</th>
                  <th>Record ID</th>
                  <th>Rejection Reason(s)</th>
                </tr>
              </thead>
              <tbody>
                {quality.rejection_reasons.map((rej, i) => (
                  <tr key={i}>
                    <td className="mono">{rej.row_index}</td>
                    <td className="mono" style={{ color: '#38bdf8' }}>{rej.record_id}</td>
                    <td style={{ color: '#f87171' }}>{rej.reasons?.join('; ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#10b981' }}>
            <CheckCircle size={24} style={{ margin: '0 auto 8px auto' }} />
            <div>No records were rejected! All rows met rigorous protocol validation criteria.</div>
          </div>
        )}
      </div>
    </div>
  );
}
