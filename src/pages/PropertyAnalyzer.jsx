import { useState } from 'react';
import { runAnalysis } from '../services/analysisService';
import { saveProperty } from '../services/propertyStorage';
import './PropertyAnalyzer.css';

const PROPERTY_TYPES = [
  { value: 'single-family', label: 'Single Family' },
  { value: 'condo',         label: 'Condo' },
  { value: 'multifamily',   label: 'Multifamily' },
  { value: 'commercial',    label: 'Commercial' },
  { value: 'land',          label: 'Land' },
];

const TYPE_LABELS = {
  'single-family': 'Single Family',
  condo:           'Condo',
  multifamily:     'Multifamily',
  commercial:      'Commercial',
  land:            'Land',
};

const INIT = { address: '', price: '', beds: '', baths: '', sqft: '', type: 'single-family' };

/* ── Circular score ring ─────────────────────────────────── */
function ScoreRing({ score, max = 100, color, label, sublabel }) {
  const r      = 38;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (score / max) * circ;

  return (
    <div className="score-ring">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--gray-100)" strokeWidth="8"/>
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: '0.8s ease' }}
        />
        <text x="50" y="46" textAnchor="middle" fill="var(--gray-900)" fontSize="20" fontWeight="800">
          {score}
        </text>
        <text x="50" y="60" textAnchor="middle" fill="var(--gray-400)" fontSize="10">
          / {max}
        </text>
      </svg>
      <p className="ring-label">{label}</p>
      {sublabel && <p className="ring-sub">{sublabel}</p>}
    </div>
  );
}

/* ── Coming-soon chip ────────────────────────────────────── */
function FeatureChip({ text }) {
  return (
    <div className="feature-chip">
      <span className="feature-dot" />
      {text}
    </div>
  );
}

/* ── Property info header ────────────────────────────────── */
function PropertyInfoHeader({ analysis }) {
  const typeMeta = TYPE_LABELS[analysis.type] || analysis.type;
  const metaParts = [
    typeMeta,
    analysis.beds  !== '—' ? `${analysis.beds} Beds`   : null,
    analysis.baths !== '—' ? `${analysis.baths} Baths`  : null,
    analysis.sqft  !== '—' ? `${analysis.sqft} Sq Ft`   : null,
  ].filter(Boolean);

  return (
    <div className="pinfo-card">
      <div className="pinfo-left">
        <div className="pinfo-address-row">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="pinfo-pin">
            <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6C3.5 9.5 8 14.5 8 14.5C8 14.5 12.5 9.5 12.5 6C12.5 3.5 10.5 1.5 8 1.5Z"
              stroke="var(--blue-500)" strokeWidth="1.4"/>
            <circle cx="8" cy="6" r="1.5" fill="var(--blue-500)"/>
          </svg>
          <h3 className="pinfo-address">{analysis.address}</h3>
        </div>
        <div className="pinfo-meta">
          {metaParts.map((p, i) => (
            <span key={i} className="pinfo-meta-pill">{p}</span>
          ))}
        </div>
      </div>
      <div className="pinfo-right">
        <p className="pinfo-price-label">Asking Price</p>
        <p className="pinfo-price">{analysis.price}</p>
      </div>
    </div>
  );
}

