import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getProperties, getPortfolio, removeFromPortfolio } from '../services/propertyStorage';
import { getSelectedProperty, selectProperty } from '../services/propertyWorkflow';
import './PortfolioDashboard.css';

const fmt  = n => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
const fmtM = n => '$' + fmt(Math.abs(Math.round(n)));

const PORTFOLIO = [
  { id:1, addr:'2140 Brickell Ave',   city:'Miami, FL',      type:'Condo',         value:847000,  equity:312000, rent:2800, cashFlow:1240, roi:8.4,  score:91, status:'Rented',   acq:'Jan 2022', appPct:12.4 },
  { id:2, addr:'918 Congress Ave',    city:'Austin, TX',     type:'Single Family', value:395000,  equity:98000,  rent:2100, cashFlow:980,  roi:9.2,  score:88, status:'Rented',   acq:'Mar 2021', appPct:18.6 },
  { id:3, addr:'3400 Camelback Rd',   city:'Phoenix, AZ',    type:'Single Family', value:520000,  equity:175000, rent:2600, cashFlow:1050, roi:8.7,  score:89, status:'Rented',   acq:'Sep 2020', appPct:22.1 },
  { id:4, addr:'1122 Commerce St',    city:'Dallas, TX',     type:'Condo',         value:340000,  equity:88000,  rent:2000, cashFlow:720,  roi:6.8,  score:84, status:'Rented',   acq:'Jun 2023', appPct:6.2  },
  { id:5, addr:'940 Belmont Ave',     city:'Nashville, TN',  type:'Single Family', value:465000,  equity:140000, rent:2400, cashFlow:840,  roi:7.9,  score:87, status:'Vacant',   acq:'Dec 2022', appPct:9.8  },
  { id:6, addr:'5880 Delmar Blvd',    city:'St. Louis, MO',  type:'Single Family', value:198000,  equity:64000,  rent:1400, cashFlow:920,  roi:11.4, score:79, status:'Rented',   acq:'Apr 2019', appPct:28.4 },
  { id:7, addr:'220 Peachtree St NE', city:'Atlanta, GA',    type:'Condo',         value:285000,  equity:71000,  rent:1800, cashFlow:1180, roi:10.1, score:82, status:'Rented',   acq:'Aug 2021', appPct:14.3 },
];

const MONTHLY_CF = [4200, 4680, 3920, 5100, 4820, 4950, 5280, 4810, 5640, 5820, 6010, 4820];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const totalValue    = PORTFOLIO.reduce((s, p) => s + p.value, 0);
const totalEquity   = PORTFOLIO.reduce((s, p) => s + p.equity, 0);
const totalCF       = PORTFOLIO.reduce((s, p) => s + p.cashFlow, 0);
const totalRent     = PORTFOLIO.reduce((s, p) => s + p.rent, 0);
const avgROI        = (PORTFOLIO.reduce((s, p) => s + p.roi, 0) / PORTFOLIO.length).toFixed(1);
const avgScore      = Math.round(PORTFOLIO.reduce((s, p) => s + p.score, 0) / PORTFOLIO.length);
const occupied      = PORTFOLIO.filter(p => p.status === 'Rented').length;

function scoreColor(s) {
  return s >= 90 ? '#059669' : s >= 80 ? '#2563eb' : s >= 70 ? '#d97706' : '#dc2626';
}

function SparkLine({ values, color }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const w = 80; const h = 30;
  const pts = values.map((v, i) => `${(i/(values.length-1))*w},${h-(v-min)/(max-min)*h}`).join(' ');
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${color.replace('#','')})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CashFlowChart() {
  const max = Math.max(...MONTHLY_CF);
  return (
    <div className="pd-cf-chart">
      {MONTHLY_CF.map((v, i) => (
        <div key={i} className="pd-cf-bar-wrap">
          <div className="pd-cf-bar" style={{ height: `${(v/max)*100}%`, background: v === Math.max(...MONTHLY_CF) ? '#c9a84c' : '#2563eb' }}/>
          <span>{MONTHS[i]}</span>
        </div>
      ))}
    </div>
  );
}

