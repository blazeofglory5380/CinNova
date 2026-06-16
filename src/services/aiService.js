/* ── aiService.js ────────────────────────────────────────────────────────
   Rule-based AI response engine with provider-ready structure.
   Active provider: 'local' (rule-based fallback).
   To activate a real provider, implement its entry in PROVIDERS and set
   ACTIVE_PROVIDER to its key.
──────────────────────────────────────────────────────────────────────── */

/* ── Formatting helpers ──────────────────────────────────────────────── */
export const fmtM = n => '$' + Math.round(Math.abs(n)).toLocaleString();
export const fmtP = n => (typeof n === 'number' ? n.toFixed(1) : '0.0') + '%';
export const sgn  = n => (n >= 0 ? '+' : '−');
export const fmtN = n => (n ? '$' + Math.round(n).toLocaleString() : '—');

/* ── localStorage helpers ────────────────────────────────────────────── */
export function getSavedDocs() {
  try { return JSON.parse(localStorage.getItem('cinnova_documents') || '[]'); }
  catch { return []; }
}

export function getNegotiationResult() {
  try { return JSON.parse(localStorage.getItem('cinnova_negotiation_result') || 'null'); }
  catch { return null; }
}

/* ── Response block builders (internal) ─────────────────────────────── */

function documentRisksResponse(docs) {
  if (!docs || docs.length === 0) {
    return [
      { type: 'text', text: 'No saved documents found. Save a document in the Document Center first, then I can review its risk flags, missing items, and action steps here.' },
      { type: 'action', text: 'Open Document Center →', route: '/document-center' },
    ];
  }

  const latest   = docs[0];
  const analysis = latest.analysisSnapshot;

  if (!analysis) {
    return [
      { type: 'text', text: `Found ${docs.length} saved document${docs.length > 1 ? 's' : ''} but no analysis snapshot is attached. Re-open and save the document from the Document Center to attach the analysis.` },
      { type: 'action', text: 'Open Document Center →', route: '/document-center' },
    ];
  }

  const highRisks  = analysis.riskFlags?.filter(r => r.severity === 'high')  || [];
  const medRisks   = analysis.riskFlags?.filter(r => r.severity === 'medium') || [];
  const totalRisks = analysis.riskFlags?.length || 0;

  const blocks = [
    { type: 'text', text: `Reviewing "${latest.name}" — your most recently saved ${latest.typeLabel}.${latest.isDemo ? ' Note: template analysis was used since the file contents were not parsed.' : ''}` },
    { type: 'heading', text: `Status: ${analysis.status} · ${totalRisks} Risk Flag${totalRisks !== 1 ? 's' : ''}` },
  ];

  if (highRisks.length > 0) {
    blocks.push({ type: 'heading', text: `🔴 High Priority (${highRisks.length})` });
    blocks.push({ type: 'bullets', items: highRisks.map(r => r.text) });
  }
  if (medRisks.length > 0) {
    blocks.push({ type: 'heading', text: `🟡 Moderate Concerns (${medRisks.length})` });
    blocks.push({ type: 'bullets', items: medRisks.slice(0, 3).map(r => r.text) });
  }
  if (analysis.missingItems?.length > 0) {
    blocks.push({ type: 'heading', text: 'Missing Items to Resolve' });
    blocks.push({ type: 'bullets', items: analysis.missingItems.slice(0, 4) });
  }
  if (analysis.aiSummary) {
    blocks.push({ type: 'text', text: analysis.aiSummary });
  }
  if (analysis.nextSteps?.length > 0) {
    blocks.push({ type: 'heading', text: 'Priority Next Steps' });
    blocks.push({ type: 'bullets', items: analysis.nextSteps.slice(0, 3) });
  }
  if (docs.length > 1) {
    blocks.push({ type: 'text', text: `You have ${docs.length} saved documents total. Ask "review my inspection report" (or any document type) to focus on a specific one.` });
  }
  blocks.push({ type: 'action', text: 'Open Document Center →', route: '/document-center' });

  return blocks;
}

