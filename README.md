# NetWatch — Network Traffic Anomaly Detection & Incident Investigation

NetWatch is a local, full-stack cybersecurity web application designed to analyze network-flow CSV datasets, detect unusual behavioral anomalies across individual hosts, correlate related findings into prioritized security incidents, and assist analysts with evidence-backed forensic investigation.

---

## Key Features

1. **Local Processing & Privacy**: Complete local execution. No cloud API or remote telemetry required.
2. **Robust CSV Ingestion & Validation**:
   - Auto-suggests and manually binds columns (Source/Destination IP, Ports, Timestamps, Bytes, Packets, Protocols, Actions, DNS queries).
   - Validates IP formats, port boundaries ($0 \le \text{port} \le 65535$), negative numbers, and malformed rows.
   - Missing fields are never fabricated; missing ports are never treated as port zero.
3. **Temporal Baseline Profiling (No Data Leakage)**:
   - Separate historical learning period and evaluation period.
   - Strictly rejects overlapping timeframes to prevent data leakage.
   - Profiles normal traffic volume, typical communication partners, service ports, and failure rates.
4. **9 Rule-Based Anomaly Detection Engines**:
   - **Rule A (Unusual Data Transfer)**: Host sending/receiving volume significantly exceeding baseline multipliers.
   - **Rule B (Port Probing)**: Host contacting an unusual count of distinct destination ports within a short time window.
   - **Rule C (Network Sweep)**: Single source reaching many destination hosts in a configurable short window.
   - **Rule D (Destination Diversity)**: Sudden surge in distinct destination endpoints contacted.
   - **Rule E (Lateral Movement)**: One host reaching multiple internal hosts over sensitive administrative ports.
   - **Rule F (Periodic Connections / C2 Beaconing)**: Regular automated connections with low coefficient of variation ($CV \le 0.15$).
   - **Rule G (Unexpected Host Communication)**: New, unobserved communication pairs with sensitive port escalation.
   - **Rule H (DNS Behaviour Analysis)**: Spikes in lookup volume and high unique domain ratios indicative of DGA / tunneling.
   - **Rule I (Blocked or Failed Connections)**: Abnormal surges in firewall denials or authentication failures.
5. **Incident Grouping & Deterministic Priority Scoring (0–100)**:
   - Groups related findings by affected host, time window, and attack category.
   - Calculates transparent investigation priority scores using configurable weights:
     $$\text{Score} = w_{\text{sev}} S_{\text{sev}} + w_{\text{dev}} S_{\text{dev}} + w_{\text{pers}} S_{\text{pers}} + w_{\text{cat}} S_{\text{cat}}$$
   - Provides plausible benign explanations and standardized SOC investigation checklists.
   - Keeps findings for audit, but excludes configured approved activities and scheduled maintenance from incident scoring; trusted-server suppression is limited to low-severity findings.
6. **13 Complete Application Views**:
   - Dashboard, Upload & Mapping, Data Quality, Baseline & Learning, Traffic Analytics, Host Analysis, Port Heatmap Analysis, DNS Analysis, Cytoscape.js Network Graph, Incidents Queue, Incident Details & Evidence, Detection Settings, and Reports & Exports.
7. **Forensic Exports**:
   - CSV exports protected against formula injection (`=`, `+`, `-`, `@` prepended with `'`).
   - Standalone HTML forensic intelligence report with fully escaped untrusted text.
8. **Optional Local Ollama Support**:
   - If a local Ollama instance is running, provides local AI triage assessment; otherwise falls back gracefully to deterministic cybersecurity synthesis.

---

## Project Structure

