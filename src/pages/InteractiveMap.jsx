import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_PROPERTIES, PROPERTY_TYPES } from '../data/demoProperties';
import { selectProperty } from '../services/propertyWorkflow';
import { addToPortfolio } from '../services/propertyStorage';
import './InteractiveMap.css';

/* ── Dataset (matches PropertySearch listings + map coordinates) ─────── */
// mx/my = % position within map, roughly mirroring US geography
/*
const LEGACY_PROPERTIES = [
  { id:1,  address:'2140 Brickell Ave',    city:'Miami, FL 33129',        price:847000,  beds:4, baths:3, sqft:2840, type:'Condo',         score:91, roi:8.4,  cashFlow:1240, capRate:4.5, rent:3200, mx:72, my:77 },
  { id:2,  address:'4821 Lake Shore Dr',   city:'Chicago, IL 60614',      price:624000,  beds:3, baths:2, sqft:1920, type:'Condo',         score:84, roi:6.8,  cashFlow:720,  capRate:5.4, rent:2800, mx:51, my:28 },
  { id:3,  address:'918 Congress Ave',     city:'Austin, TX 78701',       price:395000,  beds:2, baths:2, sqft:1240, type:'Single Family', score:88, roi:9.2,  cashFlow:980,  capRate:6.4, rent:2100, mx:38, my:67 },
  { id:4,  address:'7701 Sunset Blvd',     city:'Los Angeles, CA 90046',  price:1240000, beds:4, baths:3, sqft:2200, type:'Single Family', score:76, roi:5.4,  cashFlow:310,  capRate:3.5, rent:4400, mx:9,  my:52 },
  { id:5,  address:'220 Peachtree St NE',  city:'Atlanta, GA 30303',      price:285000,  beds:2, baths:1, sqft:980,  type:'Condo',         score:82, roi:10.1, cashFlow:1180, capRate:7.5, rent:1800, mx:60, my:60 },
  { id:6,  address:'3400 E Camelback Rd',  city:'Phoenix, AZ 85018',      price:520000,  beds:3, baths:2, sqft:1680, type:'Single Family', score:89, roi:8.7,  cashFlow:1050, capRate:6.0, rent:2600, mx:19, my:57 },
  { id:7,  address:'15 W 65th St',         city:'New York, NY 10023',     price:2100000, beds:3, baths:2, sqft:1400, type:'Condo',         score:72, roi:4.2,  cashFlow:-120, capRate:3.7, rent:6500, mx:78, my:27 },
  { id:8,  address:'482 Castro St',        city:'San Francisco, CA 94114',price:1580000, beds:4, baths:3, sqft:2100, type:'Single Family', score:68, roi:3.8,  cashFlow:-340, capRate:2.8, rent:4800, mx:6,  my:43 },
  { id:9,  address:'1122 Commerce St',     city:'Dallas, TX 75201',       price:340000,  beds:2, baths:2, sqft:1180, type:'Condo',         score:86, roi:9.6,  cashFlow:1100, capRate:7.1, rent:2000, mx:37, my:63 },
  { id:10, address:'5880 Delmar Blvd',     city:'St. Louis, MO 63112',    price:198000,  beds:3, baths:1, sqft:1420, type:'Single Family', score:79, roi:11.4, cashFlow:920,  capRate:8.5, rent:1400, mx:50, my:42 },
  { id:11, address:'940 Belmont Ave',      city:'Nashville, TN 37212',    price:465000,  beds:3, baths:2, sqft:1640, type:'Single Family', score:87, roi:7.9,  cashFlow:840,  capRate:5.6, rent:2400, mx:58, my:52 },
  { id:12, address:'2001 Blake St',        city:'Denver, CO 80205',       price:510000,  beds:2, baths:2, sqft:1360, type:'Condo',         score:85, roi:8.1,  cashFlow:760,  capRate:5.2, rent:2200, mx:27, my:39 },
  { id:13, address:'1440 W Fullerton Ave', city:'Chicago, IL 60614',      price:1180000, beds:8, baths:8, sqft:5200, type:'Multifamily',   score:93, roi:10.2, cashFlow:2400, capRate:7.8, rent:7800, mx:53, my:30 },
  { id:14, address:'2240 San Pablo Ave',   city:'Oakland, CA 94612',      price:890000,  beds:4, baths:4, sqft:3200, type:'Multifamily',   score:86, roi:8.4,  cashFlow:1100, capRate:6.5, rent:4800, mx:7,  my:45 },
  { id:15, address:'3800 Magazine St',     city:'New Orleans, LA 70115',  price:425000,  beds:4, baths:4, sqft:2800, type:'Multifamily',   score:94, roi:12.8, cashFlow:1640, capRate:8.9, rent:3200, mx:48, my:70 },
  { id:16, address:'1204 S Brevard St',    city:'Charlotte, NC 28203',    price:360000,  beds:4, baths:3, sqft:2100, type:'Single Family', score:90, roi:9.8,  cashFlow:1020, capRate:7.2, rent:2400, mx:64, my:53 },
  { id:17, address:'5542 Rainier Ave S',   city:'Seattle, WA 98118',      price:680000,  beds:3, baths:2, sqft:1800, type:'Single Family', score:83, roi:7.2,  cashFlow:640,  capRate:5.5, rent:3100, mx:9,  my:18 },
  { id:18, address:'820 Tchoupitoulas St', city:'New Orleans, LA 70130',  price:195000,  beds:2, baths:1, sqft:920,  type:'Condo',         score:88, roi:13.5, cashFlow:780,  capRate:9.2, rent:1500, mx:50, my:73 },
];

*/
const PROPERTIES = DEMO_PROPERTIES;

