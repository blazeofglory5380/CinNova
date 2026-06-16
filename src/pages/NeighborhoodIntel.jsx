import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NEIGHBORHOODS, NEIGHBORHOOD_MAP } from '../data/neighborhoodData';
import { getSelectedProperty } from '../services/propertyWorkflow';
import './NeighborhoodIntel.css';

const fmtMoney = v =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${Math.round(v / 1000)}K`;

const fmtPct = v => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;

function gradeColor(grade) {
  if (grade.startsWith('A')) return 'green';
  if (grade.startsWith('B')) return 'blue';
  return 'gold';
}

function ScoreRing({ score, label, tone }) {
  const degrees = (score / 100) * 360;
  return (
    <div className={`ni-ring-card ni-ring-card--${tone}`}>
      <div
        className="ni-ring"
        style={{ background: `conic-gradient(var(--ni-ring-color) ${degrees}deg, var(--gray-100) 0deg)` }}
      >
        <div className="ni-ring-inner">
          <span>{score}</span>
          <small>/100</small>
        </div>
      </div>
      <div className="ni-ring-copy">
        <h3>{label}</h3>
        <p>{score >= 85 ? 'Excellent' : score >= 75 ? 'Strong' : score >= 65 ? 'Moderate' : 'Developing'}</p>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, tone }) {
  return (
    <div className={`ni-kpi ni-kpi--${tone}`}>
      <span className="ni-kpi-label">{label}</span>
      <strong>{value}</strong>
      <span className="ni-kpi-sub">{sub}</span>
    </div>
  );
}

function ScoreBar({ label, score, tone }) {
  return (
    <div className="ni-bar-row">
      <div className="ni-bar-meta">
        <span>{label}</span>
        <strong className={`ni-bar-val--${tone}`}>{score}</strong>
      </div>
      <div className="ni-bar-track">
        <div className={`ni-bar-fill ni-bar-fill--${tone}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function GrowthRow({ signal }) {
  return (
    <div className="ni-growth-row">
      <div className="ni-signal-top">
        <h3>{signal.title}</h3>
        <span className="badge badge-green">{signal.strength}</span>
      </div>
      <p>{signal.detail}</p>
    </div>
  );
}

function RiskRow({ risk }) {
  const badgeCls = risk.tone === 'red' ? 'badge-red' : risk.tone === 'gold' ? 'badge-gold' : 'badge-blue';
  return (
    <div className={`ni-risk-row ni-risk-row--${risk.tone}`}>
      <div className="ni-signal-top">
        <h3>{risk.label}</h3>
        <span className={`badge ${badgeCls}`}>{risk.level}</span>
      </div>
      <p>{risk.detail}</p>
    </div>
  );
}