function negotiationResultResponse(negResult, prop) {
  if (!negResult) {
    return [
      { type: 'text', text: 'No negotiation result found. Run the Negotiation Center on a deal, then click "Send Results to AI Advisor" to get my analysis here.' },
      { type: 'action', text: 'Open Negotiation Center →', route: '/negotiation' },
    ];
  }

  const {
    strength = 0, mode, property: negProp,
    offerPrice, suggestedNextOffer, risks, concessions, advice, createdAt,
  } = negResult;

  const strengthLevel = strength >= 70 ? 'Strong' : strength >= 50 ? 'Moderate' : 'Weak';
  const strengthColor = strength >= 70 ? 'green'  : strength >= 50 ? 'gold'     : 'red';
  const propLabel     = negProp || (prop ? (prop.address || prop.fullAddress) : 'the property');
  const dateLine      = createdAt
    ? ` (sent ${new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
    : '';

  const blocks = [
    { type: 'text', text: `Here's my read on your ${mode || 'Buyer'} negotiation for ${propLabel}${dateLine}:` },
    { type: 'verdict', label: `${mode || 'Buyer'} Strength: ${strengthLevel} · ${strength}/100`, color: strengthColor },
    { type: 'heading', text: 'Position Summary' },
    { type: 'bullets', items: [
      offerPrice         ? `Current offer: ${fmtN(offerPrice)}`                : null,
      suggestedNextOffer ? `Suggested next move: ${fmtN(suggestedNextOffer)}`  : null,
      strength >= 70
        ? `At ${strength}/100 you hold clear leverage — don't over-negotiate; closing on your terms is worth more than squeezing the last dollar.`
        : strength >= 50
        ? `At ${strength}/100 this is balanced. Inspection contingencies, closing timeline, and seller concessions can tip it your way.`
        : `At ${strength}/100 the other side holds more leverage. Improve your offer terms or walk if the gap won't close.`,
    ].filter(Boolean) },
  ];

  if (risks?.length > 0) {
    blocks.push({ type: 'heading', text: 'Risk Factors' });
    blocks.push({ type: 'bullets', items: risks.slice(0, 3) });
  }
  if (concessions?.length > 0) {
    blocks.push({ type: 'heading', text: 'Recommended Concessions' });
    blocks.push({ type: 'bullets', items: concessions.slice(0, 3) });
  }
  if (advice?.length > 0) {
    blocks.push({ type: 'heading', text: 'Negotiation Advice' });
    blocks.push({ type: 'bullets', items: advice.slice(0, 3) });
  }
  blocks.push({
    type: 'text',
    text: suggestedNextOffer
      ? `If you make a move, I'd target ${fmtN(suggestedNextOffer)} as your next offer — advances the deal without signaling desperation.`
      : 'Run the Negotiation Center with updated terms to get a fresh strength score and offer strategy.',
  });
  blocks.push({ type: 'action', text: 'Back to Negotiation Center →', route: '/negotiation' });

  return blocks;
}

function buyResponse(addr, price, rent, cashFlow, capRate, score, roi, type, port) {
  const verdict = score >= 78 ? 'Strong Buy' : score >= 60 ? 'Proceed with Caution' : 'Pass on This Deal';
  const color   = score >= 78 ? 'green'      : score >= 60 ? 'gold'                 : 'red';

  const strengths = [];
  const risks     = [];

  if (capRate >= 6)    strengths.push(`Strong cap rate of ${fmtP(capRate)} — exceeds the 5% investor benchmark, indicating solid income relative to purchase price.`);
  else if (capRate >= 4) strengths.push(`Cap rate of ${fmtP(capRate)} is acceptable in appreciation-driven markets, though income coverage is thin.`);
  if (cashFlow > 200)  strengths.push(`Positive cash flow of ${fmtM(cashFlow)}/mo provides a real buffer for vacancies, maintenance, and rate changes.`);
  if (roi > 8)         strengths.push(`Projected ROI of ${fmtP(roi)} outpaces most fixed-income alternatives at current rates.`);
  if (score >= 70)     strengths.push(`AI deal score of ${score}/100 reflects strong fundamentals across income, debt coverage, and equity spread.`);
  if (price < 400000)  strengths.push(`Price point of ${fmtM(price)} limits concentrated capital-at-risk for a single asset.`);
  if (strengths.length < 2) strengths.push(`${type} properties have broad rental demand and historically stable vacancy rates.`);

  if (cashFlow < 0)    risks.push(`Negative cash flow of ${fmtM(Math.abs(cashFlow))}/mo requires ongoing out-of-pocket contributions — build a 6-month reserve before closing.`);
  if (capRate < 4)     risks.push(`Cap rate below 4% makes this an appreciation play, not an income play. Ensure you have conviction on neighborhood trajectory.`);
  if (score < 55)      risks.push(`AI score of ${score}/100 reflects multiple metrics below investment thresholds — run the Deal Analyzer before proceeding.`);
  if (rent === 0)      risks.push(`No rent estimate on file — verify current market rents with at least 3 nearby comparable leases before financing.`);
  if (risks.length < 2) {
    risks.push(`Vacancy periods are the most common source of cash flow disruption — verify local occupancy rates before finalizing assumptions.`);
    risks.push(`Interest rate risk: confirm financing terms are locked, especially if this is a value-add play with a timeline longer than 12 months.`);
  }

  const portNote = port
    ? ` Compared to your ${port.count}-property portfolio (avg cap rate ${fmtP(port.avgCap)}, avg AI score ${Math.round(port.avgScore)}), this deal ${capRate > port.avgCap ? 'improves your portfolio yield' : 'is below your current portfolio average — factor that into sizing'}.`
    : '';

  return [
    { type: 'text', text: `I've analyzed the numbers on ${addr} at ${fmtM(price)}.${portNote}` },
    { type: 'verdict', label: verdict, color },
    { type: 'heading', text: 'What Works' },
    { type: 'bullets', items: strengths.slice(0, 3) },
    { type: 'heading', text: 'Key Risks' },
    { type: 'bullets', items: risks.slice(0, 3) },
    { type: 'text', text: score >= 78
      ? 'Bottom line: the fundamentals support moving forward. Order an inspection, get 3 rent comps, and lock in financing within the next 30 days if the inspection is clean.'
      : score >= 60
      ? 'Bottom line: negotiate the price down or improve the income story before committing. A 5–8% price reduction could move this from marginal to strong.'
      : 'Bottom line: the current numbers don\'t justify the risk. Either negotiate to a significantly lower price or focus on a different opportunity.' },
    { type: 'action', text: 'Open Deal Analyzer →', route: '/deal-analyzer' },
  ];
}

