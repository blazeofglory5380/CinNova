import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSelectedProperty, saveWorkflowAnalysis } from '../services/propertyWorkflow';
import { addToPortfolio } from '../services/propertyStorage';
import './MortgageCalculator.css';

function fmt(n) { return n.toLocaleString('en-US', { maximumFractionDigits: 0 }); }
function fmtM(n)  { return '$' + fmt(Math.round(n)); }

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const NOW = new Date();

export default function MortgageCalculator() {
  const navigate = useNavigate();
  const selected = getSelectedProperty();

  const [price,      setPrice]   = useState(selected?.price || 550000);
  const [downPct,    setDown]    = useState(20);
  const [rate,       setRate]    = useState(6.82);
  const [term,       setTerm]    = useState(30);
  const [propTax,    setPropTax] = useState(1.2);
  const [insurance,  setIns]     = useState(1200);
  const [hoa,        setHoa]     = useState(0);
  const [pmi,        setPmi]     = useState(0.5);
  const [startMonth, setStartM]  = useState(NOW.getMonth() + 1);
  const [startYear,  setStartY]  = useState(NOW.getFullYear());
  const [monthlyRent, setRent]   = useState(selected?.rent || 3600);
  const [expenses,   setExp]     = useState(selected?.rent ? Math.max(250, Math.round(selected.rent * 0.18)) : 650);
  const [vacancy,    setVacancy] = useState(6);
  const [saved,      setSaved]   = useState(false);

  /* ── Core calculations ───────────────────── */
  const dp   = price * downPct / 100;
  const loan = price - dp;
  const mo   = rate / 100 / 12;
  const n    = term * 12;

  const pi = useMemo(() =>
    mo === 0 ? loan / n : loan * (mo * Math.pow(1 + mo, n)) / (Math.pow(1 + mo, n) - 1),
    [loan, mo, n]
  );

  const monthlyTax = price * propTax / 100 / 12;
  const monthlyIns = insurance / 12;
  const monthlyHoa = hoa;
  const monthlyPmi = downPct < 20 ? loan * pmi / 100 / 12 : 0;
  const total      = pi + monthlyTax + monthlyIns + monthlyHoa + monthlyPmi;

  const totalPaid     = pi * n;
  const totalInterest = totalPaid - loan;
  const totalLoanCost = totalPaid + dp;

  const payoffDate = useMemo(() => {
    const d = new Date(startYear, startMonth - 1);
    d.setMonth(d.getMonth() + n);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [startYear, startMonth, n]);

  /* ── Affordability ───────────────────────── */
  const reqMonthlyIncome = total / 0.28;
  const reqAnnualIncome  = reqMonthlyIncome * 12;
  const dtiWarn          = reqMonthlyIncome > 18000;

  const affordRec = reqMonthlyIncome > 20000
    ? 'Payment requires very high income. Consider a larger down payment, lower price, or longer term.'
    : dtiWarn
    ? 'Near the upper bound of affordability. Confirm total DTI (including all debts) stays under 36%.'
    : 'Payment is within the 28% housing ratio guideline. Factor all debts into your DTI before applying.';

  /* ── Investment metrics ──────────────────── */
  const vacancyLoss  = monthlyRent * vacancy / 100;
  const effectiveRent = monthlyRent - vacancyLoss;
  const opEx         = monthlyTax + monthlyIns + monthlyHoa + expenses;
  const noi          = effectiveRent - opEx;
  const cashFlow     = noi - pi - monthlyPmi;
  const annualNOI    = noi * 12;
  const capRate      = price > 0 ? (annualNOI / price) * 100 : 0;
  const cashOnCash   = dp > 0 ? (cashFlow * 12 / dp) * 100 : 0;
  const dscr         = pi > 0 ? noi / pi : 0;
  const invScore     = Math.max(0, Math.min(100, Math.round(
    45 + (capRate - 5) * 6 + cashOnCash * 1.3 + (dscr - 1) * 18 + (cashFlow > 0 ? 8 : -12)
  )));
  const riskLevel = invScore >= 82 && dscr >= 1.25 && cashFlow > 0 ? 'Low'
    : invScore >= 65 && dscr >= 1.05 ? 'Moderate'
    : invScore >= 45 ? 'Elevated'
    : 'High';

  /* ── Amortization: first 12 months ──────── */
  const amortMonthly = useMemo(() => {
    const rows = [];
    let balance = loan;
    for (let i = 1; i <= Math.min(12, n); i++) {
      const intPay  = balance * mo;
      const prinPay = Math.max(0, pi - intPay);
      balance = Math.max(0, balance - prinPay);
      const d = new Date(startYear, startMonth - 1 + i - 1);
      rows.push({
        label:     d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        payment:   pi,
        interest:  intPay,
        principal: prinPay,
        balance,
      });
    }
    return rows;
  }, [loan, mo, n, pi, startYear, startMonth]);

  /* ── Amortization: yearly bars ───────────── */
  const amortYearly = useMemo(() => {
    const bars = [];
    let balance = loan;
    for (let y = 1; y <= Math.min(n / 12, 30); y++) {
      let yInt = 0, yPrin = 0;
      for (let m = 0; m < 12; m++) {
        const int  = balance * mo;
        const prin = pi - int;
        yInt  += int;
        yPrin += prin;
        balance = Math.max(0, balance - prin);
      }
      bars.push({ y, int: yInt, prin: yPrin });
    }
    return bars;
  }, [loan, mo, n, pi]);

  /* ── Actions ─────────────────────────────── */
  const handleSave = () => {
    const prop = selected || { address: 'Mortgage Scenario', price, rent: monthlyRent };
    saveWorkflowAnalysis(prop, {
      monthlyRent, mortgage: pi, propertyTax: monthlyTax, insurance: monthlyIns,
      expenses, vacancy, cashFlow, roi: cashOnCash, score: invScore, downPayment: dp,
    });
    addToPortfolio({
      id: selected?.id ?? Date.now(),
      address: selected?.address || 'Mortgage Scenario',
      city: selected?.city || '',
      price, type: selected?.type || 'Single Family',
      beds: selected?.beds, baths: selected?.baths, sqft: selected?.sqft,
      rent: monthlyRent, cashFlow: Math.round(cashFlow),
      capRate: parseFloat(capRate.toFixed(1)),
      roi: parseFloat(cashOnCash.toFixed(1)),
      score: invScore, equity: Math.round(dp),
    });
    setSaved(true);
  };

  /* ── Render ──────────────────────────────── */
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Mortgage Calculator</h1>
        <p className="page-subtitle">
          Model monthly payments, total interest, affordability, and full amortization in one place.
        </p>
      </div>

      {!selected ? (
        <div className="mc-banner mc-banner--warn">
          <span>🏠</span>
          <span>
            <strong>No property selected.</strong> Showing example data.{' '}
            <Link to="/property-search">Search for a property →</Link>
          </span>
        </div>
      ) : (
        <div className="mc-banner mc-banner--info">
          <span>📍</span>
          <div>
            <strong>{selected.fullAddress || selected.address}</strong>
            <span className="mc-banner-meta">
              ${selected.price?.toLocaleString()} · {selected.type}
              {selected.beds ? ` · ${selected.beds} bd / ${selected.baths} ba` : ''}
            </span>
          </div>
        </div>
      )}

      <div className="mc-layout">

        {/* LEFT — Inputs */}
        <div className="mc-inputs">

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Property & Loan</h2>
              <span className="badge badge-blue">{term}-Yr Fixed</span>
            </div>
            <div className="mc-fields">
              <SliderField label="Home Price" value={price} display={fmtM(price)}
                min={50000} max={3000000} step={5000} onChange={setPrice} />

              <SliderField label="Down Payment" value={downPct}
                display={`${downPct}% · ${fmtM(dp)}`}
                min={3} max={50} step={1} onChange={setDown} />

              <div className="mc-derived-row">
                <span className="mc-derived-label">Loan Amount</span>
                <span className="mc-derived-val">{fmtM(loan)}</span>
              </div>

              <SliderField label="Interest Rate" value={rate}
                display={`${rate.toFixed(2)}%`}
                min={2} max={14} step={0.05} onChange={setRate} />

              <div className="mc-field">
                <div className="mc-field-hdr">
                  <label>Loan Term</label>
                  <span className="mc-val">{term} years</span>
                </div>
                <div className="mc-term-btns">
                  {[10, 15, 20, 25, 30].map(y => (
                    <button key={y}
                      className={`mc-term-btn${term === y ? ' active' : ''}`}
                      onClick={() => setTerm(y)}>
                      {y}yr
                    </button>
                  ))}
                </div>
              </div>

              <div className="mc-field">
                <div className="mc-field-hdr"><label>Start Date</label></div>
                <div className="mc-date-row">
                  <select className="mc-select" value={startMonth} onChange={e => setStartM(+e.target.value)}>
                    {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                  <select className="mc-select" value={startYear} onChange={e => setStartY(+e.target.value)}>
                    {Array.from({ length: 11 }, (_, i) => NOW.getFullYear() + i).map(y =>
                      <option key={y} value={y}>{y}</option>
                    )}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2 className="card-title">Monthly Costs</h2></div>
            <div className="mc-fields">
              <SliderField label="Property Tax Rate" value={propTax}
                display={`${propTax.toFixed(2)}% / yr · ${fmtM(monthlyTax)}/mo`}
                min={0.2} max={4} step={0.05} onChange={setPropTax} />

              <SliderField label="Homeowner's Insurance" value={insurance}
                display={`${fmtM(insurance)}/yr · ${fmtM(monthlyIns)}/mo`}
                min={400} max={8000} step={50} onChange={setIns} />

              <SliderField label="HOA Fees" value={hoa}
                display={`${fmtM(hoa)}/mo`}
                min={0} max={2000} step={25} onChange={setHoa} />

              {downPct < 20 && (
                <SliderField
                  label={<>PMI Rate <span className="mc-note">(auto-applied &lt;20% down)</span></>}
                  value={pmi}
                  display={`${pmi.toFixed(2)}% · ${fmtM(monthlyPmi)}/mo`}
                  min={0.2} max={1.5} step={0.05} onChange={setPmi} />
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Rental Assumptions</h2>
              <span className="badge badge-teal">Investment</span>
            </div>
            <div className="mc-fields">
              <SliderField label="Monthly Rent" value={monthlyRent}
                display={`${fmtM(monthlyRent)}/mo`}
                min={0} max={15000} step={50} onChange={setRent} />

              <SliderField label="Monthly Expenses" value={expenses}
                display={`${fmtM(expenses)}/mo`}
                min={0} max={5000} step={25} onChange={setExp} />

              <SliderField label="Vacancy Rate" value={vacancy}
                display={`${vacancy.toFixed(1)}% · ${fmtM(vacancyLoss)}/mo loss`}
                min={0} max={25} step={0.5} onChange={setVacancy} />
            </div>
          </div>

        </div>

        {/* RIGHT — Results */}
        <div className="mc-results">

          {/* Hero payment card */}
          <div className="mc-total-card">
            <div className="mc-total-label">Total Monthly Payment</div>
            <div className="mc-total-amt">{fmtM(total)}</div>
            <div className="mc-total-sub">/ month</div>

            <div className="mc-donut-wrap">
              <DonutChart
                segments={[
                  { label: 'P&I',       value: pi,         color: '#2563eb' },
                  { label: 'Tax',        value: monthlyTax, color: '#c9a84c' },
                  { label: 'Insurance',  value: monthlyIns, color: '#10b981' },
                  { label: 'HOA',        value: monthlyHoa, color: '#8b5cf6' },
                  { label: 'PMI',        value: monthlyPmi, color: '#f87171' },
                ].filter(s => s.value > 0)}
                total={total}
              />
            </div>

            <div className="mc-breakdown">
              {[
                { label: 'Principal & Interest', val: pi,         color: '#2563eb' },
                { label: 'Property Tax',          val: monthlyTax, color: '#c9a84c' },
                { label: 'Insurance',             val: monthlyIns, color: '#10b981' },
                ...(hoa       ? [{ label: 'HOA', val: monthlyHoa, color: '#8b5cf6' }] : []),
                ...(monthlyPmi ? [{ label: 'PMI', val: monthlyPmi, color: '#f87171' }] : []),
              ].map(row => (
                <div key={row.label} className="mc-breakdown-row">
                  <span className="mc-breakdown-dot" style={{ background: row.color }} />
                  <span className="mc-breakdown-label">{row.label}</span>
                  <span className="mc-breakdown-val">{fmtM(row.val)}</span>
                  <span className="mc-breakdown-pct">{((row.val / total) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Loan summary */}
          <div className="card">
            <div className="card-header"><h2 className="card-title">Loan Summary</h2></div>
            <div className="mc-summary-grid">
              <SumItem label="Loan Amount"      value={fmtM(loan)} />
              <SumItem label="Down Payment"     value={`${fmtM(dp)} (${downPct}%)`} />
              <SumItem label="P&I Payment"      value={`${fmtM(pi)}/mo`} />
              <SumItem label="Total Interest"   value={fmtM(totalInterest)} cls="neg" />
              <SumItem label="Total Loan Cost"  value={fmtM(totalLoanCost)} />
              <SumItem label="Total Paid"       value={fmtM(totalPaid)} />
              <SumItem label="Payoff Date"      value={payoffDate} />
              <SumItem label="Monthly NOI"      value={`${fmtM(noi)}/mo`} cls={noi >= 0 ? 'pos' : 'neg'} />
            </div>
          </div>

          {/* Affordability insight */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Affordability Insight</h2>
              <span className={`badge ${dtiWarn ? 'badge-gold' : 'badge-green'}`}>28% Rule</span>
            </div>
            <div className="mc-afford-grid">
              <div className="mc-afford-item">
                <span>Required Monthly Income</span>
                <strong>{fmtM(reqMonthlyIncome)}</strong>
                <em>at 28% housing ratio</em>
              </div>
              <div className="mc-afford-item">
                <span>Required Annual Income</span>
                <strong>{fmtM(reqAnnualIncome)}</strong>
                <em>gross, before taxes</em>
              </div>
              <div className="mc-afford-item mc-afford-dti">
                <span>Payment-to-Income (Housing Ratio)</span>
                <div className="mc-dti-bar-wrap">
                  <div className="mc-dti-bar">
                    <div className="mc-dti-fill" style={{ width: '70%' }} />
                    <div className="mc-dti-marker" />
                  </div>
                  <div className="mc-dti-labels">
                    <span>0%</span>
                    <span className="mc-dti-guideline">← 28% guideline</span>
                    <span>40%</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={`mc-afford-rec ${dtiWarn ? 'mc-afford-rec--warn' : 'mc-afford-rec--ok'}`}>
              <span>{dtiWarn ? '⚠️' : '✓'}</span>
              <p>{affordRec}</p>
            </div>
          </div>

          {/* Investment score */}
          <div className="mc-invest-card">
            <div>
              <span className="mc-total-label">Investment Score</span>
              <strong className="mc-invest-score"
                style={{ color: invScore >= 75 ? 'var(--success)' : invScore >= 55 ? 'var(--blue-700)' : 'var(--danger)' }}>
                {invScore}
              </strong>
              <span className={`mc-risk mc-risk--${riskLevel.toLowerCase()}`}>{riskLevel} Risk</span>
            </div>
            <div className="mc-invest-metrics">
              <div>
                <span>Cash Flow</span>
                <strong className={cashFlow >= 0 ? 'pos' : 'neg'}>
                  {cashFlow >= 0 ? '+' : ''}{fmtM(cashFlow)}/mo
                </strong>
              </div>
              <div>
                <span>Cap Rate</span>
                <strong>{capRate.toFixed(1)}%</strong>
              </div>
              <div>
                <span>Cash-on-Cash</span>
                <strong>{cashOnCash.toFixed(1)}%</strong>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="card">
            <div className="card-header"><h2 className="card-title">Quick Actions</h2></div>
            <div className="mc-quick-actions">
              <button className="btn btn-ghost btn-full" onClick={() => navigate('/cash-flow')}>
                Send to Cash Flow Analyzer →
              </button>
              <button className="btn btn-primary btn-full" onClick={handleSave}>
                {saved ? '✓ Saved to Portfolio' : 'Save to Portfolio'}
              </button>
              <button className="btn btn-ghost btn-full" onClick={() => navigate('/advisor')}>
                Ask AI Advisor →
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* FULL WIDTH — Amortization */}
      <div className="section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Amortization Preview — First 12 Months</h2>
            <span className="badge badge-blue">Monthly Detail</span>
          </div>
          <div className="mc-table-wrap">
            <table className="mc-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Payment</th>
                  <th>Principal</th>
                  <th>Interest</th>
                  <th>Remaining Balance</th>
                </tr>
              </thead>
              <tbody>
                {amortMonthly.map((r, i) => (
                  <tr key={i}>
                    <td><strong>{r.label}</strong></td>
                    <td>{fmtM(r.payment)}</td>
                    <td className="pos">{fmtM(r.principal)}</td>
                    <td className="neg">{fmtM(r.interest)}</td>
                    <td>{fmtM(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mc-amort-note">
            Month 1 interest: <strong>{fmtM(amortMonthly[0]?.interest ?? 0)}</strong> ·
            Month 12 interest: <strong>{fmtM(amortMonthly[11]?.interest ?? amortMonthly[amortMonthly.length - 1]?.interest ?? 0)}</strong> ·
            Total over {term} years: <strong>{fmtM(totalInterest)}</strong> ·
            Payoff: <strong>{payoffDate}</strong>
          </p>
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <h2 className="card-title">Principal vs. Interest Over Time</h2>
            <span className="badge badge-teal">Year by Year</span>
          </div>
          <div className="mc-amort-bar-preview">
            <AmortBarChart bars={amortYearly} />
          </div>
        </div>
      </div>

    </div>
  );
}

/* ── Sub-components ────────────────────────────────── */
function SliderField({ label, value, display, min, max, step, onChange }) {
  return (
    <div className="mc-field">
      <div className="mc-field-hdr">
        <label>{label}</label>
        <span className="mc-val">{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)} className="mc-range" />
    </div>
  );
}

function SumItem({ label, value, cls }) {
  return (
    <div className="mc-sum-item">
      <span>{label}</span>
      <strong className={cls}>{value}</strong>
    </div>
  );
}

function DonutChart({ segments, total }) {
  const size = 140; const r = 54; const cx = 70; const cy = 70;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="18" />
      {segments.map(s => {
        const frac = s.value / total;
        const dash = frac * circ;
        const seg = (
          <circle key={s.label} cx={cx} cy={cy} r={r}
            fill="none" stroke={s.color} strokeWidth="18"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset + circ * 0.25}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        offset += dash;
        return seg;
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="600">Monthly</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="13" fill="#0a1628" fontWeight="900">P&I</text>
    </svg>
  );
}

function AmortBarChart({ bars }) {
  const maxVal = Math.max(...bars.map(b => b.int + b.prin));
  return (
    <div className="mc-amort-bars">
      {bars.map(b => (
        <div key={b.y} className="mc-amort-bar-col" title={`Year ${b.y}: $${Math.round(b.int).toLocaleString()} interest`}>
          <div className="mc-amort-bar">
            <div style={{ height: `${(b.int / maxVal) * 100}%`, background: '#fde68a' }} />
            <div style={{ height: `${(b.prin / maxVal) * 100}%`, background: '#2563eb' }} />
          </div>
          {b.y % 5 === 0 && <span>{b.y}</span>}
        </div>
      ))}
      <div className="mc-amort-legend">
        <span><em style={{ background: '#2563eb' }} /> Principal</span>
        <span><em style={{ background: '#fde68a' }} /> Interest</span>
      </div>
    </div>
  );
}
