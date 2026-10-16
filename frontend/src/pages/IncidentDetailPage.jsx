import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ArrowLeft,
  Download,
  BrainCircuit,
  HelpCircle,
  ListChecks,
  FileSpreadsheet,
  Clock,
  Layers,
  Server,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';

export default function IncidentDetailPage({ dataRevision }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [incident, setIncident] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.getIncidentDetail(id),
      api.getIncidentEvidence(id)
    ])
      .then(([incData, evData]) => {
        setIncident(incData);
        setEvidence(evData.records || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, dataRevision]);

  const handleGenerateAiExplain = async () => {
    try {
      setGeneratingAi(true);
      const res = await api.explainIncidentAi(id);
      setAiExplanation(res);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingAi(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="alert alert-danger">
        <AlertTriangle size={18} />
        <div>Incident not found: {error}</div>
      </div>
    );
  }

  const sevBadge =
    incident.severity === 'Critical'
      ? 'badge-critical'
      : incident.severity === 'High'
      ? 'badge-high'
      : incident.severity === 'Medium'
      ? 'badge-medium'
      : 'badge-low';

  const breakdown = incident.score_breakdown || {};

  return (
    <div>
      {/* Back Button */}
      <button
        className="btn btn-secondary btn-sm"
        style={{ marginBottom: 16 }}
        onClick={() => navigate('/incidents')}
      >
        <ArrowLeft size={14} /> Back to Incidents Queue
      </button>

      {/* Incident Header */}
      <div className="page-header" style={{ alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title">{incident.title}</h1>
            <span className={`badge ${sevBadge}`}>{incident.severity}</span>
            {incident.is_approved_activity && (
              <span className="badge badge-approved">Approved Maintenance</span>
            )}
          </div>
          <p className="page-subtitle">
            Incident ID: <strong className="mono" style={{ color: '#38bdf8' }}>{incident.incident_id}</strong> &bull;{' '}
            Active: {incident.first_seen} &rarr; {incident.last_seen}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ textAlign: 'right', marginRight: 10 }}>
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Priority Risk Score</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#38bdf8' }}>
              {incident.score}
              <span style={{ fontSize: 13, color: '#64748b' }}>/100</span>
            </div>
          </div>

          <a
            href={api.getExportUrl('evidence', { incident_id: incident.incident_id })}
            className="btn btn-secondary btn-sm"
            download={`netwatch_evidence_${incident.incident_id}.csv`}
          >
            <Download size={14} /> Export Evidence CSV
          </a>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title"><span>Incident Timeline</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(incident.timeline || incident.findings || []).map((event) => (
            <div key={event.finding_id} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 190px) minmax(0, 1fr)', gap: 12, borderLeft: '2px solid #38bdf8', padding: '4px 0 4px 12px' }}>
              <span className="mono" style={{ fontSize: 12, color: '#94a3b8', overflowWrap: 'anywhere' }}>{event.timestamp}</span>
              <span style={{ fontSize: 13 }}><strong>{event.rule_name}</strong> {event.explanation}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Deterministic Scoring Breakdown Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">
          <span>Deterministic Investigation Priority Formula Breakdown</span>
        </div>
        <p style={{ color: '#cbd5e1', fontSize: 13, marginBottom: 16 }}>
          {incident.score_explanation}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div style={{ padding: 12, background: 'rgba(30, 41, 59, 0.4)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Severity Points (Weight: {breakdown.severity_weight})</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', marginTop: 4 }}>
              {breakdown.severity_score} pts
            </div>
          </div>

          <div style={{ padding: 12, background: 'rgba(30, 41, 59, 0.4)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Deviation Ratio (Weight: {breakdown.deviation_weight})</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#38bdf8', marginTop: 4 }}>
              {breakdown.deviation_score} pts
            </div>
          </div>

          <div style={{ padding: 12, background: 'rgba(30, 41, 59, 0.4)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Persistence (Weight: {breakdown.persistence_weight})</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981', marginTop: 4 }}>
              {breakdown.persistence_score} pts
            </div>
          </div>

          <div style={{ padding: 12, background: 'rgba(30, 41, 59, 0.4)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Category Diversity (Weight: {breakdown.category_weight})</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fbbf24', marginTop: 4 }}>
              {breakdown.category_score} pts
            </div>
          </div>
        </div>
      </div>

      {/* AI / SOC Assistant Explanation */}
      <div className="card" style={{ marginBottom: 24, border: '1px solid rgba(56, 189, 248, 0.3)' }}>
        <div className="card-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BrainCircuit size={18} color="#38bdf8" /> SOC Analyst Narrative & AI Explanation
          </span>
          <button
            className="btn btn-outline-cyan btn-sm"
            onClick={handleGenerateAiExplain}
            disabled={generatingAi}
          >
            {generatingAi ? 'Consulting Local Ollama...' : 'Generate / Refresh Triage Assessment'}
          </button>
        </div>

        {aiExplanation ? (
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: 16, borderRadius: 8, fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {aiExplanation.explanation}
            <div style={{ marginTop: 12, fontSize: 11, color: '#64748b' }}>
              Engine: {aiExplanation.ollama_available ? 'Local Ollama Model (LLaMA3)' : 'Rule-Based SOC Expert Synthesis'} &bull; Evidence-bound
            </div>
          </div>
        ) : (
          <p style={{ color: '#94a3b8', fontSize: 13 }}>
            Click &ldquo;Generate / Refresh Triage Assessment&rdquo; to analyze this incident. If local Ollama is
            installed, it generates an AI explanation without sending data to the cloud. Otherwise, our built-in
            cybersecurity synthesis engine formulates an immediate triage summary.
          </p>
        )}
      </div>

      {/* Grid: Benign Causes & Suggested Investigation Steps */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Possible Benign Explanations */}
        <div className="card">
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <HelpCircle size={17} color="#fbbf24" /> Plausible Benign Explanations
            </span>
          </div>
          <ul style={{ paddingLeft: 20, color: '#cbd5e1', fontSize: 13.5, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {incident.possible_benign_explanations?.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>

        {/* Suggested Investigation Next Steps */}
        <div className="card">
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ListChecks size={17} color="#10b981" /> Suggested Investigation SOP
            </span>
          </div>
          <ol style={{ paddingLeft: 20, color: '#cbd5e1', fontSize: 13.5, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {incident.suggested_investigation_steps?.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      </div>

      {/* Supporting Rule Findings */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">
          <span>Correlated Detection Findings ({incident.findings?.length})</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {incident.findings?.map((f) => (
            <div
              key={f.finding_id}
              style={{
                background: 'rgba(30, 41, 59, 0.4)',
                border: '1px solid #1e293b',
                borderRadius: 8,
                padding: 14,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="mono" style={{ fontWeight: 700, color: '#38bdf8' }}>{f.finding_id}</span>
                  <span style={{ fontWeight: 600 }}>{f.rule_name}</span>
                  <span className={`badge ${f.severity === 'Critical' ? 'badge-critical' : f.severity === 'High' ? 'badge-high' : 'badge-medium'}`}>
                    {f.severity}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{f.timestamp}</span>
              </div>
              <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>
                {f.explanation}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                Risk score: <strong style={{ color: '#38bdf8' }}>{f.risk_score ?? 'N/A'}/100</strong> &bull; Observed: <strong style={{ color: '#fff' }}>{f.observed_value}</strong> &bull; {f.baseline_threshold}
                {f.is_suppressed && <span style={{ color: '#10b981' }}> &bull; Suppressed: {f.suppression_reason}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Raw Supporting Evidence Flow Records */}
      <div className="card">
        <div className="card-title">
          <span>Supporting Network Flow Evidence Records ({evidence.length})</span>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Timestamp</th>
                <th>Source IP</th>
                <th>Destination IP</th>
                <th>Dst Port</th>
                <th>Protocol</th>
                <th>Bytes Sent</th>
                <th>Bytes Recv</th>
                <th>Action</th>
                <th>DNS Query</th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((flow) => (
                <tr key={flow.record_id}>
                  <td className="mono" style={{ color: '#38bdf8' }}>{flow.record_id}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{flow.timestamp}</td>
                  <td className="mono">{flow.src_ip}</td>
                  <td className="mono">{flow.dst_ip}</td>
                  <td className="mono">{flow.dst_port ?? 'N/A'}</td>
                  <td>{flow.protocol}</td>
                  <td>{flow.bytes_sent?.toLocaleString()}</td>
                  <td>{flow.bytes_received?.toLocaleString()}</td>
                  <td>
                    <span className={`badge ${flow.action === 'DENY' || flow.action === 'DROP' ? 'badge-critical' : 'badge-low'}`}>
                      {flow.action || 'ALLOW'}
                    </span>
                  </td>
                  <td className="mono" style={{ fontSize: 11, color: '#94a3b8' }}>
                    {flow.dns_query || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
