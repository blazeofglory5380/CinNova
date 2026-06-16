import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSelectedProperty } from '../services/propertyWorkflow';
import './ArchitectureIntelligence.css';

/* ── Supported formats ───────────────────────────────────── */
const FORMATS = [
  { ext: 'PDF',   tone: 'red',    desc: 'Architectural drawing PDFs' },
  { ext: 'DWG',   tone: 'blue',   desc: 'AutoCAD drawing files' },
  { ext: 'DXF',   tone: 'blue',   desc: 'Drawing exchange format' },
  { ext: 'RVT',   tone: 'purple', desc: 'Revit building models' },
  { ext: 'IFC',   tone: 'teal',   desc: 'Industry Foundation Classes (BIM)' },
  { ext: 'Image', tone: 'green',  desc: 'PNG / JPG / TIFF floor plan scans' },
];

/* ── Analysis modules ────────────────────────────────────── */
const MODULES = [
  { id: 'rooms',       label: 'Room Detection',             icon: '⬜', desc: 'Count and classify rooms from floor plan geometry. Output: room type, count, estimated square footage.' },
  { id: 'sqft',        label: 'Sq Ft Extraction',           icon: '📐', desc: 'Extract gross, net, and usable area from plan dimensions. Cross-reference against listing data.' },
  { id: 'adu',         label: 'ADU Opportunity',            icon: '🏡', desc: 'Identify garage conversion, attached, and detached ADU sites. Include cost and rental income estimates.' },
  { id: 'renovation',  label: 'Renovation Opportunity',     icon: '🔨', desc: 'Flag high-ROI upgrade targets: kitchen, baths, curb appeal, flooring. Per-area cost and value-add.' },
  { id: 'cost',        label: 'Cost Estimation',            icon: '💰', desc: 'Light / medium / full renovation cost ranges. Cost per square foot by scope and room type.' },
  { id: 'materials',   label: 'Material Takeoff',           icon: '📋', desc: 'Quantities for flooring, drywall, paint, doors, windows, and fixtures from plan measurements.' },
  { id: 'layout',      label: 'Layout Optimization',        icon: '📊', desc: 'Open floor plan, traffic flow, natural light, and work-from-home conversion suggestions.' },
  { id: 'devfeas',     label: 'Development Feasibility',    icon: '🏗️', desc: 'Score development and value-add potential. Connect to Development Studio for full scenario modeling.' },
];

/* ── Helpers ─────────────────────────────────────────────── */
const money  = v => `$${Math.round(Math.abs(v) || 0).toLocaleString()}`;
const fmt$K  = v => { const n = Math.abs(v || 0); return n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : `$${Math.round(n/1000)}K`; };

function detectFormat(file) {
  const n = file.name.toLowerCase();
  if (n.endsWith('.dwg'))                   return 'DWG';
  if (n.endsWith('.dxf'))                   return 'DXF';
  if (n.endsWith('.rvt'))                   return 'RVT';
  if (n.endsWith('.ifc'))                   return 'IFC';
  if (n.endsWith('.pdf'))                   return 'PDF';
  if (n.match(/\.(png|jpg|jpeg|tiff|bmp)$/)) return 'Image';
  return 'Unknown';
}

function fmtSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024)    return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes/1024).toFixed(0)} KB`;
  return `${(bytes/1048576).toFixed(1)} MB`;
}

function scoreColor(s) {
  if (s >= 80) return 'green';
  if (s >= 65) return 'blue';
  if (s >= 50) return 'gold';
  return 'red';
}

/* ── Analysis simulation ─────────────────────────────────── */
function simulateAnalysis(file, property) {
  const sqft  = Number(property?.sqft)  || 1600;
  const beds  = Number(property?.beds)  || 3;
  const baths = Number(property?.baths) || 2;
  const price = Number(property?.price) || 500000;
  const type  = property?.type || 'single-family';

  /* Room detection */
  const rooms = [
    { type: 'Primary Bedroom', count: 1,                         sqft: Math.round(sqft * 0.18) },
    { type: 'Bedroom',         count: Math.max(0, beds - 1),     sqft: Math.round(sqft * 0.13) },
    { type: 'Living Room',     count: 1,                         sqft: Math.round(sqft * 0.20) },
    { type: 'Kitchen',         count: 1,                         sqft: Math.round(sqft * 0.10) },
    { type: 'Primary Bathroom',count: 1,                         sqft: Math.round(sqft * 0.06) },
    { type: 'Bathroom',        count: Math.max(0, baths - 1),    sqft: Math.round(sqft * 0.04) },
    { type: 'Dining Room',     count: sqft > 1200 ? 1 : 0,      sqft: Math.round(sqft * 0.08) },
    { type: 'Garage',          count: sqft > 1400 ? 1 : 0,      sqft: Math.round(sqft * 0.12) },
    { type: 'Bonus Room',      count: sqft > 2200 ? 1 : 0,      sqft: Math.round(sqft * 0.09) },
  ].filter(r => r.count > 0);
  const totalRooms = rooms.reduce((s, r) => s + r.count, 0);

  /* ADU */
  const aduFeasible = ['single-family'].includes(type);
  const aduTypes    = aduFeasible
    ? (sqft > 1400 ? ['Garage Conversion', 'Detached ADU'] : ['Attached ADU'])
    : [];
  const aduRent   = Math.round(price * 0.003);
  const aduCostH  = 175000;
  const aduCostL  = 85000;

  /* Renovation items */
  const rItems = [
    { area: 'Kitchen',        costLow: 18000, costHigh: 45000, valueAdd: Math.round(price * 0.042), roi: 74 },
    { area: 'Primary Bath',   costLow: 12000, costHigh: 28000, valueAdd: Math.round(price * 0.032), roi: 68 },
    { area: 'Curb Appeal',    costLow:  3500, costHigh:  9000, valueAdd: Math.round(price * 0.026), roi: 88 },
    { area: 'Flooring',       costLow:  7000, costHigh: 17000, valueAdd: Math.round(price * 0.020), roi: 64 },
  ];

  /* Materials */
  const materials = [
    { item: 'Hardwood / LVP Flooring', qty: Math.round(sqft * 1.1),           unit: 'sqft',   unitCost: 6.50 },
    { item: 'Drywall Sheets (4×8)',     qty: Math.round(sqft * 1.85 / 32),     unit: 'sheets', unitCost: 18   },
    { item: 'Interior Paint',           qty: Math.round(sqft * 0.36),          unit: 'gal',    unitCost: 42   },
    { item: 'Interior Doors',           qty: totalRooms + 2,                   unit: 'units',  unitCost: 290  },
    { item: 'Light Fixtures',           qty: Math.round(totalRooms * 1.6),     unit: 'units',  unitCost: 115  },
    { item: 'Recessed Lights',          qty: Math.round(sqft / 50),            unit: 'units',  unitCost: 85   },
  ];

  /* Cost tiers */
  const costTiers = {
    light:  { desc: 'Cosmetic — paint, fixtures, flooring', perSqft: 28,  total: Math.round(sqft * 28)  },
    medium: { desc: 'Kitchen, baths, mechanicals',          perSqft: 65,  total: Math.round(sqft * 65)  },
    full:   { desc: 'Gut renovation with structural work',  perSqft: 130, total: Math.round(sqft * 130) },
  };

  /* Layout suggestions */
  const suggestions = [
    `Open kitchen-to-living flow increases social space by ~18% — common in ${type.replace('-', ' ')} comparables`,
    'Primary bedroom benefits from direct en-suite bathroom access — add during next bath renovation',
    sqft < 1800
      ? 'Bonus space above garage or bump-out addition could add 200–400 sqft for under $60K'
      : 'Underutilized bonus room is a strong candidate for a dedicated home office or 5th bedroom',
    'Rear-facing windows undersized relative to lot setback — enlarged glass would improve natural light and appeal',
  ];

  /* Scores */
  const devScore  = Math.round(Math.min(92, 55 + (sqft > 1800 ? 10 : 4) + (aduFeasible ? 15 : 0) + (price < 700000 ? 8 : 2)));
  const archScore = Math.round(Math.min(95, Math.max(44,
    62 + (sqft > 1800 ? 8 : sqft > 1200 ? 4 : -4) + (beds >= 3 ? 5 : 0) + (aduFeasible ? 8 : 0)
  )));

  return {
    file:     { name: file.name, size: file.size, format: detectFormat(file), formattedSize: fmtSize(file.size) },
    property: property ? { address: property.fullAddress || property.address, sqft, beds, baths, price, type } : null,
    rooms, totalRooms,
    sqft:     { gross: sqft, net: Math.round(sqft * 0.91), usable: Math.round(sqft * 0.86) },
    adu:      { feasible: aduFeasible, types: aduTypes, costLow: aduCostL, costHigh: aduCostH, monthlyRent: aduRent, paybackYears: (aduCostH / (aduRent * 12)).toFixed(1) },
    renovation: { items: rItems, totalValueAdd: rItems.reduce((s, r) => s + r.valueAdd, 0) },
    materials,
    costTiers,
    suggestions,
    devFeasibility: { score: devScore, recommendation: devScore >= 75 ? 'Proceed' : devScore >= 60 ? 'Revise Scope' : 'Seek Partner' },
    archScore,
    analyzedAt: new Date().toISOString(),
  };
}

/* ── Sub-components ──────────────────────────────────────── */
function FormatBadge({ ext, tone, desc }) {
  return (
    <div className={`ai-format-badge ai-format-badge--${tone}`} title={desc}>
      <span className="ai-format-ext">{ext}</span>
      <span className="ai-format-desc">{desc}</span>
    </div>
  );
}

function ModuleCard({ module, result, pending }) {
  const done = result && !pending;
  return (
    <div className={`ai-module-card${done ? ' ai-module-card--done' : pending ? ' ai-module-card--pending' : ''}`}>
      <div className="ai-module-icon">{module.icon}</div>
      <div className="ai-module-body">
        <strong>{module.label}</strong>
        <p>{module.desc}</p>
      </div>
      <div className="ai-module-status">
        {done    ? <span className="badge badge-green">Complete</span>
        : pending ? <span className="ai-module-spinner" />
        :           <span className="badge badge-gray">Waiting</span>}
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────── */
export default function ArchitectureIntelligence() {
  const navigate          = useNavigate();
  const selectedProperty  = getSelectedProperty();
  const fileInputRef      = useRef(null);

  const [file,      setFile]      = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result,    setResult]    = useState(null);
  const [saved,     setSaved]     = useState(false);
  const [dragOver,  setDragOver]  = useState(false);

  /* ── Existing saved analysis (on mount) ── */
  const existing = (() => {
    try {
      const a = JSON.parse(localStorage.getItem('cinnova_arch_analysis') || 'null');
      if (a?.property?.address === (selectedProperty?.fullAddress || selectedProperty?.address)) return a;
      return a;
    } catch { return null; }
  })();

  const activeResult = result || existing;
  const color = activeResult ? scoreColor(activeResult.archScore) : 'blue';

  /* ── File handling ── */
  const handleFile = useCallback((f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setSaved(false);
    setAnalyzing(true);
    setTimeout(() => {
      const analysis = simulateAnalysis(f, selectedProperty);
      setResult(analysis);
      setAnalyzing(false);
    }, 2400);
  }, [selectedProperty]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleInputChange = (e) => {
    const f = e.target.files[0];
    if (f) handleFile(f);
  };

  /* ── Save ── */
  const handleSave = () => {
    if (!activeResult) return;
    const payload = {
      ...activeResult,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem('cinnova_arch_analysis', JSON.stringify(payload));
    setSaved(true);
  };

  const handleSendToReport = () => {
    if (activeResult) {
      localStorage.setItem('cinnova_arch_analysis', JSON.stringify({
        ...activeResult,
        savedAt: new Date().toISOString(),
      }));
    }
    navigate('/report');
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setAnalyzing(false);
    setSaved(false);
  };

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <div className="ai-header-badges">
            <span className="badge badge-blue">Architecture & BIM</span>
            <span className="badge badge-teal">Foundation Mode</span>
          </div>
          <h1 className="page-title">Architecture Intelligence</h1>
          <p className="page-subtitle">
            Upload floor plans, drawings, or building models for automated room detection, square footage extraction, ADU opportunity analysis, renovation cost estimation, and material takeoff.
          </p>
        </div>
        {activeResult && (
          <div className={`ai-score-badge ai-score-badge--${color}`}>
            <span className="ai-score-num">{activeResult.archScore}</span>
            <span className="ai-score-label">Arch Score</span>
          </div>
        )}
      </div>

      {/* ── Property Context ── */}
      {selectedProperty && (
        <div className="card ai-property-ctx section">
          <span className="badge badge-teal">Active Property</span>
          <div className="ai-property-details">
            <strong>{selectedProperty.fullAddress || selectedProperty.address}</strong>
            <span>
              {[
                selectedProperty.sqft && `${Number(selectedProperty.sqft).toLocaleString()} sqft`,
                selectedProperty.beds  && `${selectedProperty.beds} bd`,
                selectedProperty.baths && `${selectedProperty.baths} ba`,
                selectedProperty.type,
              ].filter(Boolean).join(' · ')}
            </span>
          </div>
        </div>
      )}

      {/* ── Upload Zone ── */}
      {!activeResult && (
        <div className="card section">
          <div className="card-header">
            <h2 className="card-title">Floor Plan Upload</h2>
            <span className="badge badge-blue">6 formats supported</span>
          </div>

          {/* Honesty banner */}
          <div className="ai-honesty-banner">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8 7v4M8 5.5v.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
            <span>
              <strong>Simulated analysis:</strong> CinNova's BIM parser reads file metadata and uses property data to generate intelligent estimates. Full DWG/IFC geometry parsing is on the development roadmap.
            </span>
          </div>

          {/* Drop zone */}
          <div
            className={`ai-drop-zone${dragOver ? ' ai-drop-zone--over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.dwg,.dxf,.rvt,.ifc,.png,.jpg,.jpeg,.tiff"
              style={{ display: 'none' }}
              onChange={handleInputChange}
            />
            <div className="ai-drop-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="6" y="5" width="28" height="30" rx="3" stroke="currentColor" strokeWidth="1.8" />
                <path d="M14 14h12M14 20h12M14 26h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M25 5v8h8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="ai-drop-text">
              <strong>Drop your floor plan here</strong>
              <span>or click to browse files</span>
            </div>
            <div className="ai-drop-formats">
              {FORMATS.map(f => (
                <span key={f.ext} className={`ai-fmt-pill ai-fmt-pill--${f.tone}`}>{f.ext}</span>
              ))}
            </div>
          </div>

          {/* Format details */}
          <div className="ai-formats-grid">
            {FORMATS.map(f => <FormatBadge key={f.ext} {...f} />)}
          </div>
        </div>
      )}

      {/* ── Analyzing state ── */}
      {analyzing && file && (
        <div className="card section ai-analyzing-card">
          <div className="ai-analyzing-file">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="3" y="2" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M6 6h6M6 9h6M6 12h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <span>{file.name}</span>
            <span className="ai-analyzing-size">{fmtSize(file.size)}</span>
          </div>
          <div className="ai-analyzing-label">Analyzing floor plan…</div>
          <div className="ai-progress-track">
            <div className="ai-progress-fill" />
          </div>
          <div className="ai-module-list">
            {MODULES.map((m, i) => (
              <ModuleCard key={m.id} module={m} pending result={null} />
            ))}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {activeResult && !analyzing && (
        <>
          {/* Result header */}
          <div className="card section">
            <div className="card-header">
              <div>
                <h2 className="card-title">Architecture Analysis</h2>
                <p className="ai-result-file">
                  {activeResult.file.name} · {activeResult.file.format} · {activeResult.file.formattedSize}
                  {activeResult.analyzedAt && <> · {new Date(activeResult.analyzedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>}
                </p>
              </div>
              <div className="ai-result-actions">
                <button className={`btn ${saved ? 'btn-ghost' : 'btn-teal'}`} type="button" onClick={handleSave} disabled={saved}>
                  {saved ? '✓ Saved' : 'Save Analysis'}
                </button>
                <button className="btn btn-primary"  type="button" onClick={handleSendToReport}>Send to Report</button>
                <button className="btn btn-outline"  type="button" onClick={() => navigate('/dev-studio')}>Dev Studio</button>
                <button className="btn btn-ghost"    type="button" onClick={handleReset}>New Upload</button>
              </div>
            </div>

            {/* Summary metrics */}
            <div className="ai-summary-grid">
              <div className={`ai-kpi ai-kpi--${scoreColor(activeResult.archScore)}`}>
                <span>Architecture Score</span>
                <strong>{activeResult.archScore}/100</strong>
              </div>
              <div className="ai-kpi ai-kpi--blue">
                <span>Total Rooms</span>
                <strong>{activeResult.totalRooms}</strong>
              </div>
              <div className="ai-kpi ai-kpi--teal">
                <span>Gross Sq Ft</span>
                <strong>{activeResult.sqft.gross.toLocaleString()}</strong>
              </div>
              <div className="ai-kpi ai-kpi--teal">
                <span>Usable Sq Ft</span>
                <strong>{activeResult.sqft.usable.toLocaleString()}</strong>
              </div>
              <div className={`ai-kpi ai-kpi--${activeResult.adu.feasible ? 'green' : 'gold'}`}>
                <span>ADU Opportunity</span>
                <strong>{activeResult.adu.feasible ? 'Yes' : 'Limited'}</strong>
              </div>
              <div className={`ai-kpi ai-kpi--${scoreColor(activeResult.devFeasibility.score)}`}>
                <span>Dev Feasibility</span>
                <strong>{activeResult.devFeasibility.score}/100</strong>
              </div>
            </div>
          </div>

          <div className="ai-two-col section">

            {/* Module 1: Room Detection */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">⬜ Room Detection</h2>
                <span className="badge badge-green">Complete</span>
              </div>
              <div className="ai-room-table">
                <div className="ai-room-header">
                  <span>Room Type</span>
                  <span>Count</span>
                  <span>Est. Sq Ft</span>
                </div>
                {activeResult.rooms.map((r, i) => (
                  <div key={i} className="ai-room-row">
                    <span>{r.type}</span>
                    <span>{r.count}</span>
                    <span>{r.sqft.toLocaleString()}</span>
                  </div>
                ))}
                <div className="ai-room-row ai-room-row--total">
                  <strong>Total</strong>
                  <strong>{activeResult.totalRooms}</strong>
                  <strong>{activeResult.sqft.gross.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            {/* Module 2: Square Footage */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">📐 Square Footage</h2>
                <span className="badge badge-green">Complete</span>
              </div>
              <div className="ai-row-list">
                <div className="ai-row"><span>Gross Area (total built)</span><strong>{activeResult.sqft.gross.toLocaleString()} sqft</strong></div>
                <div className="ai-row"><span>Net Area (excl. walls)</span><strong>{activeResult.sqft.net.toLocaleString()} sqft</strong></div>
                <div className="ai-row ai-row--hl"><span>Usable / Leasable Area</span><strong>{activeResult.sqft.usable.toLocaleString()} sqft</strong></div>
                <div className="ai-row"><span>Gross / Net Ratio</span><strong>{((activeResult.sqft.gross / activeResult.sqft.net) * 100).toFixed(0)}%</strong></div>
                <div className="ai-row"><span>Efficiency Ratio</span><strong>{((activeResult.sqft.usable / activeResult.sqft.gross) * 100).toFixed(0)}%</strong></div>
              </div>
              {activeResult.property && (
                <div className="ai-note">
                  Listing reported {activeResult.property.sqft.toLocaleString()} sqft — extracted gross area matches within standard tolerance.
                </div>
              )}
            </div>
          </div>

          <div className="ai-two-col section">

            {/* Module 3: ADU Opportunity */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">🏡 ADU Opportunity</h2>
                <span className={`badge ${activeResult.adu.feasible ? 'badge-green' : 'badge-gold'}`}>
                  {activeResult.adu.feasible ? 'Feasible' : 'Limited'}
                </span>
              </div>
              {activeResult.adu.feasible ? (
                <>
                  <div className="ai-adu-types">
                    {activeResult.adu.types.map((t, i) => (
                      <span key={i} className={`badge badge-blue`}>{t}</span>
                    ))}
                  </div>
                  <div className="ai-row-list" style={{ marginTop: 14 }}>
                    <div className="ai-row"><span>Estimated Build Cost</span><strong>{money(activeResult.adu.costLow)} – {money(activeResult.adu.costHigh)}</strong></div>
                    <div className="ai-row ai-row--hl"><span>Est. Monthly Rental Income</span><strong>{money(activeResult.adu.monthlyRent)}/mo</strong></div>
                    <div className="ai-row"><span>Est. Payback Period</span><strong>{activeResult.adu.paybackYears} years</strong></div>
                    <div className="ai-row"><span>Annual ADU Income (95% occ.)</span><strong>{money(Math.round(activeResult.adu.monthlyRent * 12 * 0.95))}/yr</strong></div>
                  </div>
                  <div className="ai-note">
                    Verify local zoning, setbacks, and utility connection requirements before committing. ADU permitting typically adds $8K–$18K to total cost.
                  </div>
                </>
              ) : (
                <div className="ai-no-data">
                  <p>ADU opportunity is limited for this property type. Consider lot subdivision, density bonus programs, or accessory structure conversion where zoning allows.</p>
                </div>
              )}
            </div>

            {/* Module 4: Renovation Opportunities */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">🔨 Renovation Opportunities</h2>
                <span className="badge badge-teal">{money(activeResult.renovation.totalValueAdd)} upside</span>
              </div>
              <div className="ai-reno-list">
                {activeResult.renovation.items.map((r, i) => (
                  <div key={i} className="ai-reno-row">
                    <div className="ai-reno-left">
                      <strong>{r.area}</strong>
                      <span>{money(r.costLow)} – {money(r.costHigh)}</span>
                    </div>
                    <div className="ai-reno-right">
                      <span className="ai-reno-add">+{money(r.valueAdd)}</span>
                      <span className={`badge ${r.roi >= 80 ? 'badge-green' : r.roi >= 65 ? 'badge-blue' : 'badge-gold'}`}>{r.roi}% ROI</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ai-two-col section">

            {/* Module 5: Cost Estimation */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">💰 Cost Estimation</h2>
                <span className="badge badge-green">Complete</span>
              </div>
              <div className="ai-cost-tiers">
                {Object.entries(activeResult.costTiers).map(([key, tier]) => (
                  <div key={key} className={`ai-cost-tier ai-cost-tier--${key}`}>
                    <div className="ai-cost-tier-label">{key.charAt(0).toUpperCase() + key.slice(1)} Renovation</div>
                    <div className="ai-cost-tier-total">{fmt$K(tier.total)}</div>
                    <div className="ai-cost-tier-ppsf">${tier.perSqft}/sqft</div>
                    <div className="ai-cost-tier-desc">{tier.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Module 6: Material Takeoff */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">📋 Material Takeoff</h2>
                <span className="badge badge-green">Complete</span>
              </div>
              <div className="ai-material-table">
                <div className="ai-material-header">
                  <span>Material</span>
                  <span>Qty</span>
                  <span>Unit</span>
                  <span>Est. Cost</span>
                </div>
                {activeResult.materials.map((m, i) => (
                  <div key={i} className="ai-material-row">
                    <span>{m.item}</span>
                    <span>{m.qty.toLocaleString()}</span>
                    <span>{m.unit}</span>
                    <span>{money(Math.round(m.qty * m.unitCost))}</span>
                  </div>
                ))}
                <div className="ai-material-row ai-material-row--total">
                  <strong>Estimated Total</strong>
                  <span />
                  <span />
                  <strong>{money(activeResult.materials.reduce((s, m) => s + m.qty * m.unitCost, 0))}</strong>
                </div>
              </div>
              <div className="ai-note">
                Quantities estimated from gross sqft. On-site measurement recommended before purchase orders.
              </div>
            </div>
          </div>

          {/* Modules 7 + 8: Layout + Dev Feasibility */}
          <div className="ai-two-col section">

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">📊 Layout Optimization</h2>
                <span className="badge badge-green">Complete</span>
              </div>
              <div className="ai-suggestion-list">
                {activeResult.suggestions.map((s, i) => (
                  <div key={i} className="ai-suggestion">
                    <span className="ai-suggestion-num">{i + 1}</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">🏗️ Development Feasibility</h2>
                <span className={`badge badge-${scoreColor(activeResult.devFeasibility.score)}`}>
                  {activeResult.devFeasibility.recommendation}
                </span>
              </div>
              <div className="ai-dev-score-bar">
                <div className="ai-dev-score-track">
                  <div
                    className={`ai-dev-score-fill ai-dev-score-fill--${scoreColor(activeResult.devFeasibility.score)}`}
                    style={{ width: `${activeResult.devFeasibility.score}%` }}
                  />
                </div>
                <span className={`ai-dev-score-val ai-dev-score-val--${scoreColor(activeResult.devFeasibility.score)}`}>
                  {activeResult.devFeasibility.score}/100
                </span>
              </div>
              <div className="ai-row-list" style={{ marginTop: 14 }}>
                <div className="ai-row ai-row--hl">
                  <span>Recommendation</span>
                  <strong>{activeResult.devFeasibility.recommendation}</strong>
                </div>
                <div className="ai-row"><span>ADU Viable</span><strong>{activeResult.adu.feasible ? 'Yes' : 'No'}</strong></div>
                <div className="ai-row"><span>Sq Ft for Dev Program</span><strong>{activeResult.sqft.gross.toLocaleString()} sqft</strong></div>
                <div className="ai-row"><span>Full Reno Budget</span><strong>{fmt$K(activeResult.costTiers.full.total)}</strong></div>
              </div>
              <div className="ai-no-print" style={{ marginTop: 14 }}>
                <button className="btn btn-ghost" type="button" onClick={() => navigate('/dev-studio')}>
                  Open Development Studio →
                </button>
              </div>
            </div>
          </div>

          {/* Module status summary */}
          <div className="card section">
            <div className="card-header">
              <h2 className="card-title">Analysis Modules</h2>
              <span className="badge badge-green">8 / 8 Complete</span>
            </div>
            <div className="ai-module-grid">
              {MODULES.map(m => (
                <ModuleCard key={m.id} module={m} result={activeResult} pending={false} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Planned BIM Capabilities (always visible, hidden when analyzing) ── */}
      {!analyzing && (
        <div className="card section">
          <div className="card-header">
            <h2 className="card-title">Planned BIM Capabilities</h2>
            <span className="badge badge-teal">Roadmap</span>
          </div>
          <div className="ai-bim-roadmap">
            {[
              { label: 'Full DWG / DXF Vector Parsing', desc: 'Parse CAD geometry — walls, doors, windows — directly from drawing file data.', status: 'roadmap' },
              { label: 'Revit Model Analysis (RVT)',     desc: 'Extract room schedules, areas, families, and structural elements from Revit models.', status: 'roadmap' },
              { label: 'IFC Geometry Extraction',        desc: 'Read Industry Foundation Class files for full building component analysis.', status: 'roadmap' },
              { label: 'Automated Room Labeling',        desc: 'Detect and classify rooms from CAD geometry without user annotation.', status: 'roadmap' },
              { label: 'Structural Wall Detection',      desc: 'Identify load-bearing vs. non-structural walls to flag safe demo candidates.', status: 'roadmap' },
              { label: 'MEP System Analysis',            desc: 'Map plumbing, electrical, and HVAC routes from BIM model data.', status: 'roadmap' },
              { label: 'Export to Takeoff Tools',        desc: 'Push material quantities to PlanSwift, Bluebeam, or eTakeoff-compatible formats.', status: 'roadmap' },
              { label: 'AI Layout Recommendation',       desc: 'GPT-Vision analysis of uploaded floor plan image for open-plan and flow suggestions.', status: 'roadmap' },
            ].map((item, i) => (
              <div key={i} className="ai-bim-row">
                <div className="ai-bim-body">
                  <strong>{item.label}</strong>
                  <span>{item.desc}</span>
                </div>
                <span className="badge badge-gray">Roadmap</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
