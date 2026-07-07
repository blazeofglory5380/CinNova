import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProperties } from '../services/propertyStorage';
import BetaFooter from '../components/BetaFooter';
import './ReportsLibrary.css';

/* ── Filters ───────────────────────────────────────────────────────────── */
const FILTERS = [
  { id: 'all',        label: 'All' },
  { id: 'strong_buy', label: 'Strong Buy' },
  { id: 'watchlist',  label: 'Watchlist' },
  { id: 'high_cf',    label: 'High Cash Flow' },
  { id: 'high_risk',  label: 'High Risk' },
];

/* ── Helpers ───────────────────────────────────────────────────────────── */
function num(v) {
  if (v == null) return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? null : n;
}
function getScore(a) {
  return a?.dealScore ?? a?.opportunityScore ?? a?.investmentScore ?? null;
}
function scoreColor(s) {
  if (s == null) return '#94a3b8';
  return s >= 70 ? '#059669' : s >= 55 ? '#2563eb' : s >= 40 ? '#d97706' : '#dc2626';
}
function fmtCF(cf) {
  if (cf == null) return '—';
  return `${cf >= 0 ? '+' : '−'}$${Math.abs(Math.round(cf)).toLocaleString()}/mo`;
}
function fmtPct(v) { return v == null ? '—' : `${v.toFixed(1)}%`; }
function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return '—'; }
}

function buildRows(entries) {
  return entries.map(e => {
    const a = e.analysis || {};
    const f = e.form || {};
    const score    = getScore(a);
    const cashFlow = num(a.cashFlow);
    const capRate  = num(a.capRate);
    const price    = num(a.price);
    // ROI: use stored value when present, else an estimated cash-on-cash (25% down)
    const roi = a.roi != null
      ? num(a.roi)
      : (price && cashFlow != null ? (cashFlow * 12) / (price * 0.25) * 100 : null);
    return {
      id:        String(e.id),
      address:   f.address || a.address || 'Saved Property',
      city:      [f.city || a.city, f.state].filter(Boolean).join(', ') || '—',
      score, cashFlow, capRate, roi,
      rec:       a.recommendation || a.status || null,
      riskLevel: a.riskLevel || null,
      date:      e.timestamp || null,
    };
  });
}

function recBucket(r) {
  const rec = (r.rec || '').toLowerCase();
  if (rec.includes('strong')) return 'strong_buy';
  if (rec.includes('avoid') || rec.includes('exit') || rec.includes('pass') || rec.includes('high risk')) return 'high_risk';
  if (rec.includes('hold') || rec.includes('watch') || rec.includes('monitor') || rec.includes('moderate') || rec.includes('caution')) return 'watchlist';
  if (rec.includes('buy')) return 'strong_buy';
  return null;
}
function isHighRisk(r) {
  return (r.score != null && r.score < 50) || (r.riskLevel || '').toLowerCase().includes('high') || recBucket(r) === 'high_risk';
}
function isWatch(r) {
  return recBucket(r) === 'watchlist' || (r.score != null && r.score >= 50 && r.score < 70);
}
function matchesFilter(r, id) {
  if (id === 'all')        return true;
  if (id === 'strong_buy') return recBucket(r) === 'strong_buy' || (r.score != null && r.score >= 75);
  if (id === 'watchlist')  return isWatch(r);
  if (id === 'high_cf')    return r.cashFlow != null && r.cashFlow >= 500;
  if (id === 'high_risk')  return isHighRisk(r);
  return true;
}

