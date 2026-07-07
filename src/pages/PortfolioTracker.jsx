// Portfolio Tracker — /portfolio-tracker    CSS prefix: pt-
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProperties } from '../services/propertyStorage';
import BetaFooter from '../components/BetaFooter';
import './PortfolioTracker.css';

// ── Parsers ────────────────────────────────────────────────────────────────────

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

function parsePrice(raw) {
  if (!raw) return null;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  return isNaN(n) || n === 0 ? null : n;
}

function getScore(a) {
  return a?.dealScore ?? a?.opportunityScore ?? a?.investmentScore ?? null;
}

// ── Formatters ─────────────────────────────────────────────────────────────────

function fmtCF(n) {
  if (n == null) return '—';
  const abs = Math.abs(Math.round(n));
  return (n >= 0 ? '+$' : '-$') + abs.toLocaleString() + '/mo';
}

function fmtValue(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtCR(n) {
  return n != null ? n.toFixed(1) + '%' : '—';
}

function fmtPct(n, dec = 1) {
  return n != null ? n.toFixed(dec) + '%' : '—';
}

function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
}

function fmtTotalCF(n) {
  const abs = Math.abs(Math.round(n));
  return (n >= 0 ? '+$' : '-$') + abs.toLocaleString();
}

// ── Color helpers ──────────────────────────────────────────────────────────────

function scoreColor(s) {
  if (s == null) return '#94a3b8';
  return s >= 70 ? '#059669' : s >= 55 ? '#2563eb' : s >= 40 ? '#d97706' : '#dc2626';
}

function cfColor(n) {
  if (n == null) return '#94a3b8';
  return n >= 0 ? '#059669' : '#dc2626';
}

function crColor(n) {
  if (n == null) return '#94a3b8';
  return n >= 6 ? '#059669' : n >= 4.5 ? '#2563eb' : '#d97706';
}

function riskBadge(level) {
  const l = (level || '').toLowerCase();
  if (l === 'low')      return 'badge-green';
  if (l === 'high')     return 'badge-red';
  if (l === 'elevated') return 'badge-gold';
  return 'badge-blue';
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

// ── Filter definitions ─────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'pos_cf',    label: 'Positive Cash Flow' },
  { key: 'neg_cf',    label: 'Negative Cash Flow' },
  { key: 'strong',    label: 'Strong Buy / Buy' },
  { key: 'high_risk', label: 'High Risk' },
];

function applyFilter(rows, filter) {
  switch (filter) {
    case 'pos_cf':    return rows.filter(r => r.cashFlow != null && r.cashFlow > 0);
    case 'neg_cf':    return rows.filter(r => r.cashFlow != null && r.cashFlow < 0);
    case 'strong':    return rows.filter(r => {
      const l = (r.rec || '').toLowerCase();
      return l === 'strong buy' || l === 'buy';
    });
    case 'high_risk': return rows.filter(r => (r.riskLevel || '').toLowerCase() === 'high');
    default:          return rows;
  }
}

// ── Row builder ────────────────────────────────────────────────────────────────

function buildRows(entries) {
  return entries.map(entry => {
    const a  = entry.analysis || {};
    const f  = entry.form || {};
    const cf = parseCF(a.cashFlow);
    return {
      id:        String(entry.id),
      address:   f.address || a.address || '—',
      city:      [f.city, f.state].filter(Boolean).join(', ') || a.city || '—',
      type:      f.type || '—',
      price:     parsePrice(a.price),
      cashFlow:  cf,
      capRate:   parseNum(a.capRate),
      score:     getScore(a),
      riskLevel: a.riskLevel || null,
      rec:       a.recommendation || a.status || null,
      timestamp: entry.timestamp,
    };
  });
}

// ── Portfolio KPIs ─────────────────────────────────────────────────────────────

function calcKPIs(rows) {
  const withPrice   = rows.filter(r => r.price != null);
  const withCF      = rows.filter(r => r.cashFlow != null);
  const withCR      = rows.filter(r => r.capRate != null);
  const withScore   = rows.filter(r => r.score != null);

  const totalValue  = withPrice.reduce((s, r) => s + r.price, 0);
  const totalCF     = withCF.reduce((s, r) => s + r.cashFlow, 0);
  const avgCR       = withCR.length ? withCR.reduce((s, r) => s + r.capRate, 0) / withCR.length : null;
  const avgScore    = withScore.length ? withScore.reduce((s, r) => s + r.score, 0) / withScore.length : null;

  return { totalValue, totalCF, avgCR, avgScore, hasCF: withCF.length > 0 };
}

