import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Homepage.css';

/* ── Icons ──────────────────────────────────────────────── */
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M13 13L18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
);
const TrendUpIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <polyline points="2,13 6,9 9,11 14,5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.5 5H14V8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const TrendDownIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <polyline points="2,5 6,9 9,7 14,13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.5 13H14V9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
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
const MapPinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6C3.5 9.5 8 14.5 8 14.5C8 14.5 12.5 9.5 12.5 6C12.5 3.5 10.5 1.5 8 1.5Z" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="8" cy="6" r="1.5" fill="currentColor"/>
  </svg>
);
const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5L14 4V8C14 11 11.5 13.5 8 14.5C4.5 13.5 2 11 2 8V4L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M5.5 8L7 9.5L10.5 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const BarChartIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="8" width="3" height="6" rx="1" fill="currentColor" opacity="0.5"/>
    <rect x="6.5" y="5" width="3" height="9" rx="1" fill="currentColor" opacity="0.7"/>
    <rect x="11" y="2" width="3" height="12" rx="1" fill="currentColor"/>
  </svg>
);
const StarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5L9.7 5.8H14.4L10.7 8.4L12.1 12.8L8 10.2L3.9 12.8L5.3 8.4L1.6 5.8H6.3L8 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
);

/* ── Hero Property Card ──────────────────────────────────── */
function HeroPropertyCard() {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="hp-prop-card">
      <div className="hp-prop-img">
        {imageFailed ? (
          <div className="hp-prop-photo hp-prop-photo-fallback">
            <span>CinNova Property</span>
          </div>
        ) : (
          <img
            className="hp-prop-photo"
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=82"
            alt="Luxury residential property"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        )}
        <div className="hp-prop-badge">AI Score: 91</div>
      </div>
      <div className="hp-prop-body">
        <div className="hp-prop-price">$847,000</div>
        <div className="hp-prop-addr">2140 Brickell Ave, Miami, FL 33129</div>
        <div className="hp-prop-meta">
          <span>4 bd</span><span className="dot">·</span>
          <span>3 ba</span><span className="dot">·</span>
          <span>2,840 sqft</span>
        </div>
        <div className="hp-prop-tags">
          <span className="hp-prop-tag green">+12.3% YoY</span>
          <span className="hp-prop-tag gold">ROI 8.4%</span>
          <span className="hp-prop-tag navy">Cash Flow +$1,240</span>
        </div>
      </div>
    </div>
  );
}

/* ── Market Insight Card ─────────────────────────────────── */
function MarketCard({ label, value, change, changeVal, up, icon }) {
  return (
    <div className="hp-mkt-card">
      <div className="hp-mkt-icon">{icon}</div>
      <div className="hp-mkt-label">{label}</div>
      <div className="hp-mkt-value">{value}</div>
      <div className={`hp-mkt-change ${up ? 'up' : 'down'}`}>
        {up ? <TrendUpIcon /> : <TrendDownIcon />}
        <span>{changeVal} {change}</span>
      </div>
    </div>
  );
}

