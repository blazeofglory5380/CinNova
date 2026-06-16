import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DEMO_PROPERTIES } from '../data/demoProperties';
import { getProperties, getPortfolio, removeFromPortfolio } from '../services/propertyStorage';
import { getSelectedProperty, selectProperty } from '../services/propertyWorkflow';
import './PortfolioDashboard.css';

const fmt = n => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const fmtM = n => '$' + fmt(Math.abs(Math.round(Number(n || 0))));
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const SEASONAL = [0.95, 0.92, 0.98, 1.02, 1.05, 1.08, 1.06, 1.04, 1.03, 1.01, 0.99, 0.97];

const MARKET_STRENGTH = {
  Miami: 86, Austin: 88, Phoenix: 84, Denver: 82, Nashville: 85, Chicago: 76,
  Atlanta: 87, Charlotte: 86, Seattle: 80, Oakland: 74, 'New Orleans': 78,
  'Los Angeles': 72, Dallas: 87, Tampa: 85, Orlando: 84,
};

function scoreColor(s) {
  return s >= 90 ? '#059669' : s >= 80 ? '#2563eb' : s >= 70 ? '#d97706' : '#dc2626';
}

function getMarketName(p) {
  if (p.market) return p.market;
  return (p.city || '').split(',')[0] || 'Unknown';
}

function getStrategy(p) {
  if (p.strategy) return p.strategy;
  if (p.type === 'Land') return 'Development';
  if (p.type === 'Commercial') return 'Income';
  if (p.type === 'Multifamily' || p.type === 'Duplex') return 'Cash Flow';
  if ((p.cashFlow || 0) >= 750 && (p.capRate || 0) >= 6) return 'Cash Flow';
  if ((p.score || 0) >= 86 && (p.capRate || 0) < 5.5) return 'Appreciation';
  return 'Balanced';
}

function riskScoreFor(p) {
  if (!p) return 0;
  const market = MARKET_STRENGTH[getMarketName(p)] ?? 78;
  let risk = 50;
  risk += Math.max(0, 6 - (p.capRate || 0)) * 6;
  risk += (p.cashFlow || 0) < 0 ? 18 : (p.cashFlow || 0) < 300 ? 8 : -8;
  risk += Math.max(0, 78 - (p.score || 0)) * 0.55;
  risk += Math.max(0, 78 - market) * 0.4;
  risk -= Math.max(0, (p.capRate || 0) - 6) * 3;
  risk -= Math.max(0, (p.score || 0) - 84) * 0.4;
  return Math.round(Math.max(12, Math.min(94, risk)));
}

function riskLevelFromScore(score) {
  if (score <= 38) return 'Low Risk';
  if (score <= 62) return 'Moderate Risk';
  return 'High Risk';
}

function riskBadgeClass(level) {
  if (level === 'Low Risk') return 'badge-green';
  if (level === 'Moderate Risk') return 'badge-blue';
  return 'badge-red';
}

function deriveMonthlyData(portfolio) {
  const totalCF = portfolio.reduce((s, p) => s + (p.cashFlow || 0), 0);
  if (totalCF <= 0) return Array(12).fill(0);
  return SEASONAL.map(factor => Math.round(totalCF * factor));
}

function average(portfolio, key) {
  return portfolio.length ? portfolio.reduce((s, p) => s + (Number(p[key]) || 0), 0) / portfolio.length : 0;
}

function allocationRows(portfolio, keyFn) {
  const total = portfolio.reduce((s, p) => s + p.value, 0);
  const grouped = {};
  portfolio.forEach(p => {
    const key = keyFn(p);
    grouped[key] = (grouped[key] || 0) + p.value;
  });
  return Object.entries(grouped)
    .map(([label, value]) => ({ label, value, pct: total > 0 ? value / total * 100 : 0 }))
    .sort((a, b) => b.value - a.value);
}

