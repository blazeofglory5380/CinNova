import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSelectedProperty, saveWorkflowAnalysis } from '../services/propertyWorkflow';
import { addToPortfolio } from '../services/propertyStorage';
import './DealAnalyzer.css';

/* ── Defaults ──────────────────────────────────────── */
const INIT = {
  strategy:      'Buy and Hold',
  address:       '',
  purchasePrice: '325000',
  arv:           '430000',
  rehab:         '42000',
  closingCosts:  '9500',
  monthlyRent:   '3100',
  otherIncome:   '0',
  vacancy:       '6',
  management:    '8',
  taxes:         '390',
  insurance:     '165',
  hoa:           '0',
  utilities:     '0',
  repairs:       '190',
  capex:         '150',
  monthlyExpenses:'0',
  downPayment:   '20',
  interestRate:  '6.75',
  loanTerm:      '30',
  saleCost:      '8',
  targetProfit:  '12',
};

function initFromSelected() {
  const s = getSelectedProperty();
  if (!s) return INIT;
  const price = s.price || 0;
  const rent  = s.rent  || 0;
  return {
    ...INIT,
    address:        s.fullAddress || s.address || '',
    purchasePrice:  String(price),
    arv:            String(Math.round(price * 1.12)),
    monthlyRent:    String(rent),
    taxes:          String(Math.max(150, Math.round(price * 0.012 / 12))),
    insurance:      String(Math.max(85,  Math.round(price * 0.004 / 12))),
    repairs:        String(Math.max(100, Math.round(rent * 0.06))),
    capex:          String(Math.max(75,  Math.round(rent * 0.05))),
    monthlyExpenses:'0',
  };
}