/* ── Helpers ─────────────────────────────────────── */
function sColor(s) {
  if (s >= 90) return '#059669';
  if (s >= 80) return '#2563eb';
  if (s >= 70) return '#d97706';
  return '#dc2626';
}

const fmtK = n => n >= 1e6
  ? `$${(n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1)}M`
  : `$${Math.round(n / 1000)}K`;
const fmtM = n => '$' + Math.abs(Math.round(n)).toLocaleString();
const sgn  = n => n >= 0 ? '+' : '−';

/* ── Sub-components (defined outside to prevent remount) ─────────────── */
function InsightItem({ icon, label, value, sub }) {
  return (
    <div className="imap-insight-item">
      <span className="imap-insight-icon">{icon}</span>
      <div className="imap-insight-body">
        <div className="imap-insight-label">{label}</div>
        <div className="imap-insight-value">{value}</div>
        {sub && <div className="imap-insight-sub" title={sub}>{sub}</div>}
      </div>
    </div>
  );
}

function ListRow({ p, isSelected, onSelect }) {
  const col = sColor(p.score);
  return (
    <div
      className={`imap-row${isSelected ? ' imap-row--active' : ''}`}
      onClick={() => onSelect(p)}
    >
      <div className="imap-row-score" style={{ color: col, borderColor: col }}>{p.score}</div>
      <div className="imap-row-body">
        <div className="imap-row-top">
          <span className="imap-row-price">{fmtK(p.price)}</span>
          <span className="imap-row-cf" style={{ color: p.cashFlow >= 0 ? '#059669' : '#dc2626' }}>
            {sgn(p.cashFlow)}{fmtM(p.cashFlow)}/mo
          </span>
        </div>
        <div className="imap-row-addr">{p.address}</div>
        <div className="imap-row-city">{p.city}</div>
        <div className="imap-row-meta">
          <span>{p.capRate.toFixed(1)}% cap</span>
          <span className="imap-dot">·</span>
          <span>{p.type}</span>
          {p.units <= 1 && p.type !== 'Land' && (
            <><span className="imap-dot">·</span><span>{p.beds}bd/{p.baths}ba</span></>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────── */
export default function InteractiveMap() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [search,   setSearch]   = useState('');
  const [fType,    setFType]    = useState('all');
  const [fScore,   setFScore]   = useState(0);
  const [sort,     setSort]     = useState('score');
  const [layer,    setLayer]    = useState('dark');
  const [saved,    setSaved]    = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PROPERTIES
      .filter(p => {
        if (q && !p.address.toLowerCase().includes(q) && !p.city.toLowerCase().includes(q)) return false;
        if (fType !== 'all' && p.type !== fType) return false;
        if (p.score < fScore) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === 'price_asc')  return a.price    - b.price;
        if (sort === 'price_desc') return b.price    - a.price;
        if (sort === 'cashflow')   return b.cashFlow - a.cashFlow;
        if (sort === 'caprate')    return b.capRate  - a.capRate;
        return b.score - a.score;
      });
  }, [search, fType, fScore, sort]);

  const stats = useMemo(() => {
    if (!filtered.length) return null;
    const avg = key => filtered.reduce((s, p) => s + p[key], 0) / filtered.length;
    return {
      avgPrice:  avg('price'),
      avgCap:    avg('capRate'),
      bestCF:    filtered.reduce((a, b) => b.cashFlow > a.cashFlow ? b : a),
      bestScore: filtered.reduce((a, b) => b.score    > a.score    ? b : a),
    };
  }, [filtered]);

  const handleSelect = p => {
    setSelected(p);
    setSaved(false);
    selectProperty({
      id:          p.id,
      address:     p.address,
      fullAddress: `${p.address}, ${p.city}`,
      city:        p.city,
      market:      p.market,
      neighborhood:p.neighborhood,
      price:       p.price,
      type:        p.type,
      beds:        p.beds,
      baths:       p.baths,
      sqft:        p.sqft,
      units:       p.units,
      rent:        p.rent,
      cashFlow:    p.cashFlow,
      capRate:     p.capRate,
      roi:         p.roi,
      score:       p.score,
      image:       p.image,
      latitude:    p.latitude,
      longitude:   p.longitude,
    });
  };

  const handleSave = () => {
    if (!selected) return;
    addToPortfolio({
      id:       selected.id,
      address:  selected.address,
      city:     selected.city,
      market:   selected.market,
      neighborhood: selected.neighborhood,
      price:    selected.price,
      type:     selected.type,
      beds:     selected.beds,
      baths:    selected.baths,
      sqft:     selected.sqft,
      units:    selected.units,
      rent:     selected.rent,
      cashFlow: selected.cashFlow,
      capRate:  selected.capRate,
      roi:      selected.roi,
      score:    selected.score,
      equity:   Math.round(selected.price * 0.20),
    });
    setSaved(true);
  };

  const verdictBadge = s => s >= 88 ? 'badge-green' : s >= 75 ? 'badge-blue' : s >= 65 ? 'badge-gold' : 'badge-red';
  const verdictLabel = s => s >= 88 ? 'Strong Buy'   : s >= 75 ? 'Solid Deal'  : s >= 65 ? 'With Caution' : 'High Risk';
  const hasFilters = search || fType !== 'all' || fScore > 0;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Investment Map</h1>
        <p className="page-subtitle">AI-scored properties across key US markets. Click a pin or row to select.</p>
      </div>

      {/* ── Market insights bar ─────────────────────── */}
      {stats && (
        <div className="imap-insights">
          <InsightItem icon="📊" label="Avg List Price"
            value={fmtK(stats.avgPrice)} />
          <InsightItem icon="📈" label="Avg Cap Rate"
            value={`${stats.avgCap.toFixed(1)}%`} />
          <InsightItem icon="💵" label="Best Cash Flow"
            value={`${sgn(stats.bestCF.cashFlow)}${fmtM(stats.bestCF.cashFlow)}/mo`}
            sub={stats.bestCF.address} />
          <InsightItem icon="⭐" label="Top AI Score"
            value={`${stats.bestScore.score}/100`}
            sub={stats.bestScore.address} />
        </div>
      )}

      <div className="imap-layout">

        {/* ── Left panel ──────────────────────────────── */}
        <div className="card imap-sidebar">

          {/* Search */}
          <div className="imap-search-wrap">
            <svg className="imap-search-icon" width="14" height="14" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <input
              className="imap-search-input"
              placeholder="Search city or address…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="imap-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          {/* Filters */}
          <div className="imap-filter-row">
            <select className="imap-select" value={fType} onChange={e => setFType(e.target.value)}>
              <option value="all">All Types</option>
              {PROPERTY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
            <select className="imap-select" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="score">AI Score ↓</option>
              <option value="price_asc">Price ↑</option>
              <option value="price_desc">Price ↓</option>
              <option value="cashflow">Cash Flow ↓</option>
              <option value="caprate">Cap Rate ↓</option>
            </select>
          </div>

          {/* Min score slider */}
          <div className="imap-score-filter">
            <div className="imap-score-hdr">
              <span className="imap-score-label">Min AI Score</span>
              <span className="imap-score-val">{fScore > 0 ? `${fScore}+` : 'Any'}</span>
            </div>
            <input
              type="range" min={0} max={90} step={5} value={fScore}
              onChange={e => setFScore(+e.target.value)}
              className="imap-range"
            />
          </div>

          {/* List header */}
          <div className="imap-list-hdr">
            <span>{filtered.length} of {PROPERTIES.length} properties</span>
            {hasFilters && (
              <button className="imap-clear-btn"
                onClick={() => { setSearch(''); setFType('all'); setFScore(0); }}>
                Clear
              </button>
            )}
          </div>

          {/* Property list */}
          <div className="imap-list">
            {filtered.map(p => (
              <ListRow
                key={p.id} p={p}
                isSelected={selected?.id === p.id}
                onSelect={handleSelect}
              />
            ))}
            {filtered.length === 0 && (
              <div className="imap-empty">No properties match your filters.</div>
            )}
          </div>
        </div>

        {/* ── Map area ──────────────────────────────────── */}
        <div className={`imap-map-wrap imap-map-wrap--${layer}`}>

          {/* Grid background */}
          <div className="imap-map-bg" />

          {/* SVG decoration (geography, water, parks) */}
          <svg className="imap-map-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
            {/* Pacific Ocean band */}
            <rect x="0" y="0" width="2.5" height="100" fill="rgba(13,40,90,0.6)"/>
            {/* Atlantic band */}
            <rect x="85" y="0" width="15" height="100" fill="rgba(13,40,90,0.45)"/>
            {/* Gulf of Mexico */}
            <ellipse cx="43" cy="94" rx="17" ry="7" fill="rgba(13,40,90,0.55)"/>
            {/* Great Lakes */}
            <ellipse cx="52" cy="23" rx="4.5" ry="2"   fill="rgba(13,50,100,0.55)"/>
            <ellipse cx="57" cy="21" rx="3.2" ry="1.4" fill="rgba(13,50,100,0.5)"/>
            <ellipse cx="48" cy="21" rx="2.4" ry="1.2" fill="rgba(13,50,100,0.5)"/>
            <ellipse cx="62" cy="24" rx="2"   ry="1"   fill="rgba(13,50,100,0.4)"/>
            {/* Florida peninsula */}
            <path d="M72,77 L75,89 L72,96 L69,89 L71,82 Z" fill="rgba(13,40,90,0.25)"/>
            {/* Parks */}
            <rect x="29" y="34" width="5" height="5.5" rx="1.5" fill="rgba(5,56,30,0.5)"/>
            <rect x="68" y="46" width="4" height="4.5" rx="1.2" fill="rgba(5,56,30,0.45)"/>
            <rect x="22" y="54" width="3.8" height="3.5" rx="1.2" fill="rgba(5,56,30,0.4)"/>
            <rect x="55" y="14" width="3" height="3" rx="1" fill="rgba(5,56,30,0.35)"/>
            {/* City cluster glows */}
            <circle cx="52" cy="29" r="9" fill="rgba(37,99,235,0.07)"/>
            <circle cx="61" cy="57" r="8" fill="rgba(37,99,235,0.06)"/>
            <circle cx="38" cy="65" r="8" fill="rgba(201,168,76,0.06)"/>
            <circle cx="78" cy="27" r="7" fill="rgba(37,99,235,0.06)"/>
            <circle cx="72" cy="78" r="7" fill="rgba(201,168,76,0.07)"/>
            <circle cx="8"  cy="35" r="8" fill="rgba(37,99,235,0.05)"/>
          </svg>

          {/* Property pins */}
          {filtered.map(p => {
            const col      = sColor(p.score);
            const isActive = selected?.id === p.id;
            const isTop    = p.score >= 90;
            return (
              <button
                key={p.id}
                className={`imap-pin${isActive ? ' imap-pin--active' : ''}${isTop ? ' imap-pin--top' : ''}`}
                style={{ left: `${p.mx}%`, top: `${p.my}%`, '--pc': col }}
                onClick={() => handleSelect(p)}
                title={`${p.address} · ${fmtK(p.price)} · AI ${p.score}`}
              >
                <div className="imap-pin-bubble">
                  <span className="imap-pin-score">{p.score}</span>
                  <span className="imap-pin-price">{fmtK(p.price)}</span>
                </div>
                <div className="imap-pin-tip" />
              </button>
            );
          })}

          {/* Map layer toggle */}
          <div className="imap-controls">
            <div className="imap-ctrl-group">
              <button
                className={`imap-ctrl-btn${layer === 'dark' ? ' active' : ''}`}
                onClick={() => setLayer('dark')}
                title="Dark map"
              >🌙</button>
              <button
                className={`imap-ctrl-btn${layer === 'light' ? ' active' : ''}`}
                onClick={() => setLayer('light')}
                title="Light map"
              >☀️</button>
            </div>
          </div>

          {/* Legend */}
          <div className="imap-legend">
            {[['#059669','90+'], ['#2563eb','80–89'], ['#d97706','70–79'], ['#dc2626','<70']].map(([c, l]) => (
              <div key={l} className="imap-legend-item">
                <span className="imap-legend-dot" style={{ background: c }}/>
                <span>{l}</span>
              </div>
            ))}
          </div>

          {/* No-results overlay */}
          {filtered.length === 0 && (
            <div className="imap-map-empty">
              <span>No properties visible</span>
              <span>Adjust your filters to show listings</span>
            </div>
          )}

          {/* ── Selected property detail card (overlay) ── */}
          {selected && (
            <div className="imap-detail">
              <div className="imap-detail-hdr">
                <div className="imap-detail-prices">
                  <div className="imap-detail-price">{fmtK(selected.price)}</div>
                  <div className="imap-detail-addr">{selected.address}</div>
                  <div className="imap-detail-city">{selected.city}</div>
                </div>
                <button className="imap-detail-close" onClick={() => setSelected(null)}>✕</button>
              </div>

              <div className="imap-detail-score-row" style={{ borderColor: sColor(selected.score) }}>
                <span style={{ color: sColor(selected.score), fontWeight: 900, fontSize: 13 }}>
                  AI Score {selected.score}/100
                </span>
                <span className={`badge ${verdictBadge(selected.score)}`}>
                  {verdictLabel(selected.score)}
                </span>
              </div>

              <div className="imap-detail-type-row">
                <span className="imap-type-chip">{selected.type}</span>
                {selected.type === 'Land' ? (
                  <span>{selected.sqft.toLocaleString()} sqft lot</span>
                ) : selected.units <= 1 ? (
                  <span>{selected.beds} bd · {selected.baths} ba · {selected.sqft.toLocaleString()} sqft</span>
                ) : (
                  <span>{selected.units} units · {selected.sqft.toLocaleString()} sqft</span>
                )}
              </div>

              <div className="imap-detail-metrics">
                {[
                  { label: 'Est. Rent',  val: `${fmtM(selected.rent)}/mo`,                                              cls: '' },
                  { label: 'Cash Flow',  val: `${sgn(selected.cashFlow)}${fmtM(selected.cashFlow)}/mo`,                cls: selected.cashFlow >= 0 ? 'pos' : 'neg' },
                  { label: 'Cap Rate',   val: `${selected.capRate.toFixed(1)}%`,                                         cls: selected.capRate >= 6 ? 'pos' : '' },
                  { label: 'Est. ROI',   val: `${selected.roi}%`,                                                        cls: selected.roi >= 7 ? 'pos' : '' },
                ].map(m => (
                  <div key={m.label} className="imap-d-metric">
                    <span>{m.label}</span>
                    <strong className={m.cls}>{m.val}</strong>
                  </div>
                ))}
              </div>

              <div className="imap-detail-actions">
                <button className="btn btn-primary btn-sm btn-full"
                  onClick={() => navigate('/deal-analyzer')}>
                  Analyze Deal
                </button>
                <div className="imap-detail-row3">
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('/mortgage-calc')}>
                    Mortgage
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('/cash-flow')}>
                    Cash Flow
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('/advisor')}>
                    Ask AI
                  </button>
                </div>
                <button className="btn btn-ghost btn-sm btn-full" onClick={handleSave}>
                  {saved ? '✓ Saved to Portfolio' : 'Save to Portfolio'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