```text
netwatch/
├── backend/
│   ├── main.py                     # FastAPI REST API endpoints
│   ├── data_processor.py           # CSV parsing, mapping, validation & baseline computation
│   ├── detection.py                # 7 rule anomaly engines, incident grouping & deterministic scoring
│   ├── analytics.py                # Traffic series, port heatmap, host profiling & network graph
│   ├── config.py                   # YAML settings manager and validator
│   ├── generate_sample.py          # Synthetic dataset generator
│   ├── requirements.txt            # Python dependencies
│   └── tests/
│       └── test_netwatch.py        # Pytest test suite (10 comprehensive tests)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx         # Navigation sidebar with status indicators
│   │   │   └── TopBar.jsx          # Header with dataset status & sample loading
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx   # Metrics, charts, top talkers, incident queue
│   │   │   ├── UploadPage.jsx      # CSV upload, preview & column mapping
│   │   │   ├── DataQualityPage.jsx # Audit of valid, rejected & duplicate records
│   │   │   ├── BaselinePage.jsx    # Learning period training & evaluation execution
│   │   │   ├── TrafficAnalyticsPage.jsx # Multi-interval traffic and protocol breakdown
│   │   │   ├── HostAnalysisPage.jsx # Host deep-dive, baseline comparison & flows
│   │   │   ├── PortAnalysisPage.jsx # Port analysis and host-vs-port heatmap
│   │   │   ├── DnsAnalysisPage.jsx  # Domain query volume and DGA entropy
│   │   │   ├── NetworkGraphPage.jsx # Interactive Cytoscape.js topology canvas
│   │   │   ├── IncidentsPage.jsx   # Filterable incident investigation queue
│   │   │   ├── IncidentDetailPage.jsx # Incident score breakdown, evidence & AI triage
│   │   │   ├── SettingsPage.jsx    # Live editor for config/settings.yaml
│   │   │   └── ReportsPage.jsx     # CSV and HTML report exports
│   │   ├── services/
│   │   │   └── api.js              # Centralized backend API client
│   │   ├── App.jsx                 # Route configuration
│   │   ├── index.css               # Dark navy cybersecurity design system
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js              # Vite server with /api proxy
│   └── index.html
├── config/
│   └── settings.yaml               # Configurable detection rules, thresholds & approved tasks
├── data/
│   └── sample_network_flows.csv    # 596 synthetic records with 7 anomaly scenarios
├── README.md
└── .gitignore
```

---

## Windows Setup & Quick Start

Open two PowerShell terminals:

### Terminal 1: Backend Setup & Launch

```powershell
# Navigate to project root
cd c:\Users\harsh\OneDrive\Desktop\netwatch

# Create and activate virtual environment (if not already created)
python -m venv .venv
.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r backend\requirements.txt

# Start FastAPI backend server (Option A: from project root)
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000

# OR (Option B: from backend folder)
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The interactive API documentation is available at `http://127.0.0.1:8000/docs`.

### Terminal 2: Frontend Setup & Launch

