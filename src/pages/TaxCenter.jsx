import { useState } from 'react';
import { US_STATES } from '../data/benefitsData';
import { STATE_TAX_RATES } from '../data/taxData';
import './TaxCenter.css';

/* ── Helpers ─────────────────────────────────────────────── */
function parseNum(str) {
  if (!str) return 0;
  const n = parseFloat(String(str).replace(/[$,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

function fmt(n) {
  return '$' + Math.round(n).toLocaleString();
}

function buildProjection(baseAnnual, years = 10, growth = 0.025) {
  return Array.from({ length: years }, (_, i) => {
    const tax = baseAnnual * Math.pow(1 + growth, i);
    return {
      year: new Date().getFullYear() + i,
      tax,
      monthly: tax / 12,
      delta: tax - baseAnnual,
    };
  });
}

/* ── Exemption data ──────────────────────────────────────── */
const EXEMPTIONS = [
  {
    id: 'senior',
    badgeClass: 'badge-blue',
    badgeLabel: 'Age-Based',
    name: 'Senior Citizen Exemption',
    description:
      'Available to primary-residence owners aged 65 or older in most states. Typically reduces assessed value by $25,000–$50,000, directly lowering the annual tax bill.',
    eligibility: ['Age 65 or older', 'Primary residence only', 'Income caps may apply'],
    availableIn: '48 states',
    savingsLow: 400,
    savingsHigh: 1800,
  },
  {
    id: 'veteran',
    badgeClass: 'badge-teal',
    badgeLabel: 'Military',
    name: 'Veteran / Military Exemption',
    description:
      'Honorably discharged veterans — and surviving spouses — qualify for partial or full tax relief. Veterans rated 100% disabled often receive a complete annual waiver.',
    eligibility: ['Honorable discharge from U.S. military', 'Surviving spouses may qualify', 'Disability rating increases benefit'],
    availableIn: 'All 50 states',
    savingsLow: 600,
    savingsHigh: 5000,
  },
  {
    id: 'homestead',
    badgeClass: 'badge-green',
    badgeLabel: 'Homestead',
    name: 'Homestead Exemption',
    description:
      'The most widely-available exemption. Owner-occupants of a primary residence reduce their taxable assessed value by a fixed amount, automatically lowering annual taxes.',
    eligibility: ['Owner-occupied primary residence', 'Filed annually in most states', 'Automatic renewal in some jurisdictions'],
    availableIn: '47 states',
    savingsLow: 250,
    savingsHigh: 1200,
  },
  {
    id: 'energy',
    badgeClass: 'badge-gold',
    badgeLabel: 'Green',
    name: 'Energy Efficiency Credit',
    description:
      'Many jurisdictions offer property tax abatements or value-freeze programs when qualifying improvements are installed — solar panels, heat pumps, EV chargers, or insulation upgrades.',
    eligibility: ['Qualifying energy improvements installed', 'Permit pulled with local authority', 'Jurisdiction-specific — confirm locally'],
    availableIn: '32 states',
    savingsLow: 150,
    savingsHigh: 2500,
  },
];

/* ── Sub-components ──────────────────────────────────────── */
function BreakdownRow({ label, amount, total, color }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div className="tc-bdown-row">
      <div className="tc-bdown-meta">
        <span className="tc-bdown-dot" style={{ background: color }} />
        <span className="tc-bdown-label">{label}</span>
        <span className="tc-bdown-pct">{Math.round(pct)}%</span>
        <span className="tc-bdown-amt">{fmt(amount)}</span>
      </div>
      <div className="tc-bdown-track">
        <div className="tc-bdown-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function ExemptionCard({ ex }) {
  return (
    <div className="tc-ex-card">
      <div className="tc-ex-top">
        <span className={`badge ${ex.badgeClass}`}>{ex.badgeLabel}</span>
        <span className="tc-ex-avail">{ex.availableIn}</span>
      </div>
      <h4 className="tc-ex-name">{ex.name}</h4>
      <p className="tc-ex-desc">{ex.description}</p>
      <ul className="tc-ex-list">
        {ex.eligibility.map(e => (
          <li key={e} className="tc-ex-item">
            <span className="tc-ex-dot" />
            {e}
          </li>
        ))}
      </ul>
      <div className="tc-ex-savings">
        <span className="tc-ex-savings-label">Est. Annual Savings</span>
        <span className="tc-ex-savings-val">{fmt(ex.savingsLow)} – {fmt(ex.savingsHigh)}</span>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────── */
export default function TaxCenter() {
  const [form, setForm] = useState({ value: '', stateCode: '', county: '', city: '', rate: '' });
  const [result, setResult] = useState(null);

  const stateInfo = form.stateCode ? STATE_TAX_RATES[form.stateCode] : null;

  const handleChange = e =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleStateChange = e => {
    const code = e.target.value;
    const st   = STATE_TAX_RATES[code];
    setForm(prev => ({
      ...prev,
      stateCode: code,
      rate: st ? (st.rate * 100).toFixed(2) : prev.rate,
    }));
    setResult(null);
  };

  const handleCalculate = e => {
    e.preventDefault();
    const value = parseNum(form.value);
    const rate  = parseNum(form.rate) / 100;
    if (!value || !rate) return;

    const annual  = value * rate;
    const monthly = annual / 12;
    const st = stateInfo ?? { county: 0.35, city: 0.20, school: 0.38, special: 0.07 };

    const breakdown = {
      school:  annual * st.school,
      county:  annual * st.county,
      city:    annual * st.city,
      special: annual * st.special,
    };

    const projection = buildProjection(annual);
    const yr5  = projection.slice(0, 5).reduce((s, r) => s + r.tax, 0);
    const yr10 = projection.reduce((s, r) => s + r.tax, 0);

    setResult({ value, rate, annual, monthly, breakdown, projection, yr5, yr10 });
    setTimeout(() => {
      document.getElementById('tc-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleReset = () => {
    setForm({ value: '', stateCode: '', county: '', city: '', rate: '' });
    setResult(null);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Property Tax Intelligence Center</h1>
        <p className="page-subtitle">
          Calculate your tax burden, explore 10-year projections, and discover exemptions that could save you thousands annually.
        </p>
      </div>

      {/* ── Calculator ──────────────────────────────────── */}
      <div className="card section">
        <div className="card-header">
          <h2 className="card-title">Property Tax Calculator</h2>
          {result && (
            <div className="tc-header-actions">
              <span className="badge badge-green">Calculated</span>
              <button className="btn btn-ghost btn-sm" onClick={handleReset}>Reset</button>
            </div>
          )}
        </div>

        <form onSubmit={handleCalculate} className="form-grid">
          <div className="form-group col-span-2">
            <label className="form-label">Property Value (Assessed)</label>
            <input
              name="value"
              className="form-input"
              placeholder="$450,000"
              value={form.value}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">State</label>
            <select
              name="stateCode"
              className="form-select"
              value={form.stateCode}
              onChange={handleStateChange}
            >
              <option value="">Select state</option>
              {US_STATES.map(s => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Tax Rate (%)
              {stateInfo && (
                <span className="tc-rate-hint">avg {(stateInfo.rate * 100).toFixed(2)}%</span>
              )}
            </label>
            <input
              name="rate"
              className="form-input"
              placeholder="1.20"
              value={form.rate}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">County (optional)</label>
            <input
              name="county"
              className="form-input"
              placeholder="e.g. Cook County"
              value={form.county}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">City (optional)</label>
            <input
              name="city"
              className="form-input"
              placeholder="e.g. Chicago"
              value={form.city}
              onChange={handleChange}
            />
          </div>

          <div className="col-span-2">
            <button
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={!parseNum(form.value) || !parseNum(form.rate)}
            >
              {result ? 'Recalculate Tax' : 'Calculate Property Tax'}
            </button>
          </div>
        </form>

        {stateInfo && (
          <p className="tc-state-note">
            Using {stateInfo.name} state average of {(stateInfo.rate * 100).toFixed(2)}%.
            Adjust the rate above to match your specific county or tax district.
          </p>
        )}
      </div>

      {/* ── Empty state ─────────────────────────────────── */}
      {!result && (
        <div className="card section">
          <div className="placeholder-section">
            <div className="placeholder-icon">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <rect x="5" y="3" width="26" height="30" rx="3" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M11 11h14M11 16h14M11 21h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="28" cy="28" r="7" fill="var(--blue-50)" stroke="var(--blue-300)" strokeWidth="1.5"/>
                <path d="M25 28h6M28 25v6" stroke="var(--blue-500)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3>Enter Property Details to Calculate</h3>
            <p>
              Select a state to auto-fill the average effective tax rate, then enter your
              property value and click Calculate.
            </p>
            <div className="placeholder-tags">
              <span className="badge badge-blue">Annual Tax</span>
              <span className="badge badge-teal">Monthly Payment</span>
              <span className="badge badge-gold">10-Year Projection</span>
              <span className="badge badge-green">Savings Finder</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Results ─────────────────────────────────────── */}
      {result && (
        <div id="tc-results">

          {/* Summary stat strip */}
          <div className="section">
            <div className="section-header">
              <h2 className="section-title">Tax Summary</h2>
              {stateInfo && (
                <span className="badge badge-blue">
                  {stateInfo.name} · {(result.rate * 100).toFixed(2)}% rate
                </span>
              )}
            </div>
            <div className="tc-summary-grid">
              <div className="tc-stat tc-stat--primary">
                <p className="tc-stat-label">Annual Property Tax</p>
                <p className="tc-stat-value">{fmt(result.annual)}</p>
                <p className="tc-stat-sub">per year</p>
              </div>
              <div className="tc-stat">
                <p className="tc-stat-label">Monthly Tax</p>
                <p className="tc-stat-value">{fmt(result.monthly)}</p>
                <p className="tc-stat-sub">per month</p>
              </div>
              <div className="tc-stat tc-stat--gold">
                <p className="tc-stat-label">5-Year Cumulative</p>
                <p className="tc-stat-value">{fmt(result.yr5)}</p>
                <p className="tc-stat-sub">at 2.5% annual growth</p>
              </div>
              <div className="tc-stat tc-stat--danger">
                <p className="tc-stat-label">10-Year Cumulative</p>
                <p className="tc-stat-value">{fmt(result.yr10)}</p>
                <p className="tc-stat-sub">at 2.5% annual growth</p>
              </div>
            </div>
          </div>

          {/* Breakdown + Projection side by side */}
          <div className="grid-2 section">

            {/* Tax Breakdown */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Tax Breakdown</h2>
                <span className="badge badge-gold">By Category</span>
              </div>
              <div className="tc-bdown-list">
                <BreakdownRow
                  label="School District"
                  amount={result.breakdown.school}
                  total={result.annual}
                  color="var(--gold-lt)"
                />
                <BreakdownRow
                  label="County"
                  amount={result.breakdown.county}
                  total={result.annual}
                  color="var(--blue-500)"
                />
                <BreakdownRow
                  label="City / Municipal"
                  amount={result.breakdown.city}
                  total={result.annual}
                  color="var(--teal-500)"
                />
                <BreakdownRow
                  label="Special Assessments"
                  amount={result.breakdown.special}
                  total={result.annual}
                  color="#8b5cf6"
                />
              </div>
              <div className="tc-bdown-total">
                <span>Total Annual Tax</span>
                <span className="tc-bdown-total-val">{fmt(result.annual)}</span>
              </div>
              {(form.county || form.city) && (
                <p className="tc-location-note">
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M5.5 1C4 1 3 2.2 3 3.5C3 5.8 5.5 10 5.5 10S8 5.8 8 3.5C8 2.2 7 1 5.5 1Z"
                      stroke="var(--blue-400)" strokeWidth="1.1"/>
                    <circle cx="5.5" cy="3.5" r="0.9" fill="var(--blue-400)"/>
                  </svg>
                  {[form.county, form.city].filter(Boolean).join(', ')}
                </p>
              )}
            </div>

            {/* 10-Year projection table */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">10-Year Projection</h2>
                <span className="badge badge-teal">2.5% Annual Growth</span>
              </div>
              <div className="tc-proj-wrap">
                <table className="tc-proj-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Annual</th>
                      <th>Monthly</th>
                      <th>vs Today</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.projection.map((row, i) => (
                      <tr key={row.year} className={i === 0 ? 'tc-proj-base' : ''}>
                        <td className="proj-year">{row.year}</td>
                        <td className="proj-annual">{fmt(row.tax)}</td>
                        <td className="proj-monthly">{fmt(row.monthly)}</td>
                        <td className={row.delta > 0 ? 'proj-delta-up' : 'proj-delta-zero'}>
                          {row.delta === 0 ? '—' : `+${fmt(row.delta)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Tax Savings Finder — always visible ─────────── */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Tax Savings Finder</h2>
          <span className="badge badge-gray">Mock Programs</span>
        </div>
        <p className="tc-savings-intro">
          You may qualify for one or more exemptions that could significantly reduce your annual
          tax bill. Programs vary by state and county — contact your local assessor's office to apply.
        </p>
        <div className="tc-exemptions-grid">
          {EXEMPTIONS.map(ex => <ExemptionCard key={ex.id} ex={ex} />)}
        </div>
      </div>

    </div>
  );
}
