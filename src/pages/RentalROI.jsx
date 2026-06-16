import { useState, useMemo } from 'react';
import './RentalROI.css';

const fmt  = n => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
const fmtM = n => '$' + fmt(Math.round(Math.abs(n))) + (n < 0 ? '' : '');
const fmtP = n => n.toFixed(2) + '%';

export default function RentalROI() {
  // Purchase
  const [price,    setPrice]   = useState(450000);
  const [downPct,  setDown]    = useState(25);
  const [rate,     setRate]    = useState(6.82);
  const [term,     setTerm]    = useState(30);
  const [closing,  setClosing] = useState(8500);

  // Income
  const [rent,     setRent]    = useState(2800);
  const [vacancy,  setVacancy] = useState(5);
  const [other,    setOther]   = useState(150);

  // Expenses
  const [propMgmt, setMgmt]    = useState(8);
  const [propTax,  setTax]     = useState(1.2);
  const [insurance,setIns]     = useState(1200);
  const [repairs,  setRep]     = useState(1);
  const [utilities,setUtil]    = useState(0);
  const [hoa,      setHoa]     = useState(0);

  const calc = useMemo(() => {
    const dp   = price * downPct / 100;
    const loan = price - dp;
    const mo   = rate / 100 / 12;
    const n    = term * 12;
    const mtg  = mo === 0 ? loan/n : loan * (mo * Math.pow(1+mo,n)) / (Math.pow(1+mo,n)-1);

    const grossRent    = rent * 12;
    const vacancyLoss  = grossRent * vacancy / 100;
    const effRent      = grossRent - vacancyLoss + other * 12;
    const mgmtCost     = effRent * propMgmt / 100;
    const taxCost      = price * propTax / 100;
    const insCost      = insurance;
    const repCost      = price * repairs / 100;
    const utilCost     = utilities * 12;
    const hoaCost      = hoa * 12;
    const totalExp     = mgmtCost + taxCost + insCost + repCost + utilCost + hoaCost;
    const noi          = effRent - totalExp;
    const debtService  = mtg * 12;
    const netCashFlow  = noi - debtService;
    const totalInvest  = dp + closing;
    const capRate      = (noi / price) * 100;
    const cashOnCash   = (netCashFlow / totalInvest) * 100;
    const grm          = price / grossRent;
    const dscr         = debtService > 0 ? noi / debtService : 0;

    return { dp, loan, mtg, grossRent, vacancyLoss, effRent, mgmtCost, taxCost, insCost, repCost,
      utilCost, hoaCost, totalExp, noi, debtService, netCashFlow, totalInvest, capRate, cashOnCash,
      grm, dscr, monthlyCF: netCashFlow / 12 };
  }, [price, downPct, rate, term, closing, rent, vacancy, other, propMgmt, propTax, insurance, repairs, utilities, hoa]);

  const scoreColor = calc.cashOnCash >= 8 ? 'var(--success)' : calc.cashOnCash >= 5 ? 'var(--blue-600)' : calc.cashOnCash >= 2 ? 'var(--gold)' : 'var(--danger)';
  const scoreLabel = calc.cashOnCash >= 8 ? 'Excellent' : calc.cashOnCash >= 5 ? 'Good' : calc.cashOnCash >= 2 ? 'Fair' : 'Poor';

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Rental ROI Calculator</h1>
        <p className="page-subtitle">Comprehensive rental property return analysis with NOI, cash-on-cash, cap rate, and DSCR.</p>
      </div>

      <div className="roi-layout">

        {/* Inputs column */}
        <div className="roi-inputs">
          <div className="card">
            <div className="card-header"><h2 className="card-title">Purchase Details</h2></div>
            <div className="roi-fields">
              {[
                { label:'Purchase Price', val: fmtM(price), min:50000, max:5000000, step:5000, v:price, set:setPrice },
                { label:`Down Payment (${downPct}% · ${fmtM(price*downPct/100)})`, val: downPct+'%', min:3, max:50, step:1, v:downPct, set:setDown },
                { label:`Interest Rate`, val: rate.toFixed(2)+'%', min:2, max:14, step:0.05, v:rate, set:setRate },
                { label:`Closing Costs`, val: fmtM(closing), min:0, max:50000, step:500, v:closing, set:setClosing },
              ].map(f => (
                <div key={f.label} className="roi-field">
                  <div className="roi-field-hdr"><label>{f.label}</label><span>{f.val}</span></div>
                  <input type="range" min={f.min} max={f.max} step={f.step} value={f.v}
                    onChange={e => f.set(+e.target.value)} className="roi-range"/>
                </div>
              ))}
              <div className="roi-field">
                <label className="roi-field-lbl">Loan Term</label>
                <div className="roi-term-btns">
                  {[15,20,25,30].map(y => (
                    <button key={y} className={`roi-term-btn${term===y?' active':''}`}
                      onClick={() => setTerm(y)}>{y}yr</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2 className="card-title">Rental Income</h2><span className="badge badge-green">Monthly</span></div>
            <div className="roi-fields">
              {[
                { label:'Monthly Rent',  val: fmtM(rent),       min:200,  max:20000, step:50,  v:rent,    set:setRent  },
                { label:`Vacancy Rate`, val: vacancy+'%',        min:0,    max:20,   step:0.5, v:vacancy, set:setVacancy },
                { label:'Other Income', val: fmtM(other)+'/mo', min:0,    max:2000, step:25,  v:other,   set:setOther  },
              ].map(f => (
                <div key={f.label} className="roi-field">
                  <div className="roi-field-hdr"><label>{f.label}</label><span>{f.val}</span></div>
                  <input type="range" min={f.min} max={f.max} step={f.step} value={f.v}
                    onChange={e => f.set(+e.target.value)} className="roi-range"/>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2 className="card-title">Operating Expenses</h2><span className="badge badge-red">Annual</span></div>
            <div className="roi-fields">
              {[
                { label:`Property Management (${propMgmt}%)`, val: fmtM(calc.mgmtCost)+'/yr', min:0, max:15, step:0.5, v:propMgmt, set:setMgmt },
                { label:`Property Tax (${propTax}%)`,         val: fmtM(calc.taxCost)+'/yr',  min:0.2, max:4, step:0.05, v:propTax,  set:setTax  },
                { label:'Insurance',                          val: fmtM(insurance)+'/yr',      min:400, max:8000, step:50, v:insurance, set:setIns },
                { label:`Repairs & Maint. (${repairs}%)`,    val: fmtM(calc.repCost)+'/yr',   min:0, max:5, step:0.1, v:repairs,  set:setRep  },
                { label:'Utilities (paid by owner)',         val: fmtM(utilities)+'/mo',       min:0, max:800, step:25, v:utilities, set:setUtil },
                { label:'HOA Fees',                          val: fmtM(hoa)+'/mo',             min:0, max:2000, step:25, v:hoa,      set:setHoa  },
              ].map(f => (
                <div key={f.label} className="roi-field">
                  <div className="roi-field-hdr"><label>{f.label}</label><span>{f.val}</span></div>
                  <input type="range" min={f.min} max={f.max} step={f.step} value={f.v}
                    onChange={e => f.set(+e.target.value)} className="roi-range"/>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results column */}
        <div className="roi-results">
          {/* Score card */}
          <div className="roi-score-card" style={{ '--score-color': scoreColor }}>
            <div className="roi-score-label">Cash-on-Cash Return</div>
            <div className="roi-score-big" style={{ color: scoreColor }}>{fmtP(calc.cashOnCash)}</div>
            <div className="roi-score-verdict" style={{ color: scoreColor, background: scoreColor + '18' }}>
              {scoreLabel} Investment
            </div>
            <div className="roi-score-submetrics">
              <div className="roi-sub"><span>Cap Rate</span><strong>{fmtP(calc.capRate)}</strong></div>
              <div className="roi-sub"><span>GRM</span><strong>{calc.grm.toFixed(1)}x</strong></div>
              <div className="roi-sub"><span>DSCR</span><strong style={{ color: calc.dscr >= 1.25 ? 'var(--success)' : 'var(--danger)' }}>{calc.dscr.toFixed(2)}</strong></div>
            </div>
          </div>

          {/* P&L breakdown */}
          <div className="card">
            <div className="card-header"><h2 className="card-title">Annual P&L Statement</h2></div>
            <div className="roi-pl">
              <div className="roi-pl-section">
                <div className="roi-pl-hdr">INCOME</div>
                <div className="roi-pl-row"><span>Gross Rent</span><strong className="pos">+{fmtM(calc.grossRent)}</strong></div>
                <div className="roi-pl-row neg-row"><span>Vacancy Loss</span><strong className="neg">-{fmtM(calc.vacancyLoss)}</strong></div>
                <div className="roi-pl-row"><span>Other Income</span><strong className="pos">+{fmtM(calc.other * 12)}</strong></div>
                <div className="roi-pl-total"><span>Effective Gross Income</span><strong>{fmtM(calc.effRent)}</strong></div>
              </div>
              <div className="roi-pl-section">
                <div className="roi-pl-hdr">OPERATING EXPENSES</div>
                {[
                  ['Property Mgmt',      calc.mgmtCost],
                  ['Property Tax',       calc.taxCost],
                  ['Insurance',          calc.insCost],
                  ['Repairs & Maint.',   calc.repCost],
                  ...(calc.utilCost ? [['Utilities', calc.utilCost]] : []),
                  ...(calc.hoaCost ? [['HOA',         calc.hoaCost]] : []),
                ].map(([label, val]) => (
                  <div key={label} className="roi-pl-row neg-row">
                    <span>{label}</span><strong className="neg">-{fmtM(val)}</strong>
                  </div>
                ))}
                <div className="roi-pl-total"><span>Total Expenses</span><strong className="neg">-{fmtM(calc.totalExp)}</strong></div>
              </div>
              <div className="roi-pl-noi">
                <span>Net Operating Income (NOI)</span>
                <strong className={calc.noi >= 0 ? 'pos' : 'neg'}>{calc.noi >= 0 ? '+' : '-'}{fmtM(calc.noi)}</strong>
              </div>
              <div className="roi-pl-row neg-row">
                <span>Annual Debt Service</span>
                <strong className="neg">-{fmtM(calc.debtService)}</strong>
              </div>
              <div className="roi-pl-cashflow">
                <span>Net Annual Cash Flow</span>
                <strong className={calc.netCashFlow >= 0 ? 'pos' : 'neg'}>
                  {calc.netCashFlow >= 0 ? '+' : ''}{fmtM(calc.netCashFlow)}
                </strong>
              </div>
              <div className="roi-monthly-cf" style={{ borderColor: calc.monthlyCF >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                <span>Monthly Cash Flow</span>
                <strong style={{ color: calc.monthlyCF >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {calc.monthlyCF >= 0 ? '+' : ''}{fmtM(calc.monthlyCF)}/month
                </strong>
              </div>
            </div>
          </div>

          {/* Investment summary */}
          <div className="card">
            <div className="card-header"><h2 className="card-title">Investment Summary</h2></div>
            <div className="roi-summary-grid">
              {[
                { label:'Total Investment',    val: fmtM(calc.totalInvest),    note:'Down + Closing' },
                { label:'Loan Amount',          val: fmtM(calc.loan),           note:'Financed' },
                { label:'Gross Rent (annual)', val: fmtM(calc.grossRent),      note:'Before vacancy' },
                { label:'Annual NOI',           val: fmtM(calc.noi),            note:'Before debt service' },
                { label:'Annual Cash Flow',     val: fmtM(calc.netCashFlow),    note:'After mortgage' },
                { label:'Cap Rate',             val: fmtP(calc.capRate),        note:'Market-standard metric' },
                { label:'Cash-on-Cash',         val: fmtP(calc.cashOnCash),     note:'ROI on invested cash' },
                { label:'Gross Rent Multiplier',val: calc.grm.toFixed(1)+'x',  note:'Price ÷ annual rent' },
                { label:'DSCR',                 val: calc.dscr.toFixed(2),      note:'≥1.25 = lender safe' },
                { label:'Monthly Mortgage',     val: fmtM(calc.mtg)+'/mo',     note:'P&I only' },
              ].map(item => (
                <div key={item.label} className="roi-sum-item">
                  <span>{item.label}</span>
                  <strong>{item.val}</strong>
                  <em>{item.note}</em>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
