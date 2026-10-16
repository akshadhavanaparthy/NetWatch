import React, { useState, useEffect } from 'react';
import {
  Globe,
  AlertTriangle,
  Info,
  Server,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

export default function DnsAnalysisPage({ dataRevision }) {
  const [dnsData, setDnsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getDnsAnalysis()
      .then((data) => setDnsData(data))
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

  if (!dnsData || !dnsData.available) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">
              <Globe color="#38bdf8" /> DNS Behaviour & Domain Analysis
            </h1>
            <p className="page-subtitle">Examine domain lookup volume, high-entropy DGA requests, and DNS tunneling.</p>
          </div>
        </div>

        <div className="card empty-state">
          <Globe className="empty-icon" />
          <h2 className="empty-title">DNS Information Unavailable</h2>
          <p className="empty-text">
            {dnsData?.message ||
              'DNS query logging is not present in the currently loaded dataset. In accordance with strict data integrity standards, missing DNS fields are never fabricated.'}
          </p>
          <div style={{ color: '#94a3b8', fontSize: 13, maxWidth: 560, margin: '0 auto' }}>
            This dataset has no recorded DNS queries or port 53 flows. Upload a flow file with DNS records to analyze DNS activity.
          </div>
        </div>
      </div>
    );
  }

  const isDgaRisk = dnsData.unique_ratio !== null && dnsData.unique_ratio >= 0.7;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Globe color="#38bdf8" /> DNS Behaviour & Domain Analysis
          </h1>
          <p className="page-subtitle">
            Examine domain lookup volume, high-entropy DGA requests, and DNS tunneling activity.
          </p>
        </div>
      </div>

      {/* DNS Metrics Grid */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-header">
            <span>{dnsData.domain_data_available ? 'DNS Queries' : 'DNS Flows'}</span>
            <Globe size={18} color="#38bdf8" />
          </div>
          <div className="stat-value">{dnsData.total_queries?.toLocaleString()}</div>
          <div className="stat-desc">Resolutions requested</div>
        </div>

        <div className="stat-box">
          <div className="stat-header">
            <span>{dnsData.domain_data_available ? 'Unique Domains' : 'Domain Names'}</span>
            <Layers size={18} color="#10b981" />
          </div>
          <div className="stat-value">{dnsData.domain_data_available ? dnsData.unique_domains?.toLocaleString() : 'Not logged'}</div>
          <div className="stat-desc">Distinct domain targets</div>
        </div>

        <div className="stat-box">
          <div className="stat-header">
            <span>{dnsData.domain_data_available ? 'Unique Query Ratio' : 'Domain Data'}</span>
            <AlertTriangle size={18} color={isDgaRisk ? '#ef4444' : '#38bdf8'} />
          </div>
          <div className="stat-value" style={{ color: isDgaRisk ? '#ef4444' : '#38bdf8' }}>
            {dnsData.domain_data_available ? `${(dnsData.unique_ratio * 100).toFixed(1)}%` : 'Unavailable'}
          </div>
          <div className="stat-desc">
            {dnsData.domain_data_available ? (isDgaRisk ? 'Elevated diversity (potential DGA / tunneling)' : 'Normal domain diversity') : 'DNS flow observed; query names not present'}
          </div>
        </div>
      </div>

      {/* Grid: Top Domains & Querying Hosts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 }}>
        {/* Top Queried Domains */}
        <div className="card">
          <div className="card-title">Top Queried Domain Names</div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Domain Query</th>
                  <th>Request Count</th>
                </tr>
              </thead>
              <tbody>
                {dnsData.top_domains?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="mono" style={{ color: '#38bdf8', fontSize: 13 }}>
                      {item.domain}
                    </td>
                    <td>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Requesting Hosts */}
        <div className="card">
          <div className="card-title">Top Querying Internal Hosts</div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Host IP</th>
                  <th>Queries Executed</th>
                </tr>
              </thead>
              <tbody>
                {dnsData.top_querying_hosts?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="mono" style={{ color: '#f8fafc', fontWeight: 600 }}>
                      {item.host}
                    </td>
                    <td>{item.queries}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
