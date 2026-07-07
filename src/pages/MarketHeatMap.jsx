// Market Heat Map  —  /market-heat-map    CSS prefix: mhm-
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import BetaFooter from '../components/BetaFooter';
import './MarketHeatMap.css';

// ── Mock city dataset ──────────────────────────────────────────────────────────

const CITIES = [
  {
    id: 'nashville',
    name: 'Nashville',
    state: 'TN',
    score: 86,
    medianPrice: 421000,
    avgRent: 2180,
    capRate: 5.5,
    appreciation: 4.7,
    rentGrowth: 5.5,
    popGrowth: 2.5,
    tag: 'Top Pick',
    tagAccent: 'green',
    risk: 'Low',
    blurb: 'Healthcare, tech, and music-industry relocation fuel durable long-term rental demand.',
  },
  {
    id: 'dallas',
    name: 'Dallas',
    state: 'TX',
    score: 85,
    medianPrice: 398000,
    avgRent: 2050,
    capRate: 5.9,
    appreciation: 4.8,
    rentGrowth: 5.2,
    popGrowth: 2.9,
    tag: 'Growth Market',
    tagAccent: 'blue',
    risk: 'Low',
    blurb: 'Corporate relocations from CA and NY drive population gains and strong renter demand.',
  },
  {
    id: 'raleigh',
    name: 'Raleigh',
    state: 'NC',
    score: 84,
    medianPrice: 392000,
    avgRent: 1980,
    capRate: 5.7,
    appreciation: 5.2,
    rentGrowth: 5.8,
    popGrowth: 3.1,
    tag: 'Tech Corridor',
    tagAccent: 'blue',
    risk: 'Low',
    blurb: 'Research Triangle is one of the fastest-growing tech employment hubs in the Southeast.',
  },
  {
    id: 'phoenix',
    name: 'Phoenix',
    state: 'AZ',
    score: 83,
    medianPrice: 438000,
    avgRent: 2140,
    capRate: 5.8,
    appreciation: 4.1,
    rentGrowth: 4.8,
    popGrowth: 2.8,
    tag: 'Cash Flow Leader',
    tagAccent: 'emerald',
    risk: 'Moderate',
    blurb: 'Favorable rent-to-price ratio and consistent population inflow support stable cash flow.',
  },
  {
    id: 'charlotte',
    name: 'Charlotte',
    state: 'NC',
    score: 83,
    medianPrice: 374000,
    avgRent: 1940,
    capRate: 5.9,
    appreciation: 4.5,
    rentGrowth: 4.9,
    popGrowth: 2.4,
    tag: 'Banking Hub',
    tagAccent: 'teal',
    risk: 'Low',
    blurb: "Second-largest US banking center with Fortune 500 concentration and strong renter base.",
  },
  {
    id: 'atlanta',
    name: 'Atlanta',
    state: 'GA',
    score: 82,
    medianPrice: 358000,
    avgRent: 1920,
    capRate: 6.1,
    appreciation: 4.2,
    rentGrowth: 5.0,
    popGrowth: 2.3,
    tag: 'Value Play',
    tagAccent: 'emerald',
    risk: 'Moderate',
    blurb: 'Below-national-average entry pricing with above-average cap rates — a strong value market.',
  },
  {
    id: 'austin',
    name: 'Austin',
    state: 'TX',
    score: 81,
    medianPrice: 462000,
    avgRent: 2240,
    capRate: 5.1,
    appreciation: 2.8,
    rentGrowth: 3.9,
    popGrowth: 3.2,
    tag: 'Tech Premium',
    tagAccent: 'blue',
    risk: 'Moderate',
    blurb: 'Highest population growth in the dataset; disciplined underwriting is key at current prices.',
  },
  {
    id: 'tampa',
    name: 'Tampa',
    state: 'FL',
    score: 81,
    medianPrice: 368000,
    avgRent: 2080,
    capRate: 6.3,
    appreciation: 3.8,
    rentGrowth: 6.1,
    popGrowth: 2.6,
    tag: 'Rent Surge',
    tagAccent: 'gold',
    risk: 'Moderate',
    blurb: 'Among the strongest rent growth markets nationally — ideal for income-focused strategies.',
  },
  {
    id: 'orlando',
    name: 'Orlando',
    state: 'FL',
    score: 80,
    medianPrice: 352000,
    avgRent: 1870,
    capRate: 6.0,
    appreciation: 3.6,
    rentGrowth: 5.2,
    popGrowth: 2.4,
    tag: 'Tourism Hub',
    tagAccent: 'teal',
    risk: 'Moderate',
    blurb: 'Large renter pool from hospitality sector; cash flow-positive deals available at current prices.',
  },
  {
    id: 'lasvegas',
    name: 'Las Vegas',
    state: 'NV',
    score: 78,
    medianPrice: 398000,
    avgRent: 1980,
    capRate: 6.5,
    appreciation: 3.5,
    rentGrowth: 4.2,
    popGrowth: 2.1,
    tag: 'High Yield',
    tagAccent: 'gold',
    risk: 'Moderate',
    blurb: 'Highest cap rates in the group; economic volatility requires disciplined vacancy underwriting.',
  },
];