function cashFlowResponse(addr, price, rent, cashFlow, capRate, score, type) {
  const mgmtSavings  = Math.round(rent * 0.08);
  const rentIncrease = Math.max(50, Math.round(Math.abs(cashFlow) * 1.2));
  const refiBenefit  = Math.round(price * 0.80 * 0.005);

  return [
    { type: 'text', text: `Current cash flow on ${addr} is ${sgn(cashFlow)}${fmtM(cashFlow)}/mo. Here are the highest-leverage improvement strategies:` },
    { type: 'heading', text: 'Income-Side Improvements' },
    { type: 'bullets', items: [
      `Raise rent to market rate — verify 3 recent comparable leases within 0.5 miles. Even a ${fmtM(rentIncrease)}/mo increase covers ${Math.abs(cashFlow) < rentIncrease ? 'the entire current shortfall' : 'most of the gap'}.`,
      rent > 0 ? `Add ancillary income: storage ($50–100/mo), parking ($75–150/mo), or laundry ($40–80/mo) can add $165–330/mo without tenant turnover.` : 'Establish a rent baseline — pull current market comps before finalizing any purchase assumptions.',
      `Consider a short-term rental strategy (Airbnb) for ${type === 'Single Family' ? 'single-family properties' : 'this property type'} if local regulations permit — can increase gross income by 40–80%.`,
    ]},
    { type: 'heading', text: 'Expense-Side Reductions' },
    { type: 'bullets', items: [
      `Property management at 8% typically costs ${fmtM(mgmtSavings)}/mo — self-management (if local) recaptures ${fmtM(mgmtSavings * 12)}/yr in annual cash flow.`,
      'Shop homeowner\'s insurance annually — most landlords overpay 15–25% on year-2+ renewals. Savings of $50–100/mo are common.',
      'Review HOA, utilities, and other line items for renegotiation. Even a 10% reduction in operating costs is additive dollar-for-dollar to NOI.',
    ]},
    { type: 'heading', text: 'Financing Optimization' },
    { type: 'bullets', items: [
      `A 0.5% interest rate reduction on an 80% LTV loan on ${fmtM(price)} saves approximately ${fmtM(refiBenefit)}/mo — worth shopping 3+ lenders.`,
      'Extending to a 30-year term (if shorter) reduces monthly debt service at the cost of more total interest. Use the Mortgage Calculator to model the trade-off.',
    ]},
    { type: 'action', text: 'Open Cash Flow Analyzer →', route: '/cash-flow' },
  ];
}

