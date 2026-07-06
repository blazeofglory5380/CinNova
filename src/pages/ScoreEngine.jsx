import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saveProperty } from '../services/propertyStorage';
import BetaFooter from '../components/BetaFooter';
import './ScoreEngine.css';

// ── Calculation engine ────────────────────────────────────────────────────────

function calcMortgage(principal, annualRate, termYears) {
  if (!principal || !termYears) return 0;
  const r = (annualRate / 100) / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function runScoreEngine(f) {
  const price      = Number(f.purchasePrice) || 0;
  const downPct    = Number(f.downPayment)   || 20;
  const rate       = Number(f.interestRate)  || 6.75;
  const term       = Number(f.loanTerm)      || 30;
  const rent       = Number(f.monthlyRent)   || 0;
  const taxes      = Number(f.propertyTaxes) || 0;   // annual
  const insurance  = Number(f.insurance)     || 0;   // annual
  const hoa        = Number(f.hoa)           || 0;   // monthly
  const vacancyPct = Number(f.vacancy)       || 6;
  const repairPct  = Number(f.repairs)       || 8;   // % of rent

  const downAmt       = price * (downPct / 100);
  const loanAmt       = price - downAmt;
  const mortgage      = Math.round(calcMortgage(loanAmt, rate, term));

  const effectiveRent = rent * (1 - vacancyPct / 100);
  const mTaxes        = taxes / 12;
  const mInsurance    = insurance / 12;
  const mRepairs      = rent * (repairPct / 100);
  const totalOpEx     = mTaxes + mInsurance + hoa + mRepairs;

  const noiMonthly    = Math.round(effectiveRent - totalOpEx);
  const cashFlow      = Math.round(noiMonthly - mortgage);
  const annualCF      = cashFlow * 12;
  const annualNOI     = noiMonthly * 12;

  const capRate       = price > 0 ? (annualNOI / price) * 100 : 0;
  const cocReturn     = downAmt > 0 ? (annualCF / downAmt) * 100 : 0;
  const expenseRatio  = effectiveRent > 0 ? (totalOpEx / effectiveRent) * 100 : 0;
  const annualDebt    = mortgage * 12;
  const dscr          = annualDebt > 0 ? annualNOI / annualDebt : 0;

  // Weighted score (0-100)
  const capRateScore  = Math.min(100, Math.max(0, capRate * 12.5));
  const cfScore       = Math.min(100, Math.max(0, 50 + cashFlow / 20));
  const cocScore      = Math.min(100, Math.max(0, cocReturn * 8));
  const dscrScore     = Math.min(100, Math.max(0, (dscr - 0.5) * 80));
  const expScore      = Math.max(0, 100 - expenseRatio);

  const score = Math.min(100, Math.max(0, Math.round(
    capRateScore * 0.25 +
    cfScore      * 0.25 +
    cocScore     * 0.20 +
    dscrScore    * 0.15 +
    expScore     * 0.15
  )));

  const riskLevel = score >= 70 ? 'Low' : score >= 55 ? 'Moderate' : score >= 40 ? 'Elevated' : 'High';

  return {
    price, downAmt, loanAmt, mortgage, effectiveRent,
    totalOpEx, noiMonthly, cashFlow, annualCF, annualNOI,
    capRate, cocReturn, expenseRatio, dscr,
    score, riskLevel,
  };
}

function getRecommendation(score) {
  if (score >= 85) return { label: 'Strong Buy', tone: 'green',  hex: '#16a34a', badge: 'badge-green', desc: 'Exceptional return profile across all dimensions. Proceed with conviction and standard due diligence.' };
  if (score >= 70) return { label: 'Buy',         tone: 'blue',   hex: '#2563eb', badge: 'badge-blue',  desc: 'Solid fundamentals with manageable risk. Move forward with a competitive offer.' };
  if (score >= 55) return { label: 'Review',      tone: 'teal',   hex: '#0d9488', badge: 'badge-teal',  desc: 'Borderline returns. Negotiate aggressively on price or improve the income side before committing.' };
  if (score >= 40) return { label: 'High Risk',   tone: 'gold',   hex: '#d97706', badge: 'badge-gold',  desc: 'Significant return challenges. Address key metrics or consider alternative properties.' };
  return               { label: 'Avoid',        tone: 'red',    hex: '#dc2626', badge: 'badge-red',   desc: 'Does not meet minimum investment criteria at current pricing and income assumptions.' };
}

function getStrengths(m, f) {
  const out = [];
  if (m.capRate >= 7)      out.push({ icon: '📈', text: `Excellent cap rate of ${m.capRate.toFixed(1)}% — well above the 5% market threshold` });
  else if (m.capRate >= 5) out.push({ icon: '📈', text: `Solid cap rate of ${m.capRate.toFixed(1)}% meets investor return targets` });
  if (m.cashFlow > 300)    out.push({ icon: '💵', text: `Strong positive cash flow of +$${Math.round(m.cashFlow).toLocaleString()}/mo from day one` });
  else if (m.cashFlow > 0) out.push({ icon: '💵', text: `Positive cash flow of +$${Math.round(m.cashFlow).toLocaleString()}/mo — income covers all costs` });
  if (m.cocReturn >= 10)   out.push({ icon: '🔁', text: `Exceptional cash-on-cash return of ${m.cocReturn.toFixed(1)}% exceeds the 8% target` });
  else if (m.cocReturn >= 7) out.push({ icon: '🔁', text: `Cash-on-cash return of ${m.cocReturn.toFixed(1)}% is within target range` });
  if (m.dscr >= 1.5)       out.push({ icon: '🏦', text: `DSCR of ${m.dscr.toFixed(2)} gives lenders confidence — strong debt coverage` });
  else if (m.dscr >= 1.25) out.push({ icon: '🏦', text: `DSCR of ${m.dscr.toFixed(2)} comfortably covers debt service requirements` });
  if (Number(f.downPayment) >= 25) out.push({ icon: '🛡️', text: `${f.downPayment}% down payment reduces leverage and monthly debt burden` });
  if (m.expenseRatio < 40) out.push({ icon: '⚙️', text: `Low expense ratio of ${m.expenseRatio.toFixed(0)}% preserves more gross income` });
  return out.slice(0, 5);
}

function getRisks(m, f) {
  const out = [];
  if (m.cashFlow < -500)        out.push({ icon: '⚠️', text: `Severely negative cash flow (-$${Math.abs(Math.round(m.cashFlow)).toLocaleString()}/mo) — requires significant monthly capital` });
  else if (m.cashFlow < 0)      out.push({ icon: '⚠️', text: `Negative cash flow of -$${Math.abs(Math.round(m.cashFlow)).toLocaleString()}/mo requires monthly top-up from reserves` });
  if (m.capRate < 4)            out.push({ icon: '📉', text: `Cap rate of ${m.capRate.toFixed(1)}% is below the 4% minimum — property may be overpriced` });
  if (m.dscr < 1.0 && m.dscr > 0) out.push({ icon: '🏦', text: `DSCR of ${m.dscr.toFixed(2)} — income does not fully cover debt service (lender concern)` });
  else if (m.dscr < 1.25 && m.dscr > 0) out.push({ icon: '🏦', text: `DSCR of ${m.dscr.toFixed(2)} is below the 1.25 lender threshold` });
  if (m.expenseRatio > 55)      out.push({ icon: '⚙️', text: `High expense ratio of ${m.expenseRatio.toFixed(0)}% compresses net operating income` });
  if (Number(f.vacancy) > 8)    out.push({ icon: '🏘️', text: `Vacancy assumption of ${f.vacancy}% is above market average — verify local data` });
  if (m.cocReturn < 5 && m.cocReturn > -50) out.push({ icon: '🔁', text: `Cash-on-cash return of ${m.cocReturn.toFixed(1)}% is below the 8% investment target` });
  if (m.price >= 1_000_000)    out.push({ icon: '💼', text: 'Jumbo loan territory — limited lenders, larger down payment typically required' });
  return out.slice(0, 5);
}

function getNextSteps(score, m) {
  if (score >= 70) return [
    'Obtain lender pre-approval — move within 48 hrs of inspection clearance',
    'Schedule a licensed property inspection ($500–$800)',
    'Pull 3 active rent comps within 0.5 miles to confirm income assumptions',
    'Submit LOI with standard financing, inspection, and appraisal contingencies',
  ];
  if (score >= 55) return [
    `Negotiate 5–10% price reduction to improve the score above ${Math.round(m.score + 8)}/100`,
    'Optimize operating expenses — re-quote insurance and property management',
    'Verify rent comps; a 10% rent increase can flip a negative cash flow positive',
    'Re-run this analysis at a lower purchase price to find your offer ceiling',
  ];
  if (score >= 40) return [
    'Consider alternative properties in the same market with stronger fundamentals',
    `Model a 15–20% price reduction ($${Math.round(m.price * 0.82 / 1000)}K–$${Math.round(m.price * 0.85 / 1000)}K) to test viability`,
    'Identify value-add opportunities (ADU, renovation) that improve the income side',
    'Consult a property manager on realistic rents before making any offer',
  ];
  return [
    'Avoid at current pricing — returns do not meet minimum investment thresholds',
    'The property would need a significant price drop to become viable',
    'Explore other markets with stronger cap rate fundamentals (Dallas, Atlanta, Phoenix)',
    'Use this analysis as a template to screen your next opportunity',
  ];
}

// ── Form field helpers ────────────────────────────────────────────────────────

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
const PROPERTY_TYPES = ['Single Family','Condo','Townhouse','Duplex','Multifamily','Commercial','Land'];
const LOAN_TERMS = [{ value: 30, label: '30 Years' }, { value: 20, label: '20 Years' }, { value: 15, label: '15 Years' }];

const DEFAULTS = {
  address: '', city: '', state: 'FL', propertyType: 'Single Family',
  purchasePrice: '', downPayment: '20', interestRate: '6.75', loanTerm: '30',
  monthlyRent: '', propertyTaxes: '', insurance: '',
  hoa: '0', vacancy: '6', repairs: '8',
};

function fmtM(n) {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(Math.round(n));
  return (n < 0 ? '-' : '') + '$' + abs.toLocaleString();
}

function fmtP(n, d = 1) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toFixed(d) + '%';
}

