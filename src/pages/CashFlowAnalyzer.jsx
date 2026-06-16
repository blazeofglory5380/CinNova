import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSelectedProperty, saveWorkflowAnalysis } from '../services/propertyWorkflow';
import { addToPortfolio } from '../services/propertyStorage';
import './CashFlowAnalyzer.css';

const fmtN = n => Math.abs(Math.round(n)).toLocaleString('en-US');
const fmtD = n => '$' + fmtN(n);
const parseN = v => { const n = parseFloat(String(v ?? '').replace(/[$,%\s,]/g, '')); return Number.isFinite(n) ? n : 0; };

const SCENARIOS  = ['Conservative', 'Base Case', 'Optimistic'];
const SCEN_MODS  = [
  { vacancy: +4, rentGrowth: -1, appRate: -2, expAdj: +0.05 },
  { vacancy:  0, rentGrowth:  0, appRate:  0, expAdj:  0    },
  { vacancy: -3, rentGrowth: +2, appRate: +2, expAdj: -0.03 },
];

function initForm() {
  const s     = getSelectedProperty();
  const price = s?.price || 500000;
  const isM   = s?.type === 'Multifamily';
  const units = s?.units || (isM ? 4 : 1);
  const rent  = s?.rent  || 3000;
  const uRent = units > 1 ? Math.round(rent / units) : rent;
  const loan  = price * 0.80;
  const mo    = 0.0675 / 12;
  const N     = 360;
  const estM  = Math.round(loan * (mo * Math.pow(1+mo,N)) / (Math.pow(1+mo,N)-1));
  return {
    unitRent:       String(uRent),
    units:          String(units),
    otherIncome:    '0',
    laundryIncome:  '0',
    parkingIncome:  '0',
    storageIncome:  '0',
    vacancyPct:     '6',
    managementPct:  '8',
    mortgage:       String(estM),
    taxes:          String(Math.max(150, Math.round(price * 0.012 / 12))),
    insurance:      String(Math.max(85,  Math.round(price * 0.004 / 12))),
    hoa:            '0',
    utilities:      '0',
    repairs:        String(Math.max(100, Math.round(rent * 0.06))),
    capitalReserves:String(Math.max(75,  Math.round(rent * 0.05))),
    landscaping:    '0',
    pestControl:    '0',
    otherExp:       '0',
    price:          String(price),
    downPct:        '20',
    rate:           '6.82',
  };
}

