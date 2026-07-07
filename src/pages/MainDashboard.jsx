import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProperties, getPortfolio } from '../services/propertyStorage';
import BetaFooter from '../components/BetaFooter';
import './MainDashboard.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}

function fmtPrice(n) {
  if (!n) return '—';
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (n >= 1_000)     return '$' + (n / 1_000).toFixed(0) + 'K';
  return '$' + n.toLocaleString();
}

function fmtCF(n) {
  if (n == null) return '—';
  const abs = Math.abs(Math.round(n));
  return (n >= 0 ? '+$' : '-$') + abs.toLocaleString() + '/mo';
}

function scoreColor(s) {
  if (s == null) return '#94a3b8';
  return s >= 70 ? '#059669' : s >= 55 ? '#2563eb' : s >= 40 ? '#d97706' : '#dc2626';
}

function recLabel(s) {
  if (s == null) return 'Unscored';
  if (s >= 85) return 'Strong Buy';
  if (s >= 70) return 'Buy';
  if (s >= 55) return 'Review';
  if (s >= 40) return 'High Risk';
  return 'Avoid';
}

function riskBadge(level) {
  const l = (level || '').toLowerCase();
  if (l.includes('low'))  return { label: 'Low',      cls: 'wd-risk--low'  };
  if (l.includes('high')) return { label: 'High',     cls: 'wd-risk--high' };
  return                         { label: 'Moderate', cls: 'wd-risk--mod'  };
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Demo data builder ─────────────────────────────────────────────────────────

function buildDemoEntries() {
  const now = Date.now();
  return [
    {
      id: now - 500,
      timestamp: new Date(now - 500).toISOString(),
      isDemo: true,
      form: { address: '3307 Hillsborough St', city: 'Raleigh', state: 'NC', type: 'Small Multifamily' },
      analysis: {
        address: '3307 Hillsborough St, Raleigh, NC 27607',
        city: 'Raleigh',
        price: '$525,000',
        cashFlow: 1140,
        capRate: 6.8,
        cocReturn: 8.4,
        dscr: 1.42,
        investmentScore: 91,
        riskLevel: 'Low',
        recommendation: 'Strong Buy',
        status: 'Strong Buy',
      },
    },
    {
      id: now - 1000,
      timestamp: new Date(now - 1000).toISOString(),
      isDemo: true,
      form: { address: '2214 Maple Ave', city: 'Dallas', state: 'TX', type: 'Duplex' },
      analysis: {
        address: '2214 Maple Ave, Dallas, TX 75219',
        city: 'Dallas',
        price: '$378,000',
        cashFlow: 720,
        capRate: 6.4,
        cocReturn: 7.8,
        dscr: 1.28,
        investmentScore: 85,
        riskLevel: 'Low',
        recommendation: 'Strong Buy',
        status: 'Strong Buy',
      },
    },
    {
      id: now - 1500,
      timestamp: new Date(now - 1500).toISOString(),
      isDemo: true,
      form: { address: '4821 W Cactus Rd', city: 'Phoenix', state: 'AZ', type: 'Single Family' },
      analysis: {
        address: '4821 W Cactus Rd, Phoenix, AZ 85031',
        city: 'Phoenix',
        price: '$415,000',
        cashFlow: 380,
        capRate: 5.8,
        cocReturn: 6.2,
        dscr: 1.15,
        investmentScore: 78,
        riskLevel: 'Low',
        recommendation: 'Buy',
        status: 'Buy',
      },
    },
    {
      id: now - 2000,
      timestamp: new Date(now - 2000).toISOString(),
      isDemo: true,
      form: { address: '891 Peachtree St NE', city: 'Atlanta', state: 'GA', type: 'Townhouse' },
      analysis: {
        address: '891 Peachtree St NE, Atlanta, GA 30309',
        city: 'Atlanta',
        price: '$342,000',
        cashFlow: 290,
        capRate: 5.2,
        cocReturn: 5.6,
        dscr: 1.09,
        investmentScore: 72,
        riskLevel: 'Moderate',
        recommendation: 'Buy',
        status: 'Buy',
      },
    },
    {
      id: now - 2500,
      timestamp: new Date(now - 2500).toISOString(),
      isDemo: true,
      form: { address: '1705 Bayshore Blvd', city: 'Tampa', state: 'FL', type: 'Condo' },
      analysis: {
        address: '1705 Bayshore Blvd, Tampa, FL 33606',
        city: 'Tampa',
        price: '$289,000',
        cashFlow: -85,
        capRate: 4.8,
        cocReturn: 4.1,
        dscr: 0.97,
        investmentScore: 58,
        riskLevel: 'High',
        recommendation: 'Review',
        status: 'Review',
      },
    },
  ];
}

// ── Static market data ────────────────────────────────────────────────────────

const MARKETS = [
  { city: 'Phoenix', state: 'AZ', score: 84, priceYoY: '+12.4%', median: '$415K', capRate: '5.8%', tag: 'Sun Belt Leader',   color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
  { city: 'Dallas',  state: 'TX', score: 87, priceYoY: '+9.8%',  median: '$378K', capRate: '6.2%', tag: 'No State Tax',       color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { city: 'Atlanta', state: 'GA', score: 85, priceYoY: '+11.2%', median: '$342K', capRate: '6.8%', tag: 'Tech Hub Growth',    color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' },
  { city: 'Raleigh', state: 'NC', score: 83, priceYoY: '+8.9%',  median: '$395K', capRate: '5.5%', tag: 'Research Triangle', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { city: 'Tampa',   state: 'FL', score: 82, priceYoY: '+10.6%', median: '$358K', capRate: '5.9%', tag: 'Florida Growth',    color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, accent, onClick, trend, trendUp }) {
  return (
    <div className={`wd-kpi wd-kpi--${accent}${onClick ? ' wd-kpi--link' : ''}`} onClick={onClick}>
      <div className="wd-kpi-top">
        <span className="wd-kpi-icon">{icon}</span>
        <span className="wd-kpi-label">{label}</span>
      </div>
      <div className="wd-kpi-value">{value}</div>
      <div className="wd-kpi-sub">{sub}</div>
      {trend && (
        <div className={`wd-kpi-trend ${trendUp ? 'wd-kpi-trend--up' : 'wd-kpi-trend--down'}`}>
          {trendUp ? '↑' : '↓'} {trend}
        </div>
      )}
    </div>
  );
}

function MarketCard({ m, onExplore, disabled }) {
  return (
    <div className="wd-mkt-card" style={{ borderColor: m.border, background: m.bg }}>
      <div className="wd-mkt-top">
        <div>
          <div className="wd-mkt-city">{m.city}, {m.state}</div>
          <div className="wd-mkt-tag" style={{ color: m.color }}>{m.tag}</div>
        </div>
        <div className="wd-mkt-score" style={{ color: m.color, borderColor: m.color }}>
          {m.score}
        </div>
      </div>
      <div className="wd-mkt-stats">
        <div className="wd-mkt-stat">
          <span>Median</span>
          <strong>{m.median}</strong>
        </div>
        <div className="wd-mkt-stat">
          <span>Cap Rate</span>
          <strong style={{ color: '#059669' }}>{m.capRate}</strong>
        </div>
        <div className="wd-mkt-stat">
          <span>YoY Price</span>
          <strong style={{ color: '#2563eb' }}>{m.priceYoY}</strong>
        </div>
      </div>
      <button className="wd-mkt-btn" style={{ color: m.color }} onClick={() => onExplore(m.city)} disabled={disabled}>
        {disabled ? 'Explore — Soon' : 'Explore market →'}
      </button>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const AnalyzeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="7.5" cy="7.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M11.5 11.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M5.5 7.5H9.5M7.5 5.5V9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);
const HubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="9" cy="2.5" r="1.5" fill="currentColor"/>
    <circle cx="9" cy="15.5" r="1.5" fill="currentColor"/>
    <circle cx="2.5" cy="9" r="1.5" fill="currentColor"/>
    <circle cx="15.5" cy="9" r="1.5" fill="currentColor"/>
    <path d="M9 6V4M9 12v2M6 9H4M12 9h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);
const ReportIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="3" y="2" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M6 6H12M6 9H12M6 12H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);
const MktIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M2.5 9H15.5M9 2.5C9 2.5 11 5.5 11 9C11 12.5 9 15.5 9 15.5M9 2.5C9 2.5 7 5.5 7 9C7 12.5 9 15.5 9 15.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);
const ScoreEngineIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M3 12.5C3 9.46 5.69 7 9 7s6 2.46 6 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M9 7V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M5.5 8L3.5 6M12.5 8L14.5 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M9 12.5L6.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="9" cy="12.5" r="1.5" fill="currentColor"/>
  </svg>
);
const KpiAnalyzeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M10 10L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M4.5 6.5H8.5M6.5 4.5V8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);
const KpiSavedIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 2h10a1 1 0 0 1 1 1v10.5l-5-2.5-5 2.5V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M6 6h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);
const KpiValueIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M8 4.5V5.5M8 10.5V11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M6 7c0-.83.67-1.5 2-1.5s2 .5 2 1.5-.67 1.2-2 1.5C6.5 8.8 6 9.4 6 10.5c0 .83.9 1 2 1s2-.5 2-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);
const KpiScoreIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2.5 11C2.5 7.96 4.96 5.5 8 5.5s5.5 2.46 5.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 5.5V3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M5 6.8L3.5 5.5M11 6.8L12.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M8 11L6 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="8" cy="11" r="1.2" fill="currentColor"/>
  </svg>
);