function projectPortfolio(totalValue, annualCashFlow, avgCapRate, years) {
  const appreciation = Math.max(0.025, Math.min(0.065, 0.018 + (avgCapRate / 100) * 0.55));
  const reinvestment = Math.max(0, annualCashFlow) * 0.35;
  let value = totalValue;
  for (let i = 0; i < years; i += 1) value = value * (1 + appreciation) + reinvestment;
  return Math.round(value);
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
          <div className="pd-cf-bar" style={{ height: `${(v / max) * 100}%`, background: v === peak ? '#c9a84c' : '#2563eb' }} />
          <span>{MONTHS[i]}</span>
        </div>
      ))}
    </div>
  );
}

function PortfolioDonut({ portfolio }) {
  const colors = { 'Single Family': '#2563eb', Condo: '#c9a84c', Townhouse: '#14b8a6', Duplex: '#0d9488', Multifamily: '#10b981', Commercial: '#8b5cf6', Land: '#f59e0b' };
  const total = portfolio.reduce((s, p) => s + p.value, 0);
  if (total === 0) return <p className="pd-muted-empty">Save properties to see allocation.</p>;
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
            <circle key={type} cx={cx} cy={cy} r={r} fill="none" stroke={colors[type] || '#64748b'} strokeWidth="22"
              strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ * 0.25 - offset} transform={`rotate(-90 ${cx} ${cy})`} />
          );
          offset += dash;
          return el;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fill="#64748b">Portfolio</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="12" fill="#0a1628" fontWeight="900">{portfolio.length} Props</text>
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

function BreakdownBars({ rows }) {
  if (!rows.length) return <p className="pd-muted-empty">Save properties to see this allocation.</p>;
  return (
    <div className="pd-breakdown-list">
      {rows.map(row => (
        <div key={row.label} className="pd-breakdown-row">
          <div className="pd-breakdown-top"><span>{row.label}</span><strong>{row.pct.toFixed(0)}%</strong></div>
          <div className="pd-breakdown-track"><div className="pd-breakdown-fill" style={{ width: `${Math.max(4, row.pct)}%` }} /></div>
          <div className="pd-breakdown-value">{fmtM(row.value)}</div>
        </div>
      ))}
    </div>
  );
}

function ProjectionCard({ label, value, gain, years }) {
  return (
    <div className="pd-projection-card">
      <span>{label}</span>
      <strong>{fmtM(value)}</strong>
      <small>{gain >= 0 ? '+' : '-'}{fmtM(gain)} projected gain over {years} yr{years === 1 ? '' : 's'}</small>
    </div>
  );
}

function EmptyPortfolio() {
  return (
    <div className="pd-empty-state">
      <div className="pd-empty-icon">Portfolio</div>
      <h3>Your portfolio is empty</h3>
      <p>Start by saving properties from Property Search. CinNova will build your performance, risk, allocation, and acquisition intelligence here.</p>
      <div className="pd-empty-actions">
        <Link to="/property-search" className="btn btn-primary">Search Properties</Link>
        <Link to="/deal-analyzer" className="btn btn-outline">Run Deal Analysis</Link>
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
    market: p.market || getMarketName(p),
    neighborhood: p.neighborhood || '',
    price: p.value || p.price || 0,
    type: p.type || 'Single Family',
    beds: p.beds || 3,
    baths: p.baths || 2,
    sqft: p.sqft || 1500,
    units: p.units || 1,
    rent: p.rent || 0,
    cashFlow: p.cashFlow || 0,
    roi: typeof p.roi === 'number' ? p.roi : parseFloat(String(p.roi || '0').replace('%', '')),
    capRate: p.capRate || 0,
    score: p.score || 0,
  };
}