function riskResponse(addr, price, rent, cashFlow, capRate, score, type, port) {
  const risks = [];

  if (cashFlow < 0)              risks.push({ severity: 'high',   text: `Negative cash flow (${fmtM(Math.abs(cashFlow))}/mo shortfall) — the property operates at a loss. One month of vacancy could require ${fmtM(Math.abs(cashFlow) * 2)} out of pocket.` });
  if (capRate < 4)               risks.push({ severity: 'high',   text: `Cap rate of ${fmtP(capRate)} means income alone doesn't justify the price — you're underwriting appreciation, which is speculative.` });
  if (score < 55)                risks.push({ severity: 'high',   text: `AI deal score of ${score}/100 — multiple investment metrics fall below viable thresholds. Requires significant improvement before committing capital.` });
  if (cashFlow > 0 && cashFlow < 200) risks.push({ severity: 'medium', text: `Thin margin of ${fmtM(cashFlow)}/mo — a single repair event ($2,000–5,000) or one month of vacancy would eliminate 10–25 months of profit.` });
  if (capRate >= 4 && capRate < 5.5)  risks.push({ severity: 'medium', text: `Moderate cap rate of ${fmtP(capRate)} — underperforms in a rising interest rate environment. Verify your exit assumptions don't rely on sub-4% rates.` });

  risks.push({ severity: 'medium', text: `Vacancy risk: even at 6% vacancy (national average), you lose ${fmtM(rent * 0.06)}/mo in effective income — model a stress test at 10–15% vacancy.` });
  risks.push({ severity: 'low',    text: `Maintenance risk: $${type === 'Single Family' ? '5,000–12,000' : '3,000–6,000 per unit'}/yr in deferred maintenance is common in years 5–10. Build capital reserves from day one.` });
  risks.push({ severity: 'low',    text: 'Market risk: local rent growth can stall or reverse. Confirm job market health, population trends, and new supply pipeline in the submarket.' });
  risks.push({ severity: 'low',    text: 'Financing risk: if using variable-rate financing or a balloon structure, model a 2% rate increase scenario before committing.' });

  const high   = risks.filter(r => r.severity === 'high');
  const medium = risks.filter(r => r.severity === 'medium');
  const low    = risks.filter(r => r.severity === 'low');

  const portNote = port && port.count > 1
    ? `Your portfolio already holds ${port.count} properties — adding this deal ${high.length > 0 ? 'adds elevated risk concentration' : 'appears consistent with your current risk profile'}.`
    : '';

  return [
    { type: 'text', text: `Risk assessment for ${addr} (${fmtM(price)}). ${portNote}`.trim() },
    ...(high.length   ? [{ type: 'heading', text: '🔴 High Risk' },    { type: 'bullets', items: high.map(r => r.text) }] : []),
    ...(medium.length ? [{ type: 'heading', text: '🟡 Moderate Risk' }, { type: 'bullets', items: medium.slice(0, 3).map(r => r.text) }] : []),
    ...(low.length    ? [{ type: 'heading', text: '🟢 Low Risk' },     { type: 'bullets', items: low.slice(0, 2).map(r => r.text) }] : []),
    { type: 'text', text: high.length > 0
      ? `With ${high.length} high-risk flag${high.length > 1 ? 's' : ''}, I'd recommend resolving the cash flow or cap rate issue before moving forward. Run the Deal Analyzer to model different purchase price scenarios.`
      : 'No critical red flags detected. The key mitigation is maintaining a 3–6 month cash reserve to absorb vacancy and repair events.' },
    { type: 'action', text: 'Run Deal Analyzer →', route: '/deal-analyzer' },
  ];
}

function compareResponse(addr, price, cashFlow, capRate, score, port) {
  if (!port || port.count === 0) {
    return [
      { type: 'text', text: `I don't have any portfolio properties on file to compare against yet. Save properties to your portfolio first, then I can benchmark this deal against your existing holdings.` },
      { type: 'text', text: `For ${addr} at ${fmtM(price)}: cap rate ${fmtP(capRate)}, cash flow ${sgn(cashFlow)}${fmtM(cashFlow)}/mo, AI score ${score}/100. These are the numbers you'd use to evaluate fit within a larger portfolio strategy.` },
      { type: 'action', text: 'Search & Save Properties →', route: '/property-search' },
    ];
  }

  const capDiff  = capRate - port.avgCap;
  const scoreDiff = score - port.avgScore;
  const cfBetter  = cashFlow > (port.totalCF / port.count);

  return [
    { type: 'text', text: `Comparing ${addr} against your ${port.count}-property portfolio (total value ${fmtM(port.totalValue)}, monthly cash flow ${sgn(port.totalCF)}${fmtM(port.totalCF)}/mo):` },
    { type: 'heading', text: 'How This Deal Compares' },
    { type: 'bullets', items: [
      `Cap rate: ${fmtP(capRate)} vs. portfolio average ${fmtP(port.avgCap)} — this deal is ${Math.abs(capDiff) < 0.5 ? 'in line with' : capDiff > 0 ? `${fmtP(capDiff)} above` : `${fmtP(Math.abs(capDiff))} below`} your current average.`,
      `AI score: ${score}/100 vs. portfolio average ${Math.round(port.avgScore)}/100 — ${Math.abs(scoreDiff) < 5 ? 'consistent with' : scoreDiff > 0 ? 'stronger than' : 'weaker than'} your existing holdings.`,
      `Cash flow: ${sgn(cashFlow)}${fmtM(cashFlow)}/mo — ${cfBetter ? 'above' : 'below'} your per-property average of ${sgn(port.totalCF / port.count)}${fmtM(port.totalCF / port.count)}/mo.`,
    ]},
    { type: 'heading', text: 'Portfolio Impact' },
    { type: 'bullets', items: [
      `Adding this property would bring total portfolio value to ${fmtM(port.totalValue + price)} across ${port.count + 1} assets.`,
      `Combined monthly cash flow would shift to ${sgn(port.totalCF + cashFlow)}${fmtM(port.totalCF + cashFlow)}/mo (${cashFlow >= 0 ? '+' : ''}${fmtM(cashFlow)}/mo from this deal).`,
      capDiff > 0.5 ? 'This deal improves your blended portfolio cap rate — a positive signal for portfolio yield.' : capDiff < -0.5 ? 'This deal dilutes your blended cap rate slightly. Ensure the trade-off (location, appreciation potential) justifies it.' : 'This deal is broadly consistent with your existing portfolio profile.',
    ]},
    { type: 'action', text: 'View Portfolio Dashboard →', route: '/portfolio' },
  ];
}