export default function NeighborhoodIntel() {
  const navigate = useNavigate();
  const [neighborhoodId, setNeighborhoodId] = useState(NEIGHBORHOODS[0].id);

  const n = NEIGHBORHOOD_MAP[neighborhoodId];
  const selectedProperty = getSelectedProperty();
  const comparables = n.comparables.map(id => NEIGHBORHOOD_MAP[id]).filter(Boolean);

  const kpis = [
    { label: 'Median Home Price', value: fmtMoney(n.medianPrice), sub: `${fmtPct(n.yoyAppreciation)} YoY`, tone: n.yoyAppreciation >= 7 ? 'green' : 'blue' },
    { label: 'Median Rent', value: `$${n.medianRent.toLocaleString()}/mo`, sub: `${fmtPct(n.rentGrowth)} rent growth`, tone: n.rentGrowth >= 6 ? 'green' : 'teal' },
    { label: '3-Year Appreciation', value: fmtPct(n.priceGrowth3yr), sub: 'Cumulative price growth', tone: n.priceGrowth3yr >= 25 ? 'green' : 'blue' },
    { label: 'Cap Rate', value: `${n.capRate.toFixed(1)}%`, sub: 'Net operating yield', tone: n.capRate >= 5.5 ? 'green' : n.capRate >= 5 ? 'teal' : 'blue' },
    { label: 'Days on Market', value: String(n.daysOnMarket), sub: n.daysOnMarket <= 30 ? 'Fast absorption' : 'Balanced pace', tone: n.daysOnMarket <= 30 ? 'green' : 'blue' },
    { label: 'Vacancy Rate', value: `${n.vacancyRate.toFixed(1)}%`, sub: 'Rental availability', tone: n.vacancyRate <= 5 ? 'green' : 'gold' },
    { label: 'Walk Score', value: `${n.walkScore}/100`, sub: n.walkScore >= 90 ? "Walker's Paradise" : n.walkScore >= 80 ? 'Very Walkable' : 'Walkable', tone: n.walkScore >= 85 ? 'teal' : 'blue' },
    { label: 'Transit Score', value: `${n.transitScore}/100`, sub: n.transitScore >= 80 ? 'Excellent Transit' : 'Good Transit', tone: n.transitScore >= 80 ? 'green' : 'teal' },
  ];

  return (
    <div className="page">

      {/* Header */}
      <div className="ni-header">
        <div>
          <h1 className="page-title">Neighborhood Intelligence Center</h1>
          <p className="page-subtitle">
            Research walkability, investment strength, risk indicators, and local market fundamentals before making an offer.
          </p>
        </div>
        <div className={`ni-grade-badge ni-grade-badge--${gradeColor(n.investmentGrade)}`}>
          <span className="ni-grade-value">{n.investmentGrade}</span>
          <span className="ni-grade-label">Investment Grade</span>
        </div>
      </div>

      {/* Neighborhood Selector */}
      <div className="card section">
        <div className="card-header">
          <h2 className="card-title">Select Neighborhood</h2>
          <span className="badge badge-blue">{NEIGHBORHOODS.length} markets</span>
        </div>
        <div className="ni-selector-row">
          <div className="form-group ni-selector-select">
            <label className="form-label" htmlFor="nb-select">Neighborhood</label>
            <select
              id="nb-select"
              className="form-select"
              value={neighborhoodId}
              onChange={e => setNeighborhoodId(e.target.value)}
            >
              {NEIGHBORHOODS.map(nb => (
                <option key={nb.id} value={nb.id}>{nb.name} — {nb.city}, {nb.state}</option>
              ))}
            </select>
          </div>
          <div className="ni-selector-meta">
            <span className={`badge badge-${gradeColor(n.investmentGrade) === 'green' ? 'green' : gradeColor(n.investmentGrade) === 'blue' ? 'blue' : 'gold'}`}>
              {n.name} · {n.city}, {n.state}
            </span>
            <strong>{n.tagline}</strong>
          </div>
          <button className="btn btn-primary" type="button" onClick={() => navigate('/property-search')}>
            Search Properties Here
          </button>
        </div>
      </div>

      {/* Selected Property Context */}
      {selectedProperty && (
        <div className="ni-property-ctx section">
          <div className="ni-property-ctx-inner">
            <div>
              <span className="badge badge-teal">Active Property</span>
              <p className="ni-property-addr">{selectedProperty.fullAddress || selectedProperty.address || 'Selected Property'}</p>
              <p className="ni-property-meta">
                {selectedProperty.price ? `$${Number(selectedProperty.price).toLocaleString()}` : ''}
                {selectedProperty.beds ? ` · ${selectedProperty.beds} bd` : ''}
                {selectedProperty.baths ? ` ${selectedProperty.baths} ba` : ''}
                {selectedProperty.sqft ? ` · ${Number(selectedProperty.sqft).toLocaleString()} sqft` : ''}
              </p>
            </div>
            <p className="ni-property-note">
              Comparing against <strong>{n.name}, {n.city}</strong> neighborhood data before finalizing your offer.
            </p>
          </div>
        </div>
      )}

      {/* Neighborhood Identity Banner */}
      <div className="ni-identity-banner section">
        <div className="ni-identity-main">
          <span className="badge badge-blue">{n.city}, {n.state} · {n.zipCode}</span>
          <h2>{n.name}</h2>
          <p>{n.tagline}</p>
        </div>
        <div className="ni-identity-stats">
          <div>
            <span>Neighborhood Score</span>
            <strong>{n.neighborhoodScore}/100</strong>
          </div>
          <div>
            <span>Investor Confidence</span>
            <strong>{n.investorConfidence}/100</strong>
          </div>
          <div>
            <span>Cap Rate</span>
            <strong>{n.capRate.toFixed(1)}%</strong>
          </div>
          <div>
            <span>Appreciation</span>
            <strong>{fmtPct(n.yoyAppreciation)}</strong>
          </div>
        </div>
      </div>

      {/* Score Rings */}
      <div className="ni-ring-grid section">
        <ScoreRing score={n.neighborhoodScore} label="Neighborhood Score" tone="blue" />
        <ScoreRing score={n.investorConfidence} label="Investor Confidence" tone="teal" />
      </div>

      {/* KPI Cards */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Market Metrics</h2>
          <span className="badge badge-teal">Sample Intelligence</span>
        </div>
        <div className="ni-kpi-grid">
          {kpis.map(kpi => <KpiCard key={kpi.label} {...kpi} />)}
        </div>
      </div>

      {/* Lifestyle + Investment Strength */}
      <div className="grid-2 section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Mobility & Lifestyle</h2>
            <span className="badge badge-blue">Out of 100</span>
          </div>
          <div className="ni-bar-list">
            <ScoreBar label="Walk Score" score={n.walkScore} tone={n.walkScore >= 85 ? 'teal' : 'blue'} />
            <ScoreBar label="Transit Score" score={n.transitScore} tone={n.transitScore >= 75 ? 'green' : 'teal'} />
            <ScoreBar label="School Score" score={n.schoolScore} tone={n.schoolScore >= 75 ? 'green' : 'gold'} />
            <ScoreBar label="Lifestyle Score" score={n.lifestyleScore} tone={n.lifestyleScore >= 88 ? 'blue' : 'teal'} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Investment Strength</h2>
            <span className={`badge badge-${n.investmentStrength >= 82 ? 'green' : 'blue'}`}>
              {n.investmentStrength >= 82 ? 'Strong' : 'Moderate'} Profile
            </span>
          </div>
          <div className="ni-bar-list">
            <ScoreBar label="Overall Investment Strength" score={n.investmentStrength} tone="blue" />
            <ScoreBar label="Appreciation Potential" score={n.appreciationPotential} tone="teal" />
            <ScoreBar label="Rental Demand" score={n.rentalDemand} tone="green" />
          </div>
        </div>
      </div>

      {/* Growth Signals + Risk Indicators */}
      <div className="grid-2 section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Growth Signals</h2>
            <span className="badge badge-green">{n.growth.length} Positive</span>
          </div>
          <div className="ni-signal-list">
            {n.growth.map(g => <GrowthRow key={g.title} signal={g} />)}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Risk Indicators</h2>
            <span className="badge badge-gold">{n.risks.length} to Watch</span>
          </div>
          <div className="ni-signal-list">
            {n.risks.map(r => <RiskRow key={r.label} risk={r} />)}
          </div>
        </div>
      </div>

      {/* Comparable Neighborhoods Table */}
      <div className="card section">
        <div className="card-header">
          <h2 className="card-title">Comparable Neighborhoods</h2>
          <span className="badge badge-blue">CinNova Matched</span>
        </div>
        <div className="ni-table-wrap">
          <table className="ni-table">
            <thead>
              <tr>
                <th>Neighborhood</th>
                <th>City</th>
                <th>Grade</th>
                <th>Median Price</th>
                <th>YoY Appr.</th>
                <th>Walk Score</th>
                <th>NB Score</th>
              </tr>
            </thead>
            <tbody>
              <tr className="ni-table-current">
                <td><strong>{n.name}</strong></td>
                <td>{n.city}, {n.state}</td>
                <td><span className={`ni-grade-pill ni-grade-pill--${gradeColor(n.investmentGrade)}`}>{n.investmentGrade}</span></td>
                <td>{fmtMoney(n.medianPrice)}</td>
                <td>{fmtPct(n.yoyAppreciation)}</td>
                <td>{n.walkScore}</td>
                <td>{n.neighborhoodScore}</td>
              </tr>
              {comparables.map(c => (
                <tr
                  key={c.id}
                  className="ni-table-comparable"
                  onClick={() => setNeighborhoodId(c.id)}
                  title={`Switch to ${c.name}`}
                >
                  <td>{c.name}</td>
                  <td>{c.city}, {c.state}</td>
                  <td><span className={`ni-grade-pill ni-grade-pill--${gradeColor(c.investmentGrade)}`}>{c.investmentGrade}</span></td>
                  <td>{fmtMoney(c.medianPrice)}</td>
                  <td>{fmtPct(c.yoyAppreciation)}</td>
                  <td>{c.walkScore}</td>
                  <td>{c.neighborhoodScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ni-table-hint">Click a comparable row to switch to that neighborhood.</p>
      </div>

      {/* AI Neighborhood Insight */}
      <div className="card ni-insight-card section">
        <div className="card-header">
          <h2 className="card-title">AI Neighborhood Insight</h2>
          <span className="badge badge-blue">CinNova Analysis</span>
        </div>
        <p className="ni-insight-text">{n.insight}</p>
      </div>

      {/* Action Buttons */}
      <div className="ni-actions section">
        <button className="btn btn-primary" type="button" onClick={() => navigate('/property-search')}>
          Search Properties Here
        </button>
        <button className="btn btn-teal" type="button" onClick={() => navigate('/map')}>
          View on Map
        </button>
        <button className="btn btn-outline" type="button" onClick={() => navigate('/deal-analyzer')}>
          Run Deal Analyzer
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => navigate('/advisor')}>
          Ask AI Advisor
        </button>
      </div>

    </div>
  );
}