export default function PortfolioDashboard() {
  const navigate = useNavigate();
  const selectedProp = getSelectedProperty();
  const [sortBy, setSortBy] = useState('value');
  const [realPortfolio, setRealPortfolio] = useState(() => getPortfolio());
  const recentAnalyses = getProperties().slice(0, 6);

  const goAnalyze = p => { selectProperty(rowToProperty(p)); navigate('/deal-analyzer'); };
  const goCashFlow = p => { selectProperty(rowToProperty(p)); navigate('/cash-flow'); };
  const goMortgage = p => { selectProperty(rowToProperty(p)); navigate('/mortgage-calc'); };
  const goAI = p => { selectProperty(rowToProperty(p)); navigate('/advisor'); };

  const handleRemove = portfolioId => {
    removeFromPortfolio(portfolioId);
    setRealPortfolio(prev => prev.filter(p => p.portfolioId !== portfolioId));
  };

  const portfolio = realPortfolio.map(p => {
    const market = p.market || getMarketName(p);
    const row = {
      id: p.portfolioId || p.id,
      portfolioId: p.portfolioId,
      addr: p.address || 'Unknown Address',
      city: p.city || '',
      market,
      neighborhood: p.neighborhood || '',
      type: p.type || 'Single Family',
      value: p.price || 0,
      equity: p.equity || Math.round((p.price || 0) * 0.20),
      rent: p.rent || 0,
      cashFlow: p.cashFlow || 0,
      roi: typeof p.roi === 'number' ? p.roi : parseFloat(String(p.roi || '0').replace('%', '')),
      capRate: p.capRate || 0,
      score: p.score || 0,
      units: p.units || 1,
      acq: p.addedAt ? new Date(p.addedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '-',
      beds: p.beds,
      baths: p.baths,
      sqft: p.sqft,
    };
    return { ...row, strategy: getStrategy(row), riskScore: riskScoreFor(row) };
  });

  const totalValue = portfolio.reduce((s, p) => s + p.value, 0);
  const totalEquity = portfolio.reduce((s, p) => s + p.equity, 0);
  const totalCF = portfolio.reduce((s, p) => s + p.cashFlow, 0);
  const annualCF = totalCF * 12;
  const totalRent = portfolio.reduce((s, p) => s + p.rent, 0);
  const avgCapRate = average(portfolio, 'capRate');
  const avgROIValue = average(portfolio, 'roi');
  const avgScore = portfolio.length ? Math.round(average(portfolio, 'score')) : 0;
  const monthlyCF = deriveMonthlyData(portfolio);
  const portfolioRiskScore = portfolio.length ? Math.round(average(portfolio, 'riskScore')) : 0;
  const portfolioRiskLevel = portfolio.length ? riskLevelFromScore(portfolioRiskScore) : 'No Risk Data';

  const typeRows = allocationRows(portfolio, p => p.type || 'Unknown');
  const marketRows = allocationRows(portfolio, p => p.market || 'Unknown');
  const riskRows = allocationRows(portfolio, p => riskLevelFromScore(p.riskScore));
  const strategyRows = allocationRows(portfolio, p => p.strategy || 'Balanced');
  const projections = [1, 3, 5, 10].map(years => {
    const value = projectPortfolio(totalValue, annualCF, avgCapRate, years);
    return { years, value, gain: value - totalValue };
  });

  const bestPerformer = portfolio.length ? [...portfolio].sort((a, b) => (b.roi * 2 + b.score / 10 + b.cashFlow / 500) - (a.roi * 2 + a.score / 10 + a.cashFlow / 500))[0] : null;
  const highestCashFlow = portfolio.length ? [...portfolio].sort((a, b) => b.cashFlow - a.cashFlow)[0] : null;
  const highestCapRate = portfolio.length ? [...portfolio].sort((a, b) => b.capRate - a.capRate)[0] : null;
  const highestRisk = portfolio.length ? [...portfolio].sort((a, b) => b.riskScore - a.riskScore)[0] : null;
  const ownedIds = new Set(portfolio.map(p => p.id));
  const recommendedNext = DEMO_PROPERTIES
    .filter(p => !ownedIds.has(p.id))
    .sort((a, b) => {
      const aScore = a.score + a.capRate * 2 + Math.max(0, a.cashFlow) / 250 + (MARKET_STRENGTH[a.market] || 78) / 10;
      const bScore = b.score + b.capRate * 2 + Math.max(0, b.cashFlow) / 250 + (MARKET_STRENGTH[b.market] || 78) / 10;
      return bScore - aScore;
    })[0];

  const sorted = [...portfolio].sort((a, b) => {
    if (sortBy === 'value') return b.value - a.value;
    if (sortBy === 'cashflow') return b.cashFlow - a.cashFlow;
    if (sortBy === 'roi') return b.roi - a.roi;
    if (sortBy === 'score') return b.score - a.score;
    if (sortBy === 'risk') return b.riskScore - a.riskScore;
    return 0;
  });

  const kpis = [
    { label: 'Portfolio Value', val: portfolio.length ? '$' + fmt(totalValue) : '-', note: `${portfolio.length} propert${portfolio.length === 1 ? 'y' : 'ies'}`, color: '#2563eb', spark: portfolio.length ? SEASONAL.map(s => Math.round(totalValue * s * 0.995)) : [] },
    { label: 'Total Equity', val: portfolio.length ? '$' + fmt(totalEquity) : '-', note: '20% equity basis', color: '#c9a84c', spark: portfolio.length ? SEASONAL.map(s => Math.round(totalEquity * s)) : [] },
    { label: 'Monthly Cash Flow', val: portfolio.length ? `${totalCF >= 0 ? '+' : '-'}$${fmt(Math.abs(totalCF))}` : '-', note: 'Across holdings', color: '#059669', spark: monthlyCF.some(v => v > 0) ? monthlyCF : [] },
    { label: 'Annual Cash Flow', val: portfolio.length ? `${annualCF >= 0 ? '+' : '-'}$${fmt(Math.abs(annualCF))}` : '-', note: 'Monthly x 12', color: '#0d9488', spark: [] },
    { label: 'Avg. Cap Rate', val: portfolio.length ? avgCapRate.toFixed(1) + '%' : '-', note: 'Portfolio average', color: '#2563eb', spark: [] },
    { label: 'Avg. ROI', val: portfolio.length ? avgROIValue.toFixed(1) + '%' : '-', note: 'Portfolio average', color: '#8b5cf6', spark: [] },
    { label: 'Avg. AI Score', val: portfolio.length ? `${avgScore}/100` : '-', note: 'Portfolio quality', color: '#f59e0b', spark: [] },
    { label: 'Risk Score', val: portfolio.length ? portfolioRiskLevel : '-', note: portfolio.length ? `${portfolioRiskScore}/100 risk index` : 'No holdings yet', color: portfolioRiskLevel === 'Low Risk' ? '#059669' : portfolioRiskLevel === 'Moderate Risk' ? '#2563eb' : '#dc2626', spark: [] },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Portfolio Dashboard</h1>
        <p className="page-subtitle">Investor command center for portfolio value, cash flow, risk, growth, and next acquisitions.</p>
      </div>

      {selectedProp ? (
        <div className="pd-context-banner pd-context-banner--active">
          <span>Active</span>
          <div>
            <strong>{selectedProp.fullAddress || selectedProp.address}</strong>
            <small>${selectedProp.price?.toLocaleString()} · {selectedProp.type}</small>
          </div>
          <Link to="/deal-analyzer" className="btn btn-primary btn-sm">Run Deal Analysis</Link>
          <Link to="/cash-flow" className="btn btn-outline btn-sm">Cash Flow</Link>
        </div>
      ) : (
        <div className="pd-context-banner">
          <span>Start</span>
          <div>
            <strong>No property selected.</strong>
            <small>Select one from Property Search to analyze it and add it here.</small>
          </div>
          <Link to="/property-search" className="btn btn-outline btn-sm">Search Properties</Link>
        </div>
      )}

      <div className="pd-kpi-grid section">
        {kpis.map(kpi => (
          <div key={kpi.label} className="pd-kpi-card card">
            <div className="pd-kpi-label">{kpi.label}</div>
            <div className="pd-kpi-val" style={{ color: kpi.color }}>{kpi.val}</div>
            {kpi.spark.length > 0 && <SparkLine values={kpi.spark} color={kpi.color}/>}
            <div className="pd-kpi-note">{kpi.note}</div>
          </div>
        ))}
      </div>

      <div className="grid-2 section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Monthly Cash Flow</h2>
            <span className="badge badge-green">Estimated</span>
          </div>
          {portfolio.length > 0 && totalCF > 0 ? <CashFlowChart values={monthlyCF}/> : <p className="pd-muted-empty">Save properties with cash flow data to see this chart.</p>}
        </div>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Portfolio Allocation</h2>
            <span className="badge badge-blue">By Type</span>
          </div>
          <PortfolioDonut portfolio={portfolio}/>
        </div>
      </div>

      <div className="grid-2 section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Portfolio Risk Score</h2>
            <span className={`badge ${riskBadgeClass(portfolioRiskLevel)}`}>{portfolioRiskLevel}</span>
          </div>
          {portfolio.length > 0 ? (
            <div className="pd-risk-panel">
              <div className="pd-risk-score"><strong>{portfolioRiskScore}</strong><span>/100</span></div>
              <div className="pd-risk-copy">
                <p>Risk model uses cap rate, cash flow, AI score, and market strength.</p>
                <div className="pd-risk-scale"><span>Low</span><span>Moderate</span><span>High</span></div>
                <div className="pd-risk-track"><div style={{ width: `${portfolioRiskScore}%` }} /></div>
              </div>
            </div>
          ) : <p className="pd-muted-empty">Save properties to calculate risk.</p>}
        </div>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Growth Projection</h2>
            <span className="badge badge-gold">Appreciation + CF</span>
          </div>
          <div className="pd-projection-grid">
            {projections.map(p => <ProjectionCard key={p.years} label={`${p.years}-Year`} value={p.value} gain={p.gain} years={p.years} />)}
          </div>
        </div>
      </div>

      <div className="grid-2 section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Allocation Intelligence</h2>
            <span className="badge badge-blue">By Value</span>
          </div>
          <div className="pd-allocation-grid">
            <div><h3>Property Type</h3><BreakdownBars rows={typeRows}/></div>
            <div><h3>Market</h3><BreakdownBars rows={marketRows.slice(0, 6)}/></div>
            <div><h3>Risk Level</h3><BreakdownBars rows={riskRows}/></div>
            <div><h3>Strategy</h3><BreakdownBars rows={strategyRows}/></div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Portfolio Insights</h2>
            <span className="badge badge-green">Live</span>
          </div>
          {portfolio.length > 0 ? (
            <div className="pd-insights-list">
              <div><span>Best Performer</span><strong>{bestPerformer?.addr}</strong><small>{bestPerformer?.roi}% ROI · AI {bestPerformer?.score}</small></div>
              <div><span>Highest Cash Flow</span><strong>{highestCashFlow?.addr}</strong><small>{highestCashFlow?.cashFlow >= 0 ? '+' : ''}{fmtM(highestCashFlow?.cashFlow || 0)}/mo</small></div>
              <div><span>Highest Cap Rate</span><strong>{highestCapRate?.addr}</strong><small>{highestCapRate?.capRate}% cap rate</small></div>
              <div><span>Highest Risk</span><strong>{highestRisk?.addr}</strong><small>{riskLevelFromScore(highestRisk?.riskScore || 0)} · {highestRisk?.riskScore}/100</small></div>
              {recommendedNext && (
                <div className="pd-next-acq">
                  <span>Recommended Next Acquisition</span>
                  <strong>{recommendedNext.address}</strong>
                  <small>{recommendedNext.market} · {recommendedNext.type} · {recommendedNext.capRate}% cap · AI {recommendedNext.score}</small>
                  <button className="btn btn-primary btn-sm" onClick={() => { selectProperty(recommendedNext); navigate('/deal-analyzer'); }}>
                    Review Deal
                  </button>
                </div>
              )}
            </div>
          ) : <p className="pd-muted-empty">Save a few properties to generate investor insights.</p>}
        </div>
      </div>

      <div className="section card">
        <div className="card-header">
          <h2 className="card-title">My Properties</h2>
          {portfolio.length > 0 && (
            <div className="pd-table-controls">
              <select className="form-select" style={{ padding: '7px 12px', fontSize: '13px', width: 'auto' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="value">Sort: Value</option>
                <option value="cashflow">Sort: Cash Flow</option>
                <option value="roi">Sort: ROI</option>
                <option value="score">Sort: Score</option>
                <option value="risk">Sort: Risk</option>
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
                  <th>Property</th><th>Type</th><th>Market</th><th>Value</th><th>Equity</th><th>Monthly Rent</th><th>Cash Flow</th><th>Cap</th><th>ROI</th><th>Risk</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(p => (
                  <tr key={p.id}>
                    <td><div className="pd-prop-addr">{p.addr}</div><div className="pd-prop-city">{p.neighborhood || p.city}</div></td>
                    <td><span className="badge badge-gray">{p.type}</span></td>
                    <td>{p.market}</td>
                    <td><strong>{fmtM(p.value)}</strong></td>
                    <td><strong className="text-blue">{fmtM(p.equity)}</strong></td>
                    <td>{p.rent > 0 ? fmtM(p.rent) + '/mo' : '-'}</td>
                    <td><strong className={p.cashFlow >= 0 ? 'text-green' : 'text-red'}>{p.cashFlow >= 0 ? '+' : '-'}{fmtM(p.cashFlow)}/mo</strong></td>
                    <td><strong>{p.capRate ? p.capRate + '%' : '-'}</strong></td>
                    <td><strong>{p.roi > 0 ? p.roi + '%' : '-'}</strong></td>
                    <td><span className={`badge ${riskBadgeClass(riskLevelFromScore(p.riskScore))}`}>{riskLevelFromScore(p.riskScore)}</span></td>
                    <td>
                      <div className="pd-row-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => goAnalyze(p)}>Analyze</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => goCashFlow(p)}>CF</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => goMortgage(p)}>Mortgage</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => goAI(p)}>AI</button>
                        <button className="btn btn-ghost btn-sm pd-remove-btn" onClick={() => handleRemove(p.portfolioId)}>Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {recentAnalyses.length > 0 && (
        <div className="section card">
          <div className="card-header">
            <h2 className="card-title">Recent Analyses</h2>
            <span className="badge badge-blue">{recentAnalyses.length} saved</span>
          </div>
          <div className="pd-table-wrap">
            <table className="pd-table">
              <thead>
                <tr><th>Property</th><th>Deal Score</th><th>Cap Rate</th><th>Cash Flow</th><th>ROI</th><th>Risk</th><th>Analyzed</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {recentAnalyses.map(entry => {
                  const addr = entry.form?.address || entry.analysis?.address || 'Unknown Address';
                  const sc = entry.analysis?.dealScore ?? entry.analysis?.opportunityScore ?? 0;
                  const cap = entry.analysis?.capRate || '-';
                  const cf = entry.analysis?.cashFlow || '-';
                  const roi = entry.analysis?.roi || entry.analysis?.cashOnCash || '-';
                  const risk = entry.analysis?.riskLevel || '-';
                  const date = entry.timestamp ? new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-';
                  const prop = entry.property || { address: addr, price: entry.analysis?.portfolio?.value || 0 };
                  return (
                    <tr key={entry.id}>
                      <td><div className="pd-prop-addr">{addr}</div><div className="pd-prop-city">{entry.form?.type || ''}</div></td>
                      <td><span className="pd-score" style={{ color: scoreColor(sc), borderColor: scoreColor(sc) }}>{sc || '-'}</span></td>
                      <td><strong>{cap}</strong></td>
                      <td><strong className={String(cf).startsWith('+') ? 'text-green' : ''}>{cf}</strong></td>
                      <td><strong>{roi}</strong></td>
                      <td><span className={`badge ${risk === 'Low' ? 'badge-green' : risk === 'Moderate' ? 'badge-blue' : 'badge-gold'}`}>{risk}</span></td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>{date}</td>
                      <td>
                        <div className="pd-row-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => { selectProperty(prop); navigate('/deal-analyzer'); }}>Re-Analyze</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => { selectProperty(prop); navigate('/advisor'); }}>Ask AI</button>
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
