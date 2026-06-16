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

/* ── Scenario mode ───────────────────────────────────────── */
const SCENARIO_PARAMS = {
  conservative: {
    label:       'Conservative',
    description: '+10% construction cost · −8% value · +4 months',
    costMult:    1.10,
    valueMult:   0.92,
    rentMult:    0.92,
    timelineAdd: 4,
    contAdd:     3,
  },
  base: {
    label:       'Base Case',
    description: 'Your current input assumptions',
    costMult:    1.00,
    valueMult:   1.00,
    rentMult:    1.00,
    timelineAdd: 0,
    contAdd:     0,
  },
  aggressive: {
    label:       'Aggressive',
    description: '−5% construction cost · +8% value · −2 months',
    costMult:    0.95,
    valueMult:   1.08,
    rentMult:    1.08,
    timelineAdd: -2,
    contAdd:     -2,
  },
};

const SENSITIVITY_TESTS = [
  { key: 'base',        label: 'Base Case',              costMult: 1.00, valueMult: 1.00, rentMult: 1.00, timelineAdd: 0, contAdd: 0 },
  { key: 'costUp10',    label: 'If cost rises 10%',      costMult: 1.10, valueMult: 1.00, rentMult: 1.00, timelineAdd: 0, contAdd: 0 },
  { key: 'valueDown10', label: 'If resale drops 10%',    costMult: 1.00, valueMult: 0.90, rentMult: 1.00, timelineAdd: 0, contAdd: 0 },
  { key: 'timeline6mo', label: 'If timeline +6 months',  costMult: 1.00, valueMult: 1.00, rentMult: 1.00, timelineAdd: 6, contAdd: 0 },
  { key: 'rentDown10',  label: 'If rents are 10% lower', costMult: 1.00, valueMult: 1.00, rentMult: 0.90, timelineAdd: 0, contAdd: 0 },
];

/* ── Development recommendation ──────────────────────────── */
const RECOMMENDATION_MAP = {
  proceed:      { label: 'Proceed',      color: 'green', badge: 'badge-green', detail: 'Project fundamentals support moving forward. Commission site analysis, Phase I environmental, and initiate lender pre-qualification. Lock in a fixed-price GC contract.' },
  revise:       { label: 'Revise Scope', color: 'blue',  badge: 'badge-blue',  detail: 'Good foundation with margin to improve. Negotiate acquisition price down 5–8%, tighten construction scope, or increase unit count to strengthen the return profile.' },
  seek_partner: { label: 'Seek Partner', color: 'gold',  badge: 'badge-gold',  detail: 'Marginal as a solo deal. Bring in a preferred equity or JV partner to reduce capital exposure. Explore programmatic changes or density bonuses to improve feasibility.' },
  avoid:        { label: 'Avoid',        color: 'red',   badge: 'badge-red',   detail: 'Project does not pencil at current assumptions. Significantly renegotiate acquisition price, increase density, or identify an alternative use before committing capital.' },
};

function getRecommendation(fs) {
  if (fs >= 70) return RECOMMENDATION_MAP.proceed;
  if (fs >= 55) return RECOMMENDATION_MAP.revise;
  if (fs >= 40) return RECOMMENDATION_MAP.seek_partner;
  return RECOMMENDATION_MAP.avoid;
}

/* ── Helpers ─────────────────────────────────────────────── */
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

/* Compute financials for any scenario multiplier set */
function computeScenario(form, sm) {
  const acq      = Number(form.acquisitionPrice) || 0;
  const propSqft = Number(form.proposedSqft)     || 0;
  const units    = Math.max(1, Number(form.numUnits) || 1);
  const costSqft = (Number(form.constructionCostSqft) || 0) * sm.costMult;
  const softPct  = (Number(form.softCostPct) || 0) / 100;
  const contPct  = Math.max(0, (Number(form.contingencyPct) || 0) + (sm.contAdd || 0)) / 100;
  const rent     = (Number(form.rentPerUnit) || 0) * sm.rentMult;
  const resale   = (Number(form.resaleValue) || 0) * sm.valueMult;
  const capRateN = (Number(form.capRate) || 5.5) / 100;

  const hardCost     = propSqft * costSqft;
  const softCost     = hardCost * softPct;
  const contingency  = (hardCost + softCost) * contPct;
  const totalDevCost = hardCost + softCost + contingency;

  const extraCarry = sm.timelineAdd > 0 ? acq * 0.0075 * sm.timelineAdd : 0;
  const totalProjectCost = acq + totalDevCost + extraCarry;
  const costPerUnit      = totalProjectCost / units;

  const annualRent      = rent * units * 12;
  const stabilizedValue = resale > 0 ? resale : (capRateN > 0 ? (annualRent * 0.72) / capRateN : 0);

  const profit    = stabilizedValue - totalProjectCost;
  const roi       = totalProjectCost > 0 ? (profit / totalProjectCost) * 100 : 0;
  const devMargin = stabilizedValue  > 0 ? (profit / stabilizedValue)  * 100 : 0;
  const fs        = feasibilityScore(roi, devMargin, profit);

  return { hardCost, softCost, contingency, totalDevCost, totalProjectCost, costPerUnit, annualRent, stabilizedValue, profit, roi, devMargin, fs, breakEven: totalProjectCost };
}

