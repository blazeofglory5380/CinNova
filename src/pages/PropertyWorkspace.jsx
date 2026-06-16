import { useMemo, useState } from 'react';
import { getProperties } from '../services/propertyStorage';
import './PropertyWorkspace.css';

const WORKSPACE_KEY = 'cinnova_property_workspace';

const STATUS_OPTIONS = [
  'Researching',
  'Interested',
  'Offered',
  'Under Contract',
  'Purchased',
  'Sold',
];

const FILTERS = ['All', 'Favorites', 'Researching', 'Offered', 'Purchased'];

function readWorkspaceMeta() {
  try {
    return JSON.parse(localStorage.getItem(WORKSPACE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeWorkspaceMeta(meta) {
  try {
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(meta));
  } catch {
    /* Keep the UI responsive if storage is unavailable. */
  }
}

function formatDate(timestamp) {
  if (!timestamp) return 'Unknown date';
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function scoreBadge(score) {
  if (score >= 88) return 'badge-green';
  if (score >= 74) return 'badge-blue';
  if (score >= 60) return 'badge-gold';
  return 'badge-red';
}

function getMeta(metaById, id) {
  return {
    status: 'Researching',
    favorite: false,
    notes: '',
    ...(metaById[id] || {}),
  };
}

function EmptyWorkspace() {
  return (
    <div className="card">
      <div className="placeholder-section">
        <div className="placeholder-icon">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect x="6" y="7" width="24" height="22" rx="4" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M12 14H24M12 19H20M12 24H17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M25 5V10M11 5V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </div>
        <h3>No Properties Yet</h3>
        <p>
          Analyze a property first, then return here to track research status, favorites, and notes.
        </p>
        <div className="placeholder-tags">
          <span className="badge badge-blue">Deal Scores</span>
          <span className="badge badge-teal">Offer Tracking</span>
          <span className="badge badge-gold">Notes</span>
          <span className="badge badge-green">Favorites</span>
        </div>
      </div>
    </div>
  );
}

function PropertyCard({ entry, meta, onMetaChange }) {
  const { id, timestamp, form = {}, analysis = {} } = entry;
  const address = analysis.address || form.address || 'Address not provided';
  const askingPrice = analysis.price || form.price || 'Not entered';
  const offerRange = analysis.suggestedOffer || (
    analysis.offerLow && analysis.offerHigh
      ? `${analysis.offerLow} - ${analysis.offerHigh}`
      : 'Run analysis for estimate'
  );

  return (
    <article className={`workspace-card${meta.favorite ? ' workspace-card--favorite' : ''}`}>
      <div className="workspace-card-top">
        <div className="workspace-title-block">
          <p className="workspace-address">{address}</p>
          <p className="workspace-date">Analyzed {formatDate(timestamp)}</p>
        </div>

        <button
          type="button"
          className={`favorite-btn${meta.favorite ? ' favorite-btn--active' : ''}`}
          onClick={() => onMetaChange(id, { favorite: !meta.favorite })}
          aria-label={meta.favorite ? 'Remove from favorites' : 'Add to favorites'}
          title={meta.favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 1.7L11.1 6.4H16.2L12.3 9.8L13.5 15.1L9 12.3L4.5 15.1L5.7 9.8L1.8 6.4H6.9L9 1.7Z"
              fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="workspace-price-row">
        <div>
          <span className="workspace-label">Asking Price</span>
          <strong className="workspace-price">{askingPrice}</strong>
        </div>
        <div className="workspace-status-field">
          <label className="workspace-label" htmlFor={`status-${id}`}>Status</label>
          <select
            id={`status-${id}`}
            className="workspace-status-select"
            value={meta.status}
            onChange={e => onMetaChange(id, { status: e.target.value })}
          >
            {STATUS_OPTIONS.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="workspace-score-grid">
        <div className="workspace-score">
          <span className="workspace-label">Deal Score</span>
          <span className={`badge ${scoreBadge(analysis.dealScore || 0)}`}>
            {analysis.dealScore ?? '--'} / 100
          </span>
        </div>
        <div className="workspace-score">
          <span className="workspace-label">Opportunity</span>
          <span className={`badge ${scoreBadge(analysis.opportunityScore || 0)}`}>
            {analysis.opportunityScore ?? '--'} / 100
          </span>
        </div>
      </div>

      <div className="workspace-offer">
        <span className="workspace-label">Suggested Offer Range</span>
        <strong>{offerRange}</strong>
      </div>

      <div className="workspace-notes">
        <label className="workspace-label" htmlFor={`notes-${id}`}>Research Notes</label>
        <textarea
          id={`notes-${id}`}
          value={meta.notes}
          onChange={e => onMetaChange(id, { notes: e.target.value })}
          placeholder="Add comps, rehab questions, lender notes, agent follow-ups..."
        />
      </div>
    </article>
  );
}

export default function PropertyWorkspace() {
  const [properties] = useState(() => getProperties());
  const [metaById, setMetaById] = useState(() => readWorkspaceMeta());
  const [filter, setFilter] = useState('All');

  const visibleProperties = useMemo(() => {
    return properties.filter(entry => {
      const meta = getMeta(metaById, entry.id);
      if (filter === 'All') return true;
      if (filter === 'Favorites') return meta.favorite;
      return meta.status === filter;
    });
  }, [properties, metaById, filter]);

  const counts = useMemo(() => {
    return FILTERS.reduce((acc, item) => {
      acc[item] = properties.filter(entry => {
        const meta = getMeta(metaById, entry.id);
        if (item === 'All') return true;
        if (item === 'Favorites') return meta.favorite;
        return meta.status === item;
      }).length;
      return acc;
    }, {});
  }, [properties, metaById]);

  const handleMetaChange = (id, patch) => {
    setMetaById(prev => {
      const next = {
        ...prev,
        [id]: {
          ...getMeta(prev, id),
          ...patch,
        },
      };
      writeWorkspaceMeta(next);
      return next;
    });
  };

  return (
    <div className="page">
      <div className="workspace-header">
        <div>
          <h1 className="page-title">Property Workspace</h1>
          <p className="page-subtitle">
            Manage the properties you are researching, track next steps, and keep deal notes in one place.
          </p>
        </div>
        <div className="workspace-summary">
          <span className="workspace-summary-value">{properties.length}</span>
          <span className="workspace-summary-label">Saved Properties</span>
        </div>
      </div>

      <div className="workspace-filters section" role="tablist" aria-label="Property filters">
        {FILTERS.map(item => (
          <button
            key={item}
            type="button"
            className={`workspace-filter${filter === item ? ' workspace-filter--active' : ''}`}
            onClick={() => setFilter(item)}
          >
            <span>{item}</span>
            <strong>{counts[item] || 0}</strong>
          </button>
        ))}
      </div>

      {properties.length === 0 ? (
        <EmptyWorkspace />
      ) : visibleProperties.length === 0 ? (
        <div className="card">
          <div className="workspace-empty-filter">
            <h3>No properties match this filter</h3>
            <p>Update a property status or choose another filter to keep moving.</p>
          </div>
        </div>
      ) : (
        <div className="workspace-grid">
          {visibleProperties.map(entry => (
            <PropertyCard
              key={entry.id}
              entry={entry}
              meta={getMeta(metaById, entry.id)}
              onMetaChange={handleMetaChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
