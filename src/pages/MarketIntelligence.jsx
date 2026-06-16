import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MARKET_DATA } from '../data/marketData';
import './MarketIntelligence.css';

const fmtMoney = value => value >= 1000000
  ? `$${(value / 1000000).toFixed(1)}M`
  : `$${Math.round(value / 1000)}K`;

const fmtRent = value => `$${value.toLocaleString()}`;
const fmtPct = value => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

function toneForScore(score) {
  if (score >= 85) return 'green';
  if (score >= 75) return 'blue';
  if (score >= 65) return 'gold';
  return 'red';
}

function KpiCard({ label, value, sub, tone = 'blue' }) {
  return (
    <div className={`mi-kpi mi-kpi--${tone}`}>
      <span className="mi-kpi-label">{label}</span>
      <strong>{value}</strong>
      <span className="mi-kpi-sub">{sub}</span>
    </div>
  );
}

function ScoreRing({ score, label }) {
  const degrees = (score / 100) * 360;
  const tone = toneForScore(score);
  return (
    <div className={`mi-score-card mi-score-card--${tone}`}>
      <div
        className="mi-score-ring"
        style={{ background: `conic-gradient(var(--mi-score-color) ${degrees}deg, var(--gray-100) 0deg)` }}
      >
        <div className="mi-score-inner">
          <span>{score}</span>
          <small>/100</small>
        </div>
      </div>
      <div className="mi-score-copy">
        <span className="badge badge-blue">{label}</span>
        <h2>{score >= 85 ? 'High Opportunity' : score >= 75 ? 'Selective Opportunity' : 'Watchlist Market'}</h2>
        <p>
          CinNova combines rent momentum, affordability, inventory pressure, investor demand, and downside risk into one market score.
        </p>
      </div>
    </div>
  );
}