/* ── AI Chat Preview ─────────────────────────────────────── */
function AIChatPreview() {
  const messages = [
    { role: 'user', text: 'What\'s the investment potential of 2140 Brickell Ave?' },
    { role: 'ai',   text: 'Great pick! This property scores 91/100. With a cap rate of 6.8% and estimated monthly cash flow of +$1,240, it\'s well above Miami market averages. Strong rental demand in Brickell makes this a solid buy-and-hold.' },
    { role: 'user', text: 'What\'s the risk level?' },
    { role: 'ai',   text: 'Risk is rated Low-Medium. The area has <2% vacancy, strong job growth, and no flood zone concerns. I\'d suggest locking in a 30-year fixed at current rates. Want me to run a full downside scenario?' },
  ];
  return (
    <div className="hp-chat">
      <div className="hp-chat-header">
        <div className="hp-chat-avatar"><BotIcon /></div>
        <div>
          <div className="hp-chat-name">CinNova AI Advisor</div>
          <div className="hp-chat-status"><span className="hp-chat-dot"/>Online · Analyzing</div>
        </div>
      </div>
      <div className="hp-chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`hp-chat-msg ${m.role}`}>
            {m.role === 'ai' && <div className="hp-chat-msg-avatar"><BotIcon /></div>}
            <div className="hp-chat-bubble">{m.text}</div>
          </div>
        ))}
        <div className="hp-chat-typing">
          <div className="hp-chat-msg-avatar"><BotIcon /></div>
          <div className="hp-chat-bubble hp-typing">
            <span/><span/><span/>
          </div>
        </div>
      </div>
      <div className="hp-chat-input">
        <input placeholder="Ask about any property..." readOnly />
        <button><ChevronRightIcon /></button>
      </div>
    </div>
  );
}

/* ── Map Preview ─────────────────────────────────────────── */
function MapPreview() {
  const markers = [
    { x: 120, y: 80,  price: '$847K', score: 91, hot: true  },
    { x: 230, y: 110, price: '$1.2M', score: 84, hot: false },
    { x: 80,  y: 155, price: '$564K', score: 78, hot: false },
    { x: 300, y: 70,  price: '$395K', score: 88, hot: true  },
    { x: 185, y: 175, price: '$720K', score: 72, hot: false },
    { x: 350, y: 140, price: '$2.1M', score: 95, hot: true  },
  ];
  return (
    <div className="hp-map">
      <svg className="hp-map-svg" viewBox="0 0 460 240" preserveAspectRatio="xMidYMid slice">
        <rect width="460" height="240" fill="#0a1628"/>
        {/* Grid streets */}
        {[40,80,120,160,200].map(y => (
          <line key={`h${y}`} x1="0" y1={y} x2="460" y2={y} stroke="#1a2f4e" strokeWidth="1"/>
        ))}
        {[60,120,180,240,300,360,420].map(x => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="240" stroke="#1a2f4e" strokeWidth="1"/>
        ))}
        {/* Main roads */}
        <line x1="0" y1="120" x2="460" y2="120" stroke="#1e3a5f" strokeWidth="3"/>
        <line x1="200" y1="0" x2="200" y2="240" stroke="#1e3a5f" strokeWidth="3"/>
        <line x1="0" y1="60" x2="460" y2="60" stroke="#162840" strokeWidth="2"/>
        {/* Blocks */}
        {[[20,25,50,25],[130,25,55,25],[250,25,60,25],[350,25,90,25],
          [20,85,50,25],[130,85,55,25],[250,85,60,25],[350,85,90,25],
          [20,145,50,25],[130,145,55,25],[250,145,60,25],[350,145,90,25],
          [20,185,50,45],[130,185,55,45],[260,185,60,45],[350,185,90,45]
        ].map(([x,y,w,h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} rx="2" fill="#0f2038" opacity="0.7"/>
        ))}
        {/* Park area */}
        <rect x="75" y="130" width="45" height="40" rx="4" fill="#0d3320" opacity="0.8"/>
        <rect x="76" y="131" width="43" height="38" rx="3" fill="#0f3d27" opacity="0.6"/>
        {/* Water */}
        <ellipse cx="400" cy="195" rx="55" ry="40" fill="#0d2848" opacity="0.9"/>
        {/* Property markers */}
        {markers.map((m, i) => (
          <g key={i}>
            <circle cx={m.x} cy={m.y} r={m.hot ? 18 : 14} fill={m.hot ? 'rgba(201,168,76,0.2)' : 'rgba(30,58,95,0.3)'}/>
            <circle cx={m.x} cy={m.y} r={m.hot ? 10 : 8}
              fill={m.hot ? '#c9a84c' : '#2d6a9f'}
              stroke="white" strokeWidth="1.5"/>
            <text x={m.x} y={m.y + 4} textAnchor="middle" fill="white" fontSize="6" fontWeight="700">
              {m.score}
            </text>
            <rect x={m.x - 20} y={m.y - 26} width="40" height="14" rx="4" fill="rgba(6,12,24,0.85)"/>
            <text x={m.x} y={m.y - 16} textAnchor="middle" fill="#e8c46a" fontSize="7" fontWeight="700">
              {m.price}
            </text>
          </g>
        ))}
      </svg>
      <div className="hp-map-legend">
        <span className="hp-map-legend-item gold"><span/>Hot Opportunity</span>
        <span className="hp-map-legend-item blue"><span/>Listed Property</span>
      </div>
    </div>
  );
}

