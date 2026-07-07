import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DEMO_PROPERTIES, PROPERTY_TYPES } from '../data/demoProperties';
import { selectProperty } from '../services/propertyWorkflow';
import { addToPortfolio } from '../services/propertyStorage';
import './InteractiveMap.css';

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

/* ── Real basemap (PoisonGuard stack: maplibre-gl + OpenFreeMap vector tiles) ──
   Free, keyless OpenStreetMap vector tiles rendered with WebGL. Property
   markers are GeoJSON layers with clustering + a pulse on top-scored deals.   */
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const US_VIEW   = { center: [-98, 39.5], zoom: 3.4 };
const EMPTY_FC  = { type: 'FeatureCollection', features: [] };

function buildGeoJSON(list) {
  return {
    type: 'FeatureCollection',
    features: list
      .filter(p => p.longitude != null && p.latitude != null)
      .map(p => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
        properties: {
          id:       String(p.id),
          score:    p.score,
          scoreStr: String(p.score),
          color:    sColor(p.score),
        },
      })),
  };
}

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
  const [saved,    setSaved]    = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

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

  /* ── Map plumbing ─────────────────────────────── */
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const initialized  = useRef(false);
  const mapReady     = useRef(false);
  const filteredRef  = useRef(filtered);
  const selectRef    = useRef(null);
  filteredRef.current = filtered;

  const byId = useMemo(() => {
    const m = new Map();
    PROPERTIES.forEach(p => m.set(String(p.id), p));
    return m;
  }, []);

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
  selectRef.current = handleSelect;

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

  // Initialize the map once
  useEffect(() => {
    if (initialized.current || !containerRef.current) return;
    initialized.current = true;

    let m;
    try {
      m = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: US_VIEW.center,
        zoom: US_VIEW.zoom,
        minZoom: 2,
        maxZoom: 17,
        attributionControl: { customAttribution: '© OpenFreeMap · © OpenStreetMap contributors' },
      });
    } catch {
      initialized.current = false;
      setTimeout(() => setLoadError('WebGL is required to display the map. Try a modern browser.'), 0);
      return;
    }

    mapRef.current = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    m.on('error', () => { if (!mapReady.current) setLoadError('Map tiles failed to load. Check your connection.'); });

    m.on('load', () => {
      m.addSource('props', {
        type: 'geojson',
        data: buildGeoJSON(filteredRef.current),
        cluster: true,
        clusterMaxZoom: 8,
        clusterRadius: 44,
      });

      // Clustered markets
      m.addLayer({
        id: 'clusters', type: 'circle', source: 'props', filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#0d9488',
          'circle-opacity': 0.88,
          'circle-radius': ['step', ['get', 'point_count'], 16, 5, 22, 10, 28],
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(255,255,255,0.92)',
        },
      });
      m.addLayer({
        id: 'cluster-count', type: 'symbol', source: 'props', filter: ['has', 'point_count'],
        layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 12 },
        paint: { 'text-color': '#ffffff' },
      });

      // Pulse ring on top-scored deals
      m.addLayer({
        id: 'prop-pulse', type: 'circle', source: 'props',
        filter: ['all', ['!', ['has', 'point_count']], ['>=', ['get', 'score'], 90]],
        paint: { 'circle-color': '#059669', 'circle-radius': 16, 'circle-opacity': 0.22, 'circle-stroke-width': 0 },
      });

      // Individual property markers (score-colored)
      m.addLayer({
        id: 'prop-points', type: 'circle', source: 'props', filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 5, 8, 8, 12, 11],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
      m.addLayer({
        id: 'prop-score', type: 'symbol', source: 'props', filter: ['!', ['has', 'point_count']],
        layout: {
          'text-field': ['get', 'scoreStr'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 6, 0, 8.5, 10],
          'text-allow-overlap': false,
        },
        paint: { 'text-color': '#ffffff' },
      });

      // Selected-property highlight ring
      m.addSource('sel', { type: 'geojson', data: EMPTY_FC });
      m.addLayer({
        id: 'sel-ring', type: 'circle', source: 'sel',
        paint: {
          'circle-radius': 15, 'circle-opacity': 0,
          'circle-stroke-width': 3, 'circle-stroke-color': '#059669',
        },
      });

      mapReady.current = true;
      setMapLoaded(true);
    });

    // Cluster click → zoom in
    m.on('click', 'clusters', async e => {
      const [f] = m.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      if (!f) return;
      try {
        const z = await m.getSource('props').getClusterExpansionZoom(f.properties.cluster_id);
        m.easeTo({ center: f.geometry.coordinates, zoom: z + 0.6 });
      } catch { /* noop */ }
    });
    // Marker click → select property (drives the React detail card)
    m.on('click', 'prop-points', e => {
      const f = e.features?.[0];
      if (!f) return;
      const p = byId.get(f.properties.id);
      if (p) selectRef.current?.(p);
    });
    for (const l of ['clusters', 'prop-points']) {
      m.on('mouseenter', l, () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', l, () => { m.getCanvas().style.cursor = ''; });
    }

    return () => {
      initialized.current = false;
      mapReady.current = false;
      m.remove();
      mapRef.current = null;
    };
  }, [byId]);

  // Keep map markers in sync with the filtered list
  useEffect(() => {
    if (!mapLoaded) return;
    const src = mapRef.current?.getSource('props');
    if (src) src.setData(buildGeoJSON(filtered));
  }, [filtered, mapLoaded]);

  // Reflect the current selection on the map + fly to it
  useEffect(() => {
    if (!mapLoaded) return;
    const m = mapRef.current;
    if (!m) return;
    const sel = m.getSource('sel');
    if (selected && selected.longitude != null && selected.latitude != null) {
      if (sel) sel.setData({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [selected.longitude, selected.latitude] }, properties: {} }],
      });
      if (m.getLayer('sel-ring')) m.setPaintProperty('sel-ring', 'circle-stroke-color', sColor(selected.score));
      m.flyTo({ center: [selected.longitude, selected.latitude], zoom: Math.max(m.getZoom(), 9), duration: 900 });
    } else if (sel) {
      sel.setData(EMPTY_FC);
    }
  }, [selected, mapLoaded]);

  // Subtle pulse on top-scored markers (visual only, reduced-motion aware)
  useEffect(() => {
    if (!mapLoaded) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const m = mapRef.current;
    if (!m || !m.getLayer('prop-pulse')) return;
    let raf;
    const start = performance.now();
    const tick = now => {
      if (!mapRef.current?.getLayer('prop-pulse')) return;
      const ph = ((now - start) % 2600) / 2600 * Math.PI * 2;
      m.setPaintProperty('prop-pulse', 'circle-radius', 15 + Math.sin(ph) * 4);
      m.setPaintProperty('prop-pulse', 'circle-opacity', 0.14 + (Math.sin(ph) + 1) * 0.1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mapLoaded]);

  const resetView = () => mapRef.current?.flyTo({ ...US_VIEW, duration: 900 });

  const verdictBadge = s => s >= 88 ? 'badge-green' : s >= 75 ? 'badge-blue' : s >= 65 ? 'badge-gold' : 'badge-red';
  const verdictLabel = s => s >= 88 ? 'Strong Buy'   : s >= 75 ? 'Solid Deal'  : s >= 65 ? 'With Caution' : 'High Risk';
  const hasFilters = search || fType !== 'all' || fScore > 0;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Investment Map</h1>
        <p className="page-subtitle">AI-scored properties across key US markets. Click a marker or row to select.</p>
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
        <div className="imap-map-wrap">

          {/* Real interactive basemap (maplibre-gl + OpenFreeMap vector tiles) */}
          <div ref={containerRef} className="imap-canvas" />

          {/* Loading / error states */}
          {!mapLoaded && !loadError && (
            <div className="imap-map-loading">
              <div className="imap-spinner" />
              <span>Loading interactive map…</span>
            </div>
          )}
          {loadError && (
            <div className="imap-map-error">
              <span>⚠️</span>
              <p>{loadError}</p>
            </div>
          )}

          {/* AI market-scan status badge */}
          <div className="imap-scan-badge">
            <span className="imap-scan-badge__dot" />
            AI MARKET SCAN
          </div>

          {/* Reset view */}
          <button className="imap-reset-btn" onClick={resetView} title="Zoom out to the US overview">
            US Overview
          </button>

          {/* Legend */}
          <div className="imap-legend">
            {[['#059669','90+'], ['#2563eb','80–89'], ['#d97706','70–79'], ['#dc2626','<70']].map(([c, l]) => (
              <div key={l} className="imap-legend-item">
                <span className="imap-legend-dot" style={{ background: c }}/>
                <span>{l}</span>
              </div>
            ))}
          </div>

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
