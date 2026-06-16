import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addCompareProperty, saveWorkflowAnalysis, selectProperty } from '../services/propertyWorkflow';
import { saveFavorite, removeFavorite, getFavorites, addToPortfolio } from '../services/propertyStorage';
import './PropertySearch.css';

const PROPERTIES = [
  { id:1,  address:'2140 Brickell Ave',     city:'Miami, FL 33129',          price:847000,  beds:4, baths:3, sqft:2840, type:'Condo',         score:91, roi:8.4,  cashFlow:1240,  capRate:4.5, rent:3200, img:'residential',  status:'For Sale',    daysListed:12, mode:'invest' },
  { id:2,  address:'4821 Lake Shore Dr',    city:'Chicago, IL 60614',         price:624000,  beds:3, baths:2, sqft:1920, type:'Condo',         score:84, roi:6.8,  cashFlow:720,   capRate:5.4, rent:2800, img:'highrise',     status:'For Sale',    daysListed:5,  mode:'invest' },
  { id:3,  address:'918 Congress Ave',      city:'Austin, TX 78701',          price:395000,  beds:2, baths:2, sqft:1240, type:'Single Family', score:88, roi:9.2,  cashFlow:980,   capRate:6.4, rent:2100, img:'singlefamily', status:'For Sale',    daysListed:18, mode:'invest' },
  { id:4,  address:'7701 Sunset Blvd',      city:'Los Angeles, CA 90046',     price:1240000, beds:4, baths:3, sqft:2200, type:'Single Family', score:76, roi:5.4,  cashFlow:310,   capRate:3.5, rent:4400, img:'luxury',       status:'For Sale',    daysListed:34, mode:'buy'    },
  { id:5,  address:'220 Peachtree St NE',   city:'Atlanta, GA 30303',         price:285000,  beds:2, baths:1, sqft:980,  type:'Condo',         score:82, roi:10.1, cashFlow:1180,  capRate:7.5, rent:1800, img:'midrise',      status:'For Sale',    daysListed:8,  mode:'invest' },
  { id:6,  address:'3400 E Camelback Rd',   city:'Phoenix, AZ 85018',         price:520000,  beds:3, baths:2, sqft:1680, type:'Single Family', score:89, roi:8.7,  cashFlow:1050,  capRate:6.0, rent:2600, img:'singlefamily', status:'For Sale',    daysListed:21, mode:'invest' },
  { id:7,  address:'15 W 65th St',          city:'New York, NY 10023',        price:2100000, beds:3, baths:2, sqft:1400, type:'Condo',         score:72, roi:4.2,  cashFlow:-120,  capRate:3.7, rent:6500, img:'highrise',     status:'For Sale',    daysListed:45, mode:'buy'    },
  { id:8,  address:'482 Castro St',         city:'San Francisco, CA 94114',   price:1580000, beds:4, baths:3, sqft:2100, type:'Single Family', score:68, roi:3.8,  cashFlow:-340,  capRate:2.8, rent:4800, img:'residential',  status:'For Sale',    daysListed:62, mode:'buy'    },
  { id:9,  address:'1122 Commerce St',      city:'Dallas, TX 75201',          price:340000,  beds:2, baths:2, sqft:1180, type:'Condo',         score:86, roi:9.6,  cashFlow:1100,  capRate:7.1, rent:2000, img:'midrise',      status:'For Sale',    daysListed:3,  mode:'invest' },
  { id:10, address:'5880 Delmar Blvd',      city:'St. Louis, MO 63112',       price:198000,  beds:3, baths:1, sqft:1420, type:'Single Family', score:79, roi:11.4, cashFlow:920,   capRate:8.5, rent:1400, img:'singlefamily', status:'For Sale',    daysListed:14, mode:'invest' },
  { id:11, address:'940 Belmont Ave',       city:'Nashville, TN 37212',       price:465000,  beds:3, baths:2, sqft:1640, type:'Single Family', score:87, roi:7.9,  cashFlow:840,   capRate:5.6, rent:2400, img:'residential',  status:'For Sale',    daysListed:9,  mode:'invest' },
  { id:12, address:'2001 Blake St',         city:'Denver, CO 80205',          price:510000,  beds:2, baths:2, sqft:1360, type:'Condo',         score:85, roi:8.1,  cashFlow:760,   capRate:5.2, rent:2200, img:'midrise',      status:'For Sale',    daysListed:27, mode:'invest' },
  { id:13, address:'1440 W Fullerton Ave',  city:'Chicago, IL 60614',         price:1180000, beds:8, baths:8, sqft:5200, type:'Multifamily',   score:93, roi:10.2, cashFlow:2400,  capRate:7.8, rent:7800, img:'multifamily',  status:'For Sale',    daysListed:6,  mode:'invest' },
  { id:14, address:'2240 San Pablo Ave',    city:'Oakland, CA 94612',         price:890000,  beds:4, baths:4, sqft:3200, type:'Multifamily',   score:86, roi:8.4,  cashFlow:1100,  capRate:6.5, rent:4800, img:'multifamily',  status:'For Sale',    daysListed:19, mode:'invest' },
  { id:15, address:'3800 Magazine St',      city:'New Orleans, LA 70115',     price:425000,  beds:4, baths:4, sqft:2800, type:'Multifamily',   score:94, roi:12.8, cashFlow:1640,  capRate:8.9, rent:3200, img:'multifamily',  status:'Off-Market',  daysListed:0,  mode:'invest' },
  { id:16, address:'1204 S Brevard St',     city:'Charlotte, NC 28203',       price:360000,  beds:4, baths:3, sqft:2100, type:'Single Family', score:90, roi:9.8,  cashFlow:1020,  capRate:7.2, rent:2400, img:'singlefamily', status:'For Sale',    daysListed:4,  mode:'invest' },
  { id:17, address:'5542 Rainier Ave S',    city:'Seattle, WA 98118',         price:680000,  beds:3, baths:2, sqft:1800, type:'Single Family', score:83, roi:7.2,  cashFlow:640,   capRate:5.5, rent:3100, img:'singlefamily', status:'For Sale',    daysListed:11, mode:'invest' },
  { id:18, address:'820 Tchoupitoulas St',  city:'New Orleans, LA 70130',     price:195000,  beds:2, baths:1, sqft:920,  type:'Condo',         score:88, roi:13.5, cashFlow:780,   capRate:9.2, rent:1500, img:'midrise',      status:'Coming Soon', daysListed:0,  mode:'invest' },
];

