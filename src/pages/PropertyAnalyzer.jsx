import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { runAnalysis } from '../services/analysisService';
import { saveProperty, addToPortfolio } from '../services/propertyStorage';
import { getSelectedProperty, selectProperty } from '../services/propertyWorkflow';
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

function initFromSelected() {
  const s = getSelectedProperty();
  if (!s) return INIT;
  return {
    address: s.fullAddress || s.address || '',
    price:   String(s.price  || ''),
    beds:    String(s.beds   || ''),
    baths:   String(s.baths  || ''),
    sqft:    String(s.sqft   || ''),
    type:    s.type === 'Condo'       ? 'condo'
           : s.type === 'Multifamily' ? 'multifamily'
           : s.type === 'Commercial'  ? 'commercial'
           : s.type === 'Land'        ? 'land'
           : 'single-family',
  };
}

function buildPropertyObj(form, analysis) {
  return {
    id:       Date.now(),
    address:  form.address,
    price:    analysis.priceNum || 0,
    beds:     parseInt(form.beds)   || 3,
    baths:    parseFloat(form.baths) || 2,
    sqft:     parseInt(form.sqft)   || 1600,
    type:     form.type === 'single-family' ? 'Single Family'
            : form.type === 'condo'         ? 'Condo'
            : form.type === 'multifamily'   ? 'Multifamily'
            : form.type === 'commercial'    ? 'Commercial'
            : 'Land',
    score:    analysis.dealScore    || 0,
    capRate:  analysis.capRateNum   || 0,
    cashFlow: analysis.rental?.cashFlowNum || 0,
    rent:     analysis.rental ? parseInt(analysis.rental.monthlyRent.replace(/[^0-9]/g, '')) || 0 : 0,
    roi:      0,
  };
}

const RISK_COLORS = {
  Low:     'var(--success)',
  Moderate:'var(--gold)',
  High:    'var(--danger)',
  Unknown: 'var(--gray-400)',
};

const VERDICT_PALETTE = {
  green: { border: 'var(--success)',   bg: '#f0fdf4', text: '#166534' },
  blue:  { border: 'var(--blue-500)',  bg: '#eff6ff', text: '#1d4ed8' },
  gold:  { border: 'var(--gold)',      bg: '#fffbeb', text: '#92400e' },
  red:   { border: 'var(--danger)',    bg: '#fef2f2', text: '#b91c1c' },
};

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