function offerResponse(addr, price, rent, capRate, score) {
  const annualNOI       = rent * 12 * 0.65;
  const targetCapOffer  = annualNOI / 0.06;
  const rule70          = rent * 12 * 0.7 - 20000;
  const negotiationRoom = Math.max(0, price - targetCapOffer);
  const offerLow        = Math.round(targetCapOffer / 5000) * 5000;
  const offerHigh       = Math.round(price * 0.96 / 5000) * 5000;

  return [
    { type: 'text', text: `Based on the income profile of ${addr}, here's my offer strategy analysis:` },
    { type: 'heading', text: 'Offer Price Scenarios' },
    { type: 'bullets', items: [
      `Target price (6% cap rate): ${fmtM(targetCapOffer)} — at this price, the NOI justifies the investment risk. ${price > targetCapOffer ? `That's ${fmtM(price - targetCapOffer)} below list.` : 'List price is already at or below this threshold.'}`,
      `Conservative offer (4% below ask): ${fmtM(Math.round(price * 0.96))} — tests seller motivation without aggressive anchoring. Many listings have 3–6% negotiation room.`,
      `70% rule for value-add: ${fmtM(Math.max(0, rule70))} — used primarily for fix-and-flip, not buy-and-hold, but establishes a floor.`,
    ]},
    { type: 'heading', text: 'Negotiation Strategy' },
    { type: 'bullets', items: [
      `Start with a written offer at ${fmtM(offerLow)} and justify it with cap rate math — not guesswork. Sellers respond better to data-backed offers.`,
      `Request seller concessions on closing costs (1–2% of purchase price, or ${fmtM(Math.round(price * 0.015))}) rather than pure price cuts — often easier for sellers to accept.`,
      'Use inspection results as a secondary negotiation trigger. Budget $500–800 for a comprehensive inspection before finalizing price.',
      `If a buyer's market: escalation clauses hurt you — set a firm ceiling at ${fmtM(Math.min(price, offerHigh))} and walk away if exceeded.`,
    ]},
    { type: 'text', text: negotiationRoom > 10000
      ? `There appears to be ${fmtM(negotiationRoom)} of negotiation room between list price and the 6% cap rate threshold — use that in your offer letter.`
      : 'List price is close to income-justified value. Negotiate on terms (contingencies, closing timeline, repairs) rather than price alone.' },
    { type: 'action', text: 'Model Max Offer in Deal Analyzer →', route: '/deal-analyzer' },
  ];
}

function beginnerResponse(addr, price, cashFlow, capRate, score, type) {
  const complexity   = type === 'Multifamily' ? 'High' : price > 600000 ? 'Medium-High' : cashFlow < 0 ? 'Medium' : 'Low';
  const complexColor = complexity === 'Low' ? 'green' : complexity === 'Medium' ? 'gold' : 'red';
  const isGood       = score >= 65 && cashFlow >= 0 && capRate >= 4.5;

  return [
    { type: 'text', text: `Evaluating ${addr} from a first-time investor perspective:` },
    { type: 'verdict', label: `Complexity: ${complexity}`, color: complexColor },
    { type: 'heading', text: isGood ? '✓ Why This Could Work for a Beginner' : '⚠ What to Understand Before Proceeding' },
    { type: 'bullets', items: isGood ? [
      `AI score of ${score}/100 indicates manageable fundamentals — above-average starting point for a first deal.`,
      cashFlow >= 0 ? `Positive cash flow of ${fmtM(cashFlow)}/mo means the property is self-funding from day one — critical for first-time investors without deep reserves.` : `Cash flow is currently ${fmtM(Math.abs(cashFlow))}/mo negative — you'll need to fund this gap from savings while building equity.`,
      `${type} properties are the most straightforward to manage and finance, with the broadest pool of tenants and lenders.`,
    ] : [
      capRate < 4.5  ? `Cap rate of ${fmtP(capRate)} is below beginner-friendly range (5%+). Low-yield deals work better for experienced investors who can optimize expenses and leverage appreciation.` : `Cap rate of ${fmtP(capRate)} is within beginner-friendly range.`,
      cashFlow < 0   ? `Negative cash flow of ${fmtM(Math.abs(cashFlow))}/mo requires monthly out-of-pocket contributions — not ideal for a first property where cash flow stability is critical.` : 'Positive cash flow is one of the most important factors for a first investment.',
      type === 'Multifamily' ? 'Multifamily properties have more tenants, more maintenance coordination, and more complex financing — consider starting with a single-family or small duplex.' : 'Property management will be your biggest learning curve — budget 3 months of hands-on time in year one.',
    ]},
    { type: 'heading', text: 'Key Lessons for Your First Deal' },
    { type: 'bullets', items: [
      `Never skip an inspection — budget ${fmtM(500)}-${fmtM(800)} for a full report. Hidden issues (roof, foundation, HVAC) are the most common first-timer mistake.`,
      `Build a 6-month cash reserve (${fmtM(Math.abs(cashFlow) * 6 + 3000)}) before closing — covers vacancy, repairs, and surprises without panic selling.`,
      `Don't over-optimize the purchase price — paying ${fmtM(10000)}-${fmtM(20000)} more on a ${fmtM(price)} property matters less than choosing the right neighborhood and tenant profile.`,
      'Hire a property manager for year one (7–10% of rent) to learn the operation without burning out.',
    ]},
    { type: 'action', text: 'Run Deal Analyzer →', route: '/deal-analyzer' },
  ];
}

