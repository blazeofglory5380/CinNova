import { useMemo, useState } from 'react';
import { getProperties } from '../services/propertyStorage';
import { createAnalysisFromProperty, getCompareProperties, propertyToForm } from '../services/propertyWorkflow';
import './PropertyComparison.css';

const MAX_COMPARE = 3;

function formatDate(timestamp) {
  if (!timestamp) return 'Unknown date';
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function scoreValue(entry, key) {
  const score = Number(entry?.analysis?.[key]);
  return Number.isFinite(score) ? score : 0;
}

function propertyTitle(entry) {
  return entry?.analysis?.address || entry?.form?.address || 'Address not provided';
}

function scoreBadge(score) {
  if (score >= 88) return 'badge-green';
  if (score >= 74) return 'badge-blue';
  if (score >= 60) return 'badge-gold';
  return 'badge-red';
}

function getOfferRange(entry) {
  const analysis = entry.analysis || {};
  if (analysis.suggestedOffer) return analysis.suggestedOffer;
  if (analysis.offerLow && analysis.offerHigh) return `${analysis.offerLow} - ${analysis.offerHigh}`;
  return 'Not available';
}

function getOwnershipCost(entry) {
  return entry?.analysis?.tco?.total
    ? `${entry.analysis.tco.total} / mo`
    : 'Not available';
}

function compareMetricRows(selected) {
  return [
    {
      label: 'Asking Price',
      values: selected.map(entry => entry.analysis?.price || entry.form?.price || 'Not entered'),
    },
    {
      label: 'Deal Score',
      values: selected.map(entry => `${entry.analysis?.dealScore ?? '--'} / 100`),
    },
    {
      label: 'Opportunity Score',
      values: selected.map(entry => `${entry.analysis?.opportunityScore ?? '--'} / 100`),
    },
    {
      label: 'Suggested Offer Range',
      values: selected.map(getOfferRange),
    },
    {
      label: 'Estimated Rehab',
      values: selected.map(entry => entry.analysis?.rehabCost || 'Not available'),
    },
    {
      label: 'Monthly Ownership Cost',
      values: selected.map(getOwnershipCost),
    },
  ];
}

function EmptyState() {
  return (
    <div className="card">
      <div className="placeholder-section">
        <div className="placeholder-icon">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect x="5" y="8" width="10" height="20" rx="3" stroke="currentColor" strokeWidth="1.8"/>
            <rect x="21" y="8" width="10" height="20" rx="3" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M15 18H21M18 15V21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
          </svg>
        </div>
        <h3>No Saved Properties to Compare</h3>
        <p>
          Analyze properties first, then return here to compare deal scores, offers, rehab, and ownership costs.
        </p>
        <div className="placeholder-tags">
          <span className="badge badge-blue">Side-by-Side</span>
          <span className="badge badge-teal">Best Overall</span>
          <span className="badge badge-gold">Offer Ranges</span>
        </div>
      </div>
    </div>
  );
}

function SelectableProperty({ entry, selected, disabled, onToggle }) {
  const analysis = entry.analysis || {};
  const combined = Math.round((scoreValue(entry, 'dealScore') + scoreValue(entry, 'opportunityScore')) / 2);

  return (
    <button
      type="button"
      className={`pc-select-card${selected ? ' pc-select-card--selected' : ''}`}
      onClick={() => onToggle(entry.id)}
      disabled={disabled && !selected}
    >
      <span className="pc-select-check" aria-hidden="true">
        {selected ? '✓' : ''}
      </span>
      <span className="pc-select-body">
        <span className="pc-select-address">{propertyTitle(entry)}</span>
        <span className="pc-select-meta">
          {analysis.price || 'No price'} · Analyzed {formatDate(entry.timestamp)}
        </span>
      </span>
      <span className={`badge ${scoreBadge(combined)}`}>{combined}</span>
    </button>
  );
}

function ComparisonCard({ entry, isBest }) {
  const dealScore = scoreValue(entry, 'dealScore');
  const opportunityScore = scoreValue(entry, 'opportunityScore');
  const average = Math.round((dealScore + opportunityScore) / 2);

  return (
    <article className={`pc-card${isBest ? ' pc-card--best' : ''}`}>
      <div className="pc-card-top">
        <div>
          <p className="pc-card-address">{propertyTitle(entry)}</p>
          <p className="pc-card-date">Analyzed {formatDate(entry.timestamp)}</p>
        </div>
        {isBest && <span className="badge badge-green">Best Overall</span>}
      </div>

      <div className="pc-card-price">
        <span>Asking Price</span>
        <strong>{entry.analysis?.price || entry.form?.price || 'Not entered'}</strong>
      </div>

      <div className="pc-card-scores">
        <div>
          <span>Deal</span>
          <strong>{dealScore || '--'}</strong>
        </div>
        <div>
          <span>Opportunity</span>
          <strong>{opportunityScore || '--'}</strong>
        </div>
        <div>
          <span>Blend</span>
          <strong>{average || '--'}</strong>
        </div>
      </div>

      <div className="pc-card-offer">
        <span>Suggested Offer</span>
        <strong>{getOfferRange(entry)}</strong>
      </div>
    </article>
  );
}

export default function PropertyComparison() {
  const [properties] = useState(() => {
    const saved = getProperties();
    const compareEntries = getCompareProperties().map(property => ({
      id: `compare-${property.id}`,
      timestamp: new Date().toISOString(),
      form: propertyToForm(property),
      analysis: createAnalysisFromProperty(property),
    }));
    const savedKeys = new Set(saved.map(entry => propertyTitle(entry)));
    return [
      ...compareEntries.filter(entry => !savedKeys.has(propertyTitle(entry))),
      ...saved,
    ];
  });
  const [selectedIds, setSelectedIds] = useState(() => properties.slice(0, Math.min(2, properties.length)).map(p => p.id));

  const selectedProperties = useMemo(() => {
    return selectedIds
      .map(id => properties.find(entry => entry.id === id))
      .filter(Boolean);
  }, [properties, selectedIds]);

  const bestProperty = useMemo(() => {
    if (selectedProperties.length === 0) return null;
    return selectedProperties.reduce((best, entry) => {
      const entryScore = scoreValue(entry, 'dealScore') + scoreValue(entry, 'opportunityScore');
      const bestScore = scoreValue(best, 'dealScore') + scoreValue(best, 'opportunityScore');
      return entryScore > bestScore ? entry : best;
    }, selectedProperties[0]);
  }, [selectedProperties]);

  const metricRows = useMemo(() => compareMetricRows(selectedProperties), [selectedProperties]);
  const selectionFull = selectedIds.length >= MAX_COMPARE;

  const handleToggle = id => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(existing => existing !== id);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
  };

  return (
    <div className="page">
      <div className="pc-header">
        <div>
          <h1 className="page-title">Property Comparison Center</h1>
          <p className="page-subtitle">
            Select up to three saved analyses and compare deal quality, offer ranges, rehab, and ownership costs side by side.
          </p>
        </div>
        <div className="pc-summary">
          <span className="pc-summary-value">{selectedProperties.length}</span>
          <span className="pc-summary-label">Selected</span>
        </div>
      </div>

      {properties.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="card section">
            <div className="card-header">
              <h2 className="card-title">Choose Properties</h2>
              <span className={`badge ${selectionFull ? 'badge-gold' : 'badge-blue'}`}>
                Up to {MAX_COMPARE}
              </span>
            </div>
            <div className="pc-select-grid">
              {properties.map(entry => (
                <SelectableProperty
                  key={entry.id}
                  entry={entry}
                  selected={selectedIds.includes(entry.id)}
                  disabled={selectionFull}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </div>

          {selectedProperties.length === 0 ? (
            <div className="card">
              <div className="pc-empty-selection">
                <h3>Select at least one property</h3>
                <p>Pick saved analyses above to build your comparison.</p>
              </div>
            </div>
          ) : (
            <>
              {bestProperty && (
                <div className="pc-best-banner section">
                  <div className="pc-best-icon">
                    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                      <path d="M13 2.5L15.9 9H23L17.5 13.4L19.4 20.5L13 16.7L6.6 20.5L8.5 13.4L3 9H10.1L13 2.5Z"
                        fill="currentColor"/>
                    </svg>
                  </div>
                  <div>
                    <span className="pc-best-label">Best Overall Recommendation</span>
                    <h2>{propertyTitle(bestProperty)}</h2>
                    <p>
                      Highest combined deal and opportunity score among the selected properties.
                    </p>
                  </div>
                </div>
              )}

              <div className="pc-card-grid section">
                {selectedProperties.map(entry => (
                  <ComparisonCard
                    key={entry.id}
                    entry={entry}
                    isBest={bestProperty?.id === entry.id}
                  />
                ))}
              </div>

              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Side-by-Side Comparison</h2>
                  <span className="badge badge-teal">{selectedProperties.length} Properties</span>
                </div>
                <div className="pc-table-wrap">
                  <table className="pc-table">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        {selectedProperties.map(entry => (
                          <th key={entry.id}>{propertyTitle(entry)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {metricRows.map(row => (
                        <tr key={row.label}>
                          <td className="pc-table-label">{row.label}</td>
                          {row.values.map((value, index) => (
                            <td key={`${row.label}-${selectedProperties[index].id}`}>{value}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
