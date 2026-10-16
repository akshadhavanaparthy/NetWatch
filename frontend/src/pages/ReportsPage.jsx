import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  FileSpreadsheet,
  ShieldAlert,
  Layers,
  Server,
  Network,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';

export default function ReportsPage({ dataRevision }) {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    setDashboard(null);
    api.getDashboard()
      .then((data) => setDashboard(data))
      .catch((err) => console.error(err));
  }, [dataRevision]);

  const exportCards = [
    {
      title: 'Security Investigation Report (HTML)',
      desc: 'Complete standalone executive and forensic HTML report with formatted incident timelines, risk score breakdowns, findings, and evidence references.',
      filename: 'netwatch_investigation_report.html',
      endpoint: 'report-html',
      isHtml: true,
      icon: FileText,
      color: '#38bdf8',
    },
    {
      title: 'Grouped Incidents Export (CSV)',
      desc: 'Export correlated security incident queue with priority scores, severities, affected targets, and rule counts.',
      filename: 'netwatch_incidents.csv',
      endpoint: 'incidents',
      isHtml: false,
      icon: ShieldAlert,
      color: '#ef4444',
    },
    {
      title: 'Individual Anomaly Findings (CSV)',
      desc: 'Export all granular rule detection findings including observed values, baseline thresholds, and deviation multipliers.',
      filename: 'netwatch_findings.csv',
      endpoint: 'findings',
      isHtml: false,
      icon: Layers,
      color: '#f59e0b',
    },
    {
      title: 'Network Flow Evidence Records (CSV)',
      desc: 'Export supporting network flow records with preserved record IDs, timestamps, IP addresses, ports, and action decisions.',
      filename: 'netwatch_all_evidence.csv',
      endpoint: 'evidence',
      isHtml: false,
      icon: FileSpreadsheet,
      color: '#10b981',
    },
    {
      title: 'Hosts Behavioral Summary (CSV)',
      desc: 'Export profiled host metrics: volume sent/received, packet rates, connection counts, and distinct destinations contacted.',
      filename: 'netwatch_hosts_summary.csv',
      endpoint: 'hosts',
      isHtml: false,
      icon: Server,
      color: '#6366f1',
    },
    {
      title: 'Ports Usage & Services Summary (CSV)',
      desc: 'Export service destination ports, connection frequencies, unique host counters, and total bytes.',
      filename: 'netwatch_ports_summary.csv',
      endpoint: 'ports',
      isHtml: false,
      icon: Network,
      color: '#818cf8',
    },
    {
      title: 'Data Quality & Row Rejections Audit (CSV)',
      desc: 'Export comprehensive audit log of rejected records with raw row indices and specific protocol validation failure reasons.',
      filename: 'netwatch_data_quality_rejections.csv',
      endpoint: 'data-quality',
      isHtml: false,
      icon: CheckCircle,
      color: '#34d399',
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <FileText color="#38bdf8" /> Forensic Reports & Data Exports
          </h1>
          <p className="page-subtitle">
            Generate sanitized, formula-injection protected CSV records and standalone forensic HTML intelligence reports.
          </p>
        </div>
      </div>

      {dashboard && (
        <div className="card" style={{ marginBottom: 24, background: 'rgba(15, 23, 42, 0.7)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Target Dataset:</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>{dashboard.dataset_name}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Valid Records:</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#38bdf8' }}>{dashboard.valid_records?.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Findings:</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f59e0b' }}>{dashboard.total_findings}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Grouped Incidents:</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#ef4444' }}>{dashboard.total_incidents}</div>
            </div>
          </div>
        </div>
      )}

      {/* Export Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        {exportCards.map((card, idx) => {
          const Icon = card.icon;
          const url = api.getExportUrl(card.endpoint);

          return (
            <div
              key={idx}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderLeft: `4px solid ${card.color}`,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Icon size={20} color={card.color} />
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{card.title}</h3>
                </div>
                <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5, marginBottom: 18 }}>
                  {card.desc}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingTop: 12, borderTop: '1px solid #1e293b' }}>
                <a
                  href={url}
                  download={card.filename}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                >
                  <Download size={14} /> Download {card.isHtml ? 'HTML' : 'CSV'}
                </a>
                {card.isHtml && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    title="Open HTML report in new browser tab"
                  >
                    <ExternalLink size={14} /> Preview
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
