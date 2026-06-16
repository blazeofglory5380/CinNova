import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSelectedProperty } from '../services/propertyWorkflow';
import { addToPortfolio } from '../services/propertyStorage';
import './DevStudio.css';

const PROJECT_TYPES = [
  { id: 'sfr-reno',    label: 'Single-Family Renovation', icon: '🏠', defaultUnits: 1,  defaultCostSqft: 120, defaultSoft: 10, finHint: 'Fix-and-flip hard money, or cash-out refi after stabilization. Lenders typically fund 70–90% of cost.' },
  { id: 'adu',         label: 'ADU',                       icon: '🏡', defaultUnits: 1,  defaultCostSqft: 200, defaultSoft: 14, finHint: 'Cash-out refi or HELOC on primary property. ADU-specific programs available in CA, OR, WA, and CO.' },
  { id: 'mf-convert',  label: 'Multifamily Conversion',   icon: '🏢', defaultUnits: 4,  defaultCostSqft: 130, defaultSoft: 13, finHint: 'Value-add bridge loan → agency refi on stabilization (Freddie SBL or Fannie DUS for 5+ units).' },
  { id: 'mf-groundup', label: 'Ground-Up Multifamily',    icon: '🏗️', defaultUnits: 12, defaultCostSqft: 195, defaultSoft: 18, finHint: 'Construction loan + permanent takeout. HUD 221(d)(4) for 20+ units. Expect 12–18 month construction timeline.' },
  { id: 'commercial',  label: 'Commercial Redev.',         icon: '🏬', defaultUnits: 0,  defaultCostSqft: 175, defaultSoft: 16, finHint: 'SBA 504 for owner-occupied; conventional construction at 70–75% LTC for investment. NNN lease structures improve debt coverage.' },
  { id: 'mixed-use',   label: 'Mixed-Use Dev.',            icon: '🌆', defaultUnits: 8,  defaultCostSqft: 210, defaultSoft: 20, finHint: 'Preferred equity + senior construction debt. Explore NMTC for qualifying census tracts. Retail anchor tenant improves LTV.' },
  { id: 'land',        label: 'Land Development',          icon: '🌱', defaultUnits: 0,  defaultCostSqft: 40,  defaultSoft: 22, finHint: 'Hard money or private capital for raw acquisition. Conventional lot loan after entitlement. Phase horizontals to reduce carry.' },
];

const BEST_USE = {
  'sfr-reno':    'Fix-and-flip or long-term hold after value-add renovation. Best in markets where ARV exceeds acquisition + rehab by 25%+. Target properties with deferred maintenance in appreciating zip codes.',
  'adu':         'Owner-occupied rental income or long-term hold. ADUs produce the best returns in high-rent markets (SF, LA, Seattle) where a single unit yields 6–8%+ on cost. Verify local setback and FAR limits before design.',
  'mf-convert':  'Value-add multifamily conversion — turn underutilized space into rentable units in supply-constrained corridors. Most effective when existing structure allows density without major structural changes.',
  'mf-groundup': 'Ground-up construction for undersupplied rental markets. Best ROI when delivered into corridors with sub-5% vacancy and above-average rent growth. Requires entitlement strategy and experienced GC with fixed-price contract.',
  'commercial':  'Commercial repositioning play — retail-to-flex, office-to-medical, or adaptive reuse. Best outcomes when new use-class demand exceeds current utilization and NOI can be significantly improved through repositioning.',
  'mixed-use':   'Urban infill mixed-use works best in high-walkability markets with retail foot traffic and growing residential demand. Ground-floor commercial anchors residential leasing momentum above.',
  'land':        'Entitlement play — acquire raw land, secure permits and entitlements, then sell entitled parcels or self-develop in phases. Highest risk/reward profile. Requires deep local regulatory knowledge and patience capital.',
};