/* ── Portfolio Chart ─────────────────────────────────────── */
function PortfolioChart() {
  const points = [42,48,44,52,58,55,63,69,65,74,78,82];
  const max = 100;
  const w = 360, h = 100;
  const pts = points.map((v, i) => `${(i / (points.length - 1)) * w},${h - (v / max) * h}`).join(' ');
  const areaPoints = `0,${h} ${pts} ${w},${h}`;
  return (
    <div className="hp-port-chart">
      <svg width="100%" height="100" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#c9a84c" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#portGrad)"/>
        <polyline points={pts} fill="none" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Last point dot */}
        {(() => {
          const last = points.length - 1;
          const x = w;
          const y = h - (points[last] / max) * h;
          return <circle cx={x} cy={y} r="5" fill="#c9a84c" stroke="white" strokeWidth="2"/>;
        })()}
      </svg>
    </div>
  );
}

/* ── Data ────────────────────────────────────────────────── */
const MARKET_CARDS = [
  { label: 'Median Home Price', value: '$412,500', changeVal: '↑ 3.2%', change: 'YoY', up: true,  icon: <BarChartIcon /> },
  { label: '30-Yr Mortgage Rate', value: '6.82%',   changeVal: '↓ 0.15%', change: 'vs last mo', up: false, icon: <TrendDownIcon /> },
  { label: 'Days on Market',     value: '38 days',  changeVal: '↓ 4 days', change: 'faster', up: false, icon: <TrendDownIcon /> },
  { label: 'Housing Inventory',  value: '2.1M',     changeVal: '↑ 8.3%', change: 'supply', up: true,  icon: <BarChartIcon /> },
  { label: 'Rental Vacancy',     value: '5.8%',     changeVal: '↓ 0.3%', change: 'tighter', up: false, icon: <TrendDownIcon /> },
  { label: 'Foreclosure Rate',   value: '0.41%',    changeVal: '↓ 0.1%', change: 'risk', up: false, icon: <ShieldIcon /> },
];

const AI_FEATURES = [
  { icon: <StarIcon />,    text: 'Instant deal scoring on any property' },
  { icon: <BarChartIcon />, text: 'AI-powered market comparables' },
  { icon: <ShieldIcon />,  text: 'Risk assessment & mitigation' },
  { icon: <SparkleIcon />, text: 'Investment strategy recommendations' },
];