/* ── Property info header ────────────────────────────────── */
function PropertyInfoHeader({ analysis }) {
  const typeMeta = TYPE_LABELS[analysis.type] || analysis.type;
  const metaParts = [
    typeMeta,
    analysis.beds  !== '—' ? `${analysis.beds} Beds`  : null,
    analysis.baths !== '—' ? `${analysis.baths} Baths` : null,
    analysis.sqft  !== '—' ? `${analysis.sqft} Sq Ft`  : null,
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

/* ── Investment verdict ──────────────────────────────────── */
function VerdictSection({ verdict }) {
  const c = VERDICT_PALETTE[verdict.color] || VERDICT_PALETTE.blue;
  return (
    <div className="card section pa-verdict" style={{ borderLeft: `4px solid ${c.border}`, background: c.bg }}>
      <div className="pa-verdict-header">
        <span className="pa-verdict-label" style={{ color: c.text }}>{verdict.label}</span>
        <p className="pa-verdict-summary">{verdict.summary}</p>
      </div>
      <div className="pa-verdict-reasons">
        {verdict.reasons.map((reason, i) => (
          <div key={i} className="pa-verdict-reason">
            <span className="pa-verdict-dot" style={{ background: c.border }} />
            {reason}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Risk breakdown ──────────────────────────────────────── */
const RISK_BADGE_CLS = { Low: 'badge-green', Moderate: 'badge-gold', High: 'badge-red', Unknown: 'badge-gray' };

function RiskBreakdown({ risks }) {
  return (
    <div className="card section">
      <div className="card-header">
        <h2 className="card-title">Risk Breakdown</h2>
        <span className="badge badge-blue">5 Factors</span>
      </div>
      <div className="pa-risk-list">
        {risks.map((r, i) => (
          <div key={i} className="pa-risk-row">
            <div className="pa-risk-left">
              <span className="pa-risk-dot" style={{ background: RISK_COLORS[r.level] || RISK_COLORS.Unknown }} />
              <div>
                <div className="pa-risk-factor">{r.factor}</div>
                <div className="pa-risk-note">{r.note}</div>
              </div>
            </div>
            <span className={`badge ${RISK_BADGE_CLS[r.level] || 'badge-gray'}`}>{r.level}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 2-column stat grid (reused for Comps / Renovation / Rental) ── */
function StatGrid({ cells }) {
  return (
    <div className="pa-stat-grid">
      {cells.map(c => (
        <div key={c.label} className="pa-stat-cell">
          <span className="pa-stat-label">{c.label}</span>
          <strong className={`pa-stat-val${c.cls ? ' ' + c.cls : ''}`}>{c.val}</strong>
        </div>
      ))}
    </div>
  );
}

/* ── Comparable market estimate ──────────────────────────── */
const VAL_BADGE = { Undervalued: 'badge-green', 'Fair Value': 'badge-blue', Overpriced: 'badge-red' };

function CompsSection({ comps }) {
  if (!comps) return null;
  return (
    <div className="card section">
      <div className="card-header">
        <h2 className="card-title">Comparable Market Estimate</h2>
        <span className={`badge ${VAL_BADGE[comps.valuationLabel] || 'badge-blue'}`}>{comps.valuationLabel}</span>
      </div>
      <StatGrid cells={[
        { label: 'Estimated Market Value',  val: comps.estimatedValue },
        { label: 'Comparable Range',        val: `${comps.rangeLow} – ${comps.rangeHigh}` },
        { label: 'Price per Sqft (yours)',  val: comps.ppsfActual },
        { label: 'Market Average / Sqft',   val: comps.ppsfMarket },
        { label: 'Market Trend',            val: comps.marketTrend },
        { label: 'Valuation Assessment',    val: comps.valuationLabel },
      ]} />
    </div>
  );
}

/* ── Renovation opportunity ──────────────────────────────── */
const RENOV_BADGE = { High: 'badge-green', Moderate: 'badge-teal', Low: 'badge-gray' };

function RenovationSection({ renovation }) {
  return (
    <div className="card section">
      <div className="card-header">
        <h2 className="card-title">Renovation Opportunity</h2>
        <span className={`badge ${RENOV_BADGE[renovation.rating] || 'badge-gray'}`}>{renovation.rating} Potential</span>
      </div>
      <StatGrid cells={[
        { label: 'Est. Rehab Cost',    val: renovation.rehabRange },
        { label: 'After-Repair Value', val: renovation.arv },
        { label: 'Value Upside',       val: renovation.potential },
        { label: 'Renovation ROI',     val: renovation.roi },
      ]} />
    </div>
  );
}

/* ── Rental potential ────────────────────────────────────── */
const YIELD_BADGE = { 'High Yield': 'badge-green', 'Market Rate': 'badge-blue', 'Below Average': 'badge-red' };

function RentalSection({ rental }) {
  if (!rental) return null;
  return (
    <div className="card section">
      <div className="card-header">
        <h2 className="card-title">Rental Potential</h2>
        <span className={`badge ${YIELD_BADGE[rental.yieldLabel] || 'badge-blue'}`}>{rental.yieldLabel}</span>
      </div>
      <StatGrid cells={[
        { label: 'Est. Monthly Rent',   val: rental.monthlyRent },
        { label: 'Annual Gross Rent',   val: rental.annualRent },
        { label: 'Cap Rate (50% rule)', val: rental.capRate },
        { label: 'Monthly Cash Flow',   val: rental.cashFlow, cls: rental.cashFlowNum >= 0 ? 'pos' : 'neg' },
      ]} />
    </div>
  );
}

/* ── Action bar ──────────────────────────────────────────── */
function ActionBar({ form, analysis, navigate }) {
  const [portfolioSaved, setPortfolioSaved] = useState(false);

  const ensureSelected = () => {
    if (form.address && analysis.priceNum) {
      selectProperty(buildPropertyObj(form, analysis));
    }
  };

  const handleSavePortfolio = () => {
    const prop = buildPropertyObj(form, analysis);
    addToPortfolio({ ...prop, equity: Math.round((prop.price || 0) * 0.20) });
    setPortfolioSaved(true);
  };

  return (
    <div className="card section">
      <div className="card-header">
        <h2 className="card-title">Continue with This Property</h2>
      </div>
      <div className="pa-action-btns">
        <button className="btn btn-primary" onClick={() => { ensureSelected(); navigate('/deal-analyzer'); }}>
          Send to Deal Analyzer
        </button>
        <button className="btn btn-ghost" onClick={() => { ensureSelected(); navigate('/advisor'); }}>
          Send to AI Advisor
        </button>
        <button className="btn btn-ghost" onClick={handleSavePortfolio} disabled={portfolioSaved}>
          {portfolioSaved ? '✓ Saved to Portfolio' : 'Save to Portfolio'}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/report')}>
          Generate Report
        </button>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────── */
export default function PropertyAnalyzer() {
  const navigate   = useNavigate();
  const selected   = getSelectedProperty();
  const [form,     setForm]     = useState(initFromSelected);
  const [analysis, setAnalysis] = useState(null);
  const [loading,  setLoading]  = useState(false);

  const handleChange = e =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    const result = await runAnalysis(form);
    saveProperty(form, result);
    setAnalysis(result);
    setLoading(false);
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

      {selected ? (
        <div style={{ display:'flex', alignItems:'center', gap:'16px', padding:'14px 20px', background:'#eff6ff', borderLeft:'4px solid #2563eb', borderRadius:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
          <span style={{ fontSize:'18px' }}>📍</span>
          <div style={{ flex:1, minWidth:'200px' }}>
            <strong style={{ color:'#1e40af' }}>{selected.fullAddress || selected.address}</strong>
            <span style={{ color:'#3b82f6', marginLeft:'12px', fontSize:'13px' }}>
              ${selected.price?.toLocaleString()} · {selected.type}
              {selected.beds ? ` · ${selected.beds} bd / ${selected.baths} ba` : ''}
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/property-search')}>Change Property →</button>
        </div>
      ) : (
        <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 20px', background:'#fffbeb', borderLeft:'4px solid #c9a84c', borderRadius:'8px', marginBottom:'16px' }}>
          <span style={{ fontSize:'18px' }}>🏠</span>
          <span style={{ color:'#78350f' }}>
            <strong>No property selected.</strong>{' '}
            <Link to="/property-search" style={{ color:'#2563eb', fontWeight:600 }}>Search properties →</Link>
            {' '}to auto-fill this form, or enter details manually below.
          </span>
        </div>
      )}

      {/* ── Form card ─────────────────────────────────────── */}
      <div className="card section">
        <div className="card-header">
          <h2 className="card-title">Property Details</h2>
          {analysis && (
            <div className="pa-header-actions">
              <span className="badge badge-green">Analysis Complete</span>
              <button className="btn btn-ghost btn-sm" onClick={handleReset}>New Analysis</button>
            </div>
          )}
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
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
            <select name="type" className="form-select" value={form.type} onChange={handleChange}>
              {PROPERTY_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Bedrooms</label>
            <input name="beds"  className="form-input" placeholder="3" value={form.beds}  onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="form-label">Bathrooms</label>
            <input name="baths" className="form-input" placeholder="2" value={form.baths} onChange={handleChange} />
          </div>

          <div className="form-group col-span-2">
            <label className="form-label">Square Feet</label>
            <input name="sqft"  className="form-input" placeholder="1,800" value={form.sqft}  onChange={handleChange} />
          </div>

          <div className="col-span-2">
            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
              {loading ? <><span className="spinner" /> Analyzing…</> : analysis ? 'Re-Analyze Property' : 'Run AI Analysis'}
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
                sublabel={analysis.dealSublabel}
              />
              <div className="scores-divider" />
              <ScoreRing
                score={analysis.opportunityScore}
                color="var(--teal-500)"
                label="Opportunity"
                sublabel={analysis.oppSublabel}
              />
              <div className="scores-divider" />
              <div className="risk-block">
                <p className="risk-label">Risk Level</p>
                <p className="risk-value" style={{
                  color: analysis.riskLevel === 'Low' ? 'var(--success)'
                       : analysis.riskLevel === 'High' ? 'var(--danger)'
                       : 'var(--gold)'
                }}>{analysis.riskLevel}</p>
                <span className={`badge ${
                  analysis.riskLevel === 'Low'  ? 'badge-green' :
                  analysis.riskLevel === 'High' ? 'badge-red'   : 'badge-gold'
                }`}>
                  {analysis.riskLevel === 'Low'  ? 'Safe to proceed' :
                   analysis.riskLevel === 'High' ? 'Proceed with caution' : 'Review carefully'}
                </span>
              </div>
            </div>

            <div className="metrics-grid">
              {[
                { label: 'Offer Low (94%)',    value: analysis.offerLow,      highlight: true  },
                { label: 'Offer High (98%)',   value: analysis.offerHigh,     highlight: true  },
                { label: 'After-Repair Value', value: analysis.arv,           highlight: false },
                { label: 'Est. Rehab Cost',    value: analysis.rehabCost,     highlight: false },
                { label: 'Est. Cap Rate',      value: analysis.capRate,       highlight: false },
                { label: 'Programs Found',     value: `${analysis.programs} available`, highlight: false },
              ].map(m => (
                <div key={m.label} className={`metric-cell${m.highlight ? ' metric-cell--hl' : ''}`}>
                  <p className="metric-label">{m.label}</p>
                  <p className="metric-value">{m.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 3 — Investment verdict */}
          <VerdictSection verdict={analysis.verdict} />

          {/* 4 — Risk breakdown */}
          <RiskBreakdown risks={analysis.riskBreakdown} />

          {/* 5 — Total Cost of Ownership */}
          <TCOSection tco={analysis.tco} />

          {/* 6 — Comparable market estimate */}
          <CompsSection comps={analysis.comps} />

          {/* 7 — Renovation opportunity */}
          <RenovationSection renovation={analysis.renovation} />

          {/* 8 — Rental potential */}
          <RentalSection rental={analysis.rental} />

          {/* 9 — Recommended next actions */}
          <div className="card section">
            <div className="card-header">
              <h2 className="card-title">Recommended Next Steps</h2>
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

          {/* 10 — Action bar */}
          <ActionBar form={form} analysis={analysis} navigate={navigate} />

        </div>
      )}
    </div>
  );
}