function scoreColor(s) {
  if (s >= 70) return '#059669';
  if (s >= 55) return '#2563eb';
  if (s >= 40) return '#d97706';
  return '#dc2626';
}

// ── Input field component ─────────────────────────────────────────────────────

function Field({ label, id, type = 'text', value, onChange, placeholder, prefix, suffix, min, max, step, required, note, error }) {
  return (
    <div className="se-field">
      <label className="se-label" htmlFor={id}>
        {label}{required && <span className="se-required">*</span>}
      </label>
      <div className="se-input-wrap">
        {prefix && <span className="se-input-affix se-input-prefix">{prefix}</span>}
        <input
          id={id} type={type} className={`se-input${prefix ? ' se-input--pfx' : ''}${suffix ? ' se-input--sfx' : ''}`}
          value={value} onChange={e => onChange(id, e.target.value)}
          placeholder={placeholder} min={min} max={max} step={step}
        />
        {suffix && <span className="se-input-affix se-input-suffix">{suffix}</span>}
      </div>
      {error && <span className="se-field-error" role="alert">{error}</span>}
      {note  && <span className="se-field-note">{note}</span>}
    </div>
  );
}

function SelectField({ label, id, value, onChange, options, required }) {
  return (
    <div className="se-field">
      <label className="se-label" htmlFor={id}>
        {label}{required && <span className="se-required">*</span>}
      </label>
      <select id={id} className="se-select" value={value} onChange={e => onChange(id, e.target.value)}>
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </div>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, accent }) {
  const colors = {
    green: '#059669', blue: '#2563eb', teal: '#0d9488',
    gold:  '#d97706', red:  '#dc2626', gray: '#64748b',
  };
  const c = colors[accent] || colors.gray;
  return (
    <div className="se-metric-card">
      <div className="se-metric-label">{label}</div>
      <div className="se-metric-value" style={{ color: c }}>{value}</div>
      {sub && <div className="se-metric-sub">{sub}</div>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ScoreEngine() {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const [form,    setForm]    = useState(() => {
    const market = searchParams.get('market');
    return market ? { ...DEFAULTS, city: market } : DEFAULTS;
  });
  const [results, setResults] = useState(null);
  const [errors,  setErrors]  = useState({});
  const [saved,   setSaved]   = useState(false);
  const [dirty,   setDirty]   = useState(false);

  const updateField = useCallback((id, val) => {
    setForm(prev => ({ ...prev, [id]: val }));
    setErrors(prev => ({ ...prev, [id]: '' }));
    setDirty(true);
    setSaved(false);
  }, []);

  // Re-calculate live once results are shown
  useEffect(() => {
    if (!results || !dirty) return;
    const t = setTimeout(() => {
      if (form.purchasePrice && form.monthlyRent) {
        setResults(runScoreEngine(form));
      }
    }, 300);
    return () => clearTimeout(t);
  }, [form, dirty, results]);

  function validate() {
    const e = {};
    if (!form.address.trim())      e.address      = 'Required';
    if (!form.purchasePrice)       e.purchasePrice = 'Required';
    if (!form.monthlyRent)         e.monthlyRent   = 'Required';
    if (Number(form.downPayment) <= 0 || Number(form.downPayment) >= 100)
                                   e.downPayment   = 'Must be 1–99%';
    if (Number(form.interestRate) <= 0 || Number(form.interestRate) > 25)
                                   e.interestRate  = 'Must be 0.1–25%';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleCalculate() {
    if (!validate()) return;
    setResults(runScoreEngine(form));
    setDirty(false);
    setSaved(false);
  }

  function handleSave() {
    if (!results) return;
    const rec     = getRecommendation(results.score);
    const address = [form.address, form.city, form.state].filter(Boolean).join(', ');
    saveProperty(
      { address: form.address, city: form.city, state: form.state, type: form.propertyType },
      {
        address,
        city:             form.city || '',
        price:            `$${Math.round(results.price).toLocaleString()}`,
        cashFlow:         Math.round(results.cashFlow),           // numeric — no parser confusion
        capRate:          parseFloat(results.capRate.toFixed(2)), // numeric
        dealScore:        results.score,
        opportunityScore: results.score,
        investmentScore:  results.score,
        riskLevel:        results.riskLevel,
        recommendation:   rec.label,
        status:           rec.label,
      }
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const rec        = results ? getRecommendation(results.score) : null;
  const strengths  = results ? getStrengths(results, form) : [];
  const risks      = results ? getRisks(results, form) : [];
  const nextSteps  = results ? getNextSteps(results.score, results) : [];
  const hasResults = Boolean(results);

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <div className="se-header-badges">
            <span className="badge badge-blue">CinNova</span>
            <span className="badge badge-teal">Score Engine</span>
            <span className="badge badge-gold">AI Analysis</span>
          </div>
          <h1 className="page-title">Intelligence Score Engine</h1>
          <p className="page-subtitle">Enter any property's financials to get an AI investment score, recommendation, and deal breakdown.</p>
        </div>
        <div className="se-header-actions">
          <button className="btn btn-ghost btn-sm" disabled title="Coming soon">AI Advisor (soon)</button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/main-dashboard')}>Dashboard</button>
        </div>
      </div>

      {/* ── Input Panel ── */}
      <div className="card se-input-panel">
        <div className="card-header">
          <h2 className="card-title">Property Details</h2>
          <span className="badge badge-gray">Fields marked * are required</span>
        </div>

        <div className="se-form-grid">
          {/* Section: Property */}
          <div className="se-form-section">
            <div className="se-section-label">Property</div>
            <Field id="address" label="Street Address" value={form.address} onChange={updateField}
              placeholder="123 Main St" required error={errors.address} />
            <div className="se-field-row">
              <Field id="city" label="City" value={form.city} onChange={updateField} placeholder="Miami" />
              <SelectField id="state" label="State" value={form.state} onChange={updateField}
                options={US_STATES} />
            </div>
            <SelectField id="propertyType" label="Property Type" value={form.propertyType}
              onChange={updateField} options={PROPERTY_TYPES} />
          </div>

          {/* Section: Purchase */}
          <div className="se-form-section">
            <div className="se-section-label">Purchase & Financing</div>
            <Field id="purchasePrice" label="Purchase Price" type="number" value={form.purchasePrice}
              onChange={updateField} placeholder="350000" prefix="$" min="1" required error={errors.purchasePrice} />
            <div className="se-field-row">
              <Field id="downPayment" label="Down Payment" type="number" value={form.downPayment}
                onChange={updateField} placeholder="20" suffix="%" min="1" max="99" error={errors.downPayment} />
              <Field id="interestRate" label="Interest Rate" type="number" value={form.interestRate}
                onChange={updateField} placeholder="6.75" suffix="%" min="0.1" max="25" step="0.05" error={errors.interestRate} />
            </div>
            <SelectField id="loanTerm" label="Loan Term" value={form.loanTerm}
              onChange={updateField} options={LOAN_TERMS} />
          </div>

          {/* Section: Income */}
          <div className="se-form-section">
            <div className="se-section-label">Income</div>
            <Field id="monthlyRent" label="Monthly Rent" type="number" value={form.monthlyRent}
              onChange={updateField} placeholder="2200" prefix="$" min="0" required error={errors.monthlyRent} />
            <Field id="vacancy" label="Vacancy Rate" type="number" value={form.vacancy}
              onChange={updateField} placeholder="6" suffix="%" min="0" max="50"
              note="Industry standard: 5–8%" />
          </div>

          {/* Section: Expenses */}
          <div className="se-form-section">
            <div className="se-section-label">Annual Expenses</div>
            <Field id="propertyTaxes" label="Property Taxes" type="number" value={form.propertyTaxes}
              onChange={updateField} placeholder="4200" prefix="$" min="0" note="Annual total" />
            <Field id="insurance" label="Homeowner's Insurance" type="number" value={form.insurance}
              onChange={updateField} placeholder="1800" prefix="$" min="0" note="Annual total" />
            <div className="se-field-row">
              <Field id="hoa" label="HOA Fee" type="number" value={form.hoa}
                onChange={updateField} placeholder="0" prefix="$" min="0" note="/month" />
              <Field id="repairs" label="Repairs & Maint." type="number" value={form.repairs}
                onChange={updateField} placeholder="8" suffix="%" min="0" max="30" note="% of gross rent" />
            </div>
          </div>
        </div>

        <div className="se-form-footer">
          <button className="btn btn-primary se-calc-btn" onClick={handleCalculate}>
            Calculate Investment Score
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setForm(DEFAULTS); setResults(null); setErrors({}); }}>
            Reset
          </button>
          {dirty && results && (
            <span className="se-recalc-hint">Inputs changed — score updates automatically</span>
          )}
        </div>
      </div>

      {/* ── Empty state ── */}
      {!hasResults && (
        <div className="se-empty-state">
          <div className="se-empty-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="#94a3b8" strokeWidth="2"/>
              <circle cx="24" cy="24" r="10" stroke="#2563eb" strokeWidth="2.5"/>
              <path d="M24 4v7M24 37v7M4 24h7M37 24h7" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h3>Enter property details above to generate your investment score</h3>
          <p>Address, purchase price, and monthly rent are the only required fields. Everything else can use the smart defaults.</p>
        </div>
      )}

      {/* ── Results ── */}
      {hasResults && (
        <>
          {/* Score banner */}
          <div className={`card se-score-banner se-score-banner--${rec.tone}`}>
            <div className="se-score-left">
              <div className="se-score-ring-wrap">
                <svg viewBox="0 0 96 96" width="100" height="100">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="#e2e8f0" strokeWidth="10"/>
                  <circle cx="48" cy="48" r="40" fill="none"
                    stroke={rec.hex} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${(results.score / 100) * 251.2} 251.2`}
                    transform="rotate(-90 48 48)"
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                  />
                </svg>
                <div className="se-score-inner">
                  <strong style={{ color: rec.hex }}>{results.score}</strong>
                  <small>/100</small>
                </div>
              </div>
              <div className="se-score-verdict">
                <span className={`${rec.badge} se-rec-badge`}>{rec.label}</span>
                <h2 className="se-score-title">CinNova Investment Score</h2>
                <p className="se-score-desc">{rec.desc}</p>
                <div className="se-score-meta">
                  <span className={`se-risk-chip se-risk--${results.riskLevel.toLowerCase()}`}>
                    {results.riskLevel} Risk
                  </span>
                  <span>{form.address.split(',')[0]}</span>
                  {form.city && <span>{form.city}, {form.state}</span>}
                  <span>{form.propertyType}</span>
                </div>
              </div>
            </div>
            <div className="se-score-actions">
              <button
                className={`btn ${saved ? 'btn-ghost' : 'btn-teal'}`}
                onClick={handleSave}
                disabled={saved}
              >
                {saved ? '✓ Saved to Dashboard' : 'Save Analysis'}
              </button>
              <button className="btn btn-ghost btn-sm" disabled title="Coming soon">
                View Portfolio (soon)
              </button>
              <button className="btn btn-ghost btn-sm" disabled title="Coming soon">
                Ask AI Advisor (soon)
              </button>
            </div>
          </div>

          {/* Key metrics grid */}
          <div className="section">
            <div className="section-header">
              <h2 className="section-title">Key Metrics</h2>
              <span className="badge badge-gray">Calculated</span>
            </div>
            <div className="se-metrics-grid">
              <MetricCard
                label="Monthly Cash Flow"
                value={`${results.cashFlow >= 0 ? '+' : ''}${fmtM(results.cashFlow)}/mo`}
                sub={`Annual: ${results.annualCF >= 0 ? '+' : ''}${fmtM(results.annualCF)}/yr`}
                accent={results.cashFlow >= 0 ? 'green' : 'red'}
              />
              <MetricCard
                label="Monthly Mortgage"
                value={`${fmtM(results.mortgage)}/mo`}
                sub={`Loan: ${fmtM(results.loanAmt)} · ${form.loanTerm}yr @ ${form.interestRate}%`}
                accent="blue"
              />
              <MetricCard
                label="Cap Rate"
                value={fmtP(results.capRate)}
                sub={results.capRate >= 5 ? 'Meets investor threshold' : 'Below 5% target'}
                accent={results.capRate >= 6 ? 'green' : results.capRate >= 4.5 ? 'blue' : 'gold'}
              />
              <MetricCard
                label="Cash-on-Cash Return"
                value={fmtP(results.cocReturn)}
                sub={`On $${Math.round(results.downAmt).toLocaleString()} down`}
                accent={results.cocReturn >= 8 ? 'green' : results.cocReturn >= 5 ? 'blue' : 'gold'}
              />
              <MetricCard
                label="DSCR"
                value={results.dscr > 0 ? results.dscr.toFixed(2) : '—'}
                sub={results.dscr >= 1.25 ? 'Meets lender minimum' : results.dscr >= 1.0 ? 'Below 1.25 preferred' : 'Below break-even'}
                accent={results.dscr >= 1.25 ? 'green' : results.dscr >= 1.0 ? 'gold' : 'red'}
              />
              <MetricCard
                label="Expense Ratio"
                value={fmtP(results.expenseRatio)}
                sub={`Operating costs: ${fmtM(results.totalOpEx)}/mo`}
                accent={results.expenseRatio < 40 ? 'green' : results.expenseRatio < 55 ? 'blue' : 'red'}
              />
            </div>
          </div>

          {/* Strengths & Risks */}
          <div className="se-sr-row">
            <div className="card se-strengths-card">
              <div className="card-header">
                <h2 className="card-title">Strengths</h2>
                <span className="badge badge-green">{strengths.length} identified</span>
              </div>
              {strengths.length === 0 ? (
                <p className="se-sr-empty">Improve the financials to unlock strengths — try a lower price or higher rent.</p>
              ) : (
                <ul className="se-sr-list">
                  {strengths.map((s, i) => (
                    <li key={i} className="se-sr-item se-sr-item--strength">
                      <span className="se-sr-icon">{s.icon}</span>
                      <span>{s.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card se-risks-card">
              <div className="card-header">
                <h2 className="card-title">Risk Factors</h2>
                <span className={`badge ${risks.length > 2 ? 'badge-red' : risks.length > 0 ? 'badge-gold' : 'badge-green'}`}>
                  {risks.length === 0 ? 'None identified' : `${risks.length} flagged`}
                </span>
              </div>
              {risks.length === 0 ? (
                <p className="se-sr-empty" style={{ color: '#059669' }}>No significant risk factors identified at current inputs.</p>
              ) : (
                <ul className="se-sr-list">
                  {risks.map((r, i) => (
                    <li key={i} className="se-sr-item se-sr-item--risk">
                      <span className="se-sr-icon">{r.icon}</span>
                      <span>{r.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Next steps */}
          <div className="card se-next-steps">
            <div className="card-header">
              <h2 className="card-title">Suggested Next Steps</h2>
              <span className="badge badge-blue">Based on your score</span>
            </div>
            <div className="se-steps-list">
              {nextSteps.map((step, i) => (
                <div key={i} className="se-step">
                  <span className="se-step-num">{i + 1}</span>
                  <span className="se-step-text">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Market assumptions */}
          <div className="card se-assumptions">
            <div className="card-header">
              <h2 className="card-title">Market Assumptions</h2>
              <span className="badge badge-gray">Reference · Q2 2025</span>
            </div>
            <div className="se-assumptions-grid">
              {[
                { label: '30-Yr Fixed Rate',       value: '6.75%',     note: 'National average reference' },
                { label: 'Target Cap Rate',         value: '5.0–7.5%',  note: 'By market and property type' },
                { label: 'Target CoC Return',       value: '8–12%',     note: 'Typical investor benchmark' },
                { label: 'Min. Lender DSCR',        value: '1.25×',     note: 'Most conventional lenders' },
                { label: 'Vacancy Assumption',      value: `${form.vacancy}%`, note: 'Your input (market avg 5–8%)' },
                { label: 'Annual Appreciation',     value: '3–5%',      note: 'Historical national average' },
              ].map(a => (
                <div key={a.label} className="se-assumption-item">
                  <div className="se-assumption-label">{a.label}</div>
                  <div className="se-assumption-value">{a.value}</div>
                  <div className="se-assumption-note">{a.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Save CTA footer */}
          <div className="se-save-footer">
            <div>
              <strong>Ready to track this deal?</strong>
              <p>Save the analysis to your Portfolio Tracker to monitor returns, generate reports, and compare deals.</p>
            </div>
            <div className="se-save-footer-actions">
              <button className={`btn ${saved ? 'btn-ghost' : 'btn-primary'}`} onClick={handleSave} disabled={saved}>
                {saved ? '✓ Saved to Dashboard' : 'Save Analysis'}
              </button>
              <button className="btn btn-outline" onClick={() => navigate('/main-dashboard')}>
                Back to Dashboard
              </button>
            </div>
          </div>
        </>
      )}

      <BetaFooter page="Score Engine" readinessSoon />

    </div>
  );
}
