import React, { useState, useEffect } from 'react';
import {
  Network,
  Filter,
  Grid,
  Info,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { api } from '../services/api';

export default function PortAnalysisPage({ dataRevision }) {
  const [portData, setPortData] = useState(null);
  const [hostFilter, setHostFilter] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPorts = async () => {
    try {
      setLoading(true);
      const res = await api.getPortsAnalytics(hostFilter, protocolFilter);
      setPortData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPorts();
  }, [hostFilter, protocolFilter, dataRevision]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Network color="#38bdf8" /> Destination Port & Heatmap Analysis
          </h1>
          <p className="page-subtitle">
            Identify common service ports, anomalous port probing, and host-port concentration matrix.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={14} color="#94a3b8" />
            <input
              type="text"
              className="form-control mono"
              style={{ width: 170, padding: '6px 10px', fontSize: 12 }}
              placeholder="Filter by Host..."
              value={hostFilter}
              onChange={(e) => setHostFilter(e.target.value)}
            />
          </div>

          <select
            className="form-control"
            style={{ width: 130, padding: '6px 10px', fontSize: 12 }}
            value={protocolFilter}
            onChange={(e) => setProtocolFilter(e.target.value)}
          >
            <option value="">All Protocols</option>
            <option value="TCP">TCP</option>
            <option value="UDP">UDP</option>
            <option value="ICMP">ICMP</option>
          </select>
        </div>
      </div>

      {/* Protocol safety note */}
      <div className="alert alert-info" style={{ marginBottom: 20 }}>
        <Info size={18} />
        <div>
          <strong>Port Safety Protocol:</strong> Missing port values are handled properly and never treated as port 0.{' '}
          {portData?.total_flows_missing_port > 0 && (
            <span>({portData.total_flows_missing_port} flows without transport ports filtered cleanly)</span>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <div className="spinner" style={{ width: 36, height: 36 }} />
        </div>
      ) : !portData || !portData.common_ports || portData.common_ports.length === 0 ? (
        <div className="card empty-state">
          <Network className="empty-icon" />
          <h2 className="empty-title">No Port Records Found</h2>
          <p className="empty-text">No traffic matching the selected filters contains valid port information.</p>
        </div>
      ) : (
        <>
          {/* Host vs Port Heatmap Matrix */}
          {portData.heatmap_matrix && portData.heatmap_matrix.length > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-title">
                <span>Host-versus-Port Activity Heatmap</span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  Top 10 Active Hosts &times; Top 10 Target Ports
                </span>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Host IP</th>
                      {portData.top_ports_list?.map((p) => (
                        <th key={p} style={{ textAlign: 'center' }}>
                          Port {p}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {portData.heatmap_matrix.map((row, idx) => (
                      <tr key={idx}>
                        <td className="mono" style={{ color: '#38bdf8', fontWeight: 600 }}>
                          {row.host}
                        </td>
                        {portData.top_ports_list?.map((p) => {
                          const count = row[`port_${p}`] || 0;
                          // Heatmap intensity calculation
                          const intensity = Math.min(1.0, count / 15);
                          const bg = count > 0 ? `rgba(56, 189, 248, ${0.15 + intensity * 0.7})` : 'transparent';
                          const textColor = count > 0 ? '#fff' : '#64748b';

                          return (
                            <td
                              key={p}
                              style={{
                                textAlign: 'center',
                                backgroundColor: bg,
                                color: textColor,
                                fontWeight: count > 0 ? 600 : 400,
                              }}
                            >
                              {count > 0 ? count : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Common Destination Ports Table */}
          <div className="card">
            <div className="card-title">
              <span>Common Service Ports Overview ({portData.common_ports.length})</span>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Port Number</th>
                    <th>Standard Service</th>
                    <th>Observed Flows</th>
                    <th>Total Volume</th>
                    <th>Unique Source Hosts</th>
                  </tr>
                </thead>
                <tbody>
                  {portData.common_ports.map((item, idx) => (
                    <tr key={idx}>
                      <td className="mono" style={{ color: '#fbbf24', fontWeight: 700 }}>
                        {item.port}
                      </td>
                      <td style={{ fontWeight: 500 }}>{item.service}</td>
                      <td>{item.connections?.toLocaleString()}</td>
                      <td>{(item.total_bytes / 1024).toFixed(1)} KB</td>
                      <td>{item.unique_source_hosts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
