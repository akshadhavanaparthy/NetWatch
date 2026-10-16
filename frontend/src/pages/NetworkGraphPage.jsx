import React, { useState, useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import {
  Share2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Search,
  ShieldAlert,
  Info,
  Layers
} from 'lucide-react';
import { api } from '../services/api';

export default function NetworkGraphPage({ dataRevision }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedElement, setSelectedElement] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [layoutName, setLayoutName] = useState('cose');

  useEffect(() => {
    setLoading(true);
    api.getNetworkGraph()
      .then((data) => setGraphData(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [dataRevision]);

  // Initialize and update Cytoscape graph
  useEffect(() => {
    if (!containerRef.current || !graphData || !graphData.elements) return;

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: graphData.elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#0284c7',
            'label': 'data(label)',
            'color': '#f8fafc',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': '11px',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'width': 34,
            'height': 34,
            'border-width': 2,
            'border-color': '#38bdf8',
          },
        },
        {
          selector: 'node[?is_anomalous]',
          style: {
            'background-color': '#ef4444',
            'border-color': '#f87171',
            'border-width': 4,
            'width': 42,
            'height': 42,
          },
        },
        {
          selector: 'node[role = "Private Address"]',
          style: {
            'shape': 'round-rectangle',
            'background-color': '#6366f1',
            'border-color': '#818cf8',
          },
        },
        {
          selector: 'node[role = "Public Address"]',
          style: {
            'shape': 'diamond',
            'background-color': '#10b981',
            'border-color': '#34d399',
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 'mapData(weight, 1, 8, 1.5, 6)',
            'line-color': '#334155',
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#334155',
            'arrow-scale': 0.8,
            'opacity': 0.75,
          },
        },
        {
          selector: 'edge[?has_incident]',
          style: {
            'line-color': '#ef4444',
            'target-arrow-color': '#ef4444',
            'width': 4,
            'opacity': 0.9,
          },
        },
        {
          selector: ':selected',
          style: {
            'border-color': '#facc15',
            'border-width': 5,
            'line-color': '#facc15',
            'target-arrow-color': '#facc15',
          },
        },
      ],
      layout: {
        name: layoutName,
        animate: false,
        padding: 40,
      },
    });

    // Node & Edge selection event
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      setSelectedElement({
        type: 'node',
        data: node.data(),
        degree: node.degree(),
      });
    });

    cy.on('tap', 'edge', (evt) => {
      const edge = evt.target;
      setSelectedElement({
        type: 'edge',
        data: edge.data(),
      });
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedElement(null);
      }
    });

    cyRef.current = cy;

    return () => {
      if (cyRef.current) cyRef.current.destroy();
    };
  }, [graphData, layoutName]);

  // Search Host in graph
  const handleSearch = (e) => {
    e.preventDefault();
    if (!cyRef.current || !searchTerm) return;

    const cy = cyRef.current;
    const target = cy.nodes().filter((n) => n.data('id').toLowerCase().includes(searchTerm.toLowerCase()));

    if (target.length > 0) {
      cy.elements().unselect();
      target.select();
      cy.animate({
        center: { eles: target },
        zoom: 1.5,
        duration: 400,
      });
      setSelectedElement({
        type: 'node',
        data: target.data(),
        degree: target.degree(),
      });
    }
  };

  const handleZoomIn = () => cyRef.current && cyRef.current.zoom(cyRef.current.zoom() * 1.25);
  const handleZoomOut = () => cyRef.current && cyRef.current.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current && cyRef.current.fit(null, 40);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Share2 color="#38bdf8" /> Real-Data Network Topology Graph
          </h1>
          <p className="page-subtitle">
            Interactive Cytoscape.js visualization of actual observed communications between network endpoints.
          </p>
        </div>

        {/* Graph Controls */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              className="form-control mono"
              style={{ width: 180, padding: '6px 10px', fontSize: 12 }}
              placeholder="Search Host IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary btn-sm" title="Search">
              <Search size={14} />
            </button>
          </form>

          <select
            className="form-control"
            style={{ width: 130, padding: '6px 10px', fontSize: 12 }}
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
          >
            <option value="cose">Force-Directed</option>
            <option value="circle">Circular</option>
            <option value="concentric">Concentric</option>
            <option value="grid">Grid</option>
          </select>

          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-secondary btn-sm" onClick={handleZoomIn} title="Zoom In">
              <ZoomIn size={14} />
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleZoomOut} title="Zoom Out">
              <ZoomOut size={14} />
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleFit} title="Fit to Screen">
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Legend & Stats Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid #1e293b', padding: '10px 16px', borderRadius: 8, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 18, fontSize: 12, alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, backgroundColor: '#0284c7', borderRadius: '50%', display: 'inline-block' }} /> Private Address
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, backgroundColor: '#10b981', transform: 'rotate(45deg)', display: 'inline-block' }} /> Public Address
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, backgroundColor: '#ef4444', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #ef4444' }} /> Anomalous Host
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 16, height: 3, backgroundColor: '#ef4444', display: 'inline-block' }} /> Incident Edge
          </span>
        </div>

        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          Nodes: <strong style={{ color: '#fff' }}>{graphData?.summary?.total_nodes || 0}</strong> | Edges:{' '}
          <strong style={{ color: '#fff' }}>{graphData?.summary?.total_edges || 0}</strong>
        </div>
      </div>

      {/* Canvas & Details Panel Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedElement ? '1fr 320px' : '1fr', gap: 16 }}>
        {/* Cytoscape Canvas */}
        <div
          ref={containerRef}
          style={{
            height: '62vh',
            background: 'radial-gradient(circle at center, #0d1527 0%, #060911 100%)',
            border: '1px solid #1e293b',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        />

        {/* Selected Element Inspector Panel */}
        {selectedElement && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card-title" style={{ fontSize: 15, marginBottom: 0 }}>
              {selectedElement.type === 'node' ? 'Endpoint Inspector' : 'Flow Edge Inspector'}
            </div>

            {selectedElement.type === 'node' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div style={{ padding: 10, background: 'rgba(30, 41, 59, 0.4)', borderRadius: 6 }}>
                  <div style={{ color: '#94a3b8', fontSize: 11 }}>IP Address:</div>
                  <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: '#38bdf8', marginTop: 2 }}>
                    {selectedElement.data.id}
                  </div>
                </div>

                <div>
                  <div style={{ color: '#94a3b8', fontSize: 11 }}>Inferred Role:</div>
                  <div style={{ fontWeight: 600 }}>{selectedElement.data.role}</div>
                </div>

                <div>
                  <div style={{ color: '#94a3b8', fontSize: 11 }}>Security Status:</div>
                  {selectedElement.data.is_anomalous ? (
                    <span className="badge badge-critical" style={{ marginTop: 4 }}>
                      Anomalous Findings Detected
                    </span>
                  ) : (
                    <span className="badge badge-low" style={{ marginTop: 4 }}>
                      Normal Behavioral Footprint
                    </span>
                  )}
                </div>

                <div>
                  <div style={{ color: '#94a3b8', fontSize: 11 }}>Network Degree (Edges):</div>
                  <div style={{ fontWeight: 600 }}>{selectedElement.degree} connected hosts</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div style={{ padding: 10, background: 'rgba(30, 41, 59, 0.4)', borderRadius: 6 }}>
                  <div style={{ color: '#94a3b8', fontSize: 11 }}>Communication Pair:</div>
                  <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8', marginTop: 2 }}>
                    {selectedElement.data.source} &rarr; {selectedElement.data.target}
                  </div>
                </div>

                <div>
                  <div style={{ color: '#94a3b8', fontSize: 11 }}>Protocol:</div>
                  <div style={{ fontWeight: 600 }}>{selectedElement.data.protocol}</div>
                </div>

                <div>
                  <div style={{ color: '#94a3b8', fontSize: 11 }}>Total Transferred:</div>
                  <div style={{ fontWeight: 600 }}>
                    {(selectedElement.data.total_bytes / 1024).toFixed(1)} KB ({selectedElement.data.connections} flows)
                  </div>
                </div>

                <div>
                  <div style={{ color: '#94a3b8', fontSize: 11 }}>Security Alert:</div>
                  {selectedElement.data.has_incident ? (
                    <span className="badge badge-critical" style={{ marginTop: 4 }}>
                      Associated with Active Incident
                    </span>
                  ) : (
                    <span className="badge badge-low" style={{ marginTop: 4 }}>
                      Routine Traffic
                    </span>
                  )}
                </div>
              </div>
            )}

            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 'auto' }}
              onClick={() => setSelectedElement(null)}
            >
              Close Inspector
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