function TrendChart({ market }) {
  const width = 520;
  const height = 240;
  const pad = 34;
  const prices = market.trend.map(point => point.price);
  const rents = market.trend.map(point => point.rent);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minRent = Math.min(...rents);
  const maxRent = Math.max(...rents);

  const pricePath = market.trend.map((point, index) => {
    const x = pad + (index / (market.trend.length - 1)) * (width - pad * 2);
    const y = height - pad - ((point.price - minPrice) / Math.max(1, maxPrice - minPrice)) * (height - pad * 2);
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  const rentPath = market.trend.map((point, index) => {
    const x = pad + (index / (market.trend.length - 1)) * (width - pad * 2);
    const y = height - pad - ((point.rent - minRent) / Math.max(1, maxRent - minRent)) * (height - pad * 2);
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div className="mi-chart-wrap">
      <svg className="mi-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${market.name} rent versus price trend`}>
        {[0, 1, 2, 3].map(row => {
          const y = pad + row * ((height - pad * 2) / 3);
          return <line key={row} x1={pad} y1={y} x2={width - pad} y2={y} className="mi-chart-grid" />;
        })}
        <path d={pricePath} className="mi-chart-line mi-chart-line--price" />
        <path d={rentPath} className="mi-chart-line mi-chart-line--rent" />
        {market.trend.map((point, index) => {
          const x = pad + (index / (market.trend.length - 1)) * (width - pad * 2);
          return (
            <g key={point.label}>
              <text x={x} y={height - 9} textAnchor="middle" className="mi-chart-label">{point.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="mi-chart-legend">
        <span><i className="mi-dot mi-dot--price" />Median price</span>
        <span><i className="mi-dot mi-dot--rent" />Average rent</span>
      </div>
    </div>
  );
}

function RiskBreakdown({ risks }) {
  return (
    <div className="mi-risk-list">
      {risks.map(risk => (
        <div key={risk.label} className="mi-risk-row">
          <div className="mi-risk-meta">
            <span>{risk.label}</span>
            <strong>{risk.value}/100</strong>
          </div>
          <div className="mi-risk-track">
            <div className={`mi-risk-fill mi-risk-fill--${risk.tone}`} style={{ width: `${risk.value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function NeighborhoodTable({ neighborhoods }) {
  return (
    <div className="mi-table-wrap">
      <table className="mi-table">
        <thead>
          <tr>
            <th>Neighborhood</th>
            <th>Score</th>
            <th>Median Price</th>
            <th>Rent Yield</th>
            <th>Signal</th>
          </tr>
        </thead>
        <tbody>
          {neighborhoods.map(row => (
            <tr key={row.name}>
              <td>{row.name}</td>
              <td><span className={`mi-score-pill mi-score-pill--${toneForScore(row.score)}`}>{row.score}</span></td>
              <td>{fmtMoney(row.medianPrice)}</td>
              <td>{row.rentYield.toFixed(1)}%</td>
              <td>{row.signal}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MarketIntelligence() {
  const navigate = useNavigate();
  const [marketId, setMarketId] = useState(MARKET_DATA[0].id);
  const market = MARKET_DATA.find(item => item.id === marketId) || MARKET_DATA[0];

  const kpis = useMemo(() => ([
    { label: 'Median Home Price', value: fmtMoney(market.medianHomePrice), sub: `${fmtPct(market.yoyPriceGrowth)} YoY`, tone: market.yoyPriceGrowth >= 4 ? 'green' : 'blue' },
    { label: 'Average Rent', value: `${fmtRent(market.averageRent)}/mo`, sub: `${fmtPct(market.rentGrowth)} rent growth`, tone: market.rentGrowth >= 5 ? 'green' : 'teal' },
    { label: 'Inventory Level', value: market.inventoryLevel, sub: `${market.inventoryMonths.toFixed(1)} months of supply`, tone: market.inventoryLevel === 'Tight' ? 'gold' : market.inventoryLevel === 'Loose' ? 'red' : 'blue' },
    { label: 'Days on Market', value: `${market.daysOnMarket} days`, sub: market.daysOnMarket <= 35 ? 'Fast absorption' : 'More buyer leverage', tone: market.daysOnMarket <= 35 ? 'green' : 'blue' },
    { label: 'Vacancy Rate', value: `${market.vacancyRate.toFixed(1)}%`, sub: 'Rental availability', tone: market.vacancyRate <= 6 ? 'green' : 'gold' },
    { label: 'Investor Demand', value: `${market.investorDemand}/100`, sub: 'Buyer activity index', tone: toneForScore(market.investorDemand) },
    { label: 'Affordability', value: `${market.affordabilityScore}/100`, sub: 'Relative entry strength', tone: toneForScore(market.affordabilityScore) },
    { label: 'Foreclosure Risk', value: `${market.foreclosureRisk}/100`, sub: 'Distress pressure', tone: market.foreclosureRisk >= 45 ? 'gold' : 'green' },
  ]), [market]);

  const handleAnalyzeMarket = () => {
    navigate(`/property-search?market=${encodeURIComponent(market.name)}`);
  };

  return (
    <div className="page">
      <div className="mi-header">
        <div>
          <h1 className="page-title">Market Intelligence</h1>
          <p className="page-subtitle">
            Compare rent trends, pricing pressure, risk, and investor strategy across CinNova target markets.
          </p>
        </div>
        <div className="mi-summary">
          <span className="mi-summary-value">{market.cinnovaMarketScore}</span>
          <span className="mi-summary-label">CinNova Score</span>
        </div>
      </div>

      <div className="card mi-control-card section">
        <div className="mi-market-select">
          <div>
            <label className="form-label" htmlFor="market-select">Market</label>
            <select
              id="market-select"
              className="form-select"
              value={marketId}
              onChange={event => setMarketId(event.target.value)}
            >
              {MARKET_DATA.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
          <div className="mi-market-context">
            <span className="badge badge-blue">{market.name}, {market.state}</span>
            <strong>{market.inventoryLevel} inventory with {fmtPct(market.rentGrowth)} rent growth</strong>
            <p>{market.insight}</p>
          </div>
        </div>
        <div className="mi-actions">
          <button className="btn btn-primary" type="button" onClick={handleAnalyzeMarket}>
            Analyze Properties in This Market
          </button>
          <button className="btn btn-outline" type="button" onClick={() => navigate('/map')}>
            Open Interactive Map
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => navigate('/advisor')}>
            Ask AI Advisor
          </button>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Market Overview</h2>
          <span className="badge badge-teal">Sample Intelligence</span>
        </div>
        <div className="mi-kpi-grid">
          {kpis.map(kpi => <KpiCard key={kpi.label} {...kpi} />)}
        </div>
      </div>

      <div className="mi-main-grid section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Rent vs Price Trend</h2>
            <span className="badge badge-gray">5-point trend</span>
          </div>
          <TrendChart market={market} />
        </div>

        <ScoreRing score={market.cinnovaMarketScore} label="Investment Opportunity Score" />
      </div>

      <div className="grid-2 section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Risk Breakdown</h2>
            <span className={`badge badge-${market.marketRiskScore >= 60 ? 'gold' : 'green'}`}>
              Market risk {market.marketRiskScore}/100
            </span>
          </div>
          <RiskBreakdown risks={market.risks} />
        </div>

        <div className="mi-strategy-card">
          <span className="badge badge-green">Best Strategy Recommendation</span>
          <h2>{market.strategy}</h2>
          <p>
            This recommendation weighs investor demand, entry affordability, vacancy, rent growth, and the current inventory backdrop for {market.name}.
          </p>
        </div>
      </div>

      <div className="grid-2 section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Top Neighborhoods</h2>
            <span className="badge badge-blue">Ranked by CinNova</span>
          </div>
          <NeighborhoodTable neighborhoods={market.neighborhoods} />
        </div>

        <div className="card mi-forecast-card">
          <div className="card-header">
            <h2 className="card-title">Market Forecast</h2>
            <span className="badge badge-gold">12-month view</span>
          </div>
          <p>{market.forecast}</p>
          <div className="mi-forecast-grid">
            <div>
              <span>Price Growth</span>
              <strong>{fmtPct(market.yoyPriceGrowth)}</strong>
            </div>
            <div>
              <span>Rent Growth</span>
              <strong>{fmtPct(market.rentGrowth)}</strong>
            </div>
            <div>
              <span>Risk Score</span>
              <strong>{market.marketRiskScore}/100</strong>
            </div>
            <div>
              <span>Demand</span>
              <strong>{market.investorDemand}/100</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
