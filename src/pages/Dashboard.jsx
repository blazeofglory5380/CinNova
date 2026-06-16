import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import ModuleCard from '../components/ModuleCard';
import { getProperties, clearProperties, getPortfolio } from '../services/propertyStorage';
import { selectProperty } from '../services/propertyWorkflow';
import './Dashboard.css';

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M13 13L18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M6 8.5H11M8.5 6V11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

const StarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M10 2L12.2 7.5H18L13.4 10.9L15.6 16.5L10 13.1L4.4 16.5L6.6 10.9L2 7.5H7.8L10 2Z"
      stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M10 5.5V10L13 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

const GlobeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M2 10h16M10 2c-2.5 3-2.5 13 0 16M10 2c2.5 3 2.5 13 0 16"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

const BotIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="6" width="14" height="9" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="6.5" cy="10.5" r="1" fill="currentColor"/>
    <circle cx="11.5" cy="10.5" r="1" fill="currentColor"/>
    <path d="M9 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="9" cy="1.8" r="1.2" fill="currentColor"/>
  </svg>
);

const ChartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <polyline points="2,14 6,9 10,12 16,5"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="16" cy="5" r="1.8" fill="currentColor"/>
  </svg>
);

const ChevronIcon = ({ open }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>
    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const HERO_PHOTOS = {
  skyline:    'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1600&q=82',
  luxury:     'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=82',
  commercial: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=82',
  aerial:     'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1000&q=82',
};

function FallbackPhoto({ className, src, label }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <div className={`${className} hero-img-fallback`}><span>{label}</span></div>;
  }
  return <img className={className} src={src} alt="" onError={() => setFailed(true)} />;
}

function HeroPhotoScene() {
  return (
    <div className="hero-photo-scene" aria-hidden="true">
      <FallbackPhoto className="hero-photo-scene-main" src={HERO_PHOTOS.skyline} label="CinNova Market" />
      <div className="hero-market-grid" />
      <div className="hero-data-path" />
      <div className="hero-map-pin hero-map-pin--one" />
      <div className="hero-map-pin hero-map-pin--two" />
      <div className="hero-map-pin hero-map-pin--three" />
    </div>
  );
}

function HeroPhotoPanel() {
  return (
    <div className="hero-photo-panel" aria-hidden="true">
      <FallbackPhoto className="hero-panel-img hero-panel-img--large" src={HERO_PHOTOS.luxury} label="Residential" />
      <FallbackPhoto className="hero-panel-img hero-panel-img--small hero-panel-img--commercial" src={HERO_PHOTOS.commercial} label="Commercial" />
      <FallbackPhoto className="hero-panel-img hero-panel-img--small hero-panel-img--aerial" src={HERO_PHOTOS.aerial} label="Aerial" />
      <div className="hero-panel-metric">
        <span>AI Yield Signal</span>
        <strong>+8.2%</strong>
      </div>
    </div>
  );
}

