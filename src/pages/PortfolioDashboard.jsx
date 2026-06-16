import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getProperties, getPortfolio, removeFromPortfolio } from '../services/propertyStorage';
import { getSelectedProperty, selectProperty } from '../services/propertyWorkflow';
import './PortfolioDashboard.css';

const fmt  = n => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
const fmtM = n => '$' + fmt(Math.abs(Math.round(n)));

const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const SEASONAL = [0.95, 0.92, 0.98, 1.02, 1.05, 1.08, 1.06, 1.04, 1.03, 1.01, 0.99, 0.97];

function scoreColor(s) {
  return s >= 90 ? '#059669' : s >= 80 ? '#2563eb' : s >= 70 ? '#d97706' : '#dc2626';
}

function deriveMonthlyData(portfolio) {
  const totalCF = portfolio.reduce((s, p) => s + (p.cashFlow || 0), 0);
  if (totalCF <= 0) return Array(12).fill(0);
  return SEASONAL.map(factor => Math.round(totalCF * factor));
}

function SparkLine({ values, color }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  if (max === min) return null;
  const w = 80; const h = 30;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / (max - min)) * h}`).join(' ');
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${color.replace('#', '')})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CashFlowChart({ values }) {
  const max = Math.max(...values, 1);
  const peak = Math.max(...values);
  return (
    <div className="pd-cf-chart">
      {values.map((v, i) => (
        <div key={i} className="pd-cf-bar-wrap">
          <div
            className="pd-cf-bar"
            style={{ height: `${(v / max) * 100}%`, background: v === peak ? '#c9a84c' : '#2563eb' }}
          />
          <span>{MONTHS[i]}</span>
        </div>
      ))}
    </div>
  );
}

function PortfolioDonut({ portfolio }) {
  const colors = { 'Single Family': '#2563eb', Condo: '#c9a84c', Multifamily: '#10b981', Commercial: '#8b5cf6', Land: '#f59e0b' };
  const total  = portfolio.reduce((s, p) => s + p.value, 0);
  if (total === 0) {
    return (
      <p style={{ color: '#64748b', padding: '40px 0', textAlign: 'center', fontSize: '14px' }}>
        Save properties to see allocation.
      </p>
    );
  }
  const types = {};
  portfolio.forEach(p => { types[p.type] = (types[p.type] || 0) + p.value; });
  const r = 60; const cx = 80; const cy = 80; const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="pd-donut-wrap">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="22"/>
        {Object.entries(types).map(([type, val]) => {
          const frac = val / total;
          const dash = frac * circ;
          const el = (
            <circle key={type} cx={cx} cy={cy} r={r}
              fill="none" stroke={colors[type] || '#64748b'} strokeWidth="22"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={circ * 0.25 - offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += dash;
          return el;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fill="#64748b">Portfolio</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="12" fill="#0a1628" fontWeight="900">
          {portfolio.length} Props
        </text>
      </svg>
      <div className="pd-donut-legend">
        {Object.entries(types).map(([type, val]) => (
          <div key={type} className="pd-donut-item">
            <span style={{ background: colors[type] || '#64748b' }}/>
            <div>
              <div className="pd-donut-type">{type}</div>
              <div className="pd-donut-val">{fmtM(val)} · {((val / total) * 100).toFixed(0)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyPortfolio() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #e2e8f0' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏘️</div>
      <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0a1628', marginBottom: '8px' }}>
        Your portfolio is empty
      </h3>
      <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '400px', margin: '0 auto 24px' }}>
        Analyze properties in Deal Analyzer and save them to your portfolio — they'll appear here with full tracking.
      </p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/property-search"
          style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', borderRadius: '8px', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>
          Search Properties
        </Link>
        <Link to="/deal-analyzer"
          style={{ padding: '10px 20px', background: '#fff', color: '#2563eb', border: '1.5px solid #2563eb', borderRadius: '8px', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>
          Run Deal Analysis
        </Link>
      </div>
    </div>
  );
}

function rowToProperty(p) {
  return {
    id: p.id || p.portfolioId,
    address: p.addr || p.address || '',
    fullAddress: p.addr ? `${p.addr}, ${p.city || ''}` : (p.address || ''),
    city: p.city || '',
    price: p.value || p.price || 0,
    type: p.type || 'Single Family',
    beds: p.beds || 3,
    baths: p.baths || 2,
    sqft: p.sqft || 1500,
    rent: p.rent || 0,
    cashFlow: p.cashFlow || 0,
    roi: typeof p.roi === 'number' ? p.roi : parseFloat(String(p.roi || '0').replace('%', '')),
    capRate: p.capRate || 0,
    score: p.score || 0,
  };
}

export default function PortfolioDashboard() {
  const navigate     = useNavigate();
  const selectedProp = getSelectedProperty();
  const [sortBy, setSortBy]           = useState('value');
  const [realPortfolio, setRealPortfolio] = useState(() => getPortfolio());
  const recentAnalyses = getProperties().slice(0, 6);

  const goAnalyze  = p => { selectProperty(rowToProperty(p)); navigate('/deal-analyzer'); };
  const goCashFlow = p => { selectProperty(rowToProperty(p)); navigate('/cash-flow'); };
  const goMortgage = p => { selectProperty(rowToProperty(p)); navigate('/mortgage-calc'); };
  const goAI       = p => { selectProperty(rowToProperty(p)); navigate('/advisor'); };

  const handleRemove = portfolioId => {
    removeFromPortfolio(portfolioId);
    setRealPortfolio(prev => prev.filter(p => p.portfolioId !== portfolioId));
  };

  const portfolio = realPortfolio.map(p => ({
    id: p.portfolioId || p.id,
    portfolioId: p.portfolioId,
    addr: p.address || 'Unknown Address',
    city: p.city || '',
    type: p.type || 'Single Family',
    value: p.price || 0,
    equity: p.equity || Math.round((p.price || 0) * 0.20),
    rent: p.rent || 0,
    cashFlow: p.cashFlow || 0,
    roi: typeof p.roi === 'number' ? p.roi : parseFloat(String(p.roi || '0').replace('%', '')),
    capRate: p.capRate || 0,
    score: p.score || 0,
    acq: p.addedAt
      ? new Date(p.addedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : '—',
    beds: p.beds,
    baths: p.baths,
    sqft: p.sqft,
  }));

  const totalValue  = portfolio.reduce((s, p) => s + p.value, 0);
  const totalEquity = portfolio.reduce((s, p) => s + p.equity, 0);
  const totalCF     = portfolio.reduce((s, p) => s + p.cashFlow, 0);
  const totalRent   = portfolio.reduce((s, p) => s + p.rent, 0);
  const avgROI      = portfolio.length
    ? (portfolio.reduce((s, p) => s + p.roi, 0) / portfolio.length).toFixed(1)
    : '—';
  const avgScore = portfolio.length
    ? Math.round(portfolio.reduce((s, p) => s + p.score, 0) / portfolio.length)
    : 0;
  const monthlyCF = deriveMonthlyData(portfolio);

  const sorted = [...portfolio].sort((a, b) => {
    if (sortBy === 'value')    return b.value - a.value;
    if (sortBy === 'cashflow') return b.cashFlow - a.cashFlow;
    if (sortBy === 'roi')      return b.roi - a.roi;
    if (sortBy === 'score')    return b.score - a.score;
    return 0;
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Portfolio Dashboard</h1>
        <p className="page-subtitle">Complete overview of your real estate investment portfolio — value, equity, cash flow, and performance.</p>
      </div>

      {selectedProp ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', background: '#f0fdf4', borderLeft: '4px solid #059669', borderRadius: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '18px' }}>📍</span>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <strong style={{ color: '#065f46' }}>Analyzing: {selectedProp.fullAddress || selectedProp.address}</strong>
            <span style={{ color: '#047857', marginLeft: '12px' }}>${selectedProp.price?.toLocaleString()} · {selectedProp.type}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/deal-analyzer" style={{ padding: '6px 14px', background: '#059669', color: '#fff', borderRadius: '6px', fontWeight: 600, fontSize: '13px', textDecoration: 'none' }}>
              Run Deal Analysis
            </Link>
            <Link to="/cash-flow" style={{ padding: '6px 14px', background: '#0d6efd', color: '#fff', borderRadius: '6px', fontWeight: 600, fontSize: '13px', textDecoration: 'none' }}>
              Cash Flow
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', background: '#fffbeb', borderLeft: '4px solid #c9a84c', borderRadius: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '18px' }}>🏠</span>
          <span style={{ color: '#78350f' }}>
            <strong>No property selected.</strong> Select one from Property Search to analyze it and add it here.{' '}
            <Link to="/property-search" style={{ color: '#2563eb', fontWeight: 600 }}>Search properties →</Link>
          </span>
        </div>
      )}

      {/* KPI cards */}
      <div className="pd-kpi-grid section">
        {[
          {
            label: 'Portfolio Value',
            val:   portfolio.length ? '$' + fmt(totalValue) : '—',
            note:  `${portfolio.length} propert${portfolio.length === 1 ? 'y' : 'ies'}`,
            color: '#2563eb',
            spark: portfolio.length ? SEASONAL.map(s => Math.round(totalValue * s * 0.995)) : [],
          },
          {
            label: 'Total Equity',
            val:   portfolio.length ? '$' + fmt(totalEquity) : '—',
            note:  '20% down payment basis',
            color: '#c9a84c',
            spark: portfolio.length ? SEASONAL.map(s => Math.round(totalEquity * s)) : [],
          },
          {
            label: 'Monthly Cash Flow',
            val:   portfolio.length ? '+$' + fmt(totalCF) : '—',
            note:  'Sum of saved analyses',
            color: '#059669',
            spark: monthlyCF.some(v => v > 0) ? monthlyCF : [],
          },
          {
            label: 'Avg. ROI',
            val:   avgROI === '—' ? '—' : avgROI + '%',
            note:  'Across saved portfolio',
            color: '#8b5cf6',
            spark: [],
          },
          {
            label: 'Properties',
            val:   String(portfolio.length),
            note:  'In your portfolio',
            color: '#14b8a6',
            spark: [],
          },
          {
            label: 'Avg. AI Score',
            val:   portfolio.length ? `${avgScore}/100` : '—',
            note:  'Portfolio quality',
            color: '#f59e0b',
            spark: [],
          },
          {
            label: 'Gross Rent Roll',
            val:   portfolio.length ? '$' + fmt(totalRent) + '/mo' : '—',
            note:  portfolio.length ? '$' + fmt(totalRent * 12) + '/yr' : 'No rent data yet',
            color: '#2563eb',
            spark: [],
          },
          {
            label: 'Recent Analyses',
            val:   String(recentAnalyses.length),
            note:  'In analysis history',
            color: '#64748b',
            spark: [],
          },
        ].map(kpi => (
          <div key={kpi.label} className="pd-kpi-card card">
            <div className="pd-kpi-label">{kpi.label}</div>
            <div className="pd-kpi-val" style={{ color: kpi.color }}>{kpi.val}</div>
            {kpi.spark.length > 0 && <SparkLine values={kpi.spark} color={kpi.color}/>}
            <div className="pd-kpi-note">{kpi.note}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid-2 section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Monthly Cash Flow</h2>
            <span className="badge badge-green">Estimated</span>
          </div>
          {portfolio.length > 0 && totalCF > 0 ? (
            <CashFlowChart values={monthlyCF}/>
          ) : (
            <p style={{ color: '#64748b', padding: '40px 0', textAlign: 'center', fontSize: '14px' }}>
              Save properties with cash flow data to see this chart.
            </p>
          )}
        </div>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Portfolio Allocation</h2>
            <span className="badge badge-blue">By Value</span>
          </div>
          <PortfolioDonut portfolio={portfolio}/>
        </div>
      </div>

      {/* Properties table */}
      <div className="section card">
        <div className="card-header">
          <h2 className="card-title">My Properties</h2>
          {portfolio.length > 0 && (
            <div className="pd-table-controls">
              <select
                className="form-select"
                style={{ padding: '7px 12px', fontSize: '13px', width: 'auto' }}
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="value">Sort: Value</option>
                <option value="cashflow">Sort: Cash Flow</option>
                <option value="roi">Sort: ROI</option>
                <option value="score">Sort: Score</option>
              </select>
            </div>
          )}
        </div>

        {portfolio.length === 0 ? (
          <EmptyPortfolio/>
        ) : (
          <div className="pd-table-wrap">
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Equity</th>
                  <th>Monthly Rent</th>
                  <th>Cash Flow</th>
                  <th>ROI</th>
                  <th>Score</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="pd-prop-addr">{p.addr}</div>
                      <div className="pd-prop-city">{p.city}</div>
                    </td>
                    <td><span className="badge badge-gray">{p.type}</span></td>
                    <td><strong>{fmtM(p.value)}</strong></td>
                    <td><strong className="text-blue">{fmtM(p.equity)}</strong></td>
                    <td>{p.rent > 0 ? fmtM(p.rent) + '/mo' : '—'}</td>
                    <td>
                      <strong className={p.cashFlow >= 0 ? 'text-green' : 'text-red'}>
                        {p.cashFlow >= 0 ? '+' : ''}{fmtM(p.cashFlow)}/mo
                      </strong>
                    </td>
                    <td><strong>{p.roi > 0 ? p.roi + '%' : '—'}</strong></td>
                    <td>
                      <span className="pd-score" style={{ color: scoreColor(p.score), borderColor: scoreColor(p.score) }}>
                        {p.score || '—'}
                      </span>
                    </td>
                    <td><div className="pd-prop-city">{p.acq}</div></td>
                    <td>
                      <div className="pd-row-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => goAnalyze(p)}  title="Deal Analyzer">Analyze</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => goCashFlow(p)} title="Cash Flow">CF</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => goMortgage(p)} title="Mortgage">Mortgage</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => goAI(p)}       title="Ask AI">AI</button>
                        <button className="btn btn-ghost btn-sm pd-remove-btn" onClick={() => handleRemove(p.portfolioId)} title="Remove">✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Analyses */}
      {recentAnalyses.length > 0 && (
        <div className="section card">
          <div className="card-header">
            <h2 className="card-title">Recent Analyses</h2>
            <span className="badge badge-blue">{recentAnalyses.length} saved</span>
          </div>
          <div className="pd-table-wrap">
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Deal Score</th>
                  <th>Cap Rate</th>
                  <th>Cash Flow</th>
                  <th>ROI</th>
                  <th>Risk</th>
                  <th>Analyzed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentAnalyses.map(entry => {
                  const addr = entry.form?.address || entry.analysis?.address || 'Unknown Address';
                  const sc   = entry.analysis?.dealScore ?? entry.analysis?.opportunityScore ?? 0;
                  const cap  = entry.analysis?.capRate   || '—';
                  const cf   = entry.analysis?.cashFlow  || '—';
                  const roi  = entry.analysis?.roi       || entry.analysis?.cashOnCash || '—';
                  const risk = entry.analysis?.riskLevel || '—';
                  const date = entry.timestamp
                    ? new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '—';
                  const prop = entry.property || { address: addr, price: entry.analysis?.portfolio?.value || 0 };
                  return (
                    <tr key={entry.id}>
                      <td>
                        <div className="pd-prop-addr">{addr}</div>
                        <div className="pd-prop-city">{entry.form?.type || ''}</div>
                      </td>
                      <td>
                        <span className="pd-score" style={{ color: scoreColor(sc), borderColor: scoreColor(sc) }}>
                          {sc || '—'}
                        </span>
                      </td>
                      <td><strong>{cap}</strong></td>
                      <td>
                        <strong className={String(cf).startsWith('+') ? 'text-green' : ''}>{cf}</strong>
                      </td>
                      <td><strong>{roi}</strong></td>
                      <td>
                        <span className={`badge ${risk === 'Low' ? 'badge-green' : risk === 'Moderate' ? 'badge-blue' : 'badge-gold'}`}>
                          {risk}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>{date}</td>
                      <td>
                        <div className="pd-row-actions">
                          <button className="btn btn-ghost btn-sm"
                            onClick={() => { selectProperty(prop); navigate('/deal-analyzer'); }}>
                            Re-Analyze
                          </button>
                          <button className="btn btn-ghost btn-sm"
                            onClick={() => { selectProperty(prop); navigate('/advisor'); }}>
                            Ask AI
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