/* ── Helpers ───────────────────────────────────────── */
function parseNum(v) {
  const n = parseFloat(String(v ?? '').replace(/[$,%\s,]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
const fmtM = (v, sfx = '') => {
  const s = v < 0 ? '-' : '';
  return `${s}$${Math.abs(Math.round(v)).toLocaleString()}${sfx}`;
};
const fmtP = v => (Number.isFinite(v) ? v.toFixed(1) + '%' : '0.0%');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function calcMortgage(principal, annualRate, years) {
  if (principal <= 0 || years <= 0) return 0;
  const r = annualRate / 12;
  const n = years * 12;
  return r === 0 ? principal / n
    : principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function buildRecommendations(r) {
  const recs = [];
  if (r.cashFlow < 0) {
    const bump = Math.abs(Math.round(r.cashFlow));
    recs.push(`Negative cash flow of ${fmtM(Math.abs(r.cashFlow))}/mo — increase rent by $${bump}/mo or negotiate the purchase price down by ~${fmtM(bump * 12 / 0.07)} to break even.`);
  } else if (r.cashOnCash < 6) {
    recs.push(`Cash-on-cash of ${fmtP(r.cashOnCash)} is below the 6% threshold — target ${fmtM(r.breakEvenRent * 1.12)}/mo rent or reduce the purchase price to improve returns.`);
  }
  if (r.dscr > 0 && r.dscr < 1.25) {
    recs.push(`DSCR of ${r.dscr.toFixed(2)} falls below the 1.25 lender standard — consider a higher down payment or shopping for a lower interest rate to reduce debt service.`);
  }
  if (r.capRate < 5) {
    recs.push(`Cap rate of ${fmtP(r.capRate)} is below 5% — explore higher-yield markets or negotiate a lower purchase price to improve net operating income relative to cost.`);
  } else if (r.capRate >= 7 && recs.length < 3) {
    recs.push(`Strong cap rate of ${fmtP(r.capRate)} — lock in financing quickly and verify rent comps within 0.5 miles to confirm the income assumption before closing.`);
  }
  if (r.offerDelta < 0 && recs.length < 3) {
    recs.push(`Purchase price exceeds the maximum offer by ${fmtM(Math.abs(r.offerDelta))} — submit a lower offer or revise ARV and target profit assumptions.`);
  }
  if (r.equitySpread > 0 && recs.length < 3) {
    recs.push(`Equity spread of ${fmtM(r.equitySpread)} supports a refinance or BRRRR exit — confirm ARV with a licensed appraiser before committing to the rehab budget.`);
  }
  if (recs.length < 3) {
    recs.push(`Verify rental comps within 0.5 miles and confirm local vacancy rates — even a 2% variance in vacancy can shift annual cash flow by ${fmtM(parseNum(r._rent) * 0.02 * 12)}.`);
  }
  if (recs.length < 3) {
    recs.push(`Obtain 3 contractor bids on the rehab budget — cost overruns are the leading reason investment deals underperform projections.`);
  }
  return recs.slice(0, 3);
}

/* ── Sub-components ────────────────────────────────── */
function ScoreGauge({ score, verdict }) {
  const color = score >= 82 ? '#059669'
    : score >= 65 ? '#2563eb'
    : score >= 45 ? '#d97706'
    : '#dc2626';
  const deg = (score / 100) * 360;

  return (
    <div className="da-score-card">
      <div
        className="da-score-ring"
        style={{ background: `conic-gradient(${color} ${deg}deg, var(--gray-100) 0deg)` }}
      >
        <div className="da-score-inner">
          <span className="da-score-num" style={{ color }}>{score}</span>
          <span className="da-score-denom">/100</span>
        </div>
      </div>
      <div className="da-score-copy">
        <span className={`badge ${verdict.badge}`} style={{ fontSize:'13px', padding:'5px 14px' }}>
          {verdict.label}
        </span>
        <p>{verdict.detail}</p>
        <div className="da-score-stat-row">
          <span className="da-score-stat">AI Deal Score</span>
          <span className="da-score-stat-val" style={{ color }}>
            {score >= 82 ? 'Investor-Grade' : score >= 65 ? 'Workable' : score >= 45 ? 'Marginal' : 'Avoid'}
          </span>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, sub, tone = 'neutral' }) {
  return (
    <div className={`da-metric da-metric--${tone}`}>
      <p className="da-metric-label">{label}</p>
      <p className="da-metric-value">{value}</p>
      {sub && <p className="da-metric-sub">{sub}</p>}
    </div>
  );
}

function Row({ label, value, strong, highlight }) {
  return (
    <div className={`da-row${strong ? ' da-row--strong' : ''}${highlight ? ' da-row--highlight' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function SectionLabel({ icon, title }) {
  return (
    <div className="da-section-label">
      <span className="da-section-icon">{icon}</span>
      <span>{title}</span>
    </div>
  );
}

function Field({ label, name, value, onChange, hint, type = 'text', prefix }) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        {hint && <span className="da-field-hint">{hint}</span>}
      </label>
      <div className={prefix ? 'da-input-wrap' : ''}>
        {prefix && <span className="da-input-prefix">{prefix}</span>}
        <input
          name={name}
          className={`form-input${prefix ? ' da-input-prefixed' : ''}`}
          value={value}
          onChange={onChange}
          autoComplete="off"
        />
      </div>
    </div>
  );
}

/* ── Main component ────────────────────────────────── */
export default function DealAnalyzer() {
  const selectedProp = getSelectedProperty();
  const [form, setForm] = useState(initFromSelected);
  const [saved, setSaved] = useState(false);

  const result = useMemo(() => {
    const purchase    = parseNum(form.purchasePrice);
    const arv         = parseNum(form.arv);
    const rehab       = parseNum(form.rehab);
    const closing     = parseNum(form.closingCosts);
    const rent        = parseNum(form.monthlyRent);
    const otherInc    = parseNum(form.otherIncome);
    const vacPct      = parseNum(form.vacancy) / 100;
    const mgmtPct     = parseNum(form.management) / 100;
    const taxes       = parseNum(form.taxes);
    const insurance   = parseNum(form.insurance);
    const hoa         = parseNum(form.hoa);
    const utilities   = parseNum(form.utilities);
    const repairs     = parseNum(form.repairs);
    const capex       = parseNum(form.capex);
    const otherExp    = parseNum(form.monthlyExpenses);
    const downPct     = parseNum(form.downPayment) / 100;
    const rate        = parseNum(form.interestRate) / 100;
    const years       = parseNum(form.loanTerm);
    const salePct     = parseNum(form.saleCost) / 100;
    const profitPct   = parseNum(form.targetProfit) / 100;

    const totalProjectCost = purchase + rehab + closing;
    const downPayment      = purchase * downPct;
    const loanAmount       = Math.max(0, purchase - downPayment);
    const mortgage         = calcMortgage(loanAmount, rate, years);
    const vacancyLoss      = rent * vacPct;
    const management       = rent * mgmtPct;
    const operatingExpenses= taxes + insurance + hoa + utilities + repairs + capex + management + otherExp;
    const effectiveIncome  = rent + otherInc - vacancyLoss;
    const noiMonthly       = effectiveIncome - operatingExpenses;
    const annualNOI        = noiMonthly * 12;
    const cashFlow         = noiMonthly - mortgage;
    const annualCashFlow   = cashFlow * 12;
    const totalMonthlyOut  = operatingExpenses + mortgage;
    const cashInvested     = downPayment + rehab + closing;
    const capRate          = totalProjectCost > 0 ? (annualNOI / totalProjectCost) * 100 : 0;
    const cashOnCash       = cashInvested > 0 ? (annualCashFlow / cashInvested) * 100 : 0;
    const dscr             = mortgage > 0 ? noiMonthly / mortgage : 0;
    const equitySpread     = arv - totalProjectCost;
    const saleCosts        = arv * salePct;
    const profitOnSale     = arv - saleCosts - totalProjectCost;
    const roi              = cashInvested > 0 ? (profitOnSale / cashInvested) * 100 : 0;
    const maxOffer         = arv * (1 - salePct - profitPct) - rehab - closing;
    const offerDelta       = maxOffer - purchase;
    const breakEvenRent    = (operatingExpenses + mortgage - otherInc) / Math.max(0.01, 1 - vacPct);

    const score = clamp(Math.round(
      40
      + (capRate - 5) * 5
      + cashOnCash * 1.2
      + (dscr - 1) * 18
      + (equitySpread / Math.max(1, totalProjectCost)) * 30
    ), 0, 100);

    const verdict =
      score >= 82 ? { label: 'Strong Deal',  badge: 'badge-green', detail: 'Income, debt coverage, and equity spread are aligned for a strong investor acquisition.' }
    : score >= 65 ? { label: 'Promising',     badge: 'badge-blue',  detail: 'Workable economics but needs tighter due diligence before commitment.' }
    : score >= 45 ? { label: 'Thin Margin',   badge: 'badge-gold',  detail: 'Profitability depends on rent assumptions, execution quality, or a better purchase price.' }
    :               { label: 'High Risk',     badge: 'badge-red',   detail: 'Current assumptions leave insufficient room for debt service, vacancies, or unforeseen costs.' };

    const riskLevel = score >= 82 && dscr >= 1.3 && cashFlow > 0 ? 'Low'
      : score >= 65 && dscr >= 1.1 ? 'Moderate'
      : score >= 45 ? 'Elevated'
      : 'High';

    const risks = [
      cashFlow < 0                              ? 'Negative monthly cash flow after debt service'       : null,
      dscr > 0 && dscr < 1.2                   ? `DSCR of ${dscr.toFixed(2)} — below lender comfort`  : null,
      capRate > 0 && capRate < 5                ? `Cap rate of ${fmtP(capRate)} — below 5% threshold`  : null,
      offerDelta < 0                            ? `Price is ${fmtM(Math.abs(offerDelta))} over max offer` : null,
      equitySpread < rehab * 0.75 && rehab > 0 ? 'Equity spread may not justify rehab complexity'      : null,
    ].filter(Boolean);

    const recommendations = buildRecommendations({
      cashFlow, cashOnCash, capRate, dscr, offerDelta, breakEvenRent, equitySpread,
      roi, rent, annualCashFlow, _rent: form.monthlyRent,
    });

    return {
      purchase, arv, rehab, closing, totalProjectCost,
      downPayment, loanAmount, mortgage, operatingExpenses, totalMonthlyOut,
      vacancyLoss, management, effectiveIncome, noiMonthly, annualNOI,
      cashFlow, annualCashFlow, cashInvested, capRate, cashOnCash, dscr,
      equitySpread, saleCosts, profitOnSale, roi, maxOffer, offerDelta,
      breakEvenRent, score, verdict, riskLevel, risks, recommendations,
    };
  }, [form]);

  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setSaved(false);
  };

  const handleReset = () => {
    setForm(getSelectedProperty() ? initFromSelected() : INIT);
    setSaved(false);
  };

  const handleSave = () => {
    const item = {
      id:       selectedProp?.id ?? Date.now(),
      address:  form.address || selectedProp?.address || '',
      city:     selectedProp?.city || '',
      price:    result.purchase,
      type:     selectedProp?.type || form.strategy,
      beds:     selectedProp?.beds,
      baths:    selectedProp?.baths,
      sqft:     selectedProp?.sqft,
      rent:     parseNum(form.monthlyRent),
      cashFlow: Math.round(result.cashFlow),
      capRate:  parseFloat(result.capRate.toFixed(1)),
      roi:      parseFloat(result.cashOnCash.toFixed(1)),
      score:    result.score,
      equity:   Math.round(result.downPayment),
    };
    addToPortfolio(item);
    saveWorkflowAnalysis(item, {
      monthlyRent: parseNum(form.monthlyRent),
      mortgage:    result.mortgage,
      propertyTax: parseNum(form.taxes),
      insurance:   parseNum(form.insurance),
      expenses:    result.operatingExpenses,
      vacancy:     parseNum(form.vacancy),
      cashFlow:    result.cashFlow,
      roi:         result.cashOnCash,
      score:       result.score,
      downPayment: result.downPayment,
    });
    setSaved(true);
  };

  /* ── Render ──────────────────────────────────────── */
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Investor Deal Analyzer</h1>
        <p className="page-subtitle">
          Model every financial lever of an investment deal — income, expenses, financing, and exit — to get an AI deal score and recommendations.
        </p>
      </div>

      {!selectedProp && (
        <div className="da-no-prop-banner">
          <span>🏠</span>
          <span>
            <strong>No property selected.</strong> Showing example inputs.{' '}
            <Link to="/property-search">Search for a property →</Link>
          </span>
        </div>
      )}

      {selectedProp && (
        <div className="da-active-prop-banner">
          <span>📍</span>
          <div>
            <strong>{selectedProp.fullAddress || selectedProp.address}</strong>
            <span className="da-active-prop-meta">
              ${selectedProp.price?.toLocaleString()} · {selectedProp.type}
              {selectedProp.beds ? ` · ${selectedProp.beds} bd / ${selectedProp.baths} ba` : ''}
            </span>
          </div>
        </div>
      )}

      <div className="da-layout section">

        {/* ── Input panel ──────────────────────────── */}
        <div className="card da-input-card">
          <div className="card-header">
            <h2 className="card-title">Deal Assumptions</h2>
            <div className="da-header-actions">
              {saved && <span className="badge badge-green">✓ Saved</span>}
              <button className="btn btn-ghost btn-sm" onClick={handleReset}>Reset</button>
            </div>
          </div>

          <div className="da-form">

            {/* Property */}
            <div className="da-form-section">
              <SectionLabel icon="🏠" title="Property" />
              <div className="form-grid">
                <div className="form-group col-span-2">
                  <label className="form-label">Property Address</label>
                  <input name="address" className="form-input" placeholder="Optional"
                    value={form.address} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Investment Strategy</label>
                  <select name="strategy" className="form-select" value={form.strategy} onChange={handleChange}>
                    <option>Buy and Hold</option>
                    <option>BRRRR</option>
                    <option>Fix and Flip</option>
                    <option>Short-Term Rental</option>
                    <option>House Hack</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Acquisition */}
            <div className="da-form-section">
              <SectionLabel icon="🏦" title="Acquisition & Financing" />
              <div className="form-grid">
                <Field label="Purchase Price" name="purchasePrice" value={form.purchasePrice} onChange={handleChange} prefix="$" />
                <Field label="Down Payment" name="downPayment" value={form.downPayment} onChange={handleChange} hint="%" />
                <Field label="After Repair Value (ARV)" name="arv" value={form.arv} onChange={handleChange} prefix="$" />
                <Field label="Interest Rate" name="interestRate" value={form.interestRate} onChange={handleChange} hint="%" />
                <Field label="Rehab / Renovation Budget" name="rehab" value={form.rehab} onChange={handleChange} prefix="$" />
                <Field label="Loan Term" name="loanTerm" value={form.loanTerm} onChange={handleChange} hint="years" />
                <Field label="Closing Costs" name="closingCosts" value={form.closingCosts} onChange={handleChange} prefix="$" />
                <Field label="Sale Cost" name="saleCost" value={form.saleCost} onChange={handleChange} hint="%" />
                <Field label="Target Profit" name="targetProfit" value={form.targetProfit} onChange={handleChange} hint="%" />
              </div>
            </div>

            {/* Income */}
            <div className="da-form-section">
              <SectionLabel icon="💵" title="Rental Income" />
              <div className="form-grid">
                <Field label="Estimated Monthly Rent" name="monthlyRent" value={form.monthlyRent} onChange={handleChange} prefix="$" />
                <Field label="Other Monthly Income" name="otherIncome" value={form.otherIncome} onChange={handleChange} prefix="$" />
                <Field label="Vacancy Rate" name="vacancy" value={form.vacancy} onChange={handleChange} hint="%" />
                <Field label="Property Management" name="management" value={form.management} onChange={handleChange} hint="%" />
              </div>
            </div>

            {/* Expenses */}
            <div className="da-form-section">
              <SectionLabel icon="📋" title="Monthly Operating Expenses" />
              <div className="form-grid">
                <Field label="Property Taxes" name="taxes" value={form.taxes} onChange={handleChange} prefix="$" />
                <Field label="Insurance" name="insurance" value={form.insurance} onChange={handleChange} prefix="$" />
                <Field label="HOA Dues" name="hoa" value={form.hoa} onChange={handleChange} prefix="$" />
                <Field label="Utilities" name="utilities" value={form.utilities} onChange={handleChange} prefix="$" />
                <Field label="Repairs & Maintenance" name="repairs" value={form.repairs} onChange={handleChange} prefix="$" />
                <Field label="CapEx Reserve" name="capex" value={form.capex} onChange={handleChange} prefix="$" />
                <div className="form-group col-span-2">
                  <label className="form-label">Other Monthly Expenses</label>
                  <input name="monthlyExpenses" className="form-input" value={form.monthlyExpenses} onChange={handleChange} />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Results panel ─────────────────────────── */}
        <div className="da-results-stack">

          {/* Score gauge */}
          <ScoreGauge score={result.score} verdict={result.verdict} />

          {/* 6-metric summary grid */}
          <div className="da-summary-grid">
            <Metric label="Monthly Cash Flow"    value={fmtM(result.cashFlow, '/mo')}      sub="After all expenses + debt"  tone={result.cashFlow >= 0 ? 'green' : 'red'} />
            <Metric label="Annual Cash Flow"     value={fmtM(result.annualCashFlow, '/yr')} sub="12 × monthly cash flow"    tone={result.annualCashFlow >= 0 ? 'green' : 'red'} />
            <Metric label="Cap Rate"             value={fmtP(result.capRate)}               sub="NOI / total project cost"  tone="blue" />
            <Metric label="Cash-on-Cash"         value={fmtP(result.cashOnCash)}            sub="Ann. CF / cash invested"   tone={result.cashOnCash >= 8 ? 'green' : result.cashOnCash >= 5 ? 'gold' : 'red'} />
            <Metric label="Monthly Mortgage"     value={fmtM(result.mortgage, '/mo')}       sub={`${form.downPayment}% down · ${form.loanTerm}yr`} tone="neutral" />
            <Metric label="Break-even Rent"      value={fmtM(result.breakEvenRent, '/mo')} sub="Min. rent to cover costs"  tone={parseNum(form.monthlyRent) >= result.breakEvenRent ? 'green' : 'gold'} />
          </div>

          {/* Offer guidance + save */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Offer Guidance</h2>
              <span className={`badge ${result.offerDelta >= 0 ? 'badge-green' : 'badge-red'}`}>
                {result.offerDelta >= 0 ? 'Within Range' : 'Over Target'}
              </span>
            </div>
            <div className="da-offer-panel">
              <div>
                <p className="da-offer-label">Maximum Offer</p>
                <p className="da-offer-value">{fmtM(result.maxOffer)}</p>
              </div>
              <div className="da-offer-delta">
                <span>{result.offerDelta >= 0 ? 'Room Below Max' : 'Price Reduction Needed'}</span>
                <strong style={{ color: result.offerDelta >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {fmtM(Math.abs(result.offerDelta))}
                </strong>
              </div>
            </div>
            <p className="da-note">Based on ARV, sale costs, target profit, rehab, and closing assumptions.</p>
            <button className="btn btn-primary btn-full da-save-btn" onClick={handleSave}>
              {saved ? '✓ Saved to Portfolio' : 'Save to Portfolio'}
            </button>
          </div>

        </div>
      </div>

      {/* ── Detail sections ───────────────────────── */}
      <div className="grid-2 section">

        {/* Monthly income statement */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Monthly Income Statement</h2>
            <span className="badge badge-blue">{form.strategy}</span>
          </div>
          <div className="da-row-list">
            <Row label="Gross rent"              value={fmtM(parseNum(form.monthlyRent), '/mo')} />
            <Row label="Other income"            value={fmtM(parseNum(form.otherIncome), '/mo')} />
            <Row label="Vacancy loss"            value={`−${fmtM(result.vacancyLoss, '/mo')}`} />
            <Row label="Effective gross income"  value={fmtM(result.effectiveIncome, '/mo')} strong />
            <Row label="Property taxes"          value={`−${fmtM(parseNum(form.taxes), '/mo')}`} />
            <Row label="Insurance"               value={`−${fmtM(parseNum(form.insurance), '/mo')}`} />
            <Row label="HOA + utilities"         value={`−${fmtM(parseNum(form.hoa) + parseNum(form.utilities), '/mo')}`} />
            <Row label="Repairs + CapEx"         value={`−${fmtM(parseNum(form.repairs) + parseNum(form.capex), '/mo')}`} />
            <Row label="Management"              value={`−${fmtM(result.management, '/mo')}`} />
            <Row label="Total operating expenses" value={`−${fmtM(result.operatingExpenses, '/mo')}`} />
            <Row label="Net operating income"    value={fmtM(result.noiMonthly, '/mo')} strong />
            <Row label="Monthly mortgage"        value={`−${fmtM(result.mortgage, '/mo')}`} />
            <Row label="Monthly cash flow"       value={fmtM(result.cashFlow, '/mo')} strong highlight />
            <Row label="Annual cash flow"        value={fmtM(result.annualCashFlow, '/yr')} strong highlight />
          </div>
        </div>

        {/* Capital stack */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Capital Stack</h2>
            <span className="badge badge-teal">Financing</span>
          </div>
          <div className="da-row-list">
            <Row label="Purchase price"    value={fmtM(result.purchase)} />
            <Row label="Rehab budget"      value={fmtM(result.rehab)} />
            <Row label="Closing costs"     value={fmtM(result.closing)} />
            <Row label="Total project cost" value={fmtM(result.totalProjectCost)} strong />
            <Row label="Down payment"      value={fmtM(result.downPayment)} />
            <Row label="Loan amount"       value={fmtM(result.loanAmount)} />
            <Row label="Monthly mortgage"  value={fmtM(result.mortgage, '/mo')} />
            <Row label="Cash invested"     value={fmtM(result.cashInvested)} strong />
            <Row label="Debt coverage (DSCR)" value={result.dscr > 0 ? result.dscr.toFixed(2) : '—'} />
            <Row label="Break-even rent"   value={fmtM(result.breakEvenRent, '/mo')} />
          </div>
        </div>

      </div>

      <div className="grid-2 section">

        {/* Exit snapshot */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Exit Snapshot</h2>
            <span className="badge badge-gold">ARV Model</span>
          </div>
          <div className="da-exit-grid">
            <Metric label="Equity Spread"   value={fmtM(result.equitySpread)}  sub="ARV less total project cost"   tone={result.equitySpread >= 0 ? 'green' : 'red'} />
            <Metric label="Sale Costs"      value={fmtM(result.saleCosts)}     sub="Agent, closing, concessions"   tone="neutral" />
            <Metric label="Profit on Sale"  value={fmtM(result.profitOnSale)}  sub="Before capital gains taxes"    tone={result.profitOnSale >= 0 ? 'green' : 'red'} />
            <Metric label="Projected ROI"   value={fmtP(result.roi)}           sub="Profit / total cash invested"  tone={result.roi >= 15 ? 'green' : 'gold'} />
          </div>
        </div>

        {/* Risk flags */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Risk Flags</h2>
            <span className={`badge ${result.risks.length ? 'badge-gold' : 'badge-green'}`}>
              {result.risks.length ? `${result.risks.length} to Review` : 'Clean Read'}
            </span>
          </div>
          {result.risks.length ? (
            <ul className="da-risk-list">
              {result.risks.map(risk => (
                <li key={risk}>
                  <span className="da-risk-dot" />
                  {risk}
                </li>
              ))}
            </ul>
          ) : (
            <div className="da-clean">
              <strong>No major risk flags under current assumptions.</strong>
              <span>Confirm rent comps, repair scope, title status, and lender terms before committing.</span>
            </div>
          )}
        </div>

      </div>

      {/* ── AI Recommendations ───────────────────── */}
      <div className="section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">AI Recommendations</h2>
            <span className="badge badge-blue">3 Actions</span>
          </div>
          <div className="da-rec-list">
            {result.recommendations.map((rec, i) => (
              <div key={i} className="da-rec-item">
                <div className="da-rec-num">{i + 1}</div>
                <p className="da-rec-text">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