function InvestorKPICard({ card, onClick }) {
  return (
    <div
      className={`kpi-card kpi-card--${card.accent}${card.cta ? ' kpi-card--cta' : ''}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : {}}
    >
      <div className="kpi-top">
        <span className="kpi-icon">{card.icon}</span>
        <span className="kpi-label">{card.label}</span>
      </div>
      <div className="kpi-value-row">
        <span className="kpi-value">{card.value}</span>
        {card.unit && <span className="kpi-unit">{card.unit}</span>}
      </div>
      <div className="kpi-sub">{card.sub}</div>
      {card.trend && (
        <div className={`kpi-trend ${card.trendUp ? 'kpi-trend--up' : 'kpi-trend--down'}`}>
          {card.trend}
        </div>
      )}
      {card.cta && <div className="kpi-cta-arrow">→</div>}
    </div>
  );
}

const TYPE_LABELS = {
  'single-family': 'Single Family',
  condo:           'Condo',
  multifamily:     'Multifamily',
  commercial:      'Commercial',
  land:            'Land',
};

function RecentPropertyCard({ entry, onReopen }) {
  const { form, analysis, timestamp } = entry;

  const dateStr = new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const scoreColor =
    analysis.dealScore >= 90 ? 'var(--success)'
    : analysis.dealScore >= 75 ? 'var(--blue-600)'
    : 'var(--gold)';

  const typeLabel = TYPE_LABELS[form.type] || form.type || '—';
  const address   = form.address || analysis.address || 'Address not provided';

  return (
    <div className="recent-card">
      <div className="recent-card-main">
        <div className="recent-score-badge" style={{ color: scoreColor, borderColor: scoreColor }}>
          <span className="recent-score-num">{analysis.dealScore}</span>
          <span className="recent-score-denom">/100</span>
        </div>
        <div className="recent-card-body">
          <p className="recent-address">{address}</p>
          <div className="recent-meta">
            <span className="recent-price">{analysis.price}</span>
            {analysis.cashFlow && (
              <><span className="recent-sep">·</span><span className="recent-cf">{analysis.cashFlow}</span></>
            )}
          </div>
          <div className="recent-meta2">
            {typeLabel && <span className="recent-type">{typeLabel}</span>}
            <span className="recent-date">{dateStr}</span>
          </div>
        </div>
      </div>
      <button className="btn btn-ghost btn-sm recent-reopen-btn" onClick={onReopen}>
        Reopen Analysis →
      </button>
    </div>
  );
}

/* AI Advisor is live — change status to active. Market Intelligence is still coming soon. */
const MODULES = [
  { icon: <SearchIcon />, title: 'Property Analyzer',   description: 'AI deal scoring and investment analysis',   status: 'active',      path: '/analyzer' },
  { icon: <StarIcon />,   title: 'Benefits Finder',     description: 'Federal, state, county, and city programs', status: 'active',      path: '/benefits' },
  { icon: <ChartIcon />,  title: 'Market Intelligence', description: 'Real-time trends and comparable sales',      status: 'coming-soon', path: '/market'   },
  { icon: <BotIcon />,    title: 'AI Advisor',          description: 'Personalized strategy from AI',             status: 'active',      path: '/advisor'  },
];

const MARKET = [
  { label: '30-Year Fixed Rate', value: '6.82%',   up: true  },
  { label: 'Median Home Price',  value: '$412K',    up: true  },
  { label: 'Days on Market',     value: '38 days',  up: false },
  { label: 'Housing Inventory',  value: '2.1M',     up: true  },
  { label: 'Foreclosure Rate',   value: '0.4%',     up: false },
  { label: 'Rental Vacancy',     value: '5.8%',     up: false },
];

/* Strip ' / mo' suffix from analysisService cashFlow strings like '$1,850 / mo' */
function parseCFDisplay(cf) {
  if (!cf) return null;
  const s = String(cf).replace(/\s*\/\s*mo\s*$/i, '').trim();
  return s || null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [recent,         setRecent]         = useState([]);
  const [portfolio,      setPortfolio]       = useState([]);
  const [analysisCount,  setAnalysisCount]   = useState(0);
  const [moreOpen,       setMoreOpen]        = useState(false);

  useEffect(() => {
    const all = getProperties();
    setAnalysisCount(all.length);
    setRecent(all.slice(0, 6));
    setPortfolio(getPortfolio());
  }, []);

  const handleClear = () => { clearProperties(); setRecent([]); setAnalysisCount(0); };

  const handleReopen = entry => {
    const prop = entry.property || {
      id:          entry.id,
      address:     entry.form?.address || entry.analysis?.address || '',
      fullAddress: entry.form?.address || entry.analysis?.address || '',
      price:       parseFloat(String(entry.form?.price || '0').replace(/[$,]/g, '')),
      type:        entry.form?.type,
      rent:        0,
      cashFlow:    0,
      roi:         0,
      score:       entry.analysis?.dealScore || 0,
    };
    selectProperty(prop);
    navigate('/deal-analyzer');
  };

  /* ── Derive real KPI values from localStorage ─────────── */
  const lastAnalysis = recent[0]?.analysis ?? null;
  const lastScore    = lastAnalysis?.dealScore  ?? null;
  const lastCFVal    = parseCFDisplay(lastAnalysis?.cashFlow);
  const lastMortgage = lastAnalysis?.tco?.mortgage ?? null;

  const totalCF  = portfolio.reduce((s, p) => s + (p.cashFlow || 0), 0);
  const avgROI   = portfolio.length
    ? (portfolio.reduce((s, p) => s + (p.roi || 0), 0) / portfolio.length).toFixed(1)
    : null;
  const avgScore = portfolio.length
    ? Math.round(portfolio.reduce((s, p) => s + (p.score || 0), 0) / portfolio.length)
    : null;

  const aiRec  = lastScore !== null
    ? (lastScore >= 80 ? 'Buy' : lastScore >= 65 ? 'Consider' : 'Caution')
    : null;
  const aiConf = lastScore !== null
    ? (lastScore >= 80 ? 'High' : lastScore >= 65 ? 'Moderate' : 'Low')
    : null;

  const hasData = recent.length > 0 || portfolio.length > 0;

  /* ── KPI cards built from real data ─────────────────────── */
  const kpiCards = [
    {
      id:     'analyze',
      label:  'Analyze a Property',
      value:  'Start Now',
      sub:    'AI deal scoring in seconds',
      icon:   '🏠',
      accent: 'navy',
      cta:    true,
      path:   '/property-search',
    },
    {
      id:      'score',
      label:   'Investment Score',
      value:   lastScore !== null ? String(lastScore) : '—',
      unit:    '/100',
      sub:     lastScore !== null ? 'Last analyzed property' : 'No analyses yet',
      icon:    '📊',
      accent:  'blue',
      trend:   lastScore !== null
        ? (lastScore >= 80 ? 'Strong investment signal' : lastScore >= 65 ? 'Moderate signal' : 'Monitor closely')
        : null,
      trendUp: lastScore !== null ? lastScore >= 65 : false,
    },
    {
      id:      'cashflow',
      label:   'Est. Cash Flow',
      value:   lastCFVal ?? '—',
      unit:    lastCFVal ? '/mo' : '',
      sub:     lastCFVal ? 'Last analyzed property' : 'No analyses yet',
      icon:    '💵',
      accent:  'emerald',
    },
    {
      id:      'mortgage',
      label:   'Mortgage Payment',
      value:   lastMortgage ?? '—',
      unit:    lastMortgage ? '/mo' : '',
      sub:     lastMortgage ? '30yr fixed estimate' : 'Run an analysis first',
      icon:    '🏦',
      accent:  'gold',
      path:    '/mortgage-calc',
    },
    {
      id:      'portfolio-roi',
      label:   'Portfolio ROI',
      value:   avgROI !== null ? avgROI + '%' : '—',
      sub:     portfolio.length > 0
        ? `${portfolio.length} saved propert${portfolio.length === 1 ? 'y' : 'ies'}`
        : 'No portfolio yet',
      icon:    '📈',
      accent:  'teal',
      trend:   portfolio.length > 0 && totalCF > 0
        ? `$${totalCF.toLocaleString()}/mo combined CF`
        : null,
      trendUp: totalCF > 0,
      path:    '/portfolio',
    },
    {
      id:      'ai',
      label:   'AI Recommendation',
      value:   aiRec ?? '—',
      sub:     aiRec ? 'Based on last analysis' : 'No analysis yet',
      icon:    '🤖',
      accent:  'purple',
      trend:   aiConf ? `${aiConf} confidence · Score ${lastScore}/100` : null,
      trendUp: lastScore !== null ? lastScore >= 65 : false,
      path:    '/advisor',
    },
  ];

  return (
    <div className="page">

      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="hero-card">
        <HeroPhotoScene />
        <div className="hero-left">
          <div className="hero-eyebrow">
            <span className="hero-dot" />
            AI-Powered Platform · Beta
          </div>
          <h1 className="hero-title">
            Smarter Property<br />
            <span className="hero-accent">Intelligence</span>
          </h1>
          <p className="hero-subtitle">
            Analyze deals, uncover programs, and maximise returns — powered by AI.
          </p>
          <div className="hero-ctas">
            <button className="btn btn-white btn-lg" onClick={() => navigate('/property-search')}>
              Search Properties
            </button>
            <button className="btn btn-hero-outline btn-lg" onClick={() => navigate('/analyzer')}>
              Run Analysis
            </button>
          </div>
        </div>
        <div className="hero-right">
          <HeroPhotoPanel />
        </div>
      </div>

      {/* ── Investor KPI cards ────────────────────────────── */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Your Investment Dashboard</h2>
          <span className="badge badge-teal">{hasData ? 'Live' : 'No Data Yet'}</span>
        </div>
        <div className="kpi-grid">
          {kpiCards.map(card => (
            <InvestorKPICard
              key={card.id}
              card={card}
              onClick={card.path ? () => navigate(card.path) : undefined}
            />
          ))}
        </div>

        {!hasData && (
          <div style={{ marginTop: '16px', padding: '16px 20px', background: '#eff6ff', borderLeft: '4px solid #2563eb', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '20px' }}>👋</span>
            <div style={{ flex: 1 }}>
              <strong style={{ color: '#1e40af' }}>Start by searching your first property.</strong>
              <span style={{ color: '#3b82f6', marginLeft: '8px', fontSize: '14px' }}>
                Your investment metrics will appear here after your first analysis.
              </span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/property-search')}>
              Search Properties →
            </button>
          </div>
        )}
      </div>

      {/* ── Stats — derived from your real data ───────────── */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Platform Overview</h2>
          <span className="badge badge-blue">Your Data</span>
        </div>
        <div className="grid-4">
          <StatCard
            icon={<SearchIcon />}
            label="Analyses Run"
            value={String(analysisCount)}
            change={analysisCount > 0 ? `${analysisCount} total saved` : 'No analyses yet'}
            changeType={analysisCount > 0 ? 'positive' : 'neutral'}
            accent
          />
          <StatCard
            icon={<StarIcon />}
            label="Portfolio Properties"
            value={String(portfolio.length)}
            change={portfolio.length > 0 ? 'Saved from analyses' : 'None saved yet'}
            changeType={portfolio.length > 0 ? 'positive' : 'neutral'}
          />
          <StatCard
            icon={<ChartIcon />}
            label="Avg. AI Score"
            value={avgScore !== null ? `${avgScore}/100` : '—'}
            change={portfolio.length > 0 ? 'Across your portfolio' : 'Save properties first'}
            changeType={avgScore !== null && avgScore >= 75 ? 'positive' : 'neutral'}
          />
          <StatCard
            icon={<ClockIcon />}
            label="Analysis Speed"
            value="< 2s"
            change="AI-powered"
            changeType="neutral"
          />
        </div>
      </div>

      {/* ── Portfolio summary ─────────────────────────────── */}
      {portfolio.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">
              Portfolio Summary
              <span className="section-count">{portfolio.length} properties</span>
            </h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/portfolio')}>
              View Full Portfolio →
            </button>
          </div>
          <div className="grid-4">
            <StatCard
              icon={<StarIcon />}
              label="Portfolio Value"
              value={'$' + Math.round(portfolio.reduce((s, p) => s + (p.price || 0), 0) / 1000) + 'K'}
              change={`${portfolio.length} saved properties`}
              changeType="neutral"
              accent
            />
            <StatCard
              icon={<ChartIcon />}
              label="Monthly Cash Flow"
              value={'+$' + totalCF.toLocaleString()}
              change="Combined estimate"
              changeType="positive"
            />
            <StatCard
              icon={<GlobeIcon />}
              label="Avg. Cap Rate"
              value={(portfolio.reduce((s, p) => s + (p.capRate || 0), 0) / Math.max(1, portfolio.length)).toFixed(1) + '%'}
              change="Across saved properties"
              changeType="neutral"
            />
            <StatCard
              icon={<ClockIcon />}
              label="Avg. AI Score"
              value={(avgScore ?? '—') + (avgScore !== null ? '/100' : '')}
              change="Portfolio quality"
              changeType="neutral"
            />
          </div>
        </div>
      )}

      {/* ── Recently analyzed ─────────────────────────────── */}
      {recent.length > 0 ? (
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">
              Recent Analyses
              <span className="section-count">{recent.length}</span>
            </h2>
            <div className="section-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/property-search')}>
                + Search Properties
              </button>
              <button className="btn btn-ghost btn-sm recent-clear" onClick={handleClear}>
                Clear History
              </button>
            </div>
          </div>
          <div className="recent-grid">
            {recent.map(entry => (
              <RecentPropertyCard
                key={entry.id}
                entry={entry}
                onReopen={() => handleReopen(entry)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">Recent Analyses</h2>
          </div>
          <div style={{ padding: '32px 24px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #e2e8f0' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
            <p style={{ color: '#475569', fontWeight: 600, marginBottom: '6px' }}>No analyses yet</p>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>
              Run your first analysis to see investment metrics, deal scores, and recommendations here.
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/property-search')}>
              Search Properties →
            </button>
          </div>
        </div>
      )}

      {/* ── Collapsible More Tools ─────────────────────────── */}
      <div className="section">
        <button className="more-tools-toggle" onClick={() => setMoreOpen(v => !v)}>
          <span className="more-tools-label">
            {moreOpen ? 'Hide Advanced Tools' : 'More Tools & Market Data'}
          </span>
          <span className="more-tools-count">
            {moreOpen ? '' : '· Platform Tools, Market Snapshot, Quick Start'}
          </span>
          <ChevronIcon open={moreOpen} />
        </button>

        {moreOpen && (
          <div className="more-tools-content">

            {/* Modules + Market */}
            <div className="grid-2">
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Platform Tools</h2>
                  <span className="badge badge-blue">4 Tools</span>
                </div>
                <div className="module-list">
                  {MODULES.map(m => (
                    <ModuleCard
                      key={m.path}
                      icon={m.icon}
                      title={m.title}
                      description={m.description}
                      status={m.status}
                      onClick={() => navigate(m.path)}
                    />
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Market Snapshot</h2>
                  <span className="badge badge-gold">Q1 2025 · Reference</span>
                </div>
                <div className="market-list">
                  {MARKET.map(row => (
                    <div key={row.label} className="market-row">
                      <span className="market-label">{row.label}</span>
                      <div className="market-right">
                        <span className="market-value">{row.value}</span>
                        <span className={`market-dir ${row.up ? 'dir-up' : 'dir-down'}`}>
                          {row.up ? '↑' : '↓'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="market-note">Static reference data — live market feed coming soon.</p>
              </div>
            </div>

            {/* Quick start */}
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-header">
                <h2 className="card-title">Quick Start Guide</h2>
                <span className="badge badge-gray">5 Steps</span>
              </div>
              <div className="qs-grid">
                {[
                  { n: '01', text: 'Search for properties in Property Search and select one to analyze' },
                  { n: '02', text: 'Run Deal Analyzer — it auto-fills from your selected property' },
                  { n: '03', text: 'Review deal score, cash flow, ROI, and risk metrics' },
                  { n: '04', text: 'Save to Portfolio and track your deals in Portfolio Dashboard' },
                  { n: '05', text: 'Ask AI Advisor for personalized strategy on any property' },
                ].map(step => (
                  <div key={step.n} className="qs-step">
                    <span className="qs-num">{step.n}</span>
                    <span className="qs-text">{step.text}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