function renovationResponse(addr, price, rent, cashFlow, capRate, score, type) {
  const renoRentPremium = Math.round(rent * 0.10);
  const lightRenovValue = Math.round(price * 0.06);
  const fullRenovValue  = Math.round(price * 0.12);
  const carryPerMo      = Math.round(price * 0.008);

  return [
    { type: 'text', text: `Renovation value-add analysis for ${addr} at ${fmtM(price)}:` },
    { type: 'heading', text: 'Highest-ROI Renovation Scopes' },
    { type: 'bullets', items: [
      'Kitchen remodel ($15K–$45K): 70–80% ROI — the single highest-impact interior upgrade for resale and rental premium.',
      'Bathroom updates ($8K–$25K per bath): 60–70% ROI — cosmetic upgrades (vanity, tile, fixtures) outperform full gut renovations in most markets.',
      'Curb appeal ($3K–$8K): 80–100% ROI — landscaping, paint, and front door upgrades drive 3–5% price premiums at resale.',
      'HVAC replacement ($6K–$15K): 70–75% ROI — critical for tenant retention and vacancy reduction; a deferred HVAC is a deal negotiation tool.',
      `Flooring upgrade ($4K–$12K): 65–75% ROI — LVP flooring enables ${fmtM(Math.round(rent * 0.06))}–${fmtM(Math.round(rent * 0.10))}/mo rent premium for minimal cost.`,
    ]},
    { type: 'heading', text: 'Value-Add Potential' },
    { type: 'bullets', items: [
      `Light cosmetic renovation ($15K–$25K): estimated +${fmtM(lightRenovValue)} in market value and +${fmtM(Math.round(renoRentPremium * 0.6))}/mo rent premium.`,
      `Full interior renovation ($40K–$65K): estimated +${fmtM(fullRenovValue)} in value and +${fmtM(renoRentPremium)}/mo rent premium — check ARV comps before committing.`,
      `Appreciation play: a renovated property can compress cap rate from ${fmtP(capRate)} to ${fmtP(capRate - 0.5)}–${fmtP(capRate - 1)} — translate that to ${fmtM(Math.round(price * 0.06))}–${fmtM(Math.round(price * 0.12))} of additional exit value.`,
    ]},
    { type: 'heading', text: 'Execution Risks' },
    { type: 'bullets', items: [
      'Always get 3 contractor bids — use fixed-price contracts for scopes over $15K to cap downside.',
      'Pre-1980 properties: allocate 15–20% contingency for electrical, plumbing, and insulation surprises.',
      `Carrying cost during renovation at typical rates: ${fmtM(carryPerMo)}/mo — factor into your total all-in cost.`,
      'Pull permits on structural, electrical, and plumbing work — unpermitted additions create title issues at resale.',
    ]},
    { type: 'action', text: 'Open Development Studio →', route: '/dev-studio' },
  ];
}