const RISK_DETAIL = {
  Low:      'Project fundamentals are solid. ROI and development margin support institutional lender appetite. Execution risk is manageable with standard GC oversight.',
  Moderate: 'Key assumptions require third-party validation. Secure a hard bid from a licensed GC before committing capital. Soft cost and contingency buffers should be stress-tested.',
  Elevated: 'Material exposure to margin compression. Acquisition price, unit count, or construction cost targets need revision before this project can attract conventional financing.',
  High:     'Project does not pencil under current assumptions. Significant restructuring — price reduction, density increase, or lower construction cost — is required before pursuing capital.',
};

const NEXT_STEP = {
  green: 'Strong feasibility. Commission a full site analysis and Phase I environmental, engage a GC for a hard bid, and initiate lender pre-qualification conversations.',
  blue:  'Adequate feasibility. Validate assumptions with a licensed contractor estimate. Negotiate acquisition price down 5–8% if possible to improve margin before proceeding.',
  gold:  'Marginal feasibility. Review soft cost assumptions and construction cost targets. Consider increasing density or identifying value-add features to improve the return profile.',
  red:   'Project needs fundamental restructuring. Renegotiate acquisition price significantly, revisit the project program, or identify alternative uses that improve the return profile.',
};

const money = v => {
  const n = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (n >= 1_000_000) return `${sign}$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)    return `${sign}$${Math.round(n / 1000)}K`;
  return `${sign}$${Math.round(n)}`;
};

const fmtPct = v => `${v >= 0 ? '' : ''}${v.toFixed(1)}%`;

function feasibilityScore(roi, margin, profit) {
  let s = 50;
  if (profit > 0)    s += 10;
  if (roi > 20)      s += 15;
  else if (roi > 10) s += 8;
  else if (roi < 0)  s -= 20;
  else if (roi < 5)  s -= 10;
  if (margin > 25)       s += 10;
  else if (margin > 15)  s += 5;
  else if (margin < 10 && profit > 0) s -= 5;
  if (profit < 0)    s -= 15;
  return Math.max(0, Math.min(100, Math.round(s)));
}

function scoreColor(fs) {
  if (fs >= 75) return 'green';
  if (fs >= 55) return 'blue';
  if (fs >= 40) return 'gold';
  return 'red';
}

function riskLabel(fs) {
  if (fs >= 75) return 'Low';
  if (fs >= 55) return 'Moderate';
  if (fs >= 40) return 'Elevated';
  return 'High';
}

export default function DevStudio() {
  const navigate = useNavigate();
  const selectedProperty = getSelectedProperty();

  const [projectTypeId, setProjectTypeId] = useState('sfr-reno');
  const [saved, setSaved] = useState(false);

  const pt = PROJECT_TYPES.find(p => p.id === projectTypeId);

  const [form, setForm] = useState({
    acquisitionPrice: selectedProperty?.price ? String(Math.round(selectedProperty.price)) : '450000',
    lotSize:              '6500',
    existingSqft:         '1200',
    proposedSqft:         '1800',
    numUnits:             '1',
    constructionCostSqft: '120',
    softCostPct:          '10',
    contingencyPct:       '10',
    rentPerUnit:          '2200',
    resaleValue:          '720000',
    capRate:              '5.5',
    timelineMonths:       '12',
  });

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const selectType = p => {
    setProjectTypeId(p.id);
    setForm(prev => ({
      ...prev,
      numUnits:             String(p.defaultUnits),
      constructionCostSqft: String(p.defaultCostSqft),
      softCostPct:          String(p.defaultSoft),
    }));
    setSaved(false);
  };

  const calc = useMemo(() => {
    const acq      = Number(form.acquisitionPrice)      || 0;
    const propSqft = Number(form.proposedSqft)          || 0;
    const units    = Math.max(1, Number(form.numUnits)  || 1);
    const costSqft = Number(form.constructionCostSqft)  || 0;
    const softPct  = (Number(form.softCostPct)          || 0) / 100;
    const contPct  = (Number(form.contingencyPct)       || 0) / 100;
    const rent     = Number(form.rentPerUnit)            || 0;
    const resale   = Number(form.resaleValue)            || 0;
    const capRateN = (Number(form.capRate)               || 5.5) / 100;

    const hardCost    = propSqft * costSqft;
    const softCost    = hardCost * softPct;
    const contingency = (hardCost + softCost) * contPct;
    const totalDevCost    = hardCost + softCost + contingency;
    const totalProjectCost = acq + totalDevCost;
    const costPerUnit      = totalProjectCost / units;

    const annualRent    = rent * units * 12;
    const stabilizedValue = resale > 0
      ? resale
      : capRateN > 0 ? (annualRent * 0.72) / capRateN : 0;

    const profit    = stabilizedValue - totalProjectCost;
    const roi       = totalProjectCost > 0 ? (profit / totalProjectCost) * 100 : 0;
    const devMargin = stabilizedValue  > 0 ? (profit / stabilizedValue)  * 100 : 0;
    const fs        = feasibilityScore(roi, devMargin, profit);

    return {
      hardCost, softCost, contingency,
      totalDevCost, totalProjectCost, costPerUnit,
      annualRent, stabilizedValue,
      profit, roi, devMargin, fs,
      breakEven: totalProjectCost,
    };
  }, [form]);

  const color = scoreColor(calc.fs);
  const risk  = riskLabel(calc.fs);

  const handleSave = () => {
    addToPortfolio({
      id: Date.now(),
      address: selectedProperty?.fullAddress || selectedProperty?.address || `${pt.label} Project`,
      city: selectedProperty?.city || '',
      price: Number(form.acquisitionPrice) || 0,
      type: pt.label,
      cashFlow: Math.round(calc.profit / Math.max(1, Number(form.timelineMonths))),
      roi: calc.roi,
      score: calc.fs,
      status: 'Development',
    });
    setSaved(true);
  };

  return (
    <div className="page">

      {/* Header */}
      <div className="ds2-header">
        <div>
          <h1 className="page-title">Development Studio</h1>
          <p className="page-subtitle">
            Feasibility analysis for development and renovation projects — from single-family renovations to ground-up multifamily.
          </p>
        </div>
        <div className={`ds2-score-badge ds2-score-badge--${color}`}>
          <span className="ds2-score-value">{calc.fs}</span>
          <span className="ds2-score-label">Feasibility Score</span>
        </div>
      </div>

      {/* Project Type Selector */}
      <div className="card section">
        <div className="card-header">
          <h2 className="card-title">Project Type</h2>
          <span className="badge badge-blue">{PROJECT_TYPES.length} types</span>
        </div>
        <div className="ds2-type-grid">
          {PROJECT_TYPES.map(p => (
            <button
              key={p.id}
              type="button"
              className={`ds2-type-btn${projectTypeId === p.id ? ' active' : ''}`}
              onClick={() => selectType(p)}
            >
              <span className="ds2-type-icon">{p.icon}</span>
              <span className="ds2-type-label">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Property Context */}
      {selectedProperty && (
        <div className="ds2-property-ctx section">
          <span className="badge badge-teal">Active Property</span>
          <p className="ds2-property-addr">{selectedProperty.fullAddress || selectedProperty.address}</p>
          <p className="ds2-property-meta">
            {selectedProperty.price ? `$${Number(selectedProperty.price).toLocaleString()}` : ''}
            {selectedProperty.beds  ? ` · ${selectedProperty.beds} bd` : ''}
            {selectedProperty.baths ? ` ${selectedProperty.baths} ba` : ''}
            {selectedProperty.sqft  ? ` · ${Number(selectedProperty.sqft).toLocaleString()} sqft` : ''}
          </p>
        </div>
      )}

      {/* Inputs + Results */}
      <div className="ds2-analysis-grid section">

        {/* ── Inputs ── */}
        <div className="card ds2-inputs-card">
          <div className="card-header">
            <h2 className="card-title">Project Inputs</h2>
            <span className="badge badge-gold">{pt.label}</span>
          </div>

          <div className="ds2-input-section">
            <h3 className="ds2-input-section-title">Acquisition</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Acquisition Price ($)</label>
                <input className="form-input" type="number" min="0"
                  value={form.acquisitionPrice}
                  onChange={e => setField('acquisitionPrice', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Lot Size (sqft)</label>
                <input className="form-input" type="number" min="0"
                  value={form.lotSize}
                  onChange={e => setField('lotSize', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="ds2-input-section">
            <h3 className="ds2-input-section-title">Building Program</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Existing Building (sqft)</label>
                <input className="form-input" type="number" min="0"
                  value={form.existingSqft}
                  onChange={e => setField('existingSqft', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Proposed Building (sqft)</label>
                <input className="form-input" type="number" min="0"
                  value={form.proposedSqft}
                  onChange={e => setField('proposedSqft', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Number of Units</label>
                <input className="form-input" type="number" min="1"
                  value={form.numUnits}
                  onChange={e => setField('numUnits', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Timeline (months)</label>
                <input className="form-input" type="number" min="1"
                  value={form.timelineMonths}
                  onChange={e => setField('timelineMonths', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="ds2-input-section">
            <h3 className="ds2-input-section-title">Construction Costs</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Construction Cost / Sqft ($)</label>
                <input className="form-input" type="number" min="0"
                  value={form.constructionCostSqft}
                  onChange={e => setField('constructionCostSqft', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Soft Cost % (of hard costs)</label>
                <input className="form-input" type="number" min="0" max="50" step="0.5"
                  value={form.softCostPct}
                  onChange={e => setField('softCostPct', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Contingency %</label>
                <input className="form-input" type="number" min="0" max="30" step="0.5"
                  value={form.contingencyPct}
                  onChange={e => setField('contingencyPct', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="ds2-input-section">
            <h3 className="ds2-input-section-title">Expected Returns</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Rent per Unit / Month ($)</label>
                <input className="form-input" type="number" min="0"
                  value={form.rentPerUnit}
                  onChange={e => setField('rentPerUnit', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Resale / Stabilized Value ($)</label>
                <input className="form-input" type="number" min="0"
                  value={form.resaleValue}
                  onChange={e => setField('resaleValue', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Cap Rate % (used if no resale)</label>
                <input className="form-input" type="number" min="1" max="15" step="0.1"
                  value={form.capRate}
                  onChange={e => setField('capRate', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Results ── */}
        <div className="ds2-results-col">

          {/* Cost Breakdown */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Cost Breakdown</h2>
              <span className="badge badge-gray">Live</span>
            </div>
            <div className="ds2-cost-list">
              <div className="ds2-cost-row">
                <span>Acquisition Price</span>
                <strong>{money(Number(form.acquisitionPrice) || 0)}</strong>
              </div>
              <div className="ds2-cost-row">
                <span>Hard Costs ({(Number(form.proposedSqft)||0).toLocaleString()} sqft × ${form.constructionCostSqft}/sqft)</span>
                <strong>{money(calc.hardCost)}</strong>
              </div>
              <div className="ds2-cost-row ds2-cost-row--sub">
                <span>Soft Costs ({form.softCostPct}%)</span>
                <span>{money(calc.softCost)}</span>
              </div>
              <div className="ds2-cost-row ds2-cost-row--sub">
                <span>Contingency ({form.contingencyPct}%)</span>
                <span>{money(calc.contingency)}</span>
              </div>
              <div className="ds2-cost-row ds2-cost-row--subtotal">
                <span>Total Development Cost</span>
                <strong>{money(calc.totalDevCost)}</strong>
              </div>
              <div className="ds2-cost-row ds2-cost-row--total">
                <span>Total Project Cost</span>
                <strong>{money(calc.totalProjectCost)}</strong>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="ds2-kpi-grid">
            <div className={`ds2-kpi ds2-kpi--${calc.profit >= 0 ? 'green' : 'red'}`}>
              <span className="ds2-kpi-label">Est. Profit</span>
              <strong>{money(calc.profit)}</strong>
              <span className="ds2-kpi-sub">Value minus total cost</span>
            </div>
            <div className={`ds2-kpi ds2-kpi--${calc.roi >= 15 ? 'green' : calc.roi >= 8 ? 'blue' : 'gold'}`}>
              <span className="ds2-kpi-label">ROI</span>
              <strong>{fmtPct(calc.roi)}</strong>
              <span className="ds2-kpi-sub">Return on project cost</span>
            </div>
            <div className={`ds2-kpi ds2-kpi--${calc.devMargin >= 20 ? 'green' : calc.devMargin >= 12 ? 'teal' : 'gold'}`}>
              <span className="ds2-kpi-label">Dev. Margin</span>
              <strong>{fmtPct(calc.devMargin)}</strong>
              <span className="ds2-kpi-sub">Profit ÷ stabilized value</span>
            </div>
            <div className="ds2-kpi ds2-kpi--blue">
              <span className="ds2-kpi-label">Cost per Unit</span>
              <strong>{money(calc.costPerUnit)}</strong>
              <span className="ds2-kpi-sub">{form.numUnits} unit{Number(form.numUnits) !== 1 ? 's' : ''}</span>
            </div>
            <div className="ds2-kpi ds2-kpi--teal">
              <span className="ds2-kpi-label">Stabilized Value</span>
              <strong>{money(calc.stabilizedValue)}</strong>
              <span className="ds2-kpi-sub">{Number(form.resaleValue) > 0 ? 'From resale input' : `At ${form.capRate}% cap rate`}</span>
            </div>
            <div className="ds2-kpi ds2-kpi--blue">
              <span className="ds2-kpi-label">Break-Even Value</span>
              <strong>{money(calc.breakEven)}</strong>
              <span className="ds2-kpi-sub">Minimum exit required</span>
            </div>
          </div>

          {/* Feasibility Meter */}
          <div className={`card ds2-feasibility-card ds2-feasibility-card--${color}`}>
            <div className="ds2-feasibility-header">
              <div>
                <h2 className="card-title">Feasibility Score</h2>
                <p className="ds2-feasibility-desc">
                  Composite of ROI, development margin, and profit relative to project cost.
                </p>
              </div>
              <div className="ds2-feasibility-score">
                <span>{calc.fs}</span>
                <small>/100</small>
              </div>
            </div>
            <div className="ds2-feasibility-track">
              <div
                className={`ds2-feasibility-fill ds2-feasibility-fill--${color}`}
                style={{ width: `${calc.fs}%` }}
              />
            </div>
            <div className="ds2-feasibility-zones">
              <span>Poor</span>
              <span>Marginal</span>
              <span>Good</span>
              <span>Excellent</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="card section">
        <div className="card-header">
          <h2 className="card-title">AI Development Recommendations</h2>
          <span className={`badge badge-${color === 'green' ? 'green' : color === 'red' ? 'red' : 'gold'}`}>
            {risk} Risk
          </span>
        </div>
        <div className="ds2-recs-grid">
          <div className="ds2-rec-card">
            <span className="ds2-rec-label">Best Use</span>
            <p>{BEST_USE[projectTypeId]}</p>
          </div>
          <div className="ds2-rec-card">
            <span className="ds2-rec-label">Risk Assessment</span>
            <p>
              <strong className={`ds2-risk-text ds2-risk-text--${color}`}>{risk} Risk</strong>
              {' — '}{RISK_DETAIL[risk]}
            </p>
          </div>
          <div className="ds2-rec-card">
            <span className="ds2-rec-label">Financing Strategy</span>
            <p>{pt.finHint}</p>
          </div>
          <div className="ds2-rec-card">
            <span className="ds2-rec-label">Recommended Next Step</span>
            <p>{NEXT_STEP[color]}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="ds2-actions section">
        <button
          type="button"
          className={`btn ${saved ? 'btn-ghost' : 'btn-primary'}`}
          onClick={handleSave}
          disabled={saved}
        >
          {saved ? 'Saved to Portfolio' : 'Save to Portfolio'}
        </button>
        <button type="button" className="btn btn-teal" onClick={() => navigate('/deal-analyzer')}>
          Analyze Deal
        </button>
        <button type="button" className="btn btn-outline" onClick={() => navigate('/advisor')}>
          Ask AI Advisor
        </button>
      </div>

    </div>
  );
}