function PortfolioDonut() {
  const types = {};
  PORTFOLIO.forEach(p => { types[p.type] = (types[p.type] || 0) + p.value; });
  const colors = { 'Single Family':'#2563eb', 'Condo':'#c9a84c', 'Multifamily':'#10b981' };
  const total = totalValue;
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
              strokeDasharray={`${dash} ${circ-dash}`}
              strokeDashoffset={circ * 0.25 - offset}
              transform={`rotate(-90 ${cx} ${cy})`}/>
          );
          offset += dash;
          return el;
        })}
        <text x={cx} y={cy-4} textAnchor="middle" fontSize="11" fill="#64748b">Portfolio</text>
        <text x={cx} y={cy+12} textAnchor="middle" fontSize="12" fill="#0a1628" fontWeight="900">{PORTFOLIO.length} Props</text>
      </svg>
      <div className="pd-donut-legend">
        {Object.entries(types).map(([type, val]) => (
          <div key={type} className="pd-donut-item">
            <span style={{ background: colors[type] || '#64748b' }}/>
            <div>
              <div className="pd-donut-type">{type}</div>
              <div className="pd-donut-val">{fmtM(val)} · {((val/total)*100).toFixed(0)}%</div>
            </div>
          </div>
        ))}
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
  const [sortBy, setSortBy]             = useState('value');
  const [view, setView]                 = useState('all');
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

  const savedPortfolio = realPortfolio.map(p => ({
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
    status: 'Saved',
    acq: p.addedAt
      ? new Date(p.addedAt).toLocaleDateString('en-US', { month:'short', year:'numeric' })
      : 'Saved',
    appPct: 0,
    isReal: true,
    beds: p.beds,
    baths: p.baths,
    sqft: p.sqft,
  }));

  const portfolioRows = [...savedPortfolio, ...PORTFOLIO];
  const portfolioValue = portfolioRows.reduce((s, p) => s + p.value, 0);
  const portfolioEquity = portfolioRows.reduce((s, p) => s + p.equity, 0);
  const portfolioCF = portfolioRows.reduce((s, p) => s + p.cashFlow, 0);
  const portfolioRent = portfolioRows.reduce((s, p) => s + p.rent, 0);
  const portfolioROI = (portfolioRows.reduce((s, p) => s + p.roi, 0) / Math.max(1, portfolioRows.length)).toFixed(1);
  const portfolioScore = Math.round(portfolioRows.reduce((s, p) => s + p.score, 0) / Math.max(1, portfolioRows.length));
  const portfolioOccupied = portfolioRows.filter(p => p.status === 'Rented').length;

  const sorted = [...portfolioRows]
    .filter(p => view === 'all' || p.status.toLowerCase() === view)
    .sort((a, b) => {
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
        <div style={{ display:'flex', alignItems:'center', gap:'16px', padding:'14px 20px', background:'#f0fdf4', borderLeft:'4px solid #059669', borderRadius:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
          <span style={{ fontSize:'18px' }}>📍</span>
          <div style={{ flex:1, minWidth:'200px' }}>
            <strong style={{ color:'#065f46' }}>Analyzing: {selectedProp.fullAddress || selectedProp.address}</strong>
            <span style={{ color:'#047857', marginLeft:'12px' }}>${selectedProp.price.toLocaleString()} · {selectedProp.type}</span>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <Link to="/deal-analyzer" style={{ padding:'6px 14px', background:'#059669', color:'#fff', borderRadius:'6px', fontWeight:600, fontSize:'13px', textDecoration:'none' }}>Run Deal Analysis</Link>
            <Link to="/cash-flow" style={{ padding:'6px 14px', background:'#0d6efd', color:'#fff', borderRadius:'6px', fontWeight:600, fontSize:'13px', textDecoration:'none' }}>Cash Flow</Link>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 20px', background:'#fffbeb', borderLeft:'4px solid #c9a84c', borderRadius:'8px', marginBottom:'16px' }}>
          <span style={{ fontSize:'18px' }}>🏠</span>
          <span style={{ color:'#78350f' }}>
            <strong>No property selected.</strong> Select one from Property Search to analyze it and add it here.{' '}
            <Link to="/property-search" style={{ color:'#2563eb', fontWeight:600 }}>Search properties →</Link>
          </span>
        </div>
      )}

      {/* Top KPI cards */}
      <div className="pd-kpi-grid section">
        {[
          { label:'Portfolio Value',    val: '$'+fmt(portfolioValue),  note: savedPortfolio.length > 0 ? `${savedPortfolio.length} saved + demo` : 'Demo portfolio', color:'#2563eb', spark: [1.1,1.08,1.14,1.12,1.18,1.16,1.2,1.19,1.22,1.24,1.21,1.26].map(x=>x*portfolioValue/1.4) },
          { label:'Total Equity',       val: '$'+fmt(portfolioEquity), note:'Estimated equity', color:'#c9a84c', spark: [0.9,0.92,0.94,0.96,0.98,1,1.02,1.04,1.06,1.08,1.09,1.1].map(x=>x*portfolioEquity/1.1) },
          { label:'Monthly Cash Flow',  val: '+$'+fmt(portfolioCF),   note:'Current saved model', color:'#059669', spark: MONTHLY_CF },
          { label:'Avg. ROI',           val: portfolioROI+'%',            note:'Across visible portfolio', color:'#8b5cf6', spark: [7.2,7.4,7.6,7.9,8.0,8.1,8.3,8.4,8.5,8.6,8.7,8.8].map(x=>x*10) },
          { label:'Occupied Units',     val: `${portfolioOccupied}/${portfolioRows.length}`, note:'Saved items pending status', color:'#14b8a6', spark: [] },
          { label:'Avg. AI Score',      val: `${portfolioScore}/100`,    note:'Portfolio quality', color:'#f59e0b', spark: [] },
          { label:'Gross Rent Roll',    val: '$'+fmt(portfolioRent)+'/mo', note: '$'+fmt(portfolioRent*12)+'/yr', color:'#2563eb', spark: [] },
          { label:'Saved Properties',   val: String(savedPortfolio.length), note:'From workflow saves',  color:'#64748b', spark: [] },
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
            <span className="badge badge-green">2025</span>
          </div>
          <CashFlowChart />
        </div>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Portfolio Allocation</h2>
            <span className="badge badge-blue">By Value</span>
          </div>
          <PortfolioDonut />
        </div>
      </div>

      {/* Properties table */}
      <div className="section card">
        <div className="card-header">
          <h2 className="card-title">Properties</h2>
          <div className="pd-table-controls">
            <div className="pd-view-tabs">
              {[['all','All'],['rented','Rented'],['vacant','Vacant']].map(([v,l]) => (
                <button key={v} className={`pd-view-tab${view===v?' active':''}`}
                  onClick={() => setView(v)}>{l}</button>
              ))}
            </div>
            <select className="form-select" style={{ padding:'7px 12px', fontSize:'13px', width:'auto' }}
              value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="value">Sort: Value</option>
              <option value="cashflow">Sort: Cash Flow</option>
              <option value="roi">Sort: ROI</option>
              <option value="score">Sort: Score</option>
            </select>
          </div>
        </div>
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
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="pd-prop-addr">{p.addr}</div>
                    <div className="pd-prop-city">{p.city} · Since {p.acq}</div>
                  </td>
                  <td><span className="badge badge-gray">{p.type}</span></td>
                  <td><strong>{fmtM(p.value)}</strong><div className="pd-app">↑ {p.appPct}%</div></td>
                  <td><strong className="text-blue">{fmtM(p.equity)}</strong></td>
                  <td>{fmtM(p.rent)}/mo</td>
                  <td><strong className={p.cashFlow>=0?'text-green':'text-red'}>+{fmtM(p.cashFlow)}/mo</strong></td>
                  <td><strong>{p.roi}%</strong></td>
                  <td>
                    <span className="pd-score" style={{ color: scoreColor(p.score), borderColor: scoreColor(p.score) }}>
                      {p.score}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${p.status==='Rented'?'badge-green':'badge-gold'}`}>{p.status}</span>
                  </td>
                  <td>
                    <div className="pd-row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => goAnalyze(p)} title="Deal Analyzer">Analyze</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => goCashFlow(p)} title="Cash Flow">CF</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => goMortgage(p)} title="Mortgage">Mortgage</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => goAI(p)} title="Ask AI">AI</button>
                      {p.isReal && (
                        <button className="btn btn-ghost btn-sm pd-remove-btn" onClick={() => handleRemove(p.portfolioId)} title="Remove from portfolio">✕</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                  const addr  = entry.form?.address || entry.analysis?.address || 'Unknown Address';
                  const sc    = entry.analysis?.dealScore ?? entry.analysis?.opportunityScore ?? 0;
                  const cap   = entry.analysis?.capRate   || '—';
                  const cf    = entry.analysis?.cashFlow  || '—';
                  const roi   = entry.analysis?.roi       || entry.analysis?.cashOnCash || '—';
                  const risk  = entry.analysis?.riskLevel || '—';
                  const date  = entry.timestamp
                    ? new Date(entry.timestamp).toLocaleDateString('en-US',{month:'short',day:'numeric'})
                    : '—';
                  const prop  = entry.property || { address: addr, price: entry.analysis?.portfolio?.value || 0 };
                  return (
                    <tr key={entry.id}>
                      <td>
                        <div className="pd-prop-addr">{addr}</div>
                        <div className="pd-prop-city">{entry.form?.type || ''}</div>
                      </td>
                      <td>
                        <span className="pd-score" style={{ color: scoreColor(sc), borderColor: scoreColor(sc) }}>{sc || '—'}</span>
                      </td>
                      <td><strong>{cap}</strong></td>
                      <td><strong className={String(cf).startsWith('+') ? 'text-green' : ''}>{cf}</strong></td>
                      <td><strong>{roi}</strong></td>
                      <td>
                        <span className={`badge ${risk==='Low'?'badge-green':risk==='Moderate'?'badge-blue':'badge-gold'}`}>{risk}</span>
                      </td>
                      <td style={{ fontSize:'12px', color:'#64748b' }}>{date}</td>
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