function holdPeriodResponse(addr, price, rent, cashFlow, capRate, score, type, port) {
  const dp          = price * 0.20;
  const annualCF    = cashFlow * 12;
  const appRate     = 0.05;
  const total3yr    = annualCF * 3 + (price * (Math.pow(1 + appRate, 3)  - 1));
  const total5yr    = annualCF * 5 + (price * (Math.pow(1 + appRate, 5)  - 1));
  const total7yr    = annualCF * 7 + (price * (Math.pow(1 + appRate, 7)  - 1));
  const totalRet3yr = dp > 0 ? (total3yr / dp * 100) : 0;
  const totalRet5yr = dp > 0 ? (total5yr / dp * 100) : 0;
  const totalRet7yr = dp > 0 ? (total7yr / dp * 100) : 0;
  const annualDepr  = Math.round(price * 0.85 / 27.5);
  const recommended = capRate >= 6 && cashFlow > 400 ? '7–10 years'
    : capRate >= 4 && cashFlow >= 0 ? '5–7 years'
    : cashFlow < 0 ? '3–5 years (appreciation play)'
    : '5–7 years';

  return [
    { type: 'text', text: `Hold period analysis for ${addr} at ${fmtM(price)} (20% down, 5% annual appreciation assumed):` },
    { type: 'heading', text: 'Total Return by Hold Horizon' },
    { type: 'bullets', items: [
      `3-Year hold: est. total return ${fmtM(Math.round(total3yr))} · ${totalRet3yr.toFixed(0)}% on invested capital. Crosses short-term cap gains threshold; limited depreciation benefit.`,
      `5-Year hold: est. total return ${fmtM(Math.round(total5yr))} · ${totalRet5yr.toFixed(0)}% on invested capital. Qualifies for 1031 exchange; depreciation recapture begins to matter.`,
      `7-Year hold: est. total return ${fmtM(Math.round(total7yr))} · ${totalRet7yr.toFixed(0)}% on invested capital. Maximum compounding; strongest case for 1031 into larger asset.`,
    ]},
    { type: 'verdict', label: `Recommended Hold: ${recommended}`, color: 'blue' },
    { type: 'heading', text: 'Tax & Exit Considerations' },
    { type: 'bullets', items: [
      `Depreciation: claim ~${fmtM(annualDepr)}/yr over a 27.5-year schedule — shields rental income from ordinary tax throughout the hold.`,
      '1031 exchange: defer all capital gains tax by rolling proceeds into a like-kind property at any point (typically most efficient at 5yr+ with meaningful appreciation).',
      'Long-term cap gains: hold 12+ months — qualifies for 0%, 15%, or 20% rate vs. ordinary income (up to 37%).',
      cashFlow < 0
        ? `Negative cash flow of ${fmtM(Math.abs(cashFlow))}/mo adds ${fmtM(Math.abs(cashFlow) * 12)}/yr to your out-of-pocket cost — factor this into total hold cost before projecting returns.`
        : `Positive cash flow of ${fmtM(cashFlow)}/mo generates ${fmtM(annualCF)}/yr in spendable income — reinvest into reserves or next down payment to accelerate portfolio growth.`,
      `Exit cap rate risk: if local cap rates expand 0.5% at exit, expect a ${fmtM(Math.round(price * 0.05))}–${fmtM(Math.round(price * 0.08))} discount to today's value — price your hold duration against cycle risk.`,
    ]},
    { type: 'action', text: 'Model Cash Flow Over Time →', route: '/cash-flow' },
  ];
}

function generalResponse(question, addr, price, cashFlow, capRate, score, type, port) {
  return [
    { type: 'text', text: `Great question about ${addr}. Here's what the current data tells me:` },
    { type: 'heading', text: 'Property Overview' },
    { type: 'bullets', items: [
      `AI deal score of ${score}/100 — ${score >= 75 ? 'investor-grade fundamentals' : score >= 55 ? 'workable with adjustments' : 'below investment threshold'}.`,
      `Cap rate of ${fmtP(capRate)} — ${capRate >= 6 ? 'above the 5% benchmark' : capRate >= 4 ? 'moderate, typical for appreciating markets' : 'below income-justification threshold'}.`,
      `Monthly cash flow of ${sgn(cashFlow)}${fmtM(cashFlow)} — ${cashFlow > 400 ? 'strong positive return' : cashFlow > 0 ? 'thin but positive' : 'requires out-of-pocket contributions'}.`,
    ]},
    { type: 'text', text: port ? `This compares to your ${port.count}-property portfolio with an average AI score of ${Math.round(port.avgScore)} and ${sgn(port.totalCF)}${fmtM(port.totalCF)}/mo total cash flow.` : '' },
    { type: 'text', text: 'Try one of the suggested questions above for a deeper analysis, or run the tools below to model specific scenarios.' },
    { type: 'action', text: 'Open Deal Analyzer →', route: '/deal-analyzer' },
  ];
}