const PROPERTY_IMAGES = {
  residential:  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80',
  highrise:     'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80',
  singlefamily: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80',
  luxury:       'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80',
  midrise:      'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80',
  multifamily:  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=900&q=80',
};

const STATUS_LABELS = { 'For Sale': 'FOR SALE', 'Off-Market': 'OFF-MARKET', 'Coming Soon': 'COMING SOON' };

function PropertyImage({ imgKey, price }) {
  const [err, setErr] = useState(false);
  const src = PROPERTY_IMAGES[imgKey] || PROPERTY_IMAGES.residential;
  const fmtPrice = price >= 1e6 ? `$${(price / 1e6).toFixed(2).replace(/\.?0+$/, '')}M` : `$${Math.round(price / 1000)}K`;
  return (
    <>
      {err ? (
        <div className="ps-img-fallback">
          <svg viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg" width="80" height="60">
            <rect x="28" y="4" width="24" height="52" fill="#1e3a8a" fillOpacity="0.8"/>
            <rect x="8"  y="18" width="18" height="38" fill="#1e3a8a" fillOpacity="0.5"/>
            <rect x="54" y="22" width="18" height="34" fill="#1e3a8a" fillOpacity="0.5"/>
            {[0,1,2,3,4,5].map(r => [0,1].map(c => (
              <rect key={`${r}-${c}`} x={32+c*10} y={8+r*8} width="6" height="5" rx="1" fill="#c9a84c" fillOpacity={(r+c)%2===0?0.9:0.3}/>
            )))}
            <rect x="0" y="54" width="80" height="6" fill="#040c1e"/>
          </svg>
          <span>CinNova Property</span>
        </div>
      ) : (
        <img className="ps-property-photo" src={src} alt="" loading="lazy" onError={() => setErr(true)} />
      )}
      <div className="ps-photo-price">{fmtPrice}</div>
    </>
  );
}

function BookmarkIcon({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M2 2C2 1.45 2.45 1 3 1H11C11.55 1 12 1.45 12 2V13L7 10L2 13V2Z"/>
    </svg>
  );
}

