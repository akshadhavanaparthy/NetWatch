import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Table,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';

const STANDARD_FIELDS = [
  { key: 'timestamp', label: 'Timestamp *', required: true, desc: 'Flow start or timestamp' },
  { key: 'src_ip', label: 'Source IP *', required: true, desc: 'Originating host IP address' },
  { key: 'dst_ip', label: 'Destination IP *', required: true, desc: 'Target host IP address' },
  { key: 'src_port', label: 'Source Port', required: false, desc: 'Originating transport port (0-65535)' },
  { key: 'dst_port', label: 'Destination Port', required: false, desc: 'Service destination port' },
  { key: 'protocol', label: 'Protocol', required: false, desc: 'Transport protocol (TCP, UDP, etc.)' },
  { key: 'bytes_sent', label: 'Bytes Sent', required: false, desc: 'Outbound flow volume' },
  { key: 'bytes_received', label: 'Bytes Received', required: false, desc: 'Inbound flow volume' },
  { key: 'packets', label: 'Packets', required: false, desc: 'Packet count' },
  { key: 'duration', label: 'Duration (s)', required: false, desc: 'Elapsed flow seconds' },
  { key: 'action', label: 'Action / Outcome', required: false, desc: 'ALLOW, DENY, DROP, etc.' },
  { key: 'dns_query', label: 'DNS Query', required: false, desc: 'Requested domain name' },
  { key: 'record_id', label: 'Record ID', required: false, desc: 'Unique row or flow identifier' },
  { key: 'label', label: 'Threat Label', required: false, desc: 'Ground truth or threat tag' },
];