/* ── Local rule-based router ─────────────────────────────────────────── */
function buildLocalResponse(prompt, property, port, documents, negotiation) {
  const q = prompt.toLowerCase();

  if (q.includes('document') && (q.includes('risk') || q.includes('review') || q.includes('latest'))) {
    return documentRisksResponse(documents);
  }
  if (q.includes('negotiation') || q.includes('negotiat') || q.includes('my negotiation')) {
    return negotiationResultResponse(negotiation, property);
  }

  if (!property) {
    return [
      { type: 'text', text: "I don't have an active property to analyze. Select a listing from Property Search and I'll provide specific deal scoring, risk analysis, and investment recommendations tailored to that property." },
      { type: 'action', text: 'Search Properties →', route: '/property-search' },
    ];
  }

  const price    = property.price    || 0;
  const rent     = property.rent     || 0;
  const cashFlow = property.cashFlow || 0;
  const capRate  = property.capRate  || 0;
  const score    = property.score    || 0;
  const roi      = property.roi      || 0;
  const addr     = property.address  || property.fullAddress || 'the selected property';
  const type     = property.type     || 'Single Family';

  if (q.includes('should i buy') || q.match(/should i/) || q.includes('buy this'))
    return buyResponse(addr, price, rent, cashFlow, capRate, score, roi, type, port);
  if (q.includes('cash flow') || q.includes('improve') || q.includes('increase income'))
    return cashFlowResponse(addr, price, rent, cashFlow, capRate, score, type);
  if (q.includes('risk') || q.includes('concern') || q.includes('danger'))
    return riskResponse(addr, price, rent, cashFlow, capRate, score, type, port);
  if (q.includes('portfolio') || q.includes('compare') || q.includes('my properties'))
    return compareResponse(addr, price, cashFlow, capRate, score, port);
  if (q.includes('offer') || (q.includes('price') && q.includes('make')) || q.includes('negotiate'))
    return offerResponse(addr, price, rent, capRate, score);
  if (q.includes('renovat') || q.includes('rehab') || q.includes('remodel') || q.includes('upgrade'))
    return renovationResponse(addr, price, rent, cashFlow, capRate, score, type);
  if (q.includes('how long') || (q.includes('hold') && !q.includes('cash flow')) || q.includes('when should i sell') || q.includes('exit'))
    return holdPeriodResponse(addr, price, rent, cashFlow, capRate, score, type, port);
  if (q.includes('beginner') || q.includes('first time') || q.includes('new investor') || q.includes('starter'))
    return beginnerResponse(addr, price, cashFlow, capRate, score, type);

  return generalResponse(prompt, addr, price, cashFlow, capRate, score, type, port);
}

/* ── Provider registry ───────────────────────────────────────────────── */
const ACTIVE_PROVIDER = 'local';

const PROVIDERS = {
  local: async ({ prompt, property, portfolio, documents, negotiation }) =>
    buildLocalResponse(prompt, property, portfolio, documents, negotiation),

  // openai: async ({ prompt, property, portfolio, documents, negotiation }) => {
  //   const res = await fetch('https://api.openai.com/v1/chat/completions', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_OPENAI_KEY}` },
  //     body: JSON.stringify({ model: 'gpt-4o', messages: buildOpenAIMessages(prompt, property, portfolio, documents, negotiation) }),
  //   });
  //   const json = await res.json();
  //   return parseProviderBlocks(json.choices[0].message.content);
  // },

  // claude: async ({ prompt, property, portfolio, documents, negotiation }) => {
  //   const res = await fetch('https://api.anthropic.com/v1/messages', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json', 'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
  //     body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1024, messages: [{ role: 'user', content: buildClaudePrompt(prompt, property, portfolio, documents, negotiation) }] }),
  //   });
  //   const json = await res.json();
  //   return parseProviderBlocks(json.content[0].text);
  // },

  // gemini: async ({ prompt, property, portfolio, documents, negotiation }) => {
  //   const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${import.meta.env.VITE_GEMINI_KEY}`, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ contents: [{ parts: [{ text: buildGeminiPrompt(prompt, property, portfolio, documents, negotiation) }] }] }),
  //   });
  //   const json = await res.json();
  //   return parseProviderBlocks(json.candidates[0].content.parts[0].text);
  // },
};

/* ── Public API ──────────────────────────────────────────────────────── */

/**
 * Generate an AI advisor response.
 * Falls back to local rule-based responses on any error.
 *
 * @param {{ prompt: string, property: object|null, portfolio: object|null, documents: array, negotiation: object|null }} params
 * @returns {Promise<Array>} Response blocks for AIBubble renderer
 */
export async function generateAIResponse({ prompt, property, portfolio, documents, negotiation }) {
  const provider = PROVIDERS[ACTIVE_PROVIDER] ?? PROVIDERS.local;
  try {
    const blocks = await provider({ prompt, property, portfolio, documents, negotiation });
    return Array.isArray(blocks) && blocks.length > 0 ? blocks : fallbackErrorBlocks();
  } catch (err) {
    console.error('[aiService] provider error:', err);
    return fallbackErrorBlocks();
  }
}

function fallbackErrorBlocks() {
  return [
    { type: 'text', text: 'I ran into an issue generating a response. Please try again or rephrase your question.' },
    { type: 'action', text: 'Try Deal Analyzer →', route: '/deal-analyzer' },
  ];
}
