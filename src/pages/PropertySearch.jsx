import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DEMO_PROPERTIES, MARKETS_LIST, PROPERTY_IMAGES, PROPERTY_TYPES } from '../data/demoProperties';
import { addCompareProperty, saveWorkflowAnalysis, selectProperty } from '../services/propertyWorkflow';
import { saveFavorite, removeFavorite, getFavorites, addToPortfolio } from '../services/propertyStorage';
import './PropertySearch.css';

const PROPERTIES = DEMO_PROPERTIES;
const STATUS_LABELS = { 'For Sale': 'FOR SALE', 'Off-Market': 'OFF-MARKET', 'Coming Soon': 'COMING SOON' };

function PropertyImage({ imgKey, image, price }) {
  const [err, setErr] = useState(false);
  const src = image || PROPERTY_IMAGES[imgKey] || PROPERTY_IMAGES.residential;
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
  const isIncomeProperty = p.units > 1 || p.type === 'Multifamily' || p.type === 'Commercial';
  const isLand = p.type === 'Land';
  const isSaved = savedIds.has(p.id);
  const scoreColor = p.score >= 90 ? '#059669' : p.score >= 80 ? '#2563eb' : p.score >= 70 ? '#d97706' : '#dc2626';
  const statusCls = `ps-card-status ps-status-${p.status.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="ps-card">
      <div className="ps-card-img">
        <PropertyImage imgKey={p.img} image={p.image} price={p.price} />
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
            <div className="ps-card-city">{p.neighborhood} · {p.market}</div>
          </div>
          <div className="ps-score-badge" style={{ color: scoreColor, borderColor: scoreColor }}>
            <span className="ps-score-num">{p.score}</span>
            <span className="ps-score-lbl">AI</span>
          </div>
        </div>

        <div className="ps-card-meta">
          {isLand ? (
            <span>{p.sqft.toLocaleString()} sqft lot</span>
          ) : isIncomeProperty ? (
            <span className="ps-type ps-type--multi">{p.units} unit{p.units === 1 ? '' : 's'}</span>
          ) : (
            <>
              <span>{p.beds} bd</span>
              <span className="sep">·</span>
              <span>{p.baths} ba</span>
              <span className="sep">·</span>
              <span>{p.sqft.toLocaleString()} sqft</span>
            </>
          )}
          <span className={`ps-type${isIncomeProperty ? ' ps-type--multi' : ''}`}>{p.type}</span>
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
            <strong className="neutral">{p.rent > 0 ? `$${p.rent.toLocaleString()}/mo` : 'N/A'}</strong>
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
  const initialMarket = searchParams.get('market') || 'all';
  const [query, setQuery] = useState(() => initialMarket === 'all' ? '' : initialMarket);
  const [mode, setMode] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterMarket, setFilterMarket] = useState(initialMarket);
  const [filterBeds, setFilterBeds] = useState('any');
  const [filterPrice, setFilterPrice] = useState('any');
  const [minCapRate, setMinCapRate] = useState('any');
  const [minCashFlow, setMinCashFlow] = useState('any');
  const [minScore, setMinScore] = useState('any');
  const [sortBy, setSortBy] = useState('score');
  const [viewMode, setViewMode] = useState('grid');
  const [notice, setNotice] = useState('');
  const [savedIds, setSavedIds] = useState(() => new Set(getFavorites().map(f => f.id)));

  const flash = msg => { setNotice(msg); setTimeout(() => setNotice(''), 2400); };

  const handleAnalyze = p => {
    selectProperty(p);
    saveWorkflowAnalysis(p);
    navigate('/deal-analyzer');
  };
  const handleMortgage = p => { selectProperty(p); navigate('/mortgage-calc'); };
  const handleCashFlow = p => { selectProperty(p); navigate('/cash-flow'); };
  const handleAI = p => { selectProperty(p); navigate('/advisor'); };
  const handleSave = p => {
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
  const handleCompare = p => {
    selectProperty(p);
    addCompareProperty(p);
    flash('Added to comparison.');
  };

  const clearFilters = () => {
    setQuery('');
    setMode('all');
    setFilterType('all');
    setFilterMarket('all');
    setFilterBeds('any');
    setFilterPrice('any');
    setMinCapRate('any');
    setMinCashFlow('any');
    setMinScore('any');
  };

  const filtered = PROPERTIES
    .filter(p => {
      const q = query.toLowerCase();
      if (
        q &&
        !p.address.toLowerCase().includes(q) &&
        !p.city.toLowerCase().includes(q) &&
        !p.market.toLowerCase().includes(q) &&
        !p.neighborhood.toLowerCase().includes(q)
      ) return false;
      if (mode !== 'all' && p.mode !== mode) return false;
      if (filterType !== 'all' && p.type !== filterType) return false;
      if (filterMarket !== 'all' && p.market !== filterMarket) return false;
      if (filterBeds !== 'any' && p.units <= 1 && p.type !== 'Land' && p.beds < Number(filterBeds)) return false;
      if (filterPrice !== 'any') {
        const [min, max] = filterPrice.split('-').map(Number);
        if (p.price < min) return false;
        if (max && p.price > max) return false;
      }
      if (minCapRate !== 'any' && p.capRate < Number(minCapRate)) return false;
      if (minCashFlow !== 'any' && p.cashFlow < Number(minCashFlow)) return false;
      if (minScore !== 'any' && p.score < Number(minScore)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score;
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'roi') return b.roi - a.roi;
      if (sortBy === 'cashflow') return b.cashFlow - a.cashFlow;
      if (sortBy === 'caprate') return b.capRate - a.capRate;
      return 0;
    });

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Property Search</h1>
        <p className="page-subtitle">
          AI-scored listings with investment metrics, cap rate, cash flow, and ROI across active demo markets.
        </p>
      </div>

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
        <span className="ps-mode-count">{filtered.length} of {PROPERTIES.length} properties</span>
      </div>

      <div className="ps-search-bar card">
        <div className="ps-search-input-wrap">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="ps-search-ic">
            <circle cx="7.5" cy="7.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/>
            <path d="M11.5 11.5L16 16" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            className="ps-search-input form-input"
            placeholder="Search by address, city, market, neighborhood, or ZIP..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button className="ps-search-clear" onClick={() => setQuery('')}>x</button>
          )}
        </div>
        <div className="ps-filters">
          <select className="form-select" value={filterMarket} onChange={e => setFilterMarket(e.target.value)}>
            <option value="all">All Markets</option>
            {MARKETS_LIST.map(market => <option key={market} value={market}>{market}</option>)}
          </select>
          <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            {PROPERTY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
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
            <option value="300000-600000">$300K - $600K</option>
            <option value="600000-1000000">$600K - $1M</option>
            <option value="1000000-99999999">$1M+</option>
          </select>
          <select className="form-select" value={minCapRate} onChange={e => setMinCapRate(e.target.value)}>
            <option value="any">Any Cap Rate</option>
            <option value="4">4%+ Cap</option>
            <option value="5">5%+ Cap</option>
            <option value="6">6%+ Cap</option>
            <option value="7">7%+ Cap</option>
          </select>
          <select className="form-select" value={minCashFlow} onChange={e => setMinCashFlow(e.target.value)}>
            <option value="any">Any Cash Flow</option>
            <option value="0">$0+/mo</option>
            <option value="500">$500+/mo</option>
            <option value="1000">$1K+/mo</option>
            <option value="1500">$1.5K+/mo</option>
          </select>
          <select className="form-select" value={minScore} onChange={e => setMinScore(e.target.value)}>
            <option value="any">Any Score</option>
            <option value="70">70+</option>
            <option value="80">80+</option>
            <option value="90">90+</option>
          </select>
          <select className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="score">Score</option>
            <option value="caprate">Cap Rate</option>
            <option value="cashflow">Cash Flow</option>
            <option value="roi">ROI</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
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

      <div className="ps-results-meta">
        <span className="ps-results-count">
          {filtered.length} {filtered.length === 1 ? 'property' : 'properties'} found
        </span>
        <div className="ps-results-actions">
          {notice && <span className="ps-notice">Saved: {notice}</span>}
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/comparison')}>
            Compare
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/map')}>
            Map View
          </button>
        </div>
      </div>

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
            <p>No properties match your filters. Try a broader market, lower score, or lower cash-flow target.</p>
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
