/* ── Helpers ────────────────────────────────────────────── */

function parsePrice(str) {
  if (!str) return 0;
  const n = parseFloat(String(str).replace(/[$,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

function parseSqft(str) {
  if (!str) return 0;
  const n = parseFloat(String(str).replace(/[,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

function fmt(n) {
  return '$' + Math.round(n).toLocaleString();
}

/* Standard mortgage payment formula: P × [r(1+r)^n] / [(1+r)^n − 1] */
function calcMortgage(principal, annualRate = 0.0682, years = 30) {
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return Math.round(principal / n);
  return Math.round(principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}

/* ── Main export ────────────────────────────────────────── */

export async function runAnalysis(form) {
  /* Simulate async AI processing */
  await new Promise(r => setTimeout(r, 1200));

  const price = parsePrice(form.price);
  const sqft  = parseSqft(form.sqft);
  const has$  = price > 0;

  /* ── Offer range: 94 % and 98 % of asking ── */
  const offerLow  = has$ ? price * 0.94 : null;
  const offerHigh = has$ ? price * 0.98 : null;

  /* ── ARV: rough +14 % appreciation after improvements ── */
  const arv = has$ ? price * 1.14 : null;

  /* ── Rehab: $20 – $38 per sqft; fixed fallback if sqft missing ── */
  const rehabLow  = sqft > 0 ? Math.round(sqft * 20) : 18_000;
  const rehabHigh = sqft > 0 ? Math.round(sqft * 38) : 35_000;

  /* ── Total Cost of Ownership ── */
  const downPct   = 0.20;
  const loanAmt   = has$ ? price * (1 - downPct) : 0;
  const mortgage  = has$ ? calcMortgage(loanAmt)                         : null;
  const propTax   = has$ ? Math.round(price * 0.012 / 12)                : null; // 1.2 % annual
  const insurance = has$ ? Math.max(75, Math.round(price * 0.005 / 12))  : null; // 0.5 % annual
  const hoa       = 0; // placeholder — user can refine later
  const monthly   = has$ ? (mortgage + propTax + insurance + hoa)        : null;

  return {
    /* ── Actual user input (shown verbatim in report) ── */
    address: form.address || 'Address not provided',
    price:   has$ ? fmt(price) : (form.price || 'Not entered'),
    beds:    form.beds  || '—',
    baths:   form.baths || '—',
    sqft:    form.sqft  || '—',
    type:    form.type  || 'single-family',

    /* ── AI scores (mock; ML pipeline coming soon) ── */
    dealScore:        88,
    opportunityScore: 91,
    riskLevel:        'Low',

    /* ── Computed offer range ── */
    offerLow:      offerLow  ? fmt(offerLow)  : '—',
    offerHigh:     offerHigh ? fmt(offerHigh) : '—',
    suggestedOffer: has$
      ? `${fmt(offerLow)} – ${fmt(offerHigh)}`
      : 'Enter asking price for estimate',

    /* ── Other estimates ── */
    rehabCost: `${fmt(rehabLow)} – ${fmt(rehabHigh)}`,
    arv:       arv ? fmt(arv) : 'N/A',
    capRate:   '7.2%',
    cashFlow:  '$1,850 / mo',
    programs:  3,

    /* ── TCO ── */
    tco: {
      mortgage:    mortgage   ? fmt(mortgage)        : '—',
      propTax:     propTax    ? fmt(propTax)         : '—',
      insurance:   insurance  ? fmt(insurance)       : '—',
      hoa:         fmt(hoa),
      total:       monthly    ? fmt(monthly)         : '—',
      downPayment: has$       ? fmt(price * downPct) : '—',
      note: has$
        ? `20% down (${fmt(price * downPct)}) · 6.82% fixed · 30-year term`
        : 'Enter an asking price to see monthly cost estimates',
    },

    actions: [
      'Order a professional home inspection within 10 days',
      'Consult with a real estate attorney on the purchase agreement',
      'Apply for FHA 203(k) loan if renovation is planned',
      'Request seller disclosure statements for full transparency',
      'Verify zoning compliance and any HOA regulations',
    ],
    comingSoon: [
      'Automated Comp Analysis',
      'Cash Flow Projections',
      'Neighborhood Trends',
      'Rental Income Estimate',
      'Tax Assessment History',
      'School District Ratings',
    ],
  };
}