/* ── Homepage Component ──────────────────────────────────── */
export default function Homepage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [propType, setPropType]       = useState('buy');
  const [purchasePrice, setPrice]     = useState(650000);
  const [downPct, setDown]            = useState(20);
  const [rate, setRate]               = useState(6.82);

  const loan        = purchasePrice * (1 - downPct / 100);
  const mo          = rate / 100 / 12;
  const mortgage    = loan * (mo * Math.pow(1 + mo, 360)) / (Math.pow(1 + mo, 360) - 1);
  const rent        = purchasePrice * 0.0075;
  const expenses    = purchasePrice * 0.0012;
  const cashFlow    = rent - mortgage - expenses;
  const capRate     = ((rent * 12 - expenses * 12) / purchasePrice * 100).toFixed(2);

  return (
    <div className="homepage">

      {/* ── 1. Hero ─────────────────────────────────────── */}
      <section className="hp-hero">
        <div className="hp-hero-glow hp-hero-glow-l"/>
        <div className="hp-hero-glow hp-hero-glow-r"/>
        <div className="hp-hero-inner">
          <div className="hp-hero-left">
            <div className="hp-hero-pill">
              <SparkleIcon />
              AI-Powered · Real Estate Intelligence
            </div>
            <h1 className="hp-hero-title">
              AI Real Estate<br/>
              Intelligence for<br/>
              <span className="hp-hero-gold">Smarter Property</span><br/>
              Decisions
            </h1>
            <p className="hp-hero-sub">
              Leverage cutting-edge AI to analyze markets, score deals,
              forecast returns, and build lasting wealth through real estate.
            </p>
            <div className="hp-hero-actions">
              <button className="hp-btn-gold" onClick={() => navigate('/property-search')}>
                Start Analyzing <ChevronRightIcon />
              </button>
              <button className="hp-btn-ghost" onClick={() => navigate('/dashboard')}>
                View Dashboard
              </button>
            </div>
            <div className="hp-hero-trust">
              <span><strong>1,248+</strong> Properties Analyzed</span>
              <span className="hp-trust-sep"/>
              <span><strong>89</strong> Programs Available</span>
              <span className="hp-trust-sep"/>
              <span><strong>Real-Time</strong> Market Data</span>
            </div>
          </div>
          <div className="hp-hero-right">
            <HeroPropertyCard />
            <div className="hp-hero-float hp-hero-float-1">
              <TrendUpIcon />
              <span>+23.4% Portfolio</span>
            </div>
            <div className="hp-hero-float hp-hero-float-2">
              <StarIcon />
              <span>Score: 91/100</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Property Search ───────────────────────────── */}
      <section className="hp-search">
        <div className="hp-search-tabs">
          {['buy','rent','invest'].map(t => (
            <button key={t}
              className={`hp-search-tab${propType === t ? ' active' : ''}`}
              onClick={() => setPropType(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="hp-search-bar">
          <span className="hp-search-icon"><SearchIcon /></span>
          <input
            className="hp-search-input"
            placeholder="Enter address, city, neighborhood, or ZIP code..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <div className="hp-search-filters">
            <select className="hp-search-select">
              <option>Any Price</option>
              <option>Under $300K</option>
              <option>$300K–$600K</option>
              <option>$600K–$1M</option>
              <option>$1M+</option>
            </select>
            <select className="hp-search-select">
              <option>Any Beds</option>
              <option>1+ Beds</option>
              <option>2+ Beds</option>
              <option>3+ Beds</option>
              <option>4+ Beds</option>
            </select>
            <select className="hp-search-select">
              <option>Any Type</option>
              <option>Single Family</option>
              <option>Condo</option>
              <option>Multifamily</option>
              <option>Commercial</option>
            </select>
          </div>
          <button className="hp-search-btn" onClick={() => navigate('/property-search')}>
            <SearchIcon /> Search
          </button>
        </div>
        <div className="hp-search-popular">
          <span>Popular searches:</span>
          {['Miami, FL', 'Austin, TX', 'Phoenix, AZ', 'Denver, CO', 'Nashville, TN'].map(city => (
            <button key={city} className="hp-search-pill" onClick={() => { setSearchQuery(city); navigate('/property-search'); }}>
              <MapPinIcon /> {city}
            </button>
          ))}
        </div>
      </section>

      {/* ── 3. Market Insights ───────────────────────────── */}
      <section className="hp-section hp-market-section">
        <div className="hp-section-hdr">
          <div className="hp-section-pill">Live Market Data</div>
          <h2 className="hp-section-title">Market Intelligence Dashboard</h2>
          <p className="hp-section-sub">Real-time metrics powering smarter investment decisions across all US markets</p>
        </div>
        <div className="hp-mkt-grid">
          {MARKET_CARDS.map(card => <MarketCard key={card.label} {...card} />)}
        </div>
      </section>

      {/* ── 4. Investment Calculator ─────────────────────── */}
      <section className="hp-calc-section">
        <div className="hp-calc-inner">
          <div className="hp-calc-left">
            <div className="hp-section-pill light">AI Calculator</div>
            <h2 className="hp-calc-title">Model Your Returns<br/>Before Making an Offer</h2>
            <p className="hp-calc-sub">Instantly calculate mortgage payments, cash flow, and ROI for any property.</p>

            <div className="hp-calc-fields">
              <div className="hp-calc-field">
                <div className="hp-calc-field-hdr">
                  <label>Purchase Price</label>
                  <span className="hp-calc-val">${purchasePrice.toLocaleString()}</span>
                </div>
                <input type="range" min={100000} max={2000000} step={5000}
                  value={purchasePrice} onChange={e => setPrice(+e.target.value)}
                  className="hp-range"/>
                <div className="hp-range-bounds"><span>$100K</span><span>$2M</span></div>
              </div>

              <div className="hp-calc-field">
                <div className="hp-calc-field-hdr">
                  <label>Down Payment</label>
                  <span className="hp-calc-val">{downPct}% (${(purchasePrice * downPct / 100).toLocaleString()})</span>
                </div>
                <input type="range" min={3} max={40} step={1}
                  value={downPct} onChange={e => setDown(+e.target.value)}
                  className="hp-range"/>
                <div className="hp-range-bounds"><span>3%</span><span>40%</span></div>
              </div>

              <div className="hp-calc-field">
                <div className="hp-calc-field-hdr">
                  <label>Interest Rate</label>
                  <span className="hp-calc-val">{rate.toFixed(2)}%</span>
                </div>
                <input type="range" min={3} max={12} step={0.1}
                  value={rate} onChange={e => setRate(+e.target.value)}
                  className="hp-range"/>
                <div className="hp-range-bounds"><span>3%</span><span>12%</span></div>
              </div>
            </div>
          </div>

          <div className="hp-calc-right">
            <div className="hp-calc-result">
              <div className="hp-calc-result-hdr">Monthly Breakdown</div>
              <div className="hp-calc-rows">
                <div className="hp-calc-row">
                  <span>Mortgage Payment</span>
                  <strong className="neg">${Math.round(mortgage).toLocaleString()}</strong>
                </div>
                <div className="hp-calc-row">
                  <span>Operating Expenses</span>
                  <strong className="neg">-${Math.round(expenses).toLocaleString()}</strong>
                </div>
                <div className="hp-calc-row">
                  <span>Est. Rental Income</span>
                  <strong className="pos">+${Math.round(rent).toLocaleString()}</strong>
                </div>
                <div className="hp-calc-divider"/>
                <div className="hp-calc-row hp-calc-total">
                  <span>Net Cash Flow</span>
                  <strong className={cashFlow >= 0 ? 'pos' : 'neg'}>
                    {cashFlow >= 0 ? '+' : ''}${Math.round(cashFlow).toLocaleString()}/mo
                  </strong>
                </div>
              </div>
              <div className="hp-calc-metrics">
                <div className="hp-calc-metric">
                  <span>Cap Rate</span>
                  <strong>{capRate}%</strong>
                </div>
                <div className="hp-calc-metric">
                  <span>Loan Amount</span>
                  <strong>${(loan / 1000).toFixed(0)}K</strong>
                </div>
                <div className="hp-calc-metric">
                  <span>GRM</span>
                  <strong>{(purchasePrice / (rent * 12)).toFixed(1)}x</strong>
                </div>
              </div>
              <button className="hp-btn-gold full" onClick={() => navigate('/deal-analyzer')}>
                Run Full Deal Analysis <ChevronRightIcon />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. AI Assistant Preview ──────────────────────── */}
      <section className="hp-section hp-ai-section">
        <div className="hp-ai-inner">
          <div className="hp-ai-left">
            <div className="hp-section-pill">AI Advisor</div>
            <h2 className="hp-section-title">Your Personal<br/>Real Estate AI</h2>
            <p className="hp-section-sub">
              Ask any question about a property, market, or investment strategy
              and get expert-level analysis in seconds.
            </p>
            <ul className="hp-ai-features">
              {AI_FEATURES.map((f, i) => (
                <li key={i} className="hp-ai-feature">
                  <span className="hp-ai-feature-icon">{f.icon}</span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
            <button className="hp-btn-navy" onClick={() => navigate('/advisor')}>
              <BotIcon /> Chat with AI Advisor
            </button>
          </div>
          <div className="hp-ai-right">
            <AIChatPreview />
          </div>
        </div>
      </section>

      {/* ── 6. Map Preview ───────────────────────────────── */}
      <section className="hp-map-section">
        <div className="hp-map-overlay">
          <div className="hp-section-pill light">Property Explorer</div>
          <h2 className="hp-map-title">Explore Properties on the Map</h2>
          <p className="hp-map-sub">
            Every listing enriched with AI scores, cash flow estimates, and market data.
          </p>
          <button className="hp-btn-gold" onClick={() => navigate('/map')}>
            <MapPinIcon /> Explore Map
          </button>
        </div>
        <MapPreview />
      </section>

      {/* ── 7. Portfolio Analytics Preview ───────────────── */}
      <section className="hp-section hp-portfolio-section">
        <div className="hp-section-hdr">
          <div className="hp-section-pill">Portfolio</div>
          <h2 className="hp-section-title">Track Your Investment Portfolio</h2>
          <p className="hp-section-sub">Monitor performance, cash flow, and returns in one unified dashboard.</p>
        </div>
        <div className="hp-port-card">
          <div className="hp-port-header">
            <div className="hp-port-header-left">
              <div className="hp-port-title">Portfolio Performance</div>
              <div className="hp-port-value">$1,248,500 <span className="hp-port-change">↑ 18.4% YTD</span></div>
            </div>
            <div className="hp-port-tabs">
              {['1M','3M','6M','1Y','ALL'].map((t, i) => (
                <button key={t} className={`hp-port-tab${i === 3 ? ' active' : ''}`}>{t}</button>
              ))}
            </div>
          </div>
          <PortfolioChart />
          <div className="hp-port-metrics">
            {[
              { label: 'Total Properties', value: '7', up: true  },
              { label: 'Monthly Cash Flow', value: '+$4,820', up: true  },
              { label: 'Avg. ROI', value: '9.2%', up: true  },
              { label: 'Equity Built', value: '$312K', up: true  },
              { label: 'Vacancy Rate', value: '3.1%', up: false },
              { label: 'Portfolio Score', value: '87/100', up: true  },
            ].map(m => (
              <div key={m.label} className="hp-port-metric">
                <span className="hp-port-metric-label">{m.label}</span>
                <span className={`hp-port-metric-val ${m.up ? 'pos' : 'warn'}`}>{m.value}</span>
              </div>
            ))}
          </div>
          <div className="hp-port-cta">
            <button className="hp-btn-navy" onClick={() => navigate('/portfolio')}>
              Open Full Dashboard <ChevronRightIcon />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer CTA ───────────────────────────────────── */}
      <section className="hp-footer-cta">
        <div className="hp-footer-glow"/>
        <div className="hp-footer-inner">
          <h2>Ready to Invest Smarter?</h2>
          <p>Join thousands of investors using AI to find better deals, faster.</p>
          <div className="hp-footer-actions">
            <button className="hp-btn-gold" onClick={() => navigate('/property-search')}>
              Analyze Your First Property <ChevronRightIcon />
            </button>
            <button className="hp-btn-ghost" onClick={() => navigate('/benefits')}>
              Explore Benefits
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