```powershell
# Navigate to frontend folder
cd c:\Users\harsh\OneDrive\Desktop\netwatch\frontend

# Install node dependencies
npm install

# Start Vite development server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Workflow Guide

### 1. Load Synthetic Demonstration Dataset
- Click **"Load Synthetic Sample"** in the top navigation bar or on the Dashboard.
- NetWatch loads `data/sample_network_flows.csv` (596 records spanning 2026-03-01 to 2026-03-02).

### 2. Column Mapping & Data Quality Audit
- Navigate to **Upload Dataset** to verify auto-suggested column mappings.
- Click **"Confirm Mapping & Validate Data"**.
- Navigate to **Data Quality** to inspect valid/rejected record counts, duplicate checks, and feature capability indicators (DNS query tracking, firewall action decisions).

### 3. Establish Behavioral Baseline
- Navigate to **Learning & Baseline**.
- For the sample dataset, the recommended non-overlapping intervals are pre-filled:
  - **Learning Period**: `2026-03-01 08:00:00` to `2026-03-01 18:00:00`
  - **Evaluation Period**: `2026-03-02 08:00:00` to `2026-03-02 18:00:00`
- Click **"Build Historical Baseline"**. Host baseline profiles are calculated.

### 4. Execute Anomaly Detectors
- On the same page, click **"Execute Anomaly Detectors"**.
- NetWatch runs the 7 detection engines over the evaluation records and groups related findings into incidents.

### 5. Investigate Incidents & Evidence
- Navigate to **Incidents** to browse the prioritized queue.
- Click **"Investigate"** on any incident to open the **Incident Details & Evidence** view:
  - Examine the **deterministic priority score breakdown** (Severity, Statistical Deviation, Persistence, and Category Diversity).
  - Review **plausible benign explanations** and **suggested SOC investigation steps**.
  - Click **"Generate / Refresh Triage Assessment"** for AI/expert narrative explanation.
  - Inspect the table of raw supporting flow records with exact timestamps, ports, and bytes.

### 6. Explore Analytics & Network Graph
- **Traffic Analytics**: Toggle 1-min, 5-min, or 1-hour time buckets; view volume sent/received and protocol distributions.
- **Host Analysis**: Deep-dive into individual hosts with baseline vs observed comparisons.
- **Port Analysis**: View top destination ports and the interactive host-versus-port heatmap.
- **DNS Analysis**: Review lookup volume, top queried domains, and DGA/tunneling indicators.
- **Network Graph**: Interactive Cytoscape.js canvas showing real observed communications, with anomalous hosts glowing red and incident edges highlighted.

### 7. Configure Rules & Export Reports
- **Detection Settings**: Edit rule multipliers, thresholds, time windows, scoring weights, and approved maintenance lists. Changes take effect on the next analysis run.
- **Reports & Exports**: Download CSV exports of findings, incidents, evidence, hosts, ports, data quality audit, or generate the complete standalone formatted HTML forensic report.

---

## Running Verification Tests

- Trusted sources, scanner/patch/backup activities, maintenance windows, trusted servers, and dataset schema profiles are managed in `config/settings.yaml`.
- The Zeek `conn.log` profile maps `ts`, `id.orig_h`, `id.resp_h`, `id.orig_p`, and `id.resp_p` to the same canonical flow fields used by the native dataset. Both formats pass through the same validator and detector.
- Findings include per-finding risk scores, rule explanations, supporting record IDs, and suppression reasons. Incidents include a timestamp-ordered timeline and retain flow evidence.
- Regression scenarios assert detection of a suspicious horizontal sweep and internal spread, while an authorized scanner retains an auditable finding but creates no scored incident. This is scenario-based validation, not a statistically representative production accuracy estimate.
- Limitations: configured internal networks are prefix-based; maintenance schedules use local timestamps treated as UTC; approved source identities are IP-based and should be tightly controlled. Encrypted payloads and process-level attribution are outside flow-log visibility.

### Backend Pytest Suite
Run the backend test suite from the project root:

```powershell
cd c:\Users\harsh\OneDrive\Desktop\netwatch
.venv\Scripts\pytest backend\tests -v
```

**Results (13/13 Passed)**:
- `test_suggest_column_mapping` (Auto-aliasing of common flow headers)
- `test_zeek_schema_maps_to_canonical_fields_and_matches_default` (Alternate field names normalize to the canonical flow schema)
- `test_zeek_tsv_upload_auto_maps_columns` (Tab-delimited upload selects the configured schema profile)
- `test_is_valid_ip` (IPv4 / IPv6 format verification)
- `test_data_validation_and_rejections` (Handling of invalid timestamps, ports, and negative numbers)
- `test_temporal_separation` (Strict enforcement of non-overlapping learning/evaluation periods)
- `test_baseline_creation_insufficient_records` (Validation of minimum required baseline record counts)
- `test_all_seven_detection_rules` (Verification of Rules A through G)
- `test_sweep_lateral_detection_and_legitimate_activity_suppression` (Suspicious sweep/spread detection and authorized scanner false-positive reduction)
- `test_missing_dns_and_outcome_fields` (Graceful handling without data fabrication)
- `test_incident_grouping_and_scoring` (Correlation and deterministic formula calculation)
- `test_configuration_validation` (Settings schema and weight sum validation)
- `test_api_sample_load_and_workflow` (End-to-end integration test of all API routes and exports)

### Frontend Production Build
Validate the React frontend build:

```powershell
cd c:\Users\harsh\OneDrive\Desktop\netwatch\frontend
npm run build
```
Builds cleanly with zero errors.