// ── AI Portfolio Summary ───────────────────────────────────────────────────────

function buildAISummary(rows) {
  const count      = rows.length;
  const posCount   = rows.filter(r => (r.cashFlow ?? 0) > 0).length;
  const negCount   = rows.filter(r => (r.cashFlow ?? 0) < 0).length;
  const strongCount= rows.filter(r => ['strong buy','buy'].includes((r.rec||'').toLowerCase())).length;
  const highRisk   = rows.filter(r => (r.riskLevel||'').toLowerCase() === 'high');
  const lowRisk    = rows.filter(r => (r.riskLevel||'').toLowerCase() === 'low');
  const withCR     = rows.filter(r => r.capRate != null);
  const avgCR      = withCR.length ? withCR.reduce((s,r) => s+r.capRate, 0)/withCR.length : null;
  const withScore  = rows.filter(r => r.score != null);
  const avgScore   = withScore.length ? withScore.reduce((s,r) => s+r.score, 0)/withScore.length : null;
  const topScore   = withScore.length ? withScore.reduce((a,b) => b.score>a.score?b:a, withScore[0]) : null;
  const totalCF    = rows.filter(r=>r.cashFlow!=null).reduce((s,r)=>s+r.cashFlow,0);

  const strengths = [];
  const weaknesses = [];
  const actions = [];

  // Strengths
  if (posCount >= Math.ceil(count * 0.6)) {
    strengths.push(`${posCount} of ${count} properties are cash-flow positive — strong income foundation.`);
  }
  if (strongCount > 0) {
    strengths.push(`${strongCount} propert${strongCount > 1 ? 'ies carry' : 'y carries'} a Strong Buy or Buy recommendation — high-conviction positions.`);
  }
  if (lowRisk.length > 0) {
    strengths.push(`${lowRisk.length} low-risk propert${lowRisk.length > 1 ? 'ies' : 'y'} anchors portfolio stability.`);
  }
  if (avgCR != null && avgCR >= 5.5) {
    strengths.push(`Average cap rate of ${avgCR.toFixed(1)}% meets or exceeds the 5.5% investor benchmark.`);
  }
  if (totalCF > 0) {
    strengths.push(`Portfolio generates net positive cash flow of ${fmtTotalCF(totalCF)}/mo across all tracked properties.`);
  }
  if (avgScore != null && avgScore >= 70) {
    strengths.push(`Average investment score of ${avgScore.toFixed(0)}/100 indicates a well-underwritten portfolio.`);
  }

  // Weaknesses
  if (negCount > 0) {
    weaknesses.push(`${negCount} propert${negCount > 1 ? 'ies are' : 'y is'} cash-flow negative — carrying costs require reserve capital.`);
  }
  if (highRisk.length > 0) {
    weaknesses.push(`${highRisk.length} high-risk propert${highRisk.length > 1 ? 'ies require' : 'y requires'} immediate risk mitigation review.`);
  }
  if (avgCR != null && avgCR < 4.5) {
    weaknesses.push(`Average cap rate of ${avgCR.toFixed(1)}% is below the 4.5% minimum — portfolio may be over-priced relative to income.`);
  }
  if (avgScore != null && avgScore < 55) {
    weaknesses.push(`Average investment score of ${avgScore.toFixed(0)}/100 is below the Buy threshold — consider pruning or renegotiating.`);
  }
  if (totalCF < 0) {
    weaknesses.push(`Portfolio is net cash-flow negative (${fmtTotalCF(totalCF)}/mo) — expenses outpacing rental income across the group.`);
  }
  if (strengths.length === 0 && weaknesses.length === 0) {
    weaknesses.push('Run the Score Engine on each property to unlock full metrics for this summary.');
  }

  // Actions
  if (topScore && (topScore.rec||'').toLowerCase().includes('buy')) {
    actions.push(`Prioritize ${topScore.address.split(',')[0]} for near-term action — highest score (${topScore.score}/100) in the portfolio.`);
  }
  if (negCount > 0) {
    actions.push(`Review expense structures on cash-flow-negative properties — a 10% rent increase or expense trim can flip the position.`);
  }
  if (highRisk.length > 0) {
    actions.push(`Run the Score Engine at lower hypothetical prices for high-risk properties to find viable exit or renegotiation points.`);
  }
  if (avgCR != null && avgCR < 5) {
    actions.push(`Target your next acquisition above a 5.5% cap rate to raise the portfolio average and improve income quality.`);
  }
  if (count < 3) {
    actions.push(`Diversify: adding properties in different markets reduces concentration risk. Use the Market Heat Map to find the next opportunity.`);
  }
  if (actions.length === 0) {
    actions.push('Maintain discipline — continue applying the Score Engine before any new acquisition to uphold portfolio quality standards.');
  }

  return { strengths, weaknesses, actions };
}