export default function UploadPage({ onDatasetChanged }) {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [mapping, setMapping] = useState({});
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [error, setError] = useState(null);

  // Check if a dataset is already loaded
  useEffect(() => {
    api.getDatasetPreview()
      .then((data) => {
        if (data.loaded) {
          setDatasetInfo(data);
          setMapping(data.suggested_mapping || {});
          setValidationResult(data.quality_summary || null);
          setUploadSuccess(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleFileUpload = async (selectedFile) => {
    if (!selectedFile) return;
    try {
      setLoading(true);
      setError(null);
      setValidationResult(null);
      const res = await api.uploadDataset(selectedFile);
      setDatasetInfo(res);
      setMapping(res.suggested_mapping || {});
      setValidationResult(res.quality_summary || null);
      setUploadSuccess(true);
      if (res.mapping_error) {
        setError(`Automatic validation needs a column mapping adjustment: ${res.mapping_error}`);
      }
      if (onDatasetChanged) await onDatasetChanged();
      if (res.auto_validated && res.quality_summary?.valid_records > 0) {
        navigate('/');
      }
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = async () => {
    try {
      setLoading(true);
      setError(null);
      setValidationResult(null);
      const res = await api.loadSampleDataset();
      setDatasetInfo(res);
      setMapping(res.suggested_mapping || {});
      setValidationResult(res.quality_summary);
      setUploadSuccess(true);
      if (onDatasetChanged) onDatasetChanged();
    } catch (err) {
      setError(`Failed to load sample dataset: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (stdKey, csvCol) => {
    setMapping((prev) => ({
      ...prev,
      [stdKey]: csvCol === '' ? null : csvCol,
    }));
  };

  const handleConfirmMapping = async () => {
    try {
      setValidating(true);
      setError(null);
      const res = await api.mapAndValidate(mapping);
      setValidationResult(res.quality);
      if (onDatasetChanged) await onDatasetChanged();
      if (res.quality?.valid_records > 0) navigate('/');
    } catch (err) {
      setError(`Validation error: ${err.message}`);
    } finally {
      setValidating(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Upload color="#38bdf8" /> Upload & Column Mapping
          </h1>
          <p className="page-subtitle">
            Upload custom network flow CSV files or load our pre-configured synthetic dataset for immediate testing.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertTriangle size={18} />
          <div>{error}</div>
        </div>
      )}

      {/* Upload & Sample Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Dropzone */}
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <FileSpreadsheet size={40} color="#38bdf8" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>Upload CSV Network Flows</h3>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 18 }}>
            Supports Zeek, Suricata, NetFlow, or firewall CSV exports up to 50 MB.
          </p>
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            <span>{loading ? 'Processing...' : 'Browse CSV File'}</span>
            <input
              type="file"
              accept=".csv,.txt"
              style={{ display: 'none' }}
              onChange={(e) => handleFileUpload(e.target.files[0])}
              disabled={loading}
            />
          </label>
        </div>

        {/* Load Synthetic Sample CTA */}
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08), rgba(99, 102, 241, 0.08))', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Sparkles color="#38bdf8" size={22} />
            <h3 style={{ fontSize: 16 }}>Synthetic Demonstration Dataset</h3>
          </div>
          <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
            Includes 596 realistic network flows spanning 2 days: Day 1 benign baseline and Day 2 containing
            exfiltration, port probing, C2 beaconing, worm propagation, DNS anomalies, and authorized backup synchronization.
          </p>
          <button
            className="btn btn-outline-cyan"
            onClick={handleLoadSample}
            disabled={loading}
          >
            <Sparkles size={16} />
            <span>{loading ? 'Loading...' : 'Load Synthetic Sample Flows'}</span>
          </button>
        </div>
      </div>

      {/* If dataset loaded: Preview & Mapping */}
      {datasetInfo && (
        <>
          {/* Validation Result Banner */}
          {validationResult?.valid_records > 0 && (
            <div className="alert alert-success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle size={20} color="#10b981" />
                <div>
                  <strong>Dataset Validated Successfully:</strong> {validationResult.valid_records?.toLocaleString()} valid records,{' '}
                  {validationResult.rejected_records} rejected, {validationResult.duplicate_records} duplicates.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/data-quality')}>
                  Data Quality Details
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/baseline')}>
                  Proceed to Baseline <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {validationResult && validationResult.valid_records === 0 && (
            <div className="alert alert-danger">
              <AlertTriangle size={18} />
              <div>
                No valid flow records were found. Check the timestamp, source IP, and destination IP mappings, then validate again.
              </div>
            </div>
          )}

          {/* Column Mapping Configuration */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-title">
              <span>Column Mapping Configuration</span>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>
                Detected {datasetInfo.columns?.length} CSV columns
              </span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 18 }}>
              Verify auto-suggested column matches. Required fields: <strong>Source IP, Destination IP, Timestamp</strong>.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
              {STANDARD_FIELDS.map((field) => (
                <div key={field.key} className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    {field.label}
                    <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>{field.desc}</span>
                  </label>
                  <select
                    className="form-control"
                    value={mapping[field.key] || ''}
                    onChange={(e) => handleMappingChange(field.key, e.target.value)}
                  >
                    <option value="">-- None / Unmapped --</option>
                    {datasetInfo.columns?.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                className="btn btn-primary"
                onClick={handleConfirmMapping}
                disabled={validating}
              >
                {validating ? 'Validating...' : 'Confirm Mapping & Validate Data'}
              </button>
            </div>
          </div>

          {/* Preview Table */}
          <div className="card">
            <div className="card-title">
              <span>Dataset Preview (First 10 Rows)</span>
              <span className="mono" style={{ fontSize: 12, color: '#38bdf8' }}>
                {datasetInfo.dataset_name} ({datasetInfo.total_raw_rows} total rows)
              </span>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    {datasetInfo.columns?.slice(0, 10).map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {datasetInfo.preview?.map((row, idx) => (
                    <tr key={idx}>
                      {datasetInfo.columns?.slice(0, 10).map((col) => (
                        <td key={col} className="mono" style={{ fontSize: 12 }}>
                          {String(row[col] ?? '')}
                        </td>
                      ))}
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