/* ── Main component ──────────────────────────────────────── */
export default function DevStudio() {
  const navigate = useNavigate();
  const selectedProperty = getSelectedProperty();

  const [projectTypeId,  setProjectTypeId]  = useState('sfr-reno');
  const [saved,          setSaved]          = useState(false);
  const [analysisSaved,  setAnalysisSaved]  = useState(false);
  const [scenario,       setScenario]       = useState('base');

  const pt = PROJECT_TYPES.find(p => p.id === projectTypeId);

  const [form, setForm] = useState({
    acquisitionPrice:     selectedProperty?.price ? String(Math.round(selectedProperty.price)) : '450000',
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
    setAnalysisSaved(false);
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
    setAnalysisSaved(false);
  };

  /* Base calc (form inputs as-is) */
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

    const annualRent      = rent * units * 12;
    const stabilizedValue = resale > 0 ? resale : (capRateN > 0 ? (annualRent * 0.72) / capRateN : 0);

    const profit    = stabilizedValue - totalProjectCost;
    const roi       = totalProjectCost > 0 ? (profit / totalProjectCost) * 100 : 0;
    const devMargin = stabilizedValue  > 0 ? (profit / stabilizedValue)  * 100 : 0;
    const fs        = feasibilityScore(roi, devMargin, profit);

    return { hardCost, softCost, contingency, totalDevCost, totalProjectCost, costPerUnit, annualRent, stabilizedValue, profit, roi, devMargin, fs, breakEven: totalProjectCost };
  }, [form]);

  /* Scenario-adjusted calc (used for KPIs / feasibility display) */
  const scenarioCalc = useMemo(
    () => computeScenario(form, SCENARIO_PARAMS[scenario]),
    [form, scenario]
  );

  /* All 3 scenarios for comparison table */
  const scenarioComparison = useMemo(() => ({
    conservative: computeScenario(form, SCENARIO_PARAMS.conservative),
    base:         computeScenario(form, SCENARIO_PARAMS.base),
    aggressive:   computeScenario(form, SCENARIO_PARAMS.aggressive),
  }), [form]);

  /* Sensitivity tests */
  const sensitivity = useMemo(
    () => SENSITIVITY_TESTS.map(t => ({ ...t, result: computeScenario(form, t) })),
    [form]
  );

  /* Derived display values — use scenario-adjusted calc */
  const color = scoreColor(scenarioCalc.fs);
  const risk  = riskLabel(scenarioCalc.fs);
  const rec   = getRecommendation(scenarioCalc.fs);

  // Type-specific derived values (always from base calc / form)
  const acqNum    = Number(form.acquisitionPrice) || 0;
  const rentNum   = Number(form.rentPerUnit)       || 0;
  const capRateN  = (Number(form.capRate) || 5.5)  / 100;
  const monthsNum = Number(form.timelineMonths)    || 12;
  const propSqftN = Number(form.proposedSqft)      || 0;
  const costSqftN = Number(form.constructionCostSqft) || 0;
  const numUnitsN = Math.max(1, Number(form.numUnits) || 1);

  const aduBuildCost  = propSqftN * costSqftN * (1 + (Number(form.softCostPct) + Number(form.contingencyPct)) / 100);
  const aduPaybackYrs = rentNum > 0 && aduBuildCost > 0 ? aduBuildCost / (rentNum * 12) : 0;
  const aduIncomeVal  = rentNum > 0 && capRateN > 0 ? (rentNum * 12 * 0.72) / capRateN : 0;
  const aduValueAdded = aduIncomeVal - aduBuildCost;

  const arvVal     = Number(form.resaleValue) > 0 ? Number(form.resaleValue) : acqNum * 1.20;
  const rule70     = arvVal * 0.70 - calc.hardCost;
  const flipMargin = arvVal > 0 ? ((arvVal - calc.totalProjectCost) / arvVal * 100) : 0;

  const monthlyCarry   = acqNum * 0.015 / 12;
  const entitleCost    = acqNum * 0.04;
  const totalWithCarry = acqNum + entitleCost + (monthlyCarry * monthsNum);
  const landNetProfit  = calc.stabilizedValue - totalWithCarry;

  const annualGrossRent = rentNum * numUnitsN * 12;
  const noiCommercial   = annualGrossRent * 0.72;
  const nnnEquiv        = rentNum * 1.15;
  const impliedCap      = calc.stabilizedValue > 0 ? (noiCommercial / calc.stabilizedValue) * 100 : 0;

  const grm = rentNum > 0 ? (calc.stabilizedValue / (rentNum * numUnitsN * 12)) : 0;

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

  const saveDevAnalysis = () => {
    const data = {
      id:             Date.now(),
      timestamp:      new Date().toISOString(),
      projectType:    pt.label,
      address:        selectedProperty?.fullAddress || selectedProperty?.address || `${pt.label} Project`,
      form,
      feasibility:    calc.fs,
      roi:            calc.roi,
      profit:         calc.profit,
      recommendation: rec.label,
      scenarios:      scenarioComparison,
    };
    try {
      const existing = JSON.parse(localStorage.getItem('cinnova_dev_analyses') || '[]');
      localStorage.setItem('cinnova_dev_analyses', JSON.stringify([data, ...existing].slice(0, 20)));
    } catch {}
    setAnalysisSaved(true);
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
          <span className="ds2-score-value">{scenarioCalc.fs}</span>
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
              <span className="badge badge-gray">Base Inputs</span>
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

          {/* Scenario Toggle */}
          <div className="ds2-scenario-bar">
            {Object.entries(SCENARIO_PARAMS).map(([key, s]) => (
              <button
                key={key}
                type="button"
                className={`ds2-scenario-btn${scenario === key ? ' active ds2-scenario-btn--' + scoreColor(scenarioComparison[key].fs) : ''}`}
                onClick={() => setScenario(key)}
              >
                {s.label}
              </button>
            ))}
          </div>
          {scenario !== 'base' && (
            <div className={`ds2-scenario-note ds2-scenario-note--${color}`}>
              {SCENARIO_PARAMS[scenario].description}
            </div>
          )}

          {/* KPI Cards */}
          <div className="ds2-kpi-grid">
            <div className={`ds2-kpi ds2-kpi--${scenarioCalc.profit >= 0 ? 'green' : 'red'}`}>
              <span className="ds2-kpi-label">Est. Profit</span>
              <strong>{money(scenarioCalc.profit)}</strong>
              <span className="ds2-kpi-sub">Value minus total cost</span>
            </div>
            <div className={`ds2-kpi ds2-kpi--${scenarioCalc.roi >= 15 ? 'green' : scenarioCalc.roi >= 8 ? 'blue' : 'gold'}`}>
              <span className="ds2-kpi-label">ROI</span>
              <strong>{fmtPct(scenarioCalc.roi)}</strong>
              <span className="ds2-kpi-sub">Return on project cost</span>
            </div>
            <div className={`ds2-kpi ds2-kpi--${scenarioCalc.devMargin >= 20 ? 'green' : scenarioCalc.devMargin >= 12 ? 'teal' : 'gold'}`}>
              <span className="ds2-kpi-label">Dev. Margin</span>
              <strong>{fmtPct(scenarioCalc.devMargin)}</strong>
              <span className="ds2-kpi-sub">Profit ÷ stabilized value</span>
            </div>
            <div className="ds2-kpi ds2-kpi--blue">
              <span className="ds2-kpi-label">Cost per Unit</span>
              <strong>{money(scenarioCalc.costPerUnit)}</strong>
              <span className="ds2-kpi-sub">{form.numUnits} unit{Number(form.numUnits) !== 1 ? 's' : ''}</span>
            </div>
            <div className="ds2-kpi ds2-kpi--teal">
              <span className="ds2-kpi-label">Stabilized Value</span>
              <strong>{money(scenarioCalc.stabilizedValue)}</strong>
              <span className="ds2-kpi-sub">{Number(form.resaleValue) > 0 ? 'From resale input' : `At ${form.capRate}% cap rate`}</span>
            </div>
            <div className="ds2-kpi ds2-kpi--blue">
              <span className="ds2-kpi-label">Break-Even Value</span>
              <strong>{money(scenarioCalc.breakEven)}</strong>
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
                <span>{scenarioCalc.fs}</span>
                <small>/100</small>
              </div>
            </div>
            <div className="ds2-feasibility-track">
              <div
                className={`ds2-feasibility-fill ds2-feasibility-fill--${color}`}
                style={{ width: `${scenarioCalc.fs}%` }}
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

      {/* ── Development Recommendation ── */}
      <div className={`card section ds2-rec-action ds2-rec-action--${rec.color}`}>
        <div className="card-header">
          <h2 className="card-title">Development Recommendation</h2>
          <span className={`badge ${rec.badge}`}>{rec.label}</span>
        </div>
        <div className="ds2-rec-action-body">
          <div className="ds2-rec-action-verdict">
            <span className={`ds2-rec-action-label ds2-rec-action-label--${rec.color}`}>{rec.label}</span>
            <p>{rec.detail}</p>
          </div>
          <div className="ds2-rec-action-criteria">
            <span className="ds2-rec-label">Criteria Summary</span>
            <div className="ds2-criteria-rows">
              {[
                { label: 'Feasibility Score', val: `${scenarioCalc.fs}/100`, pass: scenarioCalc.fs >= 55 },
                { label: 'Project ROI',        val: fmtPct(scenarioCalc.roi),       pass: scenarioCalc.roi >= 15 },
                { label: 'Dev. Margin',        val: fmtPct(scenarioCalc.devMargin), pass: scenarioCalc.devMargin >= 15 },
                { label: 'Est. Profit',        val: money(scenarioCalc.profit),      pass: scenarioCalc.profit > 0 },
              ].map(c => (
                <div key={c.label} className="ds2-criteria-row">
                  <span className={`ds2-criteria-dot ${c.pass ? 'ds2-criteria-dot--pass' : 'ds2-criteria-dot--fail'}`} />
                  <span className="ds2-criteria-label">{c.label}</span>
                  <strong className={c.pass ? 'ds2-criteria-pass' : 'ds2-criteria-fail'}>{c.val}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scenario Comparison ── */}
      <div className="card section">
        <div className="card-header">
          <h2 className="card-title">Scenario Comparison</h2>
          <span className="badge badge-blue">3 Scenarios</span>
        </div>
        <div className="ds2-scen-table-wrap">
          <table className="ds2-scen-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th className={scenario === 'conservative' ? 'ds2-scen-active' : ''}>Conservative</th>
                <th className={scenario === 'base' ? 'ds2-scen-active' : ''}>Base Case</th>
                <th className={scenario === 'aggressive' ? 'ds2-scen-active' : ''}>Aggressive</th>
              </tr>
            </thead>
            <tbody>
              <tr className="ds2-scen-row--sub">
                <td>Construction Cost</td>
                <td className={scenario === 'conservative' ? 'ds2-scen-active' : ''}>+10%</td>
                <td className={scenario === 'base' ? 'ds2-scen-active' : ''}>Base</td>
                <td className={scenario === 'aggressive' ? 'ds2-scen-active' : ''}>−5%</td>
              </tr>
              <tr className="ds2-scen-row--sub">
                <td>Resale / Rent Value</td>
                <td className={scenario === 'conservative' ? 'ds2-scen-active' : ''}>−8%</td>
                <td className={scenario === 'base' ? 'ds2-scen-active' : ''}>Base</td>
                <td className={scenario === 'aggressive' ? 'ds2-scen-active' : ''}>+8%</td>
              </tr>
              <tr className="ds2-scen-row--sub">
                <td>Timeline Shift</td>
                <td className={scenario === 'conservative' ? 'ds2-scen-active' : ''}>+4 months</td>
                <td className={scenario === 'base' ? 'ds2-scen-active' : ''}>—</td>
                <td className={scenario === 'aggressive' ? 'ds2-scen-active' : ''}>−2 months</td>
              </tr>
              <tr className="ds2-scen-row--sub">
                <td>Contingency Adj.</td>
                <td className={scenario === 'conservative' ? 'ds2-scen-active' : ''}>+3%</td>
                <td className={scenario === 'base' ? 'ds2-scen-active' : ''}>—</td>
                <td className={scenario === 'aggressive' ? 'ds2-scen-active' : ''}>−2%</td>
              </tr>
              <tr>
                <td>Total Project Cost</td>
                {['conservative','base','aggressive'].map(k => (
                  <td key={k} className={scenario === k ? 'ds2-scen-active' : ''}>
                    <strong>{money(scenarioComparison[k].totalProjectCost)}</strong>
                  </td>
                ))}
              </tr>
              <tr>
                <td>Stabilized Value</td>
                {['conservative','base','aggressive'].map(k => (
                  <td key={k} className={scenario === k ? 'ds2-scen-active' : ''}>
                    {money(scenarioComparison[k].stabilizedValue)}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Est. Profit</td>
                {['conservative','base','aggressive'].map(k => {
                  const v = scenarioComparison[k].profit;
                  return (
                    <td key={k} className={scenario === k ? 'ds2-scen-active' : ''}>
                      <strong className={v >= 0 ? 'ds2-pos' : 'ds2-neg'}>{money(v)}</strong>
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td>ROI</td>
                {['conservative','base','aggressive'].map(k => (
                  <td key={k} className={scenario === k ? 'ds2-scen-active' : ''}>
                    {fmtPct(scenarioComparison[k].roi)}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Dev. Margin</td>
                {['conservative','base','aggressive'].map(k => (
                  <td key={k} className={scenario === k ? 'ds2-scen-active' : ''}>
                    {fmtPct(scenarioComparison[k].devMargin)}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Feasibility Score</td>
                {['conservative','base','aggressive'].map(k => {
                  const fs = scenarioComparison[k].fs;
                  return (
                    <td key={k} className={scenario === k ? 'ds2-scen-active' : ''}>
                      <span className={`ds2-scen-fs ds2-scen-fs--${scoreColor(fs)}`}>{fs}</span>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Sensitivity Analysis ── */}
      <div className="card section">
        <div className="card-header">
          <h2 className="card-title">Sensitivity Analysis</h2>
          <span className="badge badge-teal">5 Stress Tests</span>
        </div>
        <div className="ds2-sens-table-wrap">
          <table className="ds2-sens-table">
            <thead>
              <tr>
                <th>Scenario</th>
                <th>Est. Profit</th>
                <th>Profit Δ</th>
                <th>ROI</th>
                <th>Feasibility</th>
              </tr>
            </thead>
            <tbody>
              {sensitivity.map(t => {
                const r = t.result;
                const delta = r.profit - calc.profit;
                const isBase = t.key === 'base';
                return (
                  <tr key={t.key} className={isBase ? 'ds2-sens-row--base' : ''}>
                    <td className="ds2-sens-label">{t.label}</td>
                    <td>
                      <strong className={r.profit >= 0 ? 'ds2-pos' : 'ds2-neg'}>{money(r.profit)}</strong>
                    </td>
                    <td>
                      {isBase
                        ? <span className="ds2-sens-dash">—</span>
                        : <span className={delta >= 0 ? 'ds2-pos' : 'ds2-neg'}>{delta >= 0 ? '+' : ''}{money(delta)}</span>
                      }
                    </td>
                    <td>{fmtPct(r.roi)}</td>
                    <td>
                      <span className={`ds2-scen-fs ds2-scen-fs--${scoreColor(r.fs)}`}>{r.fs}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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

      {/* ── ADU Feasibility ── */}
      {projectTypeId === 'adu' && (
        <div className="card section">
          <div className="card-header">
            <h2 className="card-title">ADU Feasibility Analysis</h2>
            <span className={`badge ${aduValueAdded >= 0 ? 'badge-green' : 'badge-gold'}`}>
              {aduValueAdded >= 0 ? 'Value Creating' : 'Review Inputs'}
            </span>
          </div>
          <div className="ds2-recs-grid">
            <div className="ds2-rec-card">
              <span className="ds2-rec-label">ADU Income</span>
              <p><strong>{money(rentNum)}/mo · {money(rentNum * 12)}/yr</strong></p>
              <p>Yield on ADU cost: {aduBuildCost > 0 ? ((rentNum * 12) / aduBuildCost * 100).toFixed(1) : 0}%</p>
              <p>Net income after vacancy (6%): {money(rentNum * 0.94)}/mo</p>
            </div>
            <div className="ds2-rec-card">
              <span className="ds2-rec-label">Payback Period</span>
              <p><strong>{aduPaybackYrs > 0 ? `${aduPaybackYrs.toFixed(1)} years` : 'Enter rent & sqft'}</strong></p>
              <p>Total ADU cost (incl. soft + contingency): {money(aduBuildCost)}</p>
              <p>At {money(rentNum)}/mo gross rent</p>
            </div>
            <div className="ds2-rec-card">
              <span className="ds2-rec-label">Value Creation (Income Approach)</span>
              <p>ADU income value at {form.capRate}% cap: <strong>{money(aduIncomeVal)}</strong></p>
              <p>ADU build cost: <strong>{money(aduBuildCost)}</strong></p>
              <p>Net value added: <strong>{money(aduValueAdded)}</strong></p>
            </div>
            <div className="ds2-rec-card">
              <span className="ds2-rec-label">ADU Permit Checklist</span>
              <p>• Verify setbacks (4–5 ft sides, 5 ft rear typical)</p>
              <p>• Confirm lot coverage limit vs. existing footprint</p>
              <p>• Check local ordinance for owner-occupancy requirements</p>
              <p>• Utility connections: separate meter vs. sub-panel</p>
              <p>• Permit & fee estimate: typically $5K–$18K</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Renovation Potential ── */}
      {projectTypeId === 'sfr-reno' && (
        <div className="card section">
          <div className="card-header">
            <h2 className="card-title">Renovation Potential Analysis</h2>
            <span className={`badge ${flipMargin >= 20 ? 'badge-green' : flipMargin >= 12 ? 'badge-blue' : 'badge-gold'}`}>
              {flipMargin >= 20 ? 'Strong Margin' : flipMargin >= 12 ? 'Viable' : 'Tight Margin'}
            </span>
          </div>
          <div className="ds2-recs-grid">
            <div className="ds2-rec-card">
              <span className="ds2-rec-label">ARV & Flip Metrics</span>
              <p>After-Repair Value (ARV): <strong>{money(arvVal)}</strong></p>
              <p>Total Project Cost: <strong>{money(calc.totalProjectCost)}</strong></p>
              <p>Gross Flip Margin: <strong>{flipMargin.toFixed(1)}%</strong></p>
              <p>Target: ≥20% gross margin to cover carry, commissions, and taxes</p>
            </div>
            <div className="ds2-rec-card">
              <span className="ds2-rec-label">70% Rule Analysis</span>
              <p>Max all-in at 70% of ARV: <strong>{money(rule70)}</strong></p>
              <p>Current all-in: <strong>{money(calc.totalProjectCost)}</strong></p>
              <p>{calc.totalProjectCost <= rule70 ? '✓ Within the 70% threshold' : '⚠ Exceeds 70% — renegotiate price or reduce rehab scope'}</p>
            </div>
            <div className="ds2-rec-card">
              <span className="ds2-rec-label">High-ROI Scope Guide</span>
              <p>• Kitchen Remodel ($15K–45K): 70–80% ROI</p>
              <p>• Bathroom Update ($8K–25K): 60–70% ROI</p>
              <p>• Curb Appeal ($3K–8K): 80–100% ROI</p>
              <p>• HVAC Replacement ($6K–15K): 70–75% ROI</p>
              <p>• Flooring Upgrade ($4K–12K): 65–75% ROI</p>
            </div>
            <div className="ds2-rec-card">
              <span className="ds2-rec-label">Execution Risk Factors</span>
              <p>• Get 3 bids — fixed-price contracts over $15K</p>
              <p>• Pre-1980 properties: 15–20% contingency minimum</p>
              <p>• Pull permits for structural, electrical, and plumbing</p>
              <p>• Monthly carrying cost: {money(acqNum * 0.0075)}/mo</p>
              <p>• Total carry over {monthsNum} months: {money(acqNum * 0.0075 * monthsNum)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Land Development Analysis ── */}
      {projectTypeId === 'land' && (
        <div className="card section">
          <div className="card-header">
            <h2 className="card-title">Land Development Analysis</h2>
            <span className={`badge ${landNetProfit >= 0 ? 'badge-green' : 'badge-gold'}`}>
              {landNetProfit >= 0 ? 'Positive Upside' : 'Review Inputs'}
            </span>
          </div>
          <div className="ds2-recs-grid">
            <div className="ds2-rec-card">
              <span className="ds2-rec-label">Carry Cost Analysis</span>
              <p>Monthly carry (est. 1.5%/mo hard money): <strong>{money(monthlyCarry)}/mo</strong></p>
              <p>Carry over {monthsNum}-month timeline: <strong>{money(monthlyCarry * monthsNum)}</strong></p>
              <p>Estimated entitlement costs (≈4% of acq): <strong>{money(entitleCost)}</strong></p>
              <p>Total all-in with carry: <strong>{money(totalWithCarry)}</strong></p>
            </div>
            <div className="ds2-rec-card">
              <span className="ds2-rec-label">Entitlement Process</span>
              <p>• Pre-application with planning dept: 2–4 weeks</p>
              <p>• Environmental review (CEQA/NEPA): 60–180 days</p>
              <p>• Public hearing and approval: 30–90 days</p>
              <p>• Total timeline: typically 6–18 months</p>
            </div>
            <div className="ds2-rec-card">
              <span className="ds2-rec-label">Phase Development Strategy</span>
              <p>Phase 1: Entitle and sell entitled parcels at a 20–40% premium</p>
              <p>Phase 2: Horizontal infrastructure (roads, utilities, grading)</p>
              <p>Phase 3: Vertical construction or lot sales to builders</p>
              <p>Phased approach reduces capital at risk and accelerates cash recovery</p>
            </div>
            <div className="ds2-rec-card">
              <span className="ds2-rec-label">Due Diligence Checklist</span>
              <p>• Phase I Environmental Site Assessment</p>
              <p>• Boundary survey and ALTA title report</p>
              <p>• Geotechnical / soils report (critical for foundations)</p>
              <p>• Wetlands and flood zone determination</p>
              <p>• Utility capacity verification (water, sewer, power)</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Commercial Opportunity Analysis ── */}
      {(projectTypeId === 'commercial' || projectTypeId === 'mixed-use') && (
        <div className="card section">
          <div className="card-header">
            <h2 className="card-title">Commercial Opportunity Analysis</h2>
            <span className={`badge ${impliedCap >= 6 ? 'badge-green' : impliedCap >= 4 ? 'badge-blue' : 'badge-gold'}`}>
              {impliedCap >= 6 ? 'Strong Yield' : impliedCap >= 4 ? 'Market Rate' : 'Low Yield'}
            </span>
          </div>
          <div className="ds2-recs-grid">
            <div className="ds2-rec-card">
              <span className="ds2-rec-label">Income & NOI Analysis</span>
              <p>Gross Annual Rent: <strong>{money(annualGrossRent)}</strong></p>
              <p>NOI (28% expense ratio): <strong>{money(noiCommercial)}</strong></p>
              <p>Implied Cap Rate: <strong>{impliedCap.toFixed(1)}%</strong> at {money(calc.stabilizedValue)}</p>
              <p>Benchmarks: retail 5.5–7%, office 6–8%, industrial 4–6%</p>
            </div>
            <div className="ds2-rec-card">
              <span className="ds2-rec-label">NNN vs. Gross Lease</span>
              <p>NNN equivalent rent: <strong>{money(nnnEquiv)}/mo per unit</strong> (est. 15% premium)</p>
              <p>NNN: tenant pays taxes, insurance, maintenance — lower landlord burden</p>
              <p>Gross: landlord pays all expenses — better for tenant attraction</p>
              <p>Modified gross: common middle ground for small commercial</p>
            </div>
            <div className="ds2-rec-card">
              <span className="ds2-rec-label">Financing Options</span>
              <p>• SBA 504: owner-occupied, up to $5M, 10% down</p>
              <p>• Conventional: 70–75% LTV, 1.25x DSCR minimum</p>
              <p>• CMBS: non-recourse, 5–10yr fixed, pooled securitization</p>
              <p>• Bridge: 65–75% LTV, 12–36 months for value-add plays</p>
            </div>
            <div className="ds2-rec-card">
              <span className="ds2-rec-label">Tenant Considerations</span>
              <p>• National credit (NNN): highest value, 10–20yr leases</p>
              <p>• Local businesses: shorter leases, more flexible terms</p>
              <p>• Lenders prefer 5+ years remaining on primary lease at close</p>
              <p>• Commercial vacancies average 12–24 months to backfill</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Multifamily Development Analysis ── */}
      {(projectTypeId === 'mf-groundup' || projectTypeId === 'mf-convert') && (
        <div className="card section">
          <div className="card-header">
            <h2 className="card-title">Multifamily Development Analysis</h2>
            <span className={`badge ${calc.costPerUnit <= 200000 ? 'badge-green' : calc.costPerUnit <= 350000 ? 'badge-blue' : 'badge-gold'}`}>
              {calc.costPerUnit <= 200000 ? 'Efficient Cost' : calc.costPerUnit <= 350000 ? 'Market Rate' : 'High Cost Basis'}
            </span>
          </div>
          <div className="ds2-recs-grid">
            <div className="ds2-rec-card">
              <span className="ds2-rec-label">Per-Unit Economics</span>
              <p>Cost per unit: <strong>{money(calc.costPerUnit)}</strong></p>
              <p>Rent per unit: <strong>{money(rentNum)}/mo</strong></p>
              <p>Gross Rent Multiplier (GRM): <strong>{grm > 0 ? grm.toFixed(1) : '—'}x</strong></p>
              <p>Agency GRM benchmarks: 10–14x multifamily</p>
            </div>
            <div className="ds2-rec-card">
              <span className="ds2-rec-label">Agency Financing Thresholds</span>
              <p>Freddie Mac SBL: 5+ units, $1M–$7.5M, 80% LTV</p>
              <p>Fannie DUS: 5+ units, $1M+, non-recourse, 10yr fixed</p>
              <p>HUD 221(d)(4): 20+ units, 40yr am., 87% LTV</p>
              <p>DSCR minimum: 1.25x agency; 1.10–1.20x bridge lenders</p>
            </div>
            <div className="ds2-rec-card">
              <span className="ds2-rec-label">Construction Risk Factors</span>
              <p>• Fixed-price GC contract — avoid cost-plus over $500K</p>
              <p>• 5–7 monthly construction draws typical</p>
              <p>• Lease-up period: budget 90–180 days post-delivery</p>
              <p>• Stabilization: 90% occupied for 3 months before refi</p>
            </div>
            <div className="ds2-rec-card">
              <span className="ds2-rec-label">Value-Add Strategies</span>
              <p>• Rent bump $50/unit = {money(50 * numUnitsN * 12 / 0.06)} in value at 6% cap</p>
              <p>• RUBS (utility billing): +$40–80/unit/mo to NOI</p>
              <p>• Ancillary income: parking, storage, laundry</p>
              <p>• Unit renovation: $50–$150/unit/mo rent premium per $8K–$15K invested</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Highest & Best Use ── */}
      <div className="card section">
        <div className="card-header">
          <h2 className="card-title">Highest & Best Use Analysis</h2>
          <span className="badge badge-blue">{pt.label}</span>
        </div>
        <div className="ds2-recs-grid">
          <div className="ds2-rec-card">
            <span className="ds2-rec-label">Selected Program</span>
            <p><strong>{pt.icon} {pt.label}</strong></p>
            <p>{BEST_USE[projectTypeId]}</p>
          </div>
          <div className="ds2-rec-card">
            <span className="ds2-rec-label">Alternative Uses to Consider</span>
            {projectTypeId === 'sfr-reno'    && <><p>• ADU addition: add rental unit to parcel (if zoning permits)</p><p>• Short-term rental: 40–80% income premium in demand markets</p><p>• House hack: live in one unit, rent the other to offset mortgage</p></>}
            {projectTypeId === 'adu'         && <><p>• Junior ADU (JADU): lower cost, no separate utility connection</p><p>• Garage conversion: lowest-cost option, typically $40K–$90K</p><p>• Compare LTR vs. STR income before selecting strategy</p></>}
            {projectTypeId === 'land'        && <><p>• Entitled lot sale: sell with permits for 20–40% premium</p><p>• Build-to-rent: develop and hold SFR at scale</p><p>• Ground lease: preserve land ownership with income stream</p></>}
            {projectTypeId === 'commercial'  && <><p>• Residential conversion: office-to-residential active in many markets</p><p>• Medical/flex: higher credit tenants, longer leases</p><p>• Industrial/flex: strongest national fundamentals, lowest vacancy</p></>}
            {projectTypeId === 'mixed-use'   && <><p>• Pure residential: simpler financing, broader buyer pool</p><p>• Live-work units: attractive to creative and professional tenants</p><p>• Ground-floor retail anchor drives residential lease-up momentum</p></>}
            {projectTypeId === 'mf-groundup' && <><p>• Build-to-rent SFR: premium in suburban markets</p><p>• LIHTC affordable: trades at premium cap rates, subsidy capital</p><p>• Model BTR vs. condo sell-off exit strategies</p></>}
            {projectTypeId === 'mf-convert'  && <><p>• Condo conversion: sell individual units for premium vs. rental hold</p><p>• Rent-then-sell: stabilize at market rent, sell as investment</p><p>• Ground-floor commercial: retain for NOI improvement</p></>}
          </div>
          <div className="ds2-rec-card">
            <span className="ds2-rec-label">Current Program Returns</span>
            <p>Feasibility Score: <strong>{calc.fs}/100</strong></p>
            <p>Project ROI: <strong>{fmtPct(calc.roi)}</strong></p>
            <p>Dev. Margin: <strong>{fmtPct(calc.devMargin)}</strong></p>
            <p>Est. Profit: <strong>{money(calc.profit)}</strong> over {form.timelineMonths} months</p>
          </div>
          <div className="ds2-rec-card">
            <span className="ds2-rec-label">Market Validation Steps</span>
            <p>• Pull submarket absorption data (CoStar, LoopNet, Yardi)</p>
            <p>• Confirm zoning flexibility before redesigning the program</p>
            <p>• Get 3 broker opinions of value for stabilized asset</p>
            <p>• Validate rent assumptions with active lease comps within 0.5 mi</p>
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
          {saved ? '✓ Saved to Portfolio' : 'Save to Portfolio'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/deal-analyzer')}>
          Analyze Deal
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/advisor')}>
          Ask AI Advisor
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/report')}>
          Send to Report
        </button>
        <button
          type="button"
          className={`btn ${analysisSaved ? 'btn-ghost' : 'btn-ghost'}`}
          onClick={saveDevAnalysis}
          disabled={analysisSaved}
        >
          {analysisSaved ? '✓ Analysis Saved' : 'Save Analysis'}
        </button>
      </div>

    </div>
  );
}
