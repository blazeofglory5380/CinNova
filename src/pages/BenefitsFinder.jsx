import { useState, useMemo } from 'react';
import { mockPrograms, US_STATES } from '../data/benefitsData';
import './BenefitsFinder.css';

const USER_TYPES = ['Buyer', 'Seller', 'Investor', 'Homeowner'];

/* category → badge class */
const CAT_BADGE = {
  Federal: 'badge-blue',
  State:   'badge-teal',
  County:  'badge-gold',
  City:    'badge-green',
};

function categoryBadge(category) {
  const key = category.split(' ')[0];
  return CAT_BADGE[key] || 'badge-gray';
}

/* ── Program card ───────────────────────────────────────── */
function ProgramCard({ p }) {
  return (
    <div className="program-card">
      <div className="program-card-top">
        <span className={`badge ${categoryBadge(p.category)}`}>{p.category}</span>
        <span className="badge badge-gray">{p.type}</span>
      </div>

      <h4 className="program-name">{p.name}</h4>
      <p className="program-benefit">{p.benefit}</p>
      <p className="program-desc">{p.description}</p>

      <div className="program-footer">
        <div className="program-amount">
          <span className="program-amount-label">Max Benefit</span>
          <span className="program-amount-value">{p.maxAmount}</span>
        </div>
        <div className="program-tags">
          {p.eligibility.map(e => (
            <span key={e} className="tag">{e}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Tab bar ────────────────────────────────────────────── */
function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tab-bar" role="tablist">
      {tabs.map(t => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          className={`tab-btn${active === t.key ? ' tab-btn--active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
          <span className={`tab-count${active === t.key ? ' tab-count--active' : ''}`}>
            {t.count}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────── */
export default function BenefitsFinder() {
  const [userType,  setUserType]  = useState('');
  const [stateCode, setStateCode] = useState('');
  const [city,      setCity]      = useState('');
  const [searched,  setSearched]  = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  /* Compute results only when user clicks Search */
  const results = useMemo(() => {
    if (!searched || !userType) return null;

    const statePool =
      stateCode && mockPrograms.state[stateCode]
        ? mockPrograms.state[stateCode]
        : mockPrograms.state.DEFAULT;

    const all = [
      ...mockPrograms.federal,
      ...statePool,
      ...mockPrograms.county,
      ...mockPrograms.city,
    ].filter(p => p.eligibility.includes(userType));

    return {
      all,
      federal: all.filter(p => p.category === 'Federal'),
      state:   all.filter(p => p.category.startsWith('State')),
      county:  all.filter(p => p.category === 'County'),
      city:    all.filter(p => p.category === 'City'),
    };
  }, [searched, userType, stateCode]);

  const handleSearch = e => {
    e.preventDefault();
    if (!userType) return;
    setSearched(true);
    setActiveTab('all');
  };

  const tabs = results
    ? [
        { key: 'all',     label: 'All Programs', count: results.all.length     },
        { key: 'federal', label: 'Federal',       count: results.federal.length },
        { key: 'state',   label: 'State',         count: results.state.length   },
        { key: 'county',  label: 'County',        count: results.county.length  },
        { key: 'city',    label: 'City',           count: results.city.length    },
      ]
    : [];

  const displayed = results ? results[activeTab] : [];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Benefits Finder</h1>
        <p className="page-subtitle">
          Discover federal, state, county, and city assistance programs tailored to your situation.
        </p>
      </div>

      {/* ── Search panel ────────────────────────────────── */}
      <div className="card bf-search-card section">

        {/* Header */}
        <div className="card-header">
          <h2 className="card-title">Find Programs</h2>
          {searched && results && (
            <span className="badge badge-teal">{results.all.length} programs found</span>
          )}
        </div>

        <form onSubmit={handleSearch} className="bf-form">

          {/* User type */}
          <div className="form-group">
            <label className="form-label">I am a…</label>
            <div className="user-type-row">
              {USER_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  className={`ut-btn${userType === t ? ' ut-btn--active' : ''}`}
                  onClick={() => setUserType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Location row */}
          <div className="bf-location-row">
            <div className="form-group">
              <label className="form-label">State (optional)</label>
              <select
                className="form-select"
                value={stateCode}
                onChange={e => setStateCode(e.target.value)}
              >
                <option value="">All states</option>
                {US_STATES.map(s => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">City (optional)</label>
              <input
                className="form-input"
                placeholder="e.g. Austin"
                value={city}
                onChange={e => setCity(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={!userType}
          >
            Find My Programs
          </button>
        </form>
      </div>

      {/* ── Results ─────────────────────────────────────── */}
      {searched && results && (
        <div className="bf-results">

          {/* Summary banner */}
          <div className="results-banner">
            <div className="results-banner-text">
              <strong>{results.all.length} programs</strong> available for{' '}
              <strong>{userType}s</strong>
              {stateCode ? ` in ${US_STATES.find(s => s.code === stateCode)?.name ?? stateCode}` : ' nationwide'}
            </div>
            <div className="results-summary-pills">
              <span className="badge badge-blue">{results.federal.length} Federal</span>
              <span className="badge badge-teal">{results.state.length} State</span>
              <span className="badge badge-gold">{results.county.length} County</span>
              <span className="badge badge-green">{results.city.length} City</span>
            </div>
          </div>

          {/* Tab bar */}
          <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

          {/* Cards */}
          {displayed.length === 0 ? (
            <div className="card">
              <div className="placeholder-section">
                <div className="placeholder-icon">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path d="M16 4L19.2 12H28L21.6 17.2L24.8 26L16 21L7.2 26L10.4 17.2L4 12H12.8L16 4Z"
                      stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3>No Programs in This Category</h3>
                <p>No programs matched your filters here. Try another tab or adjust your user type.</p>
              </div>
            </div>
          ) : (
            <div className="programs-grid">
              {displayed.map(p => (
                <ProgramCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Empty state (before search) ─────────────────── */}
      {!searched && (
        <div className="card">
          <div className="placeholder-section">
            <div className="placeholder-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M16 4L19.2 12H28L21.6 17.2L24.8 26L16 21L7.2 26L10.4 17.2L4 12H12.8L16 4Z"
                  stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Ready to Find Your Benefits</h3>
            <p>
              Select your user type above and click <strong>Find My Programs</strong> to discover
              available assistance from federal, state, county, and city sources.
            </p>
            <div className="placeholder-tags">
              <span className="badge badge-blue">Federal Programs</span>
              <span className="badge badge-teal">State Programs</span>
              <span className="badge badge-gold">County Programs</span>
              <span className="badge badge-green">City Programs</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