export default function CashFlowAnalyzer() {
  const navigate = useNavigate();
  const selected = getSelectedProperty();

  const [form,         setForm]   = useState(initForm);
  const [appreciation, setAppr]   = useState(4);
  const [rentGrowth,   setRentG]  = useState(3);
  const [horizon,      setHorizon]= useState(10);
  const [selScen,      setScen]   = useState(1);
  const [saved,        setSaved]  = useState(false);

  const upd = e => { setForm(p => ({ ...p, [e.target.name]: e.target.value })); setSaved(false); };
  const updN = name => e => setForm(p => ({ ...p, [name]: String(e.target.value) }));

  /* ── Parse form values ───────────────────── */
  const unitRent        = parseN(form.unitRent);
  const units           = Math.max(1, Math.round(parseN(form.units)));
  const totalRent       = unitRent * units;
  const otherIncome     = parseN(form.otherIncome);
  const laundryIncome   = parseN(form.laundryIncome);
  const parkingIncome   = parseN(form.parkingIncome);
  const storageIncome   = parseN(form.storageIncome);
  const grossIncome     = totalRent + otherIncome + laundryIncome + parkingIncome + storageIncome;
  const vacancyPct      = parseN(form.vacancyPct);
  const managementPct   = parseN(form.managementPct);
  const vacancyAmt      = grossIncome * (vacancyPct / 100);
  const effectiveIncome = grossIncome - vacancyAmt;
  const managementAmt   = effectiveIncome * (managementPct / 100);
  const mortgage        = parseN(form.mortgage);
  const taxes           = parseN(form.taxes);
  const insurance       = parseN(form.insurance);
  const hoa             = parseN(form.hoa);
  const utilities       = parseN(form.utilities);
  const repairs         = parseN(form.repairs);
  const capitalReserves = parseN(form.capitalReserves);
  const landscaping     = parseN(form.landscaping);
  const pestControl     = parseN(form.pestControl);
  const otherExp        = parseN(form.otherExp);
  const price_n         = parseN(form.price);

  const totalOpEx    = taxes + insurance + hoa + utilities + repairs + managementAmt + capitalReserves + landscaping + pestControl + otherExp;
  const totalExpenses = totalOpEx + mortgage;
  const noi          = effectiveIncome - totalOpEx;
  const cashFlow     = noi - mortgage;
  const annualCashFlow = cashFlow * 12;
  const annualNOI    = noi * 12;
  const expenseRatio = effectiveIncome > 0 ? (totalOpEx / effectiveIncome) * 100 : 0;
  const breakEvenOcc = grossIncome > 0 ? (totalExpenses / grossIncome) * 100 : 0;
  const dscr         = mortgage > 0 ? noi / mortgage : null;
  const cashFlowPerUnit = units > 1 ? cashFlow / units : null;
  const capRate      = price_n > 0 ? (annualNOI / price_n) * 100 : 0;

  const status = cashFlow >= 400
    ? { label: 'Strong Cash Flow',   badge: 'badge-green', cls: 'strong',   icon: '✓', detail: 'Positive cash flow with healthy margin above all expenses and debt service.' }
    : cashFlow >= 0
    ? { label: 'Tight Margin',       badge: 'badge-gold',  cls: 'tight',    icon: '⚠', detail: 'Covering expenses but limited buffer for vacancies, repairs, or rate changes.' }
    : { label: 'Negative Cash Flow', badge: 'badge-red',   cls: 'negative', icon: '✗', detail: 'Monthly expenses exceed income — requires rent increase, expense cuts, or refinancing.' };

  /* ── Recommendations ─────────────────────── */
  const recommendations = useMemo(() => {
    const recs = [];
    if (cashFlow < 0) {
      const gap = Math.abs(cashFlow);
      recs.push(`Negative cash flow of ${fmtD(gap)}/mo — raise rent by ${fmtD(gap)}/mo or cut operating expenses to break even. Start with repairs (${fmtD(repairs)}/mo) and management (${fmtD(managementAmt)}/mo).`);
    } else if (cashFlow < 300) {
      recs.push(`Thin cash flow of ${fmtD(cashFlow)}/mo. Aim to reduce operating expenses or renegotiate insurance — a 10% cut saves ${fmtD(Math.round(insurance * 0.1 * 12))}/yr.`);
    } else {
      recs.push(`Healthy cash flow of ${fmtD(cashFlow)}/mo. Consider directing ${fmtD(Math.round(cashFlow * 0.3))}/mo of surplus into a dedicated capital reserve fund to prevent deferred maintenance.`);
    }
    if (breakEvenOcc > 85) {
      recs.push(`Break-even occupancy of ${breakEvenOcc.toFixed(0)}% is high — one vacant month erases multiple months of positive cash flow. Prioritize tenant retention to minimize turnover costs.`);
    } else if (expenseRatio > 50) {
      recs.push(`Expense ratio of ${expenseRatio.toFixed(0)}% exceeds the 45% benchmark. Review utilities (${fmtD(utilities)}/mo), repairs (${fmtD(repairs)}/mo), and management (${fmtD(managementAmt)}/mo) for reduction opportunities.`);
    } else {
      recs.push(`Expense ratio of ${expenseRatio.toFixed(0)}% is within range. Keep capital reserves at least 5% of gross rent (${fmtD(Math.round(grossIncome * 0.05))}/mo) to cover long-term replacements like roof, HVAC, and appliances.`);
    }
    if (dscr !== null && dscr < 1.2) {
      recs.push(`DSCR of ${dscr.toFixed(2)} falls below the 1.25 lender threshold. Increasing rents or reducing non-debt expenses by ${fmtD(Math.max(0, Math.round(mortgage * 1.25 - noi)))}/mo would bring coverage to lender standards.`);
    } else if (units > 1) {
      const cfpu = cashFlowPerUnit ?? 0;
      recs.push(`With ${units} units, per-unit cash flow is ${fmtD(Math.abs(cfpu))}/mo ${cashFlow < 0 ? '(loss)' : '(profit)'}. A $100/mo improvement across all units adds ${fmtD(units * 100 * 12)}/yr to annual cash flow.`);
    } else {
      recs.push(`DSCR of ${dscr !== null ? dscr.toFixed(2) : '—'} meets lender standards. Review rent comps annually — a 3% annual increase on ${fmtD(totalRent)}/mo adds ${fmtD(Math.round(totalRent * 0.03 * 12))}/yr without added expenses.`);
    }
    return recs.slice(0, 3);
  }, [cashFlow, breakEvenOcc, expenseRatio, dscr, units, repairs, insurance, utilities, managementAmt, grossIncome, cashFlowPerUnit, mortgage, noi, totalRent, capitalReserves]);

  /* ── Long-term projection ────────────────── */
  const projections = useMemo(() => {
    const dp_n   = price_n * parseN(form.downPct) / 100;
    const loan   = price_n - dp_n;
    const rate_n = parseN(form.rate);
    const mo     = rate_n / 100 / 12;
    const N      = 360;
    const mtg    = mo === 0 ? loan/N : loan * (mo * Math.pow(1+mo,N)) / (Math.pow(1+mo,N)-1);
    const baseExpR = effectiveIncome > 0 ? totalOpEx / effectiveIncome : 0.35;
    const mod    = SCEN_MODS[selScen];
    const effVac = Math.max(0, vacancyPct + mod.vacancy);
    const effRG  = rentGrowth + mod.rentGrowth;
    const effApp = appreciation + mod.appRate;
    const effExpR= Math.min(0.8, Math.max(0.1, baseExpR + mod.expAdj));

    let balance = loan, cumCF = 0;
    const rows = [];
    for (let y = 1; y <= horizon; y++) {
      const yearGross = grossIncome * Math.pow(1 + effRG/100, y-1);
      const effRent   = yearGross * (1 - effVac/100);
      const opEx      = effRent * effExpR;
      const noi_y     = effRent - opEx;
      const debtSvc   = mtg * 12;
      const cf_y      = noi_y - debtSvc;
      const propVal   = price_n * Math.pow(1 + effApp/100, y);
      const approxInt = balance * rate_n / 100;
      balance = Math.max(0, balance - Math.max(0, debtSvc - approxInt));
      const equity    = propVal - balance;
      cumCF += cf_y;
      const roi = dp_n > 0 ? ((cumCF + propVal - price_n) / dp_n) * 100 : 0;
      rows.push({ y, cashFlow: cf_y, propValue: propVal, equity, noi: noi_y, cumCF, roi, effectiveRent: effRent, opExpenses: opEx });
    }
    return { rows, dp: dp_n };
  }, [price_n, form.downPct, form.rate, grossIncome, vacancyPct, effectiveIncome, totalOpEx, horizon, selScen, rentGrowth, appreciation]);

  const yr1       = projections.rows[0]  || {};
  const last      = projections.rows[projections.rows.length - 1] || {};
  const chartMax  = Math.max(1, ...projections.rows.map(r => r.propValue || 0));

  /* ── Save ────────────────────────────────── */
  const handleSave = () => {
    const prop  = selected || { address: 'Cash Flow Scenario', price: price_n, rent: totalRent };
    const score = Math.max(0, Math.min(100, Math.round(55 + cashFlow / 40 + (cashFlow > 0 ? 10 : -8))));
    saveWorkflowAnalysis(prop, {
      monthlyRent: totalRent, mortgage, propertyTax: taxes, insurance,
      expenses: totalOpEx, vacancy: vacancyPct, cashFlow, roi: last.roi || 0,
      score, downPayment: projections.dp,
    });
    addToPortfolio({
      id: selected?.id ?? Date.now(),
      address: selected?.address || 'Cash Flow Scenario',
      city: selected?.city || '',
      price: price_n,
      type: selected?.type || (units > 1 ? 'Multifamily' : 'Single Family'),
      beds: selected?.beds, baths: selected?.baths, sqft: selected?.sqft,
      rent: totalRent, cashFlow: Math.round(cashFlow),
      capRate: parseFloat(capRate.toFixed(1)),
      roi: parseFloat((last.roi || 0).toFixed(1)),
      score, equity: Math.round(projections.dp),
    });
    setSaved(true);
  };

  /* ── Render ──────────────────────────────── */
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Cash Flow Analyzer</h1>
        <p className="page-subtitle">
          Analyze rental income, itemized expenses, and net cash flow — then project returns over any time horizon.
        </p>
      </div>

      {!selected ? (
        <div className="cf-banner cf-banner--warn">
          <span>🏠</span>
          <span><strong>No property selected.</strong> Showing example data.{' '}
            <Link to="/property-search">Search for a property →</Link>
          </span>
        </div>
      ) : (
        <div className="cf-banner cf-banner--info">
          <span>📍</span>
          <div>
            <strong>{selected.fullAddress || selected.address}</strong>
            <span className="cf-banner-meta">
              ${selected.price?.toLocaleString()} · {selected.type}
              {selected.beds ? ` · ${selected.beds} bd` : ''}
              {selected.units > 1 ? ` · ${selected.units} units` : ''}
            </span>
          </div>
        </div>
      )}

      {/* ── Monthly Analysis ─────────────────── */}
      <div className="cf-layout">

        {/* LEFT — Inputs */}
        <div className="card cf-input-card">
          <div className="card-header">
            <h2 className="card-title">Income & Expenses</h2>
            <button className="btn btn-ghost btn-sm"
              onClick={() => { setForm(initForm()); setSaved(false); }}>
              Reset
            </button>
          </div>

          {/* Income */}
          <div className="cf-form-section">
            <CfSectionLabel icon="💵" title="Monthly Income" />
            <div className="form-grid">
              <CfField label={units > 1 ? 'Rent per Unit' : 'Monthly Rent'} name="unitRent" form={form} onChange={upd} prefix="$" />
              <div className="form-group">
                <label className="form-label">Number of Units</label>
                <input name="units" type="number" min="1" max="500" className="form-input"
                  value={form.units} onChange={upd} />
              </div>
              <CfField label="Other Income"   name="otherIncome"  form={form} onChange={upd} prefix="$" />
              <CfField label="Laundry Income" name="laundryIncome" form={form} onChange={upd} prefix="$" />
              <CfField label="Parking Income" name="parkingIncome" form={form} onChange={upd} prefix="$" />
              <CfField label="Storage Income" name="storageIncome" form={form} onChange={upd} prefix="$" />
            </div>
            {units > 1 && (
              <div className="cf-derived-row cf-derived-row--blue">
                <span>Total Monthly Rent ({units} units × {fmtD(unitRent)})</span>
                <strong>{fmtD(totalRent)}/mo</strong>
              </div>
            )}
            <div className="cf-derived-row">
              <span>Gross Monthly Income</span>
              <strong>{fmtD(grossIncome)}/mo</strong>
            </div>
          </div>

          {/* Income adjustments */}
          <div className="cf-form-section">
            <CfSectionLabel icon="📉" title="Income Adjustments" />
            <CfPctSlider label="Vacancy Rate" name="vacancyPct" form={form} onChange={updN}
              min={0} max={25} note={`${fmtD(vacancyAmt)}/mo loss`} />
            <CfPctSlider label="Property Management" name="managementPct" form={form} onChange={updN}
              min={0} max={20} note={`${fmtD(managementAmt)}/mo`} />
          </div>

          {/* Fixed expenses */}
          <div className="cf-form-section">
            <CfSectionLabel icon="📋" title="Monthly Expenses" />
            <div className="form-grid">
              <CfField label="Mortgage (P&I)"       name="mortgage"        form={form} onChange={upd} prefix="$" />
              <CfField label="Property Taxes"        name="taxes"           form={form} onChange={upd} prefix="$" />
              <CfField label="Insurance"             name="insurance"       form={form} onChange={upd} prefix="$" />
              <CfField label="HOA Fees"              name="hoa"             form={form} onChange={upd} prefix="$" />
              <CfField label="Utilities"             name="utilities"       form={form} onChange={upd} prefix="$" />
              <CfField label="Repairs & Maintenance" name="repairs"         form={form} onChange={upd} prefix="$" />
              <CfField label="Capital Reserves"      name="capitalReserves" form={form} onChange={upd} prefix="$" />
              <CfField label="Landscaping"           name="landscaping"     form={form} onChange={upd} prefix="$" />
              <CfField label="Pest Control"          name="pestControl"     form={form} onChange={upd} prefix="$" />
              <div className="form-group col-span-2">
                <label className="form-label">Other Expenses</label>
                <div className="cf-prefix-wrap">
                  <span className="cf-prefix">$</span>
                  <input name="otherExp" className="form-input cf-prefixed" value={form.otherExp} onChange={upd} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Results */}
        <div className="cf-results">

          {/* Status */}
          <div className={`cf-status-card cf-status--${status.cls}`}>
            <div className="cf-status-icon">{status.icon}</div>
            <div className="cf-status-body">
              <div className="cf-status-label">{status.label}</div>
              <div className="cf-status-detail">{status.detail}</div>
            </div>
            <span className={`badge ${status.badge}`} style={{ alignSelf: 'flex-start', flexShrink: 0 }}>
              {status.cls === 'strong' ? 'Investor Grade' : status.cls === 'tight' ? 'Caution' : 'Underperforming'}
            </span>
          </div>

          {/* Monthly income statement */}
          <div className="card">
            <div className="card-header"><h2 className="card-title">Monthly Income Statement</h2></div>
            <div className="cf-is-list">
              <CfRow label="Gross monthly income"     val={fmtD(grossIncome)} />
              <CfRow label={`Vacancy (${vacancyPct}%)`} val={`−${fmtD(vacancyAmt)}`} indent />
              <CfRow label="Effective gross income"   val={fmtD(effectiveIncome)} strong />
              <div className="cf-is-divider" />
              <CfRow label="Property taxes"           val={`−${fmtD(taxes)}`}         indent />
              <CfRow label="Insurance"                val={`−${fmtD(insurance)}`}      indent />
              {hoa > 0        && <CfRow label="HOA"             val={`−${fmtD(hoa)}`}       indent />}
              {utilities > 0  && <CfRow label="Utilities"       val={`−${fmtD(utilities)}`} indent />}
              <CfRow label="Repairs & maintenance"    val={`−${fmtD(repairs)}`}         indent />
              <CfRow label={`Management (${managementPct}%)`} val={`−${fmtD(managementAmt)}`} indent />
              <CfRow label="Capital reserves"         val={`−${fmtD(capitalReserves)}`} indent />
              {landscaping > 0 && <CfRow label="Landscaping"   val={`−${fmtD(landscaping)}`} indent />}
              {pestControl > 0 && <CfRow label="Pest control"   val={`−${fmtD(pestControl)}`} indent />}
              {otherExp > 0    && <CfRow label="Other expenses" val={`−${fmtD(otherExp)}`}    indent />}
              <CfRow label="Total operating expenses" val={`−${fmtD(totalOpEx)}`} strong />
              <div className="cf-is-divider" />
              <CfRow label="Net operating income (NOI)" val={noi >= 0 ? `+${fmtD(noi)}` : `−${fmtD(noi)}`}
                strong highlight={noi >= 0} negative={noi < 0} />
              <CfRow label="Mortgage (P&I)"           val={`−${fmtD(mortgage)}`} indent />
              <div className="cf-is-divider" />
              <CfRow
                label="Net monthly cash flow"
                val={cashFlow >= 0 ? `+${fmtD(cashFlow)}` : `−${fmtD(cashFlow)}`}
                strong highlight={cashFlow >= 0} negative={cashFlow < 0}
              />
              <CfRow
                label="Annual cash flow"
                val={annualCashFlow >= 0 ? `+${fmtD(annualCashFlow)}/yr` : `−${fmtD(annualCashFlow)}/yr`}
                strong highlight={annualCashFlow >= 0} negative={annualCashFlow < 0}
              />
            </div>
          </div>

          {/* Metrics grid */}
          <div className="cf-metrics-grid">
            <CfMetric label="Expense Ratio" value={`${expenseRatio.toFixed(1)}%`}
              sub="OpEx / effective income"
              tone={expenseRatio <= 45 ? 'green' : expenseRatio <= 55 ? 'gold' : 'red'} />
            <CfMetric label="Break-even Occ." value={`${breakEvenOcc.toFixed(1)}%`}
              sub="Min. occupancy to cover costs"
              tone={breakEvenOcc <= 80 ? 'green' : breakEvenOcc <= 90 ? 'gold' : 'red'} />
            <CfMetric label="Annual NOI" value={`$${fmtN(annualNOI)}`}
              sub="Net operating income / yr"
              tone={annualNOI >= 0 ? 'blue' : 'red'} />
            <CfMetric label="Cap Rate" value={`${capRate.toFixed(1)}%`}
              sub="NOI / purchase price"
              tone={capRate >= 6 ? 'green' : capRate >= 4 ? 'gold' : 'red'} />
            {dscr !== null
              ? <CfMetric label="DSCR" value={dscr.toFixed(2)}
                  sub="NOI / mortgage (1.25+ ideal)"
                  tone={dscr >= 1.25 ? 'green' : dscr >= 1.0 ? 'gold' : 'red'} />
              : <CfMetric label="Total Monthly Expenses" value={`$${fmtN(totalExpenses)}`}
                  sub="All costs incl. mortgage" tone="neutral" />
            }
            {cashFlowPerUnit !== null
              ? <CfMetric label={`CF / Unit (${units})`} value={`${cashFlowPerUnit >= 0 ? '+' : '−'}${fmtD(Math.abs(cashFlowPerUnit))}/mo`}
                  sub={`Across ${units} units`}
                  tone={cashFlowPerUnit >= 0 ? 'green' : 'red'} />
              : <CfMetric label="Annual Cash Flow" value={`${annualCashFlow >= 0 ? '+' : '−'}$${fmtN(Math.abs(annualCashFlow))}`}
                  sub="12 × monthly cash flow"
                  tone={annualCashFlow >= 0 ? 'green' : 'red'} />
            }
          </div>

          {/* Recommendations */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">AI Recommendations</h2>
              <span className="badge badge-blue">3 Actions</span>
            </div>
            <div className="cf-rec-list">
              {recommendations.map((rec, i) => (
                <div key={i} className="cf-rec-item">
                  <div className="cf-rec-num">{i + 1}</div>
                  <p className="cf-rec-text">{rec}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="card">
            <div className="card-header"><h2 className="card-title">Quick Actions</h2></div>
            <div className="cf-quick-actions">
              <button className="btn btn-ghost btn-full" onClick={() => navigate('/deal-analyzer')}>
                Send to Deal Analyzer →
              </button>
              <button className="btn btn-ghost btn-full" onClick={() => navigate('/mortgage-calc')}>
                Send to Mortgage Calculator →
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

      {/* ── Long-Term Projection ──────────────── */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Long-Term Projection</h2>
          <p className="cf-proj-sub">Uses current income/expense profile as Year 1 baseline.</p>
        </div>

        <div className="cf-proj-layout">

          {/* Projection settings */}
          <div className="card cf-proj-settings">
            <div className="card-header"><h2 className="card-title">Projection Settings</h2></div>
            <div className="cf-fields">
              {[
                { l: 'Purchase Price', name: 'price',   min: 50000, max: 3000000, step: 5000, disp: fmtD(price_n) },
                { l: 'Down Payment %', name: 'downPct', min: 3,     max: 50,      step: 1,    disp: form.downPct + '%' },
                { l: 'Interest Rate',  name: 'rate',    min: 2,     max: 14,      step: 0.05, disp: parseN(form.rate).toFixed(2) + '%' },
              ].map(f => (
                <div key={f.l} className="cf-field">
                  <div className="cf-field-hdr"><label>{f.l}</label><span>{f.disp}</span></div>
                  <input type="range" min={f.min} max={f.max} step={f.step}
                    value={parseN(form[f.name])} onChange={updN(f.name)} className="cf-range" />
                </div>
              ))}
              <div className="cf-field">
                <div className="cf-field-hdr"><label>Annual Appreciation</label><span>{appreciation}%/yr</span></div>
                <input type="range" min={0} max={15} step={0.5} value={appreciation}
                  onChange={e => setAppr(+e.target.value)} className="cf-range" />
              </div>
              <div className="cf-field">
                <div className="cf-field-hdr"><label>Rent Growth Rate</label><span>{rentGrowth}%/yr</span></div>
                <input type="range" min={0} max={10} step={0.5} value={rentGrowth}
                  onChange={e => setRentG(+e.target.value)} className="cf-range" />
              </div>
              <div className="cf-field">
                <div className="cf-field-hdr"><label>Projection Horizon</label><span>{horizon} years</span></div>
                <div className="cf-horizon-btns">
                  {[5, 10, 15, 20, 25, 30].map(y => (
                    <button key={y} className={`cf-hz-btn${horizon === y ? ' active' : ''}`}
                      onClick={() => setHorizon(y)}>{y}yr</button>
                  ))}
                </div>
              </div>
              <div className="cf-field">
                <div className="cf-field-hdr"><label>Scenario</label></div>
                <div className="cf-scenarios">
                  {SCENARIOS.map((s, i) => (
                    <button key={s}
                      className={`cf-scen-btn${selScen === i ? ' active' : ''}`}
                      style={selScen === i ? { background: i===0?'#dc2626':i===1?'#2563eb':'#059669', color:'white', borderColor:'transparent' } : {}}
                      onClick={() => setScen(i)}>
                      {s}
                    </button>
                  ))}
                </div>
                <p className="cf-scen-note">Adjusts vacancy, rent growth, appreciation, and expense assumptions.</p>
              </div>
            </div>
          </div>

          {/* Chart + table */}
          <div className="cf-proj-main">
            <div className="cf-kpis">
              {[
                { label: 'Year 1 Annual CF',             val: `${(yr1.cashFlow||0)>=0?'+':'−'}${fmtD(yr1.cashFlow||0)}`,   color: (yr1.cashFlow||0)>=0?'var(--success)':'var(--danger)', note: `${fmtD((yr1.cashFlow||0)/12)}/mo` },
                { label: `Yr ${horizon} Annual CF`,      val: `${(last.cashFlow||0)>=0?'+':'−'}${fmtD(last.cashFlow||0)}`, color: (last.cashFlow||0)>=0?'var(--success)':'var(--danger)', note: `${fmtD((last.cashFlow||0)/12)}/mo` },
                { label: `Yr ${horizon} Property Value`, val: `$${fmtN(last.propValue||0)}`,  color: 'var(--blue-700)', note: `+${appreciation}%/yr` },
                { label: `${horizon}-Yr Total ROI`,      val: `${(last.roi||0).toFixed(1)}%`, color: (last.roi||0)>=50?'var(--success)':'var(--gold)', note: 'On cash invested' },
              ].map(k => (
                <div key={k.label} className="cf-kpi">
                  <div className="cf-kpi-label">{k.label}</div>
                  <div className="cf-kpi-val" style={{ color: k.color }}>{k.val}</div>
                  <div className="cf-kpi-note">{k.note}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Property Value & Equity Growth</h2>
                <span className="badge badge-gold">{SCENARIOS[selScen]}</span>
              </div>
              <div className="cf-chart">
                <svg viewBox="0 0 560 160" width="100%" height="160" preserveAspectRatio="none">
                  {projections.rows.map((r, i) => {
                    if (i === 0) return null;
                    const total = projections.rows.length;
                    const x0 = ((i-1) / Math.max(1, total-1)) * 560;
                    const x1 = (i     / Math.max(1, total-1)) * 560;
                    const prev = projections.rows[i-1];
                    return (
                      <g key={i}>
                        <line x1={x0} y1={160-(prev.propValue/chartMax)*150} x2={x1} y2={160-(r.propValue/chartMax)*150} stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round"/>
                        <line x1={x0} y1={160-(Math.max(0,prev.equity)/chartMax)*150} x2={x1} y2={160-(Math.max(0,r.equity)/chartMax)*150} stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round"/>
                        <circle cx={x1} cy={160-(r.propValue/chartMax)*150} r="3" fill="#2563eb"/>
                        <circle cx={x1} cy={160-(Math.max(0,r.equity)/chartMax)*150} r="3" fill="#c9a84c"/>
                      </g>
                    );
                  })}
                </svg>
                <div className="cf-chart-legend">
                  <span><em style={{ background:'#2563eb' }}/> Property Value</span>
                  <span><em style={{ background:'#c9a84c' }}/> Equity</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h2 className="card-title">Year-by-Year Projection</h2></div>
              <div className="cf-table-wrap">
                <table className="cf-table">
                  <thead>
                    <tr>
                      <th>Year</th><th>Eff. Rent</th><th>Op. Expenses</th>
                      <th>Annual Cash Flow</th><th>Prop. Value</th><th>Equity</th><th>Total ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projections.rows.map(r => (
                      <tr key={r.y}>
                        <td><strong>Yr {r.y}</strong></td>
                        <td>${fmtN(r.effectiveRent)}</td>
                        <td className="neg">${fmtN(r.opExpenses)}</td>
                        <td className={r.cashFlow >= 0 ? 'pos' : 'neg'}>
                          {r.cashFlow >= 0 ? '+' : '−'}${fmtN(r.cashFlow)}
                        </td>
                        <td>${fmtN(r.propValue)}</td>
                        <td className="pos">${fmtN(r.equity)}</td>
                        <td className={r.roi >= 0 ? 'pos' : 'neg'}>{r.roi.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components (outside main to prevent remount) ── */
function CfSectionLabel({ icon, title }) {
  return (
    <div className="cf-section-label">
      <span>{icon}</span><span>{title}</span>
    </div>
  );
}

function CfField({ label, name, form, onChange, prefix }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className={prefix ? 'cf-prefix-wrap' : ''}>
        {prefix && <span className="cf-prefix">{prefix}</span>}
        <input name={name} className={`form-input${prefix ? ' cf-prefixed' : ''}`}
          value={form[name]} onChange={onChange} autoComplete="off" />
      </div>
    </div>
  );
}

function CfPctSlider({ label, name, form, onChange, min, max, note }) {
  const val = parseN(form[name]);
  return (
    <div className="cf-pct-field">
      <div className="cf-field-hdr">
        <label>{label}</label>
        <span>{val.toFixed(1)}%{note ? ` · ${note}` : ''}</span>
      </div>
      <input type="range" min={min} max={max} step={0.5} value={val}
        onChange={onChange(name)} className="cf-range" />
    </div>
  );
}

function CfRow({ label, val, strong, indent, highlight, negative }) {
  const cls = [
    'cf-is-row',
    strong   ? 'cf-is-row--strong'   : '',
    indent   ? 'cf-is-row--indent'   : '',
    highlight ? 'cf-is-row--highlight' : '',
    negative  ? 'cf-is-row--negative'  : '',
  ].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <span className="cf-is-label">{label}</span>
      <span className="cf-is-val">{val}</span>
    </div>
  );
}

function CfMetric({ label, value, sub, tone = 'neutral' }) {
  return (
    <div className={`cf-metric cf-metric--${tone}`}>
      <p className="cf-metric-label">{label}</p>
      <p className="cf-metric-value">{value}</p>
      {sub && <p className="cf-metric-sub">{sub}</p>}
    </div>
  );
}
