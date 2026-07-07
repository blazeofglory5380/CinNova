// Deal Pipeline — Kanban Board  /deal-pipeline    CSS prefix: dp-
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProperties } from '../services/propertyStorage';
import BetaFooter from '../components/BetaFooter';
import './DealPipeline.css';

// ── Column definitions ─────────────────────────────────────────────────────────

const COLUMNS = [
  { id: 'new_lead',       label: 'New Lead',       color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
  { id: 'under_review',   label: 'Under Review',   color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'offer_ready',    label: 'Offer Ready',    color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { id: 'in_negotiation', label: 'In Negotiation', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { id: 'closed',         label: 'Closed',         color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
  { id: 'rejected',       label: 'Rejected',       color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
];

const COL_MAP = Object.fromEntries(COLUMNS.map(c => [c.id, c]));
const COL_IDS = COLUMNS.map(c => c.id);

const PIPELINE_KEY = 'cinnova_deal_pipeline';

// ── Helpers ────────────────────────────────────────────────────────────────────

function loadStages() {
  try {
    const raw = localStorage.getItem(PIPELINE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    // Only keep entries that match known column IDs
    const raw_stages = saved?.stages || {};
    const clean = {};
    for (const [k, v] of Object.entries(raw_stages)) {
      if (COL_IDS.includes(v)) clean[k] = v;
    }
    return clean;
  } catch { return {}; }
}

function saveStages(stages) {
  try {
    localStorage.setItem(PIPELINE_KEY, JSON.stringify({ stages, updatedAt: new Date().toISOString() }));
  } catch {}
}

function parseCF(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number') return raw;
  const s = String(raw);
  const neg = s.trimStart().startsWith('-') || s.includes('(');
  const n   = parseFloat(s.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : (neg ? -n : n);
}

function parseNum(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number') return raw;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : n;
}

function getScore(a) {
  return a?.dealScore ?? a?.opportunityScore ?? a?.investmentScore ?? null;
}

function scoreColor(s) {
  if (s == null) return '#94a3b8';
  return s >= 70 ? '#059669' : s >= 55 ? '#2563eb' : s >= 40 ? '#d97706' : '#dc2626';
}

function cfColor(n) {
  if (n == null) return '#94a3b8';
  return n >= 0 ? '#059669' : '#dc2626';
}

function fmtCF(n) {
  if (n == null) return '—';
  const abs = Math.abs(Math.round(n));
  return (n >= 0 ? '+$' : '-$') + abs.toLocaleString() + '/mo';
}

function fmtCR(n) {
  return n != null ? n.toFixed(1) + '%' : '—';
}

function recBadge(label) {
  const l = (label || '').toLowerCase();
  if (l === 'strong buy') return 'badge-green';
  if (l === 'buy')        return 'badge-blue';
  if (l === 'review')     return 'badge-teal';
  if (l === 'high risk')  return 'badge-gold';
  if (l === 'avoid')      return 'badge-red';
  return 'badge-gray';
}

function riskColor(level) {
  const l = (level || '').toLowerCase();
  return l === 'low' ? '#059669' : l === 'high' ? '#dc2626' : '#64748b';
}

function fmtDate(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  catch { return ''; }
}

// ── Deal builder (only cinnova_properties) ─────────────────────────────────────

function buildDeals() {
  return getProperties().map(entry => {
    const a  = entry.analysis || {};
    const f  = entry.form || {};
    const cf = parseCF(a.cashFlow);
    return {
      id:          String(entry.id),
      address:     f.address || a.address || '—',
      city:        [f.city, f.state].filter(Boolean).join(', ') || a.city || '—',
      score:       getScore(a),
      rec:         a.recommendation || a.status || null,
      cashFlow:    cf,
      capRate:     parseNum(a.capRate),
      riskLevel:   a.riskLevel || null,
      timestamp:   entry.timestamp,
    };
  });
}

// ── AI pipeline summary ────────────────────────────────────────────────────────

function buildSummary(deals, stages) {
  if (!deals.length) return null;
  const stageOf   = d => stages[d.id] || 'new_lead';
  const active    = deals.filter(d => !['closed', 'rejected'].includes(stageOf(d)));
  const closed    = deals.filter(d => stageOf(d) === 'closed').length;
  const rejected  = deals.filter(d => stageOf(d) === 'rejected').length;
  const withScore = active.filter(d => d.score != null);
  const best      = withScore.length
    ? withScore.reduce((b, d) => d.score > b.score ? d : b, withScore[0])
    : null;
  const advanced  = active.find(d => ['in_negotiation', 'offer_ready'].includes(stageOf(d)));
  const newLeads  = active.filter(d => stageOf(d) === 'new_lead').length;

  const parts = [];
  parts.push(`${deals.length} deal${deals.length !== 1 ? 's' : ''} in your pipeline — ${active.length} active${closed ? `, ${closed} closed` : ''}${rejected ? `, ${rejected} rejected` : ''}.`);
  if (best) {
    parts.push(`Strongest deal: ${best.address} (score ${best.score}/100, ${best.rec || 'no recommendation'}).`);
  }
  if (advanced) {
    const col = COL_MAP[stageOf(advanced)];
    parts.push(`${advanced.address} is at ${col?.label} stage — keep momentum going.`);
  }
  if (newLeads > 1) {
    parts.push(`${newLeads} leads in New Lead — run the Score Engine to prioritize which to advance.`);
  }
  return parts.join(' ');
}

// ── Column helpers ─────────────────────────────────────────────────────────────

function prevColId(colId) {
  const idx = COL_IDS.indexOf(colId);
  return idx > 0 ? COL_IDS[idx - 1] : null;
}

function nextColId(colId) {
  const idx = COL_IDS.indexOf(colId);
  return idx >= 0 && idx < COL_IDS.length - 1 ? COL_IDS[idx + 1] : null;
}

// ── Deal Card ──────────────────────────────────────────────────────────────────

function DealCard({ deal, colId, onMove, onReport, onCompare }) {
  const col   = COL_MAP[colId];
  const prev  = prevColId(colId);
  const next  = nextColId(colId);
  const isDim = colId === 'closed' || colId === 'rejected';

  return (
    <div className={`dp-card${isDim ? ' dp-card--dim' : ''}`}
      style={{ '--col-color': col.color, '--col-border': col.border }}>

      {/* Color accent bar */}
      <div className="dp-card-bar" style={{ background: col.color }} />

      {/* Address + city */}
      <div className="dp-card-addr">{deal.address}</div>
      <div className="dp-card-city">{deal.city}</div>

      {/* Score + recommendation */}
      <div className="dp-card-score-row">
        <span className="dp-score-ring"
          style={{ color: scoreColor(deal.score), borderColor: scoreColor(deal.score) + '60', background: scoreColor(deal.score) + '10' }}>
          {deal.score ?? '—'}
        </span>
        {deal.rec
          ? <span className={`badge ${recBadge(deal.rec)} dp-rec-badge`}>{deal.rec}</span>
          : <span className="dp-na">No score</span>}
      </div>

      {/* 3 metrics */}
      <div className="dp-card-metrics">
        <div className="dp-metric">
          <span>Cash Flow</span>
          <strong style={{ color: cfColor(deal.cashFlow) }}>{fmtCF(deal.cashFlow)}</strong>
        </div>
        <div className="dp-metric">
          <span>Cap Rate</span>
          <strong>{fmtCR(deal.capRate)}</strong>
        </div>
        <div className="dp-metric">
          <span>Risk</span>
          <strong style={{ color: riskColor(deal.riskLevel) }}>{deal.riskLevel || '—'}</strong>
        </div>
      </div>

      {/* Date */}
      {deal.timestamp && (
        <div className="dp-card-date">Analyzed {fmtDate(deal.timestamp)}</div>
      )}

      {/* Quick actions */}
      <div className="dp-card-actions">
        <button className="dp-action-btn" onClick={onReport} disabled={!onReport} title={onReport ? 'View Report' : 'Coming soon'}>
          <svg width="13" height="13" viewBox="0 0 18 18" fill="none"><path d="M4.5 2.5H10.7L13.5 5.4V15.5H4.5V2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M10.7 2.5V5.4H13.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M6.5 8.5H11.5M6.5 11H9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          {onReport ? 'View Report' : 'Report · Soon'}
        </button>
        <button className="dp-action-btn" onClick={onCompare} disabled={!onCompare} title={onCompare ? 'Compare' : 'Coming soon'}>
          <svg width="13" height="13" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="5.5" height="12" rx="1.3" stroke="currentColor" strokeWidth="1.5"/><rect x="10.5" y="3" width="5.5" height="12" rx="1.3" stroke="currentColor" strokeWidth="1.5"/><path d="M7.5 9H10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="1.5 1"/></svg>
          {onCompare ? 'Compare' : 'Compare · Soon'}
        </button>
      </div>

      {/* Move controls */}
      <div className="dp-card-move">
        <button
          className="dp-move-btn"
          disabled={!prev}
          onClick={() => prev && onMove(deal.id, prev)}
          title={prev ? `Move to ${COL_MAP[prev]?.label}` : 'Already in first column'}
        >
          ‹ {prev ? COL_MAP[prev]?.label : '—'}
        </button>
        <button
          className="dp-move-btn dp-move-btn--fwd"
          disabled={!next}
          onClick={() => next && onMove(deal.id, next)}
          title={next ? `Move to ${COL_MAP[next]?.label}` : 'Already in last column'}
        >
          {next ? COL_MAP[next]?.label : '—'} ›
        </button>
      </div>
    </div>
  );
}

// ── Column component ───────────────────────────────────────────────────────────

function KanbanColumn({ col, deals, stages, onMove, navigate }) {
  const colDeals = deals.filter(d => (stages[d.id] || 'new_lead') === col.id);

  return (
    <div className="dp-column">
      <div className="dp-column-header" style={{ borderTopColor: col.color }}>
        <div className="dp-col-title" style={{ color: col.color }}>{col.label}</div>
        <span className="dp-col-count"
          style={{ background: col.color + '18', color: col.color, border: `1px solid ${col.color}30` }}>
          {colDeals.length}
        </span>
      </div>
      <div className="dp-column-body">
        {colDeals.length === 0 ? (
          <div className="dp-col-empty">
            <span>No deals here</span>
            {col.id === 'new_lead' && (
              <button className="dp-col-empty-btn" onClick={() => navigate('/score-engine')}>
                + Score Engine
              </button>
            )}
          </div>
        ) : (
          colDeals.map(deal => (
            <DealCard
              key={deal.id}
              deal={deal}
              colId={col.id}
              onMove={onMove}
              onReport={undefined}
              onCompare={undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DealPipeline() {
  const navigate = useNavigate();
  const deals    = useMemo(() => buildDeals(), []);

  const [stages, setStages] = useState(() => loadStages());

  const summary = useMemo(() => buildSummary(deals, stages), [deals, stages]);

  // Column deal counts for header stats
  const colCounts = useMemo(() => {
    const c = {};
    COLUMNS.forEach(col => { c[col.id] = 0; });
    deals.forEach(d => { const s = stages[d.id] || 'new_lead'; c[s] = (c[s] || 0) + 1; });
    return c;
  }, [deals, stages]);

  const activeCount = deals.filter(d => {
    const s = stages[d.id] || 'new_lead';
    return s !== 'closed' && s !== 'rejected';
  }).length;

  function moveStage(dealId, colId) {
    setStages(prev => {
      const updated = { ...prev, [dealId]: colId };
      saveStages(updated);
      return updated;
    });
  }

  // ── Empty state ──────────────────────────────────────────────────────────────

  if (deals.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <div className="dp-header-badges">
              <span className="badge badge-blue">CinNova</span>
              <span className="badge badge-teal">Deal Pipeline</span>
            </div>
            <h1 className="page-title">Deal Pipeline</h1>
            <p className="page-subtitle">Track your saved analyses through every stage from lead to close.</p>
          </div>
        </div>
        <div className="card dp-empty-card">
          <div className="dp-empty-icon">
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <rect x="4"  y="8"  width="12" height="36" rx="3" stroke="#cbd5e1" strokeWidth="2"/>
              <rect x="20" y="16" width="12" height="28" rx="3" stroke="#cbd5e1" strokeWidth="2"/>
              <rect x="36" y="22" width="12" height="22" rx="3" stroke="#cbd5e1" strokeWidth="2" opacity="0.6"/>
              <path d="M2 48H50" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h3>No saved deals yet.</h3>
          <p>Run the Score Engine on a property and save the results. Your saved analyses will appear here so you can track them through every stage of the deal lifecycle.</p>
          <div className="dp-empty-btns">
            <button className="btn btn-primary" onClick={() => navigate('/score-engine')}>Open Score Engine</button>
            <button className="btn btn-outline" onClick={() => navigate('/main-dashboard')}>Dashboard</button>
          </div>
        </div>
        <BetaFooter page="Deal Pipeline" />
      </div>
    );
  }

  // ── Full kanban layout ───────────────────────────────────────────────────────

  return (
    <div className="page">

      {/* Header */}
      <div className="page-header dp-page-header">
        <div>
          <div className="dp-header-badges">
            <span className="badge badge-blue">CinNova</span>
            <span className="badge badge-teal">Deal Pipeline</span>
          </div>
          <h1 className="page-title">Deal Pipeline</h1>
          <p className="page-subtitle">
            Track every saved analysis from first look to closed deal. Move cards between columns as deals progress.
          </p>
        </div>
        <div className="dp-header-stats">
          <div className="dp-stat"><strong>{deals.length}</strong><span>Total</span></div>
          <div className="dp-stat"><strong>{activeCount}</strong><span>Active</span></div>
          <div className="dp-stat"><strong>{colCounts.offer_ready || 0}</strong><span>Offer Ready</span></div>
          <div className="dp-stat"><strong>{colCounts.in_negotiation || 0}</strong><span>Negotiating</span></div>
          <div className="dp-stat dp-stat--green"><strong>{colCounts.closed || 0}</strong><span>Closed</span></div>
        </div>
      </div>

      {/* AI Summary */}
      {summary && (
        <div className="card dp-summary-card">
          <div className="card-header">
            <h2 className="card-title">AI Pipeline Summary</h2>
            <span className="badge badge-blue">Intelligence Analysis</span>
          </div>
          <p className="dp-summary-text">{summary}</p>
          <div className="dp-summary-chips">
            <span className="dp-chip dp-chip--blue">📋 {activeCount} active</span>
            {(colCounts.offer_ready || 0) > 0 && (
              <span className="dp-chip dp-chip--gold">⚡ {colCounts.offer_ready} offer ready</span>
            )}
            {(colCounts.in_negotiation || 0) > 0 && (
              <span className="dp-chip dp-chip--purple">🤝 {colCounts.in_negotiation} negotiating</span>
            )}
            {(colCounts.closed || 0) > 0 && (
              <span className="dp-chip dp-chip--green">✓ {colCounts.closed} closed</span>
            )}
            {(colCounts.rejected || 0) > 0 && (
              <span className="dp-chip dp-chip--gray">{colCounts.rejected} rejected</span>
            )}
          </div>
        </div>
      )}

      {/* Kanban board */}
      <div className="dp-board-wrap">
        <div className="dp-board">
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.id}
              col={col}
              deals={deals}
              stages={stages}
              onMove={moveStage}
              navigate={navigate}
            />
          ))}
        </div>
      </div>

      {/* Score Engine CTA */}
      <div className="dp-board-footer">
        <span>Add more deals:</span>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/score-engine')}>
          Open Score Engine
        </button>
        <button className="btn btn-ghost btn-sm" disabled title="Coming soon">
          Report Generator (soon)
        </button>
        <button className="btn btn-ghost btn-sm" disabled title="Coming soon">
          Compare Properties (soon)
        </button>
      </div>

      <BetaFooter page="Deal Pipeline" />

    </div>
  );
}