/* ── Component ─────────────────────────────────────────────────────────── */
export default function ReportsLibrary() {
  const navigate = useNavigate();
  const rows = useMemo(() => buildRows(getProperties()), []);
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => rows.filter(r => matchesFilter(r, filter)), [rows, filter]);
  const counts = useMemo(() => {
    const c = { all: rows.length };
    FILTERS.slice(1).forEach(f => { c[f.id] = rows.filter(r => matchesFilter(r, f.id)).length; });
    return c;
  }, [rows]);

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="rl-header-badges">
            <span className="badge badge-blue">CinNova</span>
            <span className="badge badge-teal">Document Center</span>
          </div>
          <h1 className="page-title">Reports Library</h1>
          <p className="page-subtitle">
            Every scored property, collected as an investor report you can open, re-score, or discuss with the AI Advisor.
          </p>
        </div>
        <div className="rl-header-actions">
          <div className="rl-header-stat">
            <strong>{rows.length}</strong>
            <span>{rows.length === 1 ? 'Report' : 'Reports'}</span>
          </div>
          <button className="btn btn-outline" type="button" onClick={() => navigate('/main-dashboard')}>
            Dashboard
          </button>
          <button className="btn btn-primary" type="button" onClick={() => navigate('/property-report-generator')}>
            + Generate Report
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        /* Empty state */
        <div className="card">
          <div className="rl-empty">
            <div className="rl-empty-icon">
              <svg width="46" height="46" viewBox="0 0 46 46" fill="none">
                <rect x="8" y="4" width="30" height="38" rx="4" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M15 15H31M15 21H31M15 27H23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
                <circle cx="34" cy="34" r="7" fill="white" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M31 34H37M34 31V37" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3>No saved reports yet</h3>
            <p>Run the Score Engine on a property and save the analysis — it will appear here as an investor report you can open, re-score, and share.</p>
            <div className="rl-empty-actions">
              <button className="btn btn-primary" type="button" onClick={() => navigate('/score-engine')}>Open Score Engine</button>
              <button className="btn btn-ghost"   type="button" onClick={() => navigate('/main-dashboard')}>Back to Dashboard</button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Filter bar */}
          <div className="rl-filter-bar section">
            {FILTERS.map(f => (
              <button
                key={f.id}
                type="button"
                className={`rl-filter-pill${filter === f.id ? ' rl-filter-pill--active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
                {(counts[f.id] || 0) > 0 && (
                  <span className={`rl-filter-count${filter === f.id ? ' rl-filter-count--active' : ''}`}>
                    {counts[f.id]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="card">
              <div className="rl-empty" style={{ padding: '40px 24px' }}>
                <p style={{ color: 'var(--gray-500)', fontSize: '14px' }}>No reports match this filter.</p>
              </div>
            </div>
          ) : (
            <div className="rl-reports-grid section">
              {filtered.map(r => {
                const col = scoreColor(r.score);
                return (
                  <div key={r.id} className="rl-report-card">
                    {/* Top row */}
                    <div className="rl-card-top">
                      <div className="rl-score-circle" style={{ color: col, borderColor: col }}>
                        {r.score != null ? r.score : '—'}
                      </div>
                      <div className="rl-card-meta">
                        <div className="rl-card-address">{r.address}</div>
                        <div className="rl-card-date">{r.city} · Saved {fmtDate(r.date)}</div>
                      </div>
                      {r.rec && (
                        <span className="rl-rec-badge" style={{ color: col, borderColor: col, background: `${col}18` }}>
                          {r.rec}
                        </span>
                      )}
                    </div>

                    {/* Metrics */}
                    <div className="rl-card-metrics">
                      <div className="rl-metric">
                        <span className="rl-metric-label">Cash Flow</span>
                        <strong className="rl-metric-val" style={{ color: (r.cashFlow ?? 0) >= 0 ? '#059669' : '#dc2626' }}>{fmtCF(r.cashFlow)}</strong>
                      </div>
                      <div className="rl-metric">
                        <span className="rl-metric-label">Cap Rate</span>
                        <strong className="rl-metric-val">{fmtPct(r.capRate)}</strong>
                      </div>
                      <div className="rl-metric">
                        <span className="rl-metric-label">Est. ROI</span>
                        <strong className="rl-metric-val">{fmtPct(r.roi)}</strong>
                      </div>
                    </div>

                    {/* Score bar */}
                    {r.score != null && (
                      <div className="rl-score-bar">
                        <div className="rl-score-fill" style={{ width: `${Math.max(0, Math.min(100, r.score))}%`, background: col }} />
                      </div>
                    )}

                    {/* Actions — route only to live pages; unfinished export is disabled/Soon */}
                    <div className="rl-card-actions">
                      <button className="btn btn-primary btn-sm" type="button" onClick={() => navigate('/property-report-generator')}>View Report</button>
                      <button className="btn btn-ghost btn-sm"   type="button" onClick={() => navigate('/score-engine')}>Re-score</button>
                      <button className="btn btn-ghost btn-sm"   type="button" onClick={() => navigate('/ai-advisor-chat')}>Ask AI</button>
                      <button className="btn btn-ghost btn-sm rl-soon-btn" type="button" disabled title="Coming soon">Export PDF · Soon</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <BetaFooter page="Reports Library" />
    </div>
  );
}