// ── Sortable table header ──────────────────────────────────────────────────────

function TH({ label, sortKey, sort, onSort }) {
  const active = sort.key === sortKey;
  return (
    <th
      className={`pt-th${active ? ' pt-th--active' : ''} ${sortKey ? 'pt-th--sortable' : ''}`}
      onClick={() => sortKey && onSort(sortKey)}
    >
      {label}
      {sortKey && (
        <span className="pt-sort-icon">
          {active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
        </span>
      )}
    </th>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PortfolioTracker() {
  const navigate = useNavigate();
  const entries  = useMemo(() => getProperties(), []);
  const allRows  = useMemo(() => buildRows(entries), [entries]);

  const [filter, setFilter] = useState('all');
  const [sort,   setSort]   = useState({ key: 'score', dir: 'desc' });

  const filtered = useMemo(() => applyFilter(allRows, filter), [allRows, filter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    const { key, dir } = sort;
    copy.sort((a, b) => {
      const av = a[key] ?? (dir === 'asc' ? Infinity : -Infinity);
      const bv = b[key] ?? (dir === 'asc' ? Infinity : -Infinity);
      if (typeof av === 'string') return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === 'asc' ? av - bv : bv - av;
    });
    return copy;
  }, [filtered, sort]);

  const kpis    = useMemo(() => calcKPIs(allRows), [allRows]);
  const summary = useMemo(() => buildAISummary(allRows), [allRows]);

  function toggleSort(key) {
    setSort(prev => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'desc' }
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────────

  if (entries.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <div className="pt-header-badges">
              <span className="badge badge-blue">CinNova</span>
              <span className="badge badge-teal">Portfolio Tracker</span>
            </div>
            <h1 className="page-title">Portfolio Tracker</h1>
            <p className="page-subtitle">Track your analyzed properties, monitor cash flow, and manage portfolio performance.</p>
          </div>
        </div>
        <div className="card pt-empty-card">
          <div className="pt-empty-icon">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
              <rect x="6"  y="10" width="44" height="36" rx="4" stroke="#e2e8f0" strokeWidth="2"/>
              <path d="M6 20H50" stroke="#f1f5f9" strokeWidth="1.5"/>
              <rect x="12" y="27" width="8"  height="14" rx="2" fill="#dbeafe"/>
              <rect x="24" y="23" width="8"  height="18" rx="2" fill="#bfdbfe"/>
              <rect x="36" y="19" width="8"  height="22" rx="2" fill="#93c5fd"/>
              <circle cx="44" cy="14" r="8" fill="#f0fdf4" stroke="#059669" strokeWidth="1.5"/>
              <path d="M41 14l2 2 4-4" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3>No portfolio properties yet.</h3>
          <p>Run the Score Engine on a property and save your analysis. Your saved properties will appear here with a full portfolio overview.</p>
          <div className="pt-empty-btns">
            <button className="btn btn-primary" onClick={() => navigate('/score-engine')}>Open Score Engine</button>
            <button className="btn btn-outline" onClick={() => navigate('/market-heat-map')}>Explore Markets</button>
          </div>
        </div>
        <BetaFooter page="Portfolio Tracker" />
      </div>
    );
  }

  // ── Full layout ──────────────────────────────────────────────────────────────

  return (
    <div className="page">

      {/* Header */}
      <div className="page-header pt-page-header">
        <div>
          <div className="pt-header-badges">
            <span className="badge badge-blue">CinNova</span>
            <span className="badge badge-teal">Portfolio Tracker</span>
            <span className="badge badge-gray">{allRows.length} Propert{allRows.length !== 1 ? 'ies' : 'y'}</span>
          </div>
          <h1 className="page-title">Portfolio Tracker</h1>
          <p className="page-subtitle">Monitor cash flow, cap rates, and investment scores across your full property portfolio.</p>
        </div>
        <div className="pt-header-actions">
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/score-engine')}>+ Add Property</button>
          <button className="btn btn-ghost btn-sm"   disabled title="Coming soon">Compare (soon)</button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="pt-kpi-row">

        <div className="pt-kpi-card">
          <div className="pt-kpi-icon pt-kpi-icon--blue">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/><path d="M6 9h6M9 6v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </div>
          <div className="pt-kpi-body">
            <div className="pt-kpi-val">{allRows.length}</div>
            <div className="pt-kpi-label">Total Properties</div>
          </div>
        </div>

        <div className="pt-kpi-card">
          <div className="pt-kpi-icon pt-kpi-icon--emerald">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M9 5.5V9L11.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M6.5 9H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </div>
          <div className="pt-kpi-body">
            <div className="pt-kpi-val">{kpis.totalValue > 0 ? fmtValue(kpis.totalValue) : '—'}</div>
            <div className="pt-kpi-label">Total Portfolio Value</div>
          </div>
        </div>

        <div className="pt-kpi-card">
          <div className={`pt-kpi-icon ${kpis.totalCF >= 0 ? 'pt-kpi-icon--green' : 'pt-kpi-icon--red'}`}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><polyline points="2,13 5.5,8.5 8.5,10.5 12,6 15.5,7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="pt-kpi-body">
            <div className="pt-kpi-val" style={{ color: cfColor(kpis.hasCF ? kpis.totalCF : null) }}>
              {kpis.hasCF ? fmtTotalCF(kpis.totalCF) : '—'}
            </div>
            <div className="pt-kpi-label">Monthly Cash Flow</div>
          </div>
        </div>

        <div className="pt-kpi-card">
          <div className="pt-kpi-icon pt-kpi-icon--teal">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2L16 9L9 16L2 9L9 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="9" cy="9" r="2.5" fill="currentColor" opacity="0.7"/></svg>
          </div>
          <div className="pt-kpi-body">
            <div className="pt-kpi-val" style={{ color: crColor(kpis.avgCR) }}>{fmtPct(kpis.avgCR)}</div>
            <div className="pt-kpi-label">Avg. Cap Rate</div>
          </div>
        </div>

        <div className="pt-kpi-card">
          <div className="pt-kpi-icon pt-kpi-icon--gold">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1.5L10.9 6.8H16.5L11.8 10L13.7 15.5L9 12.3L4.3 15.5L6.2 10L1.5 6.8H7.1L9 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
          </div>
          <div className="pt-kpi-body">
            <div className="pt-kpi-val" style={{ color: scoreColor(kpis.avgScore) }}>
              {kpis.avgScore != null ? kpis.avgScore.toFixed(0) : '—'}
            </div>
            <div className="pt-kpi-label">Avg. Investment Score</div>
          </div>
        </div>

      </div>

      {/* ── AI Portfolio Summary ── */}
      <div className="card pt-summary-card">
        <div className="card-header">
          <h2 className="card-title">AI Portfolio Summary</h2>
          <span className="badge badge-blue">Intelligence Analysis</span>
        </div>
        <div className="pt-summary-body">

          <div className="pt-summary-col">
            <div className="pt-summary-section-title pt-summary-section-title--green">
              <span>✓</span> Strengths
            </div>
            {summary.strengths.length > 0
              ? <ul className="pt-summary-list pt-summary-list--green">
                  {summary.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              : <p className="pt-summary-none">No clear strengths identified yet — add more scored properties.</p>
            }
          </div>

          <div className="pt-summary-col">
            <div className="pt-summary-section-title pt-summary-section-title--red">
              <span>⚠</span> Weaknesses
            </div>
            {summary.weaknesses.length > 0
              ? <ul className="pt-summary-list pt-summary-list--red">
                  {summary.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              : <p className="pt-summary-none">No material weaknesses detected.</p>
            }
          </div>

          <div className="pt-summary-col">
            <div className="pt-summary-section-title pt-summary-section-title--blue">
              <span>→</span> Suggested Actions
            </div>
            <ol className="pt-summary-steps">
              {summary.actions.map((a, i) => (
                <li key={i}>
                  <span className="pt-step-num">{i + 1}</span>
                  <span>{a}</span>
                </li>
              ))}
            </ol>
          </div>

        </div>
      </div>

      {/* ── Filters + table ── */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Property Table</h2>
          <span className="badge badge-gray">{filtered.length} shown</span>
        </div>

        {/* Filter pills */}
        <div className="pt-filter-row">
          {FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              className={`pt-filter-btn${filter === f.key ? ' pt-filter-btn--active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              {f.key !== 'all' && (
                <span className="pt-filter-count">
                  {applyFilter(allRows, f.key).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        {sorted.length === 0 ? (
          <div className="pt-no-results">
            No properties match this filter.
          </div>
        ) : (
          <div className="pt-table-wrap">
            <table className="pt-table">
              <thead>
                <tr>
                  <TH label="Address"        sortKey="address"   sort={sort} onSort={toggleSort} />
                  <TH label="City / State"   sortKey="city"      sort={sort} onSort={toggleSort} />
                  <TH label="Type"           sortKey="type"      sort={sort} onSort={toggleSort} />
                  <TH label="Est. Value"     sortKey="price"     sort={sort} onSort={toggleSort} />
                  <TH label="Cash Flow / mo" sortKey="cashFlow"  sort={sort} onSort={toggleSort} />
                  <TH label="Cap Rate"       sortKey="capRate"   sort={sort} onSort={toggleSort} />
                  <TH label="Score"          sortKey="score"     sort={sort} onSort={toggleSort} />
                  <TH label="Risk Level"     sortKey="riskLevel" sort={sort} onSort={null} />
                  <TH label="Recommendation" sortKey="rec"       sort={sort} onSort={null} />
                  <TH label="Date Added"     sortKey="timestamp" sort={sort} onSort={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {sorted.map(row => (
                  <tr key={row.id} className="pt-row">
                    <td className="pt-td pt-td--addr">{row.address}</td>
                    <td className="pt-td pt-td--city">{row.city}</td>
                    <td className="pt-td">{row.type}</td>
                    <td className="pt-td pt-td--num">{fmtValue(row.price)}</td>
                    <td className="pt-td pt-td--num">
                      <span style={{ fontWeight: 700, color: cfColor(row.cashFlow) }}>
                        {fmtCF(row.cashFlow)}
                      </span>
                    </td>
                    <td className="pt-td pt-td--num">
                      <span style={{ fontWeight: 700, color: crColor(row.capRate) }}>
                        {fmtCR(row.capRate)}
                      </span>
                    </td>
                    <td className="pt-td pt-td--num">
                      {row.score != null
                        ? <span className="pt-score-chip" style={{ color: scoreColor(row.score), borderColor: scoreColor(row.score) + '50', background: scoreColor(row.score) + '10' }}>
                            {row.score}
                          </span>
                        : <span className="pt-na">—</span>}
                    </td>
                    <td className="pt-td">
                      {row.riskLevel
                        ? <span className={`badge ${riskBadge(row.riskLevel)}`}>{row.riskLevel}</span>
                        : <span className="pt-na">—</span>}
                    </td>
                    <td className="pt-td">
                      {row.rec
                        ? <span className={`badge ${recBadge(row.rec)}`}>{row.rec}</span>
                        : <span className="pt-na">—</span>}
                    </td>
                    <td className="pt-td pt-td--date">{fmtDate(row.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="pt-footer-actions">
        <button className="btn btn-primary btn-sm"  onClick={() => navigate('/score-engine')}>
          + Analyze Property
        </button>
        <button className="btn btn-outline btn-sm"  disabled title="Coming soon">
          Generate Report (soon)
        </button>
        <button className="btn btn-ghost btn-sm"    disabled title="Coming soon">
          Compare Properties (soon)
        </button>
        <button className="btn btn-ghost btn-sm"    onClick={() => navigate('/deal-pipeline')}>
          Deal Pipeline
        </button>
      </div>

      <BetaFooter page="Portfolio Tracker" />

    </div>
  );
}