// ── Filter definitions ─────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'overall',      label: 'Best Overall',  icon: '⭐' },
  { key: 'cashflow',     label: 'Cash Flow',      icon: '💵' },
  { key: 'appreciation', label: 'Appreciation',   icon: '📈' },
  { key: 'lowrisk',      label: 'Low Risk',       icon: '🛡️' },
];

function sortedCities(filter) {
  const copy = [...CITIES];
  switch (filter) {
    case 'cashflow':
      return copy.sort((a, b) => b.capRate - a.capRate);
    case 'appreciation':
      return copy.sort((a, b) => b.appreciation - a.appreciation);
    case 'lowrisk': {
      const rank = { Low: 0, Moderate: 1, High: 2 };
      return copy.sort((a, b) => {
        const r = rank[a.risk] - rank[b.risk];
        return r !== 0 ? r : b.score - a.score;
      });
    }
    default:
      return copy.sort((a, b) => b.score - a.score);
  }
}

// ── AI summaries ───────────────────────────────────────────────────────────────

const SUMMARIES = {
  overall: {
    text: 'Nashville leads the CinNova market rankings with an 86/100 score, followed by Dallas (85) and Raleigh (84). These three markets combine strong job growth, sustained rent momentum, and population migration from higher-cost metros — making them the most well-rounded buy-and-hold markets in this comparison. Use the Score Engine to evaluate specific properties before committing capital.',
    chips: ['Nashville 86/100', 'Dallas 85/100', 'Raleigh 84/100', '3 Low-risk markets'],
  },
  cashflow: {
    text: 'Las Vegas (6.5%), Tampa (6.3%), and Atlanta (6.1%) generate the highest cap rates in this group. These markets favor cash flow investors seeking day-one income. Conservative rent underwriting is critical — input current market rents rather than optimistic projections when using the Score Engine, especially in markets with elevated vacancy sensitivity.',
    chips: ['Las Vegas 6.5% cap', 'Tampa 6.3% cap', 'Atlanta 6.1% cap', 'Income-first strategy'],
  },
  appreciation: {
    text: 'Raleigh (+5.2%) and Dallas (+4.8%) top the appreciation rankings, driven by tech job creation and sustained domestic migration from California and New York. Long-term holds in these markets compound equity meaningfully. Verify current entry pricing in the Score Engine — appreciation markets can compress cap rates, so buy-in basis matters more than in yield-first markets.',
    chips: ['Raleigh +5.2% YoY', 'Dallas +4.8% YoY', 'Nashville +4.7% YoY', 'Long-hold strategy'],
  },
  lowrisk: {
    text: 'Dallas, Nashville, Raleigh, and Charlotte carry the lowest risk profiles in this group — all four have sub-6% vacancy rates, diversified employment bases, and strong renter demand from in-migration. These markets are particularly well-suited for first-time real estate investors or capital-preservation strategies where downside protection matters as much as upside.',
    chips: ['4 Low-risk markets', 'Dallas, Nashville', 'Raleigh, Charlotte', 'Conservative strategy'],
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function scoreColor(s) {
  return s >= 85 ? '#059669' : s >= 80 ? '#2563eb' : s >= 75 ? '#0d9488' : '#d97706';
}

function scoreGradient(s) {
  return s >= 85
    ? 'linear-gradient(135deg, #059669, #10b981)'
    : s >= 80
    ? 'linear-gradient(135deg, #2563eb, #3b82f6)'
    : s >= 75
    ? 'linear-gradient(135deg, #0d9488, #14b8a6)'
    : 'linear-gradient(135deg, #d97706, #f59e0b)';
}

function pct(v, plus = true) {
  return `${plus && v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

function fmtPrice(n) {
  return n >= 1000000
    ? `$${(n / 1000000).toFixed(1)}M`
    : `$${Math.round(n / 1000)}K`;
}

function riskBadge(r) {
  return r === 'Low' ? 'badge-green' : r === 'High' ? 'badge-red' : 'badge-blue';
}

const RANK_LABELS = ['', '🥇 #1', '🥈 #2', '🥉 #3'];

// ── City Card ─────────────────────────────────────────────────────────────────

function CityCard({ city, rank, filter, onAnalyze }) {
  const color    = scoreColor(city.score);
  const gradient = scoreGradient(city.score);
  const isTopThree = rank <= 3;

  // Which metric to highlight based on active filter
  const highlightKey = filter === 'cashflow'     ? 'capRate'
                     : filter === 'appreciation'  ? 'appreciation'
                     : filter === 'lowrisk'        ? null
                     : null;

  return (
    <div className={`mhm-card${isTopThree ? ` mhm-card--top${rank}` : ''}`}
      style={{ '--card-color': color, '--card-gradient': gradient }}>

      {/* Color bar */}
      <div className="mhm-card-bar" style={{ background: gradient }} />

      {/* Rank badge */}
      {isTopThree && (
        <div className="mhm-rank-badge">{RANK_LABELS[rank]}</div>
      )}

      {/* Card header */}
      <div className="mhm-card-header">
        <div className="mhm-card-city">
          <span className="mhm-city-name">{city.name}</span>
          <span className="mhm-city-state">{city.state}</span>
        </div>
        <div className="mhm-score-ring" style={{ borderColor: color + '40', background: color + '12' }}>
          <span className="mhm-score-num" style={{ color }}>{city.score}</span>
          <span className="mhm-score-denom">/100</span>
        </div>
      </div>

      {/* Tag + risk */}
      <div className="mhm-card-tags">
        <span className={`mhm-tag mhm-tag--${city.tagAccent}`}>{city.tag}</span>
        <span className={`badge ${riskBadge(city.risk)}`} style={{ fontSize: '0.68rem' }}>
          {city.risk} Risk
        </span>
      </div>

      {/* Metrics grid */}
      <div className="mhm-metrics">
        <div className={`mhm-metric${highlightKey === 'capRate' ? '' : ''}`}>
          <span>Median Price</span>
          <strong>{fmtPrice(city.medianPrice)}</strong>
        </div>
        <div className="mhm-metric">
          <span>Avg. Rent</span>
          <strong>${city.avgRent.toLocaleString()}</strong>
        </div>
        <div className={`mhm-metric${highlightKey === 'capRate' ? ' mhm-metric--highlight' : ''}`}>
          <span>Cap Rate</span>
          <strong style={{ color: city.capRate >= 6 ? '#059669' : city.capRate >= 5 ? '#2563eb' : '#d97706' }}>
            {city.capRate.toFixed(1)}%
          </strong>
        </div>
        <div className={`mhm-metric${highlightKey === 'appreciation' ? ' mhm-metric--highlight' : ''}`}>
          <span>YoY Appreciation</span>
          <strong style={{ color: '#059669' }}>{pct(city.appreciation)}</strong>
        </div>
        <div className="mhm-metric">
          <span>Rent Growth</span>
          <strong style={{ color: '#059669' }}>{pct(city.rentGrowth)}</strong>
        </div>
        <div className="mhm-metric">
          <span>Pop. Growth</span>
          <strong style={{ color: city.popGrowth >= 2.5 ? '#059669' : '#2563eb' }}>{pct(city.popGrowth)}</strong>
        </div>
      </div>

      {/* Blurb */}
      <p className="mhm-blurb">{city.blurb}</p>

      {/* CTA */}
      <button
        className="mhm-cta"
        onClick={() => onAnalyze(city.name)}
        style={{ '--cta-color': color }}
      >
        Analyze Property in {city.name} →
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MarketHeatMap() {
  const navigate     = useNavigate();
  const [filter, setFilter] = useState('overall');

  const ranked  = useMemo(() => sortedCities(filter), [filter]);
  const summary = SUMMARIES[filter];

  function handleAnalyze(cityName) {
    navigate('/score-engine?market=' + encodeURIComponent(cityName));
  }

  return (
    <div className="page">

      {/* ── Page header ── */}
      <div className="page-header mhm-page-header">
        <div>
          <div className="mhm-header-badges">
            <span className="badge badge-blue">CinNova</span>
            <span className="badge badge-teal">Market Intelligence</span>
            <span className="badge badge-gray">10 Markets · Q2 2025</span>
          </div>
          <h1 className="page-title">Market Heat Map</h1>
          <p className="page-subtitle">
            Compare 10 top investor markets side by side. Filter by strategy to surface the best opportunities for your goals.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" disabled title="Coming soon">
          Market Dashboard (soon)
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div className="mhm-filter-bar">
        <span className="mhm-filter-label">Filter by:</span>
        <div className="mhm-filter-group">
          {FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              className={`mhm-filter-btn${filter === f.key ? ' mhm-filter-btn--active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              <span>{f.icon}</span>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── AI Market Summary ── */}
      <div className="card mhm-summary-card">
        <div className="card-header">
          <h2 className="card-title">
            AI Market Summary
            <span className="mhm-summary-filter-tag">
              {FILTERS.find(f => f.key === filter)?.icon} {FILTERS.find(f => f.key === filter)?.label}
            </span>
          </h2>
          <span className="badge badge-blue">Intelligence Analysis</span>
        </div>
        <p className="mhm-summary-text">{summary.text}</p>
        <div className="mhm-summary-chips">
          {summary.chips.map(c => (
            <span key={c} className="mhm-summary-chip">{c}</span>
          ))}
        </div>
      </div>

      {/* ── Top 3 highlight banner ── */}
      <div className="mhm-podium">
        <div className="mhm-podium-label">
          <span>
            {FILTERS.find(f => f.key === filter)?.icon} Top 3 —{' '}
            {filter === 'overall'      ? 'Best Overall Score'
           : filter === 'cashflow'     ? 'Highest Cap Rate'
           : filter === 'appreciation' ? 'Strongest Appreciation'
           :                             'Lowest Risk Profile'}
          </span>
        </div>
        <div className="mhm-podium-names">
          {ranked.slice(0, 3).map((c, i) => (
            <div key={c.id} className={`mhm-podium-item mhm-podium-item--${i + 1}`}>
              <span className="mhm-podium-rank">{RANK_LABELS[i + 1]}</span>
              <span className="mhm-podium-city">{c.name}, {c.state}</span>
              <span className="mhm-podium-val" style={{ color: scoreColor(c.score) }}>
                {filter === 'cashflow'     ? `${c.capRate.toFixed(1)}% cap`
               : filter === 'appreciation' ? `${pct(c.appreciation)} YoY`
               : filter === 'lowrisk'      ? c.risk + ' Risk'
               :                             `${c.score}/100`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── City card grid ── */}
      <div className="mhm-grid">
        {ranked.map((city, i) => (
          <CityCard
            key={city.id}
            city={city}
            rank={i + 1}
            filter={filter}
            onAnalyze={handleAnalyze}
          />
        ))}
      </div>

      {/* ── Bottom CTA strip ── */}
      <div className="mhm-bottom-strip">
        <div>
          <div className="mhm-bottom-title">Ready to analyze a specific deal?</div>
          <div className="mhm-bottom-sub">Enter any property address to get a score, cash flow projection, and AI recommendation.</div>
        </div>
        <div className="mhm-bottom-actions">
          <button className="btn btn-primary" onClick={() => navigate('/score-engine')}>
            Open Score Engine
          </button>
          <button className="btn btn-outline" disabled title="Coming soon">
            Compare Properties (soon)
          </button>
          <button className="btn btn-ghost" disabled title="Coming soon">
            Deep Market Analysis (soon)
          </button>
        </div>
      </div>

      <BetaFooter page="Market Heat Map" />

    </div>
  );
}
