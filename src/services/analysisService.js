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

/* ── Type metadata ──────────────────────────────────────── */

const TYPE_RENT_MULT = {
  'single-family': 0.0058,
  condo:           0.0050,
  multifamily:     0.0088,
  commercial:      0.0070,
  land:            0,
};

const TYPE_PPSF_AVG = {
  'single-family': 220,
  condo:           310,
  multifamily:     175,
  commercial:      155,
  land:            20,
};

const TYPE_SCORE_DELTA = {
  'single-family': 0,
  condo:           -3,
  multifamily:     8,
  commercial:      4,
  land:            -10,
};

/* ── Main export ────────────────────────────────────────── */

export async function runAnalysis(form) {
  await new Promise(r => setTimeout(r, 1200));

  const price = parsePrice(form.price);
  const sqft  = parseSqft(form.sqft);
  const has$  = price > 0;
  const type  = form.type || 'single-family';

  /* ── Offer range ── */
  const offerLow  = has$ ? price * 0.94 : null;
  const offerHigh = has$ ? price * 0.98 : null;
  const arv       = has$ ? price * 1.14 : null;

  /* ── Rehab estimate ── */
  const rehabLow  = sqft > 0 ? Math.round(sqft * 20) : 18_000;
  const rehabHigh = sqft > 0 ? Math.round(sqft * 38) : 35_000;
  const rehabMid  = (rehabLow + rehabHigh) / 2;

  /* ── Rental potential (50% rule) ── */
  const rentMult       = TYPE_RENT_MULT[type] ?? 0.0058;
  const estMonthlyRent = has$ ? Math.round(price * rentMult) : 0;
  const estAnnualRent  = estMonthlyRent * 12;
  const noi            = estAnnualRent * 0.50;
  const capRateNum     = has$ && estMonthlyRent > 0 ? (noi / price) * 100 : 0;
  const mortgageAmt    = has$ ? calcMortgage(price * 0.80) : 0;
  const cashFlowNum    = has$ && estMonthlyRent > 0
    ? Math.round(estMonthlyRent * 0.50 - mortgageAmt)
    : 0;

  /* ── Price per sqft ── */
  const ppsfActual = sqft > 0 && has$ ? Math.round(price / sqft) : 0;
  const ppsfMarket = TYPE_PPSF_AVG[type] ?? 220;
  const ppsfDiff   = ppsfActual > 0 ? ((ppsfActual - ppsfMarket) / ppsfMarket) * 100 : 0;

  /* ── Dynamic scores ── */
  const capBonus  = capRateNum > 0 ? Math.min(12, Math.max(-12, (capRateNum - 6) * 2.5)) : 0;
  const ppsfBonus = ppsfDiff < -8 ? 5 : ppsfDiff > 8 ? -5 : 0;
  const typeDelta = TYPE_SCORE_DELTA[type] ?? 0;
  const dealScore = Math.round(Math.min(97, Math.max(52, 76 + typeDelta + capBonus + ppsfBonus)));
  const oppScore  = Math.round(Math.min(97, Math.max(52, dealScore + (capRateNum > 7 ? 6 : capRateNum > 5 ? 2 : -4))));
  const riskLevel = dealScore >= 80 ? 'Low' : dealScore >= 68 ? 'Moderate' : 'High';

  /* ── Valuation label ── */
  const valuationLabel = ppsfDiff < -8 ? 'Undervalued' : ppsfDiff > 8 ? 'Overpriced' : 'Fair Value';
  const valuationColor = ppsfDiff < -8 ? 'green'       : ppsfDiff > 8 ? 'red'        : 'blue';

  /* ── Verdict ── */
  const verdictLabel   = dealScore >= 82 ? 'Strong Buy' : dealScore >= 72 ? 'Buy' : dealScore >= 62 ? 'Consider' : 'Pass';
  const verdictColor   = dealScore >= 82 ? 'green'      : dealScore >= 72 ? 'blue' : dealScore >= 62 ? 'gold'    : 'red';
  const verdictSummary = dealScore >= 82
    ? 'This property presents an exceptional opportunity with strong fundamentals and favorable risk-adjusted returns.'
    : dealScore >= 72
    ? 'Solid deal with good cash flow potential. Minor concerns are manageable with proper due diligence.'
    : dealScore >= 62
    ? 'Borderline opportunity. Proceed with caution and negotiate aggressively on price before committing.'
    : 'This property does not meet minimum investment criteria at the current asking price.';
  const verdictReasons = dealScore >= 72
    ? [
        capRateNum > 0 ? `${capRateNum.toFixed(1)}% estimated cap rate` : `Strong ${type.replace('-', ' ')} asset class`,
        has$ ? `Offer range ${fmt(offerLow)} – ${fmt(offerHigh)} leaves room to negotiate` : 'Opportunity to negotiate on price',
        arv ? `$${Math.round(arv - price).toLocaleString()} appreciation upside (ARV: ${fmt(arv)})` : 'Strong hold potential in current market',
      ]
    : [
        ppsfDiff > 8 ? `Asking price is ${Math.abs(ppsfDiff).toFixed(0)}% above market per-sqft` : 'Fundamentals are weak at current price',
        capRateNum < 5 && capRateNum > 0 ? `${capRateNum.toFixed(1)}% cap rate is below the 5% threshold` : 'Insufficient cash flow data to assess',
        'Consider waiting for a price reduction or exploring alternative properties',
      ];

  /* ── Risk breakdown ── */
  const riskBreakdown = [
    {
      factor: 'Market Liquidity',
      level:  ['multifamily', 'commercial', 'land'].includes(type) ? 'Moderate' : 'Low',
      note:   type === 'land'        ? 'Limited buyer pool and extended hold periods typical'
             : type === 'commercial' ? 'Commercial assets require longer to liquidate'
             :                        'Highly liquid market with strong buyer demand',
    },
    {
      factor: 'Cash Flow Stability',
      level:  capRateNum >= 7 ? 'Low' : capRateNum >= 5 ? 'Moderate' : 'High',
      note:   capRateNum >= 7 ? `Strong ${capRateNum.toFixed(1)}% cap rate provides buffer against vacancies`
             : capRateNum >= 5 ? `${capRateNum.toFixed(1)}% cap rate covers expenses with a thin margin`
             :                   'Low or unknown cap rate — verify rental income assumptions',
    },
    {
      factor: 'Financing Risk',
      level:  price >= 1_000_000 ? 'High' : price >= 600_000 ? 'Moderate' : has$ ? 'Low' : 'Unknown',
      note:   price >= 1_000_000 ? 'Jumbo loan territory — fewer lenders and higher rates apply'
             : price >= 600_000  ? 'Near or above conforming loan limit in most markets'
             : has$               ? 'Conforming loan eligible — strong lender competition expected'
             :                     'Enter asking price to assess financing risk',
    },
    {
      factor: 'Renovation Exposure',
      level:  rehabLow > 50_000 ? 'High' : rehabLow > 25_000 ? 'Moderate' : 'Low',
      note:   `Estimated rehab: ${fmt(rehabLow)} – ${fmt(rehabHigh)}. Inspect electrical, plumbing, and roof.`,
    },
    {
      factor: 'Valuation Risk',
      level:  ppsfActual > 0 ? (ppsfDiff > 15 ? 'High' : ppsfDiff > 5 ? 'Moderate' : 'Low') : 'Unknown',
      note:   ppsfActual > 0
        ? `$${ppsfActual}/sqft vs. $${ppsfMarket}/sqft market avg — ${valuationLabel.toLowerCase()}`
        : 'Enter price and square footage for a valuation comparison',
    },
  ];

  /* ── Renovation opportunity ── */
  const renovPotential = arv ? Math.round(arv - price) : null;
  const renovROI       = renovPotential && rehabMid > 0 ? Math.round((renovPotential / rehabMid) * 100) : null;
  const renovRating    = renovPotential
    ? (renovPotential > 80_000 ? 'High' : renovPotential > 40_000 ? 'Moderate' : 'Low')
    : 'Low';

  /* ── Total Cost of Ownership ── */
  const downPct   = 0.20;
  const loanAmt   = has$ ? price * (1 - downPct) : 0;
  const mortgage  = has$ ? calcMortgage(loanAmt) : null;
  const propTax   = has$ ? Math.round(price * 0.012 / 12) : null;
  const insurance = has$ ? Math.max(75, Math.round(price * 0.005 / 12)) : null;
  const hoa       = 0;
  const monthly   = has$ ? (mortgage + propTax + insurance + hoa) : null;

  return {
    /* ── Input echo ─────────────────────────────── */
    address:  form.address || 'Address not provided',
    price:    has$ ? fmt(price) : (form.price || 'Not entered'),
    priceNum: price,
    beds:     form.beds  || '—',
    baths:    form.baths || '—',
    sqft:     form.sqft  || '—',
    type:     form.type  || 'single-family',

    /* ── Scores ──────────────────────────────────── */
    dealScore,
    opportunityScore: oppScore,
    riskLevel,
    dealSublabel: dealScore >= 85 ? 'Excellent' : dealScore >= 75 ? 'Good' : dealScore >= 65 ? 'Fair' : 'Below Avg',
    oppSublabel:  oppScore  >= 85 ? 'High'      : oppScore  >= 75 ? 'Good' : 'Average',

    /* ── Investment verdict ───────────────────────── */
    verdict: { label: verdictLabel, color: verdictColor, summary: verdictSummary, reasons: verdictReasons },

    /* ── Risk breakdown ──────────────────────────── */
    riskBreakdown,

    /* ── Comparable market estimate ──────────────── */
    comps: has$ ? {
      estimatedValue: fmt(price * 0.99),
      rangeLow:       fmt(price * 0.92),
      rangeHigh:      fmt(price * 1.06),
      ppsfActual:     ppsfActual > 0 ? `$${ppsfActual}/sqft` : '—',
      ppsfMarket:     `$${ppsfMarket}/sqft (market avg)`,
      valuationLabel,
      valuationColor,
      marketTrend: ['multifamily', 'commercial'].includes(type) ? 'Appreciating' : type === 'land' ? 'Stable' : 'Appreciating',
    } : null,

    /* ── Renovation opportunity ───────────────────── */
    renovation: {
      potential:  renovPotential ? fmt(renovPotential) : '—',
      rehabRange: `${fmt(rehabLow)} – ${fmt(rehabHigh)}`,
      arv:        arv ? fmt(arv) : '—',
      roi:        renovROI ? `${renovROI}%` : '—',
      rating:     renovRating,
    },

    /* ── Rental potential ────────────────────────── */
    rental: estMonthlyRent > 0 ? {
      monthlyRent:  fmt(estMonthlyRent),
      annualRent:   fmt(estAnnualRent),
      capRate:      `${capRateNum.toFixed(1)}%`,
      cashFlow:     cashFlowNum >= 0 ? `+${fmt(cashFlowNum)}/mo` : `−${fmt(Math.abs(cashFlowNum))}/mo`,
      cashFlowNum,
      yieldLabel:   capRateNum >= 7 ? 'High Yield' : capRateNum >= 5 ? 'Market Rate' : 'Below Average',
    } : null,

    /* ── Offer range ─────────────────────────────── */
    offerLow:      offerLow  ? fmt(offerLow)  : '—',
    offerHigh:     offerHigh ? fmt(offerHigh) : '—',
    suggestedOffer: has$ ? `${fmt(offerLow)} – ${fmt(offerHigh)}` : 'Enter asking price for estimate',

    /* ── Legacy fields (backward compat) ─────────── */
    rehabCost:  `${fmt(rehabLow)} – ${fmt(rehabHigh)}`,
    arv:        arv ? fmt(arv) : 'N/A',
    capRate:    capRateNum > 0 ? `${capRateNum.toFixed(1)}%` : '—',
    capRateNum,
    cashFlow:   cashFlowNum !== 0
      ? (cashFlowNum >= 0 ? `+${fmt(cashFlowNum)} / mo` : `${fmt(cashFlowNum)} / mo`)
      : '—',
    programs: 3,

    /* ── TCO ─────────────────────────────────────── */
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

    /* ── Recommended actions ─────────────────────── */
    actions: [
      'Order a professional home inspection within 10 days',
      'Consult with a real estate attorney on the purchase agreement',
      capRateNum >= 6
        ? 'Review rental comps within 0.5 miles to validate income assumptions'
        : 'Apply for FHA 203(k) loan if renovation is planned',
      'Request seller disclosure statements for full transparency',
      'Verify zoning compliance and any HOA restrictions',
    ],
  };
}