/* ── TCO section ─────────────────────────────────────────── */
function TCOSection({ tco }) {
  const rows = [
    { label: 'Monthly Mortgage',  value: tco.mortgage,  note: '(20% down, 30yr, 6.82%)' },
    { label: 'Property Tax Est.', value: tco.propTax,   note: '(~1.2% annually)' },
    { label: 'Home Insurance',    value: tco.insurance, note: '(~0.5% annually)' },
    { label: 'HOA',               value: tco.hoa,       note: '(enter actual amount)' },
  ];

  return (
    <div className="card section">
      <div className="card-header">
        <h2 className="card-title">Total Cost of Ownership</h2>
        <span className="badge badge-gold">Monthly Estimates</span>
      </div>

      <p className="tco-note-top">{tco.note}</p>

      <div className="tco-rows">
        {rows.map(row => (
          <div key={row.label} className="tco-row">
            <div className="tco-row-left">
              <span className="tco-row-label">{row.label}</span>
              <span className="tco-row-note">{row.note}</span>
            </div>
            <span className="tco-row-value">{row.value}<span className="tco-mo">/mo</span></span>
          </div>
        ))}
      </div>

      <div className="tco-total-row">
        <span className="tco-total-label">Est. Total Monthly Cost</span>
        <span className="tco-total-value">{tco.total}<span className="tco-mo">/mo</span></span>
      </div>

      <div className="tco-down-row">
        <span className="tco-down-label">Required Down Payment (20%)</span>
        <span className="tco-down-value">{tco.downPayment}</span>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────── */
export default function PropertyAnalyzer() {
  const [form,     setForm]     = useState(INIT);
  const [analysis, setAnalysis] = useState(null);
  const [loading,  setLoading]  = useState(false);

  const handleChange = e =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    const result = await runAnalysis(form);
    saveProperty(form, result);   // persist to localStorage
    setAnalysis(result);
    setLoading(false);
    /* Scroll to results after render */
    setTimeout(() => {
      document.getElementById('pa-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleReset = () => { setForm(INIT); setAnalysis(null); };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Property Analyzer</h1>
        <p className="page-subtitle">
          Enter property details to generate an AI-powered deal score and investment report.
        </p>
      </div>

      {/* ── Form card ─────────────────────────────────────── */}
      <div className="card section">
        <div className="card-header">
          <h2 className="card-title">Property Details</h2>
          {analysis && (
            <div className="pa-header-actions">
              <span className="badge badge-green">Analysis Complete</span>
              <button className="btn btn-ghost btn-sm" onClick={handleReset}>
                New Analysis
              </button>
            </div>
          )}
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          {/* Address — full width */}
          <div className="form-group col-span-2">
            <label className="form-label">Property Address</label>
            <input
              name="address"
              className="form-input"
              placeholder="123 Main St, City, State 00000"
              value={form.address}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Asking Price</label>
            <input
              name="price"
              className="form-input"
              placeholder="$550,000"
              value={form.price}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Property Type</label>
            <select
              name="type"
              className="form-select"
              value={form.type}
              onChange={handleChange}
            >
              {PROPERTY_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Bedrooms</label>
            <input
              name="beds"
              className="form-input"
              placeholder="3"
              value={form.beds}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Bathrooms</label>
            <input
              name="baths"
              className="form-input"
              placeholder="2"
              value={form.baths}
              onChange={handleChange}
            />
          </div>

          <div className="form-group col-span-2">
            <label className="form-label">Square Feet</label>
            <input
              name="sqft"
              className="form-input"
              placeholder="1,800"
              value={form.sqft}
              onChange={handleChange}
            />
          </div>

          <div className="col-span-2">
            <button
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={loading}
            >
              {loading ? (
                <><span className="spinner" /> Analyzing…</>
              ) : (
                analysis ? 'Re-Analyze Property' : 'Run AI Analysis'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Results ───────────────────────────────────────── */}
      {analysis && (
        <div className="pa-results" id="pa-results">

          {/* 1 — Property info header */}
          <div className="section">
            <PropertyInfoHeader analysis={analysis} />
          </div>

          {/* 2 — AI scores + key metrics */}
          <div className="card section">
            <div className="card-header">
              <h2 className="card-title">AI Analysis Report</h2>
              <span className="badge badge-blue">Generated just now</span>
            </div>

            <div className="scores-row">
              <ScoreRing
                score={analysis.dealScore}
                color="var(--blue-600)"
                label="Deal Score"
                sublabel="Excellent"
              />
              <div className="scores-divider" />
              <ScoreRing
                score={analysis.opportunityScore}
                color="var(--teal-500)"
                label="Opportunity"
                sublabel="High"
              />
              <div className="scores-divider" />
              <div className="risk-block">
                <p className="risk-label">Risk Level</p>
                <p className="risk-value">{analysis.riskLevel}</p>
                <span className="badge badge-green">Safe to proceed</span>
              </div>
            </div>

            {/* Key metrics — offer values are now computed from actual price */}
            <div className="metrics-grid">
              {[
                { label: 'Offer Low (94%)',   value: analysis.offerLow,      highlight: true  },
                { label: 'Offer High (98%)',  value: analysis.offerHigh,     highlight: true  },
                { label: 'After-Repair Value', value: analysis.arv,          highlight: false },
                { label: 'Est. Rehab Cost',   value: analysis.rehabCost,     highlight: false },
                { label: 'Est. Cap Rate',     value: analysis.capRate,       highlight: false },
                { label: 'Programs Found',    value: `${analysis.programs} available`, highlight: false },
              ].map(m => (
                <div key={m.label} className={`metric-cell${m.highlight ? ' metric-cell--hl' : ''}`}>
                  <p className="metric-label">{m.label}</p>
                  <p className="metric-value">{m.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 3 — Total Cost of Ownership */}
          <TCOSection tco={analysis.tco} />

          {/* 4 — Recommended actions */}
          <div className="card section">
            <div className="card-header">
              <h2 className="card-title">Recommended Next Actions</h2>
              <span className="badge badge-teal">{analysis.actions.length} Steps</span>
            </div>
            <ol className="action-list">
              {analysis.actions.map((action, i) => (
                <li key={i} className="action-item">
                  <span className="action-num">{i + 1}</span>
                  <span className="action-text">{action}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* 5 — Coming soon */}
          <div className="card section">
            <div className="card-header">
              <h2 className="card-title">Coming Soon to CinNova</h2>
              <span className="badge badge-gray">In Development</span>
            </div>
            <div className="features-grid">
              {analysis.comingSoon.map(f => <FeatureChip key={f} text={f} />)}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