function PropertyCard({ p, savedIds, onAnalyze, onMortgage, onCashFlow, onAI, onSave, onCompare }) {
  const isMulti = p.type === 'Multifamily';
  const isSaved = savedIds.has(p.id);
  const scoreColor = p.score >= 90 ? '#059669' : p.score >= 80 ? '#2563eb' : p.score >= 70 ? '#d97706' : '#dc2626';
  const statusCls = `ps-card-status ps-status-${p.status.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="ps-card">
      <div className="ps-card-img">
        <PropertyImage imgKey={p.img} price={p.price} />
        <div className={statusCls}>{STATUS_LABELS[p.status] || p.status}</div>
        {p.daysListed > 0 && <div className="ps-card-days">{p.daysListed}d listed</div>}
        <button
          className={`ps-save-icon${isSaved ? ' saved' : ''}`}
          onClick={() => onSave(p)}
          title={isSaved ? 'Saved' : 'Save to portfolio'}
        >
          <BookmarkIcon filled={isSaved} />
        </button>
      </div>

      <div className="ps-card-body">
        <div className="ps-card-top">
          <div className="ps-card-info">
            <div className="ps-card-price">${p.price.toLocaleString()}</div>
            <div className="ps-card-addr">{p.address}</div>
            <div className="ps-card-city">{p.city}</div>
          </div>
          <div className="ps-score-badge" style={{ color: scoreColor, borderColor: scoreColor }}>
            <span className="ps-score-num">{p.score}</span>
            <span className="ps-score-lbl">AI</span>
          </div>
        </div>

        <div className="ps-card-meta">
          {isMulti ? (
            <span className="ps-type ps-type--multi">{p.beds} units</span>
          ) : (
            <>
              <span>{p.beds} bd</span>
              <span className="sep">·</span>
              <span>{p.baths} ba</span>
              <span className="sep">·</span>
              <span>{p.sqft.toLocaleString()} sqft</span>
            </>
          )}
          <span className={`ps-type${isMulti ? ' ps-type--multi' : ''}`}>{p.type}</span>
        </div>

        <div className="ps-card-metrics">
          <div className="ps-metric">
            <span>ROI</span>
            <strong className={p.roi >= 7 ? 'pos' : 'neutral'}>{p.roi}%</strong>
          </div>
          <div className="ps-metric">
            <span>Cash Flow</span>
            <strong className={p.cashFlow >= 0 ? 'pos' : 'neg'}>
              {p.cashFlow >= 0 ? '+' : '-'}${Math.abs(p.cashFlow).toLocaleString()}/mo
            </strong>
          </div>
          <div className="ps-metric">
            <span>Cap Rate</span>
            <strong className={p.capRate >= 6 ? 'pos' : 'neutral'}>{p.capRate}%</strong>
          </div>
          <div className="ps-metric">
            <span>Est. Rent</span>
            <strong className="neutral">${p.rent.toLocaleString()}/mo</strong>
          </div>
        </div>

        <div className="ps-card-actions">
          <div className="ps-actions-primary">
            <button className="ps-btn-analyze" onClick={() => onAnalyze(p)}>
              Analyze Deal
            </button>
          </div>
          <div className="ps-actions-secondary">
            <button className="ps-btn-sm" onClick={() => onMortgage(p)}>Mortgage</button>
            <button className="ps-btn-sm" onClick={() => onCashFlow(p)}>Cash Flow</button>
            <button className="ps-btn-sm ps-btn-ai" onClick={() => onAI(p)}>Ask AI</button>
            <button className="ps-btn-sm" onClick={() => onCompare(p)}>Compare</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PropertySearch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query,       setQuery]       = useState(() => searchParams.get('market') || '');
  const [mode,        setMode]        = useState('all');
  const [filterType,  setFilterType]  = useState('all');
  const [filterBeds,  setFilterBeds]  = useState('any');
  const [filterPrice, setFilterPrice] = useState('any');
  const [sortBy,      setSortBy]      = useState('score');
  const [viewMode,    setViewMode]    = useState('grid');
  const [notice,      setNotice]      = useState('');
  const [savedIds,    setSavedIds]    = useState(() => new Set(getFavorites().map(f => f.id)));

  const flash = msg => { setNotice(msg); setTimeout(() => setNotice(''), 2400); };

  const handleAnalyze  = p => {
    selectProperty(p);
    saveWorkflowAnalysis(p);
    navigate('/deal-analyzer');
  };
  const handleMortgage = p => { selectProperty(p); navigate('/mortgage-calc'); };
  const handleCashFlow = p => { selectProperty(p); navigate('/cash-flow'); };
  const handleAI       = p => { selectProperty(p); navigate('/advisor'); };
  const handleSave     = p => {
    if (savedIds.has(p.id)) {
      removeFavorite(p.id);
      setSavedIds(prev => { const s = new Set(prev); s.delete(p.id); return s; });
      flash(`Removed: ${p.address}`);
    } else {
      selectProperty(p);
      saveFavorite(p);
      addToPortfolio(p);
      setSavedIds(prev => new Set([...prev, p.id]));
      flash(`Saved to portfolio: ${p.address}`);
    }
  };
  const handleCompare  = p => {
    selectProperty(p);
    addCompareProperty(p);
    flash('Added to comparison.');
  };

  const filtered = PROPERTIES
    .filter(p => {
      const q = query.toLowerCase();
      if (q && !p.address.toLowerCase().includes(q) && !p.city.toLowerCase().includes(q)) return false;
      if (mode !== 'all' && p.mode !== mode) return false;
      if (filterType !== 'all' && p.type !== filterType) return false;
      if (filterBeds !== 'any' && p.type !== 'Multifamily' && p.beds < parseInt(filterBeds)) return false;
      if (filterPrice !== 'any') {
        const [min, max] = filterPrice.split('-').map(Number);
        if (p.price < min) return false;
        if (max && p.price > max) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'score')      return b.score - a.score;
      if (sortBy === 'price-asc')  return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'roi')        return b.roi - a.roi;
      if (sortBy === 'cashflow')   return b.cashFlow - a.cashFlow;
      if (sortBy === 'caprate')    return b.capRate - a.capRate;
      return 0;
    });

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Property Search</h1>
        <p className="page-subtitle">
          AI-scored listings with investment metrics — cap rate, cash flow, and ROI on every property.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="ps-mode-tabs">
        {[['all', 'All Listings'], ['buy', 'Buy'], ['invest', 'Invest']].map(([v, l]) => (
          <button
            key={v}
            className={`ps-mode-tab${mode === v ? ' active' : ''}`}
            onClick={() => setMode(v)}
          >
            {l}
          </button>
        ))}
        <span className="ps-mode-count">{filtered.length} properties</span>
      </div>

      {/* Search bar + filters */}
      <div className="ps-search-bar card">
        <div className="ps-search-input-wrap">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="ps-search-ic">
            <circle cx="7.5" cy="7.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/>
            <path d="M11.5 11.5L16 16" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            className="ps-search-input form-input"
            placeholder="Search by address, city, or ZIP..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button className="ps-search-clear" onClick={() => setQuery('')}>×</button>
          )}
        </div>
        <div className="ps-filters">
          <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="Single Family">Single Family</option>
            <option value="Condo">Condo</option>
            <option value="Multifamily">Multifamily</option>
          </select>
          <select className="form-select" value={filterBeds} onChange={e => setFilterBeds(e.target.value)}>
            <option value="any">Any Beds</option>
            <option value="2">2+ Beds</option>
            <option value="3">3+ Beds</option>
            <option value="4">4+ Beds</option>
          </select>
          <select className="form-select" value={filterPrice} onChange={e => setFilterPrice(e.target.value)}>
            <option value="any">Any Price</option>
            <option value="0-300000">Under $300K</option>
            <option value="300000-600000">$300K – $600K</option>
            <option value="600000-1000000">$600K – $1M</option>
            <option value="1000000-99999999">$1M+</option>
          </select>
          <select className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="score">Best AI Score</option>
            <option value="cashflow">Best Cash Flow</option>
            <option value="roi">Highest ROI</option>
            <option value="caprate">Cap Rate</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
          </select>
        </div>
        <div className="ps-view-toggle">
          <button className={`ps-toggle-btn${viewMode === 'grid' ? ' active' : ''}`} onClick={() => setViewMode('grid')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="1" width="6" height="6" rx="1"/>
              <rect x="9" y="1" width="6" height="6" rx="1"/>
              <rect x="1" y="9" width="6" height="6" rx="1"/>
              <rect x="9" y="9" width="6" height="6" rx="1"/>
            </svg>
          </button>
          <button className={`ps-toggle-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 4H13M3 8H13M3 12H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Results bar */}
      <div className="ps-results-meta">
        <span className="ps-results-count">
          {filtered.length} {filtered.length === 1 ? 'property' : 'properties'} found
        </span>
        <div className="ps-results-actions">
          {notice && <span className="ps-notice">✓ {notice}</span>}
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/comparison')}>
            Compare
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/map')}>
            Map View
          </button>
        </div>
      </div>

      {/* Property grid */}
      <div className={`ps-grid${viewMode === 'list' ? ' ps-grid--list' : ''}`}>
        {filtered.map(p => (
          <PropertyCard
            key={p.id}
            p={p}
            savedIds={savedIds}
            onAnalyze={handleAnalyze}
            onMortgage={handleMortgage}
            onCashFlow={handleCashFlow}
            onAI={handleAI}
            onSave={handleSave}
            onCompare={handleCompare}
          />
        ))}
        {filtered.length === 0 && (
          <div className="ps-empty">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="21" cy="21" r="13" stroke="#cbd5e1" strokeWidth="2"/>
              <path d="M30 30L42 42" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <p>No properties match your filters.</p>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              setQuery(''); setMode('all'); setFilterType('all');
              setFilterBeds('any'); setFilterPrice('any');
            }}>
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