// ── Incremental-landing route guard ──────────────────────────────────────────
// Only these routes exist on `main` today. Missing analysis/scoring routes fall
// back to the Property Analyzer; everything else is shown as "Coming soon" so no
// button ever lands on a blank (unrouted) page.
const LIVE_ROUTES       = new Set(['/analyzer', '/score-engine', '/market-heat-map', '/deal-pipeline']); // + Deal Pipeline (PR #5)
const ANALYZER_FALLBACK = new Set([]); // (no fallbacks needed)

function routeState(path) {
  if (LIVE_ROUTES.has(path))       return 'live';
  if (ANALYZER_FALLBACK.has(path)) return 'analyzer';
  return 'soon';
}
function isComingSoon(path) {
  return routeState(path) === 'soon';
}

// Small "Soon" chip for actions whose destination page isn't on main yet.
function Soon() {
  return <span className="wd-soon">Soon</span>;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MainDashboard() {
  const navigate = useNavigate();

  // Safe navigation: never routes to a page that doesn't exist on main yet.
  const go = (path) => {
    const state = routeState(path);
    if (state === 'live')     navigate(path);
    else if (state === 'analyzer') navigate('/analyzer');
    // 'soon' → intentionally no navigation
  };

  const [portfolio,  setPortfolio]  = useState([]);
  const [analyses,   setAnalyses]   = useState([]);
  const [hub,        setHub]        = useState(null);
  const [actionPlan, setActionPlan] = useState(null);
  const [report,     setReport]     = useState(null);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [checklist,  setChecklist]  = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [betaClOpen, setBetaClOpen] = useState(true);

  useEffect(() => {
    setPortfolio(getPortfolio());
    const props = getProperties();
    setAnalyses(props);
    setHub(safeJson('cinnova_intelligence_hub'));
    setActionPlan(safeJson('cinnova_deal_action_plan'));
    setReport(safeJson('cinnova_investor_report'));

    const demo = localStorage.getItem('cinnova_demo_loaded') === 'true';
    setDemoLoaded(demo);

    const pipeline = safeJson('cinnova_deal_pipeline');
    const pipelineMoved = !!(
      pipeline?.stages && Object.values(pipeline.stages).some(v => v !== 'new_lead')
    );
    const advisorUsed = localStorage.getItem('cinnova_advisor_used') === 'true';

    setChecklist([
      { label: 'Analyze your first property',  done: props.length > 0,  path: '/score-engine',              icon: '🔍' },
      { label: 'Compare two deals',            done: props.length >= 2, path: '/property-comparison',       icon: '⚖️' },
      { label: 'Generate a report',            done: props.length > 0,  path: '/property-report-generator', icon: '📄' },
      { label: 'Move a deal in the pipeline',  done: pipelineMoved,     path: '/deal-pipeline',             icon: '📋' },
      { label: 'Ask AI Advisor a question',    done: advisorUsed,       path: '/ai-advisor-chat',           icon: '🤖' },
    ]);
  }, [refreshKey]);

  // ── KPI values ─────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const portfolioValue = portfolio.reduce((s, p) => s + (p.price || p.value || 0), 0);
    const scores = [
      ...portfolio.map(p => p.score).filter(Boolean),
      ...(hub?.intelligenceScore ? [hub.intelligenceScore] : []),
    ];
    const avgScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;
    return { portfolioValue, avgScore };
  }, [portfolio, hub]);

  // ── Recent deals table ──────────────────────────────────────────────────────
  const tableRows = useMemo(() => {
    const rows = [];
    const seen = new Set();

    portfolio.forEach(p => {
      const addr = p.address || p.addr || '';
      const key  = addr.toLowerCase().split(',')[0].trim();
      if (!addr || seen.has(key)) return;
      seen.add(key);
      rows.push({
        address:  addr,
        city:     p.city || p.market || '—',
        cashFlow: p.cashFlow ?? null,
        capRate:  p.capRate  ?? null,
        risk:     p.riskLevel || (p.riskScore != null
          ? (p.riskScore > 62 ? 'High' : p.riskScore > 38 ? 'Moderate' : 'Low')
          : 'Moderate'),
        score:    p.score || null,
      });
    });

    analyses.slice(0, 8).forEach(entry => {
      const addr = entry.form?.address || entry.analysis?.address || '';
      const key  = addr.toLowerCase().split(',')[0].trim();
      if (!addr || seen.has(key)) return;
      seen.add(key);
      const rawCF = entry.analysis?.cashFlow;
      let cf = null;
      if (rawCF != null) {
        if (typeof rawCF === 'number') {
          cf = rawCF;
        } else {
          const s   = String(rawCF);
          const neg = s.trimStart().startsWith('-');
          const num = parseFloat(s.replace(/[^0-9.]/g, ''));
          cf = isNaN(num) ? null : (neg ? -num : num);
        }
      }
      rows.push({
        address:  addr,
        city:     entry.form?.city || entry.analysis?.city || '—',
        cashFlow: cf,
        capRate:  entry.analysis?.capRate ?? null,
        risk:     entry.analysis?.riskLevel || 'Moderate',
        score:    entry.analysis?.dealScore || entry.analysis?.opportunityScore || entry.analysis?.investmentScore || null,
      });
    });

    return rows.slice(0, 10);
  }, [portfolio, analyses]);

  // ── AI Advisor content ──────────────────────────────────────────────────────
  const advisor = useMemo(() => {
    const actions = [];
    if (!analyses.length) {
      actions.push({ text: 'Score your first property — enter financials to get a 100-point investment rating', path: '/score-engine' });
    }
    if (analyses.length && !portfolio.length) {
      actions.push({ text: 'Open the Portfolio Tracker to monitor returns on your saved analyses', path: '/portfolio-tracker' });
    }
    if (portfolio.length) {
      actions.push({ text: 'Generate an investor-ready report for a saved property', path: '/property-report-generator' });
    }
    if (portfolio.length >= 2) {
      actions.push({ text: 'Compare your top deals side-by-side to identify the best opportunity', path: '/property-comparison' });
    }
    actions.push({ text: 'Explore high-opportunity markets — Nashville, Dallas, and Raleigh lead this cycle', path: '/market-heat-map' });
    actions.push({ text: 'Compare up to 3 saved deals side-by-side with AI winner picks', path: '/property-comparison' });

    const summary = `Sun Belt markets (Dallas, Phoenix, Atlanta) are showing strong fundamentals with cap rates 5.5–6.8%. Nashville and Raleigh lead appreciation at 4.7–5.2% annually. Use the Score Engine to get a personalized 100-point investment rating on any property.`;

    return { summary, actions: actions.slice(0, 3) };
  }, [portfolio, analyses]);

  // ── Demo handlers ───────────────────────────────────────────────────────────

  function loadDemo() {
    const existing = safeJson('cinnova_properties') || [];
    const alreadyLoaded = localStorage.getItem('cinnova_demo_loaded') === 'true';

    if (alreadyLoaded) {
      if (!window.confirm('Demo data is already loaded. Reload it with fresh demo entries?')) return;
      const withoutDemo = existing.filter(e => !e.isDemo);
      const demos = buildDemoEntries();
      localStorage.setItem('cinnova_properties', JSON.stringify([...demos, ...withoutDemo].slice(0, 20)));
    } else {
      const realData = existing.filter(e => !e.isDemo);
      if (realData.length > 0) {
        const count = realData.length;
        const msg = `You have ${count} saved ${count === 1 ? 'analysis' : 'analyses'}. 5 demo properties will be added alongside your existing data. Your real data is preserved. Continue?`;
        if (!window.confirm(msg)) return;
      }
      const demos = buildDemoEntries();
      localStorage.setItem('cinnova_properties', JSON.stringify([...demos, ...realData].slice(0, 20)));
    }

    localStorage.setItem('cinnova_demo_loaded', 'true');
    setRefreshKey(k => k + 1);
  }

  function clearDemo() {
    const existing = safeJson('cinnova_properties') || [];
    const withoutDemo = existing.filter(e => !e.isDemo);
    localStorage.setItem('cinnova_properties', JSON.stringify(withoutDemo));
    localStorage.removeItem('cinnova_demo_loaded');
    setRefreshKey(k => k + 1);
  }

  function exploreMarket() {
    go('/market-heat-map');
  }

  const hasAnyData = portfolio.length > 0 || analyses.length > 0;
  const checklistComplete = checklist.filter(c => c.done).length;
  const allDone = checklist.length > 0 && checklistComplete === checklist.length;

  return (
    <div className="page">

      {/* ── Hero (cinematic) ── */}
      <section className="wd-hero" aria-label="CinNova Real Estate AI">

        {/* Decorative background layers */}
        <div className="wd-hero-bg" aria-hidden>
          {/* Clean cinematic photo (glowing property + AI rings + warm lights) */}
          <div
            className="wd-hero-photo"
            style={{ backgroundImage: "url('/images/real-estate-ai-hero-background-clean.png')" }}
          />
          {/* Bloom — blurred, brightened copy blended to make all lights glow more */}
          <div
            className="wd-hero-bloom"
            style={{ backgroundImage: "url('/images/real-estate-ai-hero-background-clean.png')" }}
          />
          {/* Light gradient overlay — keeps left text readable, right stays bright */}
          <div className="wd-hero-veil" />
          {/* Ambient depth glow */}
          <div className="wd-hero-glow wd-hero-glow--blue" />
          <div className="wd-hero-glow wd-hero-glow--teal" />
          {/* City skyline light glow */}
          <div className="wd-hero-spot wd-hero-spot--city" />
          {/* Soft golden bloom around the house */}
          <div className="wd-hero-goldbloom" />
          {/* Defined warm window glow (primary) */}
          <div className="wd-hero-windows" />
          {/* Warm exterior / landscaping glow */}
          <div className="wd-hero-spot wd-hero-spot--exterior" />
          {/* Warm tree / landscaping uplights */}
          <div className="wd-hero-trees" />
          {/* Cyan AI-ring glow (secondary, pulsing) */}
          <div className="wd-hero-spot wd-hero-spot--ring" />
          {/* Glowing circular AI grid/ring following the plaza ring shape */}
          <div className="wd-hero-ring" />
          <div className="wd-hero-ring wd-hero-ring--outer" />
          {/* Soft ground reflection under the house/ring */}
          <div className="wd-hero-reflect" />
          {/* Scattered blue light nodes / data points */}
          <svg className="wd-hero-nodes" viewBox="0 0 1440 620" preserveAspectRatio="xMidYMid slice" fill="none">
            {/* skyline + grid ambient nodes */}
            {[
              [120,90],[260,60],[410,120],[560,70],[720,50],[880,96],[1040,64],[1200,110],[1330,72],
              [90,300],[300,470],[520,540],[240,560],[700,520],[980,300],[1180,470],[1320,520],
              [1080,540],[620,300],[860,560],[430,330]
            ].map(([cx, cy], i) => (
              <circle key={`n${i}`} className={`wd-node wd-node--${i % 4}`} cx={cx} cy={cy} r={cy < 130 ? 2 : 2.6} fill="#7dd3fc" />
            ))}
            {/* brighter nodes tracing the circular ring around the house */}
            {[
              [690,452],[770,486],[864,506],[968,512],[1072,506],[1170,484],[1258,450],
              [812,500],[1118,498],[930,516],[1016,516]
            ].map(([cx, cy], i) => (
              <circle key={`r${i}`} className={`wd-node wd-node--ring wd-node--${i % 4}`} cx={cx} cy={cy} r="3" fill="#93e0ff" />
            ))}
          </svg>
          {/* Faint light sweep */}
          <div className="wd-hero-scan" />
          {/* Animated data arcs */}
          <svg className="wd-hero-arcs" viewBox="0 0 1440 320" preserveAspectRatio="xMidYMid slice" fill="none">
            <path className="wd-hero-arc wd-hero-arc--1" d="M-20 300 C 360 120, 760 120, 1120 40" stroke="#3b82f6" strokeWidth="1.2"/>
            <path className="wd-hero-arc wd-hero-arc--2" d="M-20 320 C 420 200, 900 200, 1460 60" stroke="#0d9488" strokeWidth="1.2"/>
            <path className="wd-hero-arc wd-hero-arc--3" d="M120 340 C 500 160, 1000 260, 1460 140" stroke="#22d3ee" strokeWidth="1"/>
          </svg>
        </div>

        <div className="wd-hero-inner">
          <div className="wd-hero-main">
            <div className="wd-hero-badges wd-anim wd-anim--1">
              <span className="wd-hb">CinNova Real Estate AI</span>
              <span className="wd-hb wd-hb--dot">Beta Active</span>
              <span className="wd-hb wd-hb--ghost">Property Intelligence Platform</span>
            </div>

            <h1 className="wd-hero-title">
              <span className="wd-hero-line wd-anim wd-anim--2">Analyze Properties.</span>
              <span className="wd-hero-line wd-anim wd-anim--3">Score Deals.</span>
              <span className="wd-hero-line wd-hero-accent wd-anim wd-anim--4">Invest Smarter.</span>
            </h1>

            <p className="wd-hero-sub wd-anim wd-anim--5">
              CinNova Real Estate AI helps you evaluate rental properties, estimate cash
              flow, compare markets, and turn raw numbers into confident investment decisions.
            </p>

            <div className="wd-hero-ctas wd-anim wd-anim--6">
              <button className="wd-hero-cta wd-hero-cta--primary" onClick={() => navigate('/analyzer')}>
                Start Property Analysis
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M3 8h9M8 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="wd-hero-cta wd-hero-cta--ghost" onClick={() => go('/score-engine')}>
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden>
                  <path d="M3 12.5C3 9.46 5.69 7 9 7s6 2.46 6 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M9 7V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  <path d="M9 12.5L6.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="9" cy="12.5" r="1.5" fill="currentColor"/>
                </svg>
                Run Deal Score
              </button>
            </div>

            <div className="wd-hero-features wd-anim wd-anim--7">
              {[
                {
                  title: '100-Point', sub: 'Deal Score', tone: 'green',
                  icon: (<><circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M6.2 9.2l2 2L12 7.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>),
                },
                {
                  title: 'Cash Flow &', sub: 'ROI Estimates', tone: 'teal',
                  icon: (<><circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M9 5.2V6.4M9 11.6v1.2M7 10.6c0 .9.9 1.4 2 1.4s2-.5 2-1.5-.9-1.3-2-1.6c-1.1-.3-2-.6-2-1.6 0-.9.9-1.3 2-1.3s2 .5 2 1.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></>),
                },
                {
                  title: 'Market', sub: 'Intelligence', tone: 'blue',
                  icon: (<><path d="M3 14V8M7 14V5M11 14v-4M15 14V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>),
                },
                {
                  title: 'AI Advisor', sub: 'Insights', tone: 'purple',
                  icon: (<><rect x="3" y="6" width="12" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.4"/><circle cx="6.5" cy="10" r="1" fill="currentColor"/><circle cx="11.5" cy="10" r="1" fill="currentColor"/><path d="M9 3v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="9" cy="2.6" r="1" fill="currentColor"/></>),
                },
              ].map((f, i) => (
                <div key={i} className="wd-hero-feat">
                  <span className={`wd-hero-feat-icon wd-hero-feat-icon--${f.tone}`} aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">{f.icon}</svg>
                  </span>
                  <div className="wd-hero-feat-txt">
                    <strong>{f.title}</strong>
                    <span>{f.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="wd-hero-fade" aria-hidden />
      </section>

      {/* ── Header ── */}
      <div className="page-header wd-page-header">
        <div>
          <div className="wd-header-badges">
            <span className="badge badge-blue">CinNova</span>
            <span className="badge badge-teal">Workspace</span>
            {hasAnyData && <span className="badge badge-green">Live Data</span>}
            {demoLoaded && <span className="badge badge-gold">Demo Active</span>}
          </div>
          <h1 className="page-title">Investment Command Center</h1>
          <p className="page-subtitle">Score deals, manage your pipeline, and track portfolio returns — your AI-powered real estate command center.</p>
        </div>
        <div className="wd-header-meta">
          <span className="wd-last-updated">Updated {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
          <div className="wd-header-demo-btns">
            {!demoLoaded
              ? <button className="btn btn-outline btn-sm" onClick={loadDemo}>Load Demo Portfolio</button>
              : <button className="wd-clear-demo-btn" onClick={clearDemo}>✕ Clear Demo Data</button>
            }
          </div>
        </div>
      </div>

      {/* ── Beta Mode Banner ── */}
      <div className="wd-beta-mode-banner">
        <span className="wd-beta-mode-badge">BETA</span>
        <span className="wd-beta-mode-text">
          CinNova Real Estate AI is currently in beta. Calculations are estimates only.
        </span>
        <button
          className="wd-beta-mode-link"
          onClick={() => go('/beta-readiness')}
          disabled={isComingSoon('/beta-readiness')}
        >
          What's in beta <Soon />
        </button>
      </div>

      {/* ── KPI cards ── */}
      <div className="section">
        <div className="wd-kpi-grid wd-anim wd-anim--8">
          <KpiCard
            icon={<KpiAnalyzeIcon />}
            label="Properties Analyzed"
            value={analyses.length || '0'}
            sub={analyses.length ? `${analyses.length} saved analys${analyses.length === 1 ? 'is' : 'es'}` : 'No analyses yet'}
            accent="blue"
            onClick={() => go('/score-engine')}
            trend={analyses.length ? 'Open score engine →' : null}
            trendUp
          />
          <KpiCard
            icon={<KpiSavedIcon />}
            label="Deals Saved"
            value={portfolio.length || '0'}
            sub={portfolio.length ? `${portfolio.length} portfolio propert${portfolio.length === 1 ? 'y' : 'ies'}` : 'No deals saved yet'}
            accent="emerald"
            trend={portfolio.length ? 'Portfolio tracker — soon' : null}
            trendUp
          />
          <KpiCard
            icon={<KpiValueIcon />}
            label="Portfolio Value"
            value={kpi.portfolioValue ? fmtPrice(kpi.portfolioValue) : '—'}
            sub={portfolio.length ? `Across ${portfolio.length} properties` : 'Save properties to track'}
            accent="gold"
            trend={portfolio.length ? `$${Math.round(kpi.portfolioValue * 0.03).toLocaleString()} est. annual appreciation` : null}
            trendUp
          />
          <KpiCard
            icon={<KpiScoreIcon />}
            label="Avg. Investment Score"
            value={kpi.avgScore != null ? `${kpi.avgScore}/100` : '—'}
            sub={kpi.avgScore != null ? recLabel(kpi.avgScore) : 'Analyze properties to score'}
            accent={kpi.avgScore != null ? (kpi.avgScore >= 70 ? 'green' : kpi.avgScore >= 55 ? 'blue' : 'amber') : 'gray'}
            onClick={() => go('/score-engine')}
            trend={kpi.avgScore != null ? 'Open score engine →' : null}
            trendUp={kpi.avgScore != null && kpi.avgScore >= 55}
          />
        </div>
      </div>

      {/* ── Demo banner (new users, no data) ── */}
      {!hasAnyData && !demoLoaded && (
        <div className="wd-demo-banner">
          <span className="wd-demo-banner-icon">🎮</span>
          <div className="wd-demo-banner-body">
            <strong>New here?</strong> Load 5 realistic investment scenarios — Phoenix, Dallas, Atlanta, Tampa, and Raleigh — to explore every feature of the platform.
          </div>
          <button className="btn btn-primary btn-sm" onClick={loadDemo}>
            Load Demo Portfolio
          </button>
        </div>
      )}

      {/* ── Onboard empty state ── */}
      {!hasAnyData && (
        <div className="wd-onboard-banner">
          <div className="wd-onboard-icon">🏠</div>
          <div className="wd-onboard-body">
            <strong>Start by analyzing your first property.</strong>
            <p>Search any address, run AI deal scoring, and build your investment portfolio — all in one place.</p>
          </div>
          <div className="wd-onboard-actions">
            <button className="btn btn-primary" onClick={() => go('/score-engine')}>
              Analyze a Property
            </button>
            <button className="btn btn-outline" onClick={() => go('/market-heat-map')} disabled={isComingSoon('/market-heat-map')}>
              Explore Markets {isComingSoon('/market-heat-map') && <Soon />}
            </button>
          </div>
        </div>
      )}

      {/* ── Onboarding checklist ── */}
      {!allDone && <div className="wd-checklist-card card">
        <div className="wd-checklist-header">
          <div className="wd-checklist-title-row">
            <h3 className="wd-checklist-title">
              {allDone ? '🎉 Getting Started — Complete!' : 'Getting Started'}
            </h3>
            <div className="wd-checklist-progress-wrap">
              <div className="wd-checklist-bar">
                <div
                  className="wd-checklist-bar-fill"
                  style={{ width: `${(checklistComplete / Math.max(checklist.length, 1)) * 100}%` }}
                />
              </div>
              <span className="wd-checklist-progress-label">{checklistComplete}/{checklist.length}</span>
            </div>
          </div>
        </div>

        <div className="wd-checklist-items">
          {checklist.map((item, i) => (
            <button
              key={i}
              type="button"
              className={`wd-cl-item${item.done ? ' wd-cl-item--done' : ''}`}
              onClick={() => go(item.path)}
              disabled={isComingSoon(item.path)}
            >
              <span className="wd-cl-check" aria-hidden>
                {item.done
                  ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : null}
              </span>
              <span className="wd-cl-icon">{item.icon}</span>
              <span className="wd-cl-label">{item.label}</span>
              {!item.done && (isComingSoon(item.path) ? <Soon /> : <span className="wd-cl-go">Go →</span>)}
            </button>
          ))}
        </div>
      </div>}

      {/* ── Main content: table + advisor ── */}
      <div className="wd-main-row">

        {/* Recent properties table */}
        <div className="wd-table-panel card">
          <div className="card-header">
            <h2 className="card-title">Recent Properties & Deals</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="badge badge-blue">{tableRows.length} total</span>
              <button className="btn btn-ghost btn-sm" onClick={() => go('/portfolio-tracker')} disabled={isComingSoon('/portfolio-tracker')}>View all <Soon /></button>
            </div>
          </div>

          {tableRows.length === 0 ? (
            <div className="wd-table-empty">
              <div className="wd-empty-icon">📋</div>
              <p>No properties yet. Analyze or save a property to see it here.</p>
              <button className="btn btn-primary btn-sm" onClick={() => go('/score-engine')}>
                Analyze a Property →
              </button>
            </div>
          ) : (
            <div className="wd-table-wrap">
              <table className="wd-table">
                <thead>
                  <tr>
                    <th>Address</th>
                    <th>Market</th>
                    <th>Cash Flow</th>
                    <th>Cap Rate</th>
                    <th>Risk</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, i) => {
                    const rb    = riskBadge(row.risk);
                    const color = scoreColor(row.score);
                    const label = recLabel(row.score);
                    const cfNum = row.cashFlow;
                    const crNum = typeof row.capRate === 'number'
                      ? row.capRate
                      : parseFloat(String(row.capRate || '').replace('%', ''));
                    return (
                      <tr key={i} className="wd-tr">
                        <td className="wd-td-addr">
                          <div className="wd-addr-primary">{row.address.split(',')[0]}</div>
                          <div className="wd-addr-city">{row.address.split(',').slice(1).join(',').trim() || '—'}</div>
                        </td>
                        <td className="wd-td-city">{row.city}</td>
                        <td className={`wd-td-cf ${cfNum != null && cfNum < 0 ? 'wd-cf--neg' : cfNum != null ? 'wd-cf--pos' : ''}`}>
                          {cfNum != null ? fmtCF(cfNum) : '—'}
                        </td>
                        <td className="wd-td-cr">
                          {!isNaN(crNum) && crNum > 0 ? (
                            <span style={{ color: crNum >= 6 ? '#059669' : crNum >= 4 ? '#2563eb' : '#d97706', fontWeight: 800 }}>
                              {crNum.toFixed(1)}%
                            </span>
                          ) : '—'}
                        </td>
                        <td><span className={`wd-risk-badge ${rb.cls}`}>{rb.label}</span></td>
                        <td>
                          {row.score != null ? (
                            <span className="wd-status-badge" style={{ color, borderColor: color + '33', background: color + '11' }}>
                              {label}
                            </span>
                          ) : (
                            <span className="wd-status-badge wd-status--gray">Unscored</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* AI Advisor card */}
        <div className="wd-advisor-panel card">
          <div className="wd-advisor-header">
            <div className="wd-advisor-icon">
              <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="6" width="14" height="9" rx="2.5" stroke="white" strokeWidth="1.5"/>
                <circle cx="6.5" cy="10.5" r="1" fill="white"/>
                <circle cx="11.5" cy="10.5" r="1" fill="white"/>
                <path d="M9 2V6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="9" cy="1.8" r="1.2" fill="white"/>
              </svg>
            </div>
            <div>
              <div className="wd-advisor-title">AI Advisor</div>
              <div className="wd-advisor-status">Active</div>
            </div>
          </div>

          <p className="wd-advisor-greeting">{greeting()}, Investor.</p>

          <div className="wd-advisor-summary">{advisor.summary}</div>

          <div className="wd-advisor-actions-label">Suggested next actions</div>
          <div className="wd-advisor-actions">
            {advisor.actions.map((a, i) => (
              <button
                key={i}
                className="wd-advisor-action"
                onClick={() => go(a.path)}
                disabled={isComingSoon(a.path)}
              >
                <span className="wd-action-num">{i + 1}</span>
                <span className="wd-action-text">{a.text}</span>
                {isComingSoon(a.path) ? <Soon /> : <span className="wd-action-arrow">→</span>}
              </button>
            ))}
          </div>

          <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={() => go('/ai-advisor-chat')} disabled={isComingSoon('/ai-advisor-chat')}>
            AI Advisor <Soon />
          </button>
        </div>
      </div>

      {/* ── Market opportunities ── */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Market Opportunities</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => go('/market-heat-map')} disabled={isComingSoon('/market-heat-map')}>
            Full market analysis {isComingSoon('/market-heat-map') && <Soon />}
          </button>
        </div>
        <div className="wd-markets-grid">
          {MARKETS.map(m => (
            <MarketCard key={m.city} m={m} onExplore={exploreMarket} disabled={isComingSoon('/market-heat-map')} />
          ))}
        </div>
      </div>

      {/* ── Beta Testing Checklist ── */}
      <div className="card wd-beta-checklist">
        <div className="card-header">
          <h2 className="card-title">Beta Testing Checklist</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="badge badge-gold">Beta v0.1</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setBetaClOpen(o => !o)}>
              {betaClOpen ? 'Collapse ▲' : 'Expand ▼'}
            </button>
          </div>
        </div>
        {betaClOpen && <p className="wd-beta-cl-intro">
          Help us test these core workflows — click any item to go directly to the feature.
        </p>}
        {betaClOpen && <div className="wd-beta-cl-items">
          {[
            { icon: '📊', label: 'Test Score Engine',   note: 'Enter any property + get a 100-point score',           path: '/score-engine' },
            { icon: '💾', label: 'Save an analysis',    note: 'Click Save Analysis after scoring to add to portfolio', path: '/score-engine' },
            { icon: '📄', label: 'Generate a report',   note: 'Select a saved property and copy the investor report',  path: '/property-report-generator' },
            { icon: '⚖️', label: 'Compare properties',  note: 'Compare 2–3 deals side by side with AI winner picks',  path: '/property-comparison' },
            { icon: '🤖', label: 'Ask AI Advisor',      note: 'Try a suggested prompt about your portfolio',           path: '/ai-advisor-chat' },
          ].map((item, i) => (
            <button key={i} className="wd-beta-cl-item" onClick={() => go(item.path)} disabled={isComingSoon(item.path)}>
              <span className="wd-beta-cl-icon">{item.icon}</span>
              <div className="wd-beta-cl-body">
                <span className="wd-beta-cl-label">{item.label}</span>
                <span className="wd-beta-cl-note">{item.note}</span>
              </div>
              {isComingSoon(item.path) ? <Soon /> : <span className="wd-beta-cl-arrow">→</span>}
            </button>
          ))}
        </div>}
      </div>

      {/* ── Quick actions ── */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Quick Actions</h2>
        </div>
        <div className="wd-quick-actions">
          <button className="wd-qa-btn wd-qa-btn--primary" onClick={() => go('/score-engine')}>
            <span className="wd-qa-icon"><AnalyzeIcon /></span>
            <div>
              <div className="wd-qa-label">Analyze Property</div>
              <div className="wd-qa-sub">AI deal scoring in seconds</div>
            </div>
          </button>
          <button className="wd-qa-btn wd-qa-btn--teal" onClick={() => go('/ai-advisor-chat')} disabled={isComingSoon('/ai-advisor-chat')}>
            <span className="wd-qa-icon"><HubIcon /></span>
            <div>
              <div className="wd-qa-label">AI Advisor <Soon /></div>
              <div className="wd-qa-sub">Ask about your portfolio</div>
            </div>
          </button>
          <button className="wd-qa-btn wd-qa-btn--gold" onClick={() => go('/property-report-generator')} disabled={isComingSoon('/property-report-generator')}>
            <span className="wd-qa-icon"><ReportIcon /></span>
            <div>
              <div className="wd-qa-label">Generate Report <Soon /></div>
              <div className="wd-qa-sub">Investor-ready report in seconds</div>
            </div>
          </button>
          <button className="wd-qa-btn wd-qa-btn--purple" onClick={() => go('/market-heat-map')} disabled={isComingSoon('/market-heat-map')}>
            <span className="wd-qa-icon"><MktIcon /></span>
            <div>
              <div className="wd-qa-label">Market Heat Map {isComingSoon('/market-heat-map') && <Soon />}</div>
              <div className="wd-qa-sub">Nashville, Dallas, Raleigh +</div>
            </div>
          </button>
          <button className="wd-qa-btn wd-qa-btn--indigo" onClick={() => go('/score-engine')}>
            <span className="wd-qa-icon"><ScoreEngineIcon /></span>
            <div>
              <div className="wd-qa-label">Score Engine</div>
              <div className="wd-qa-sub">Enter any property, get a score</div>
            </div>
          </button>
        </div>
      </div>

      <BetaFooter page="Main Dashboard" readinessSoon />

    </div>
  );
}
