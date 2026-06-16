import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSelectedProperty, saveWorkflowAnalysis } from '../services/propertyWorkflow';
import { addToPortfolio, getPortfolio } from '../services/propertyStorage';
import './AIAdvisor.css';

const fmtM = n => '$' + Math.round(Math.abs(n)).toLocaleString();
const fmtP = n => (typeof n === 'number' ? n.toFixed(1) : '0.0') + '%';
const sgn  = n => (n >= 0 ? '+' : '−');

const PROMPTS = [
  { id: 'buy',      icon: '🏠', label: 'Should I buy this property?' },
  { id: 'cashflow', icon: '💵', label: 'How can I improve cash flow?' },
  { id: 'risks',    icon: '⚠️', label: 'What risks do you see?' },
  { id: 'compare',  icon: '📊', label: 'Compare this to my portfolio' },
  { id: 'offer',    icon: '🤝', label: 'What offer price should I make?' },
  { id: 'beginner', icon: '🎓', label: 'Is this good for a beginner investor?' },
];

/* ── Response generator ──────────────────────────────────────────────── */
function buildResponse(question, prop, port) {
  if (!prop) {
    return [
      { type: 'text', text: "I don't have an active property to analyze. Select a listing from Property Search and I'll provide specific deal scoring, risk analysis, and investment recommendations tailored to that property." },
      { type: 'action', text: 'Search Properties →', route: '/property-search' },
    ];
  }

  const price    = prop.price    || 0;
  const rent     = prop.rent     || 0;
  const cashFlow = prop.cashFlow || 0;
  const capRate  = prop.capRate  || 0;
  const score    = prop.score    || 0;
  const roi      = prop.roi      || 0;
  const addr     = prop.address  || prop.fullAddress || 'the selected property';
  const type     = prop.type     || 'Single Family';
  const q        = question.toLowerCase();

  if (q.includes('should i buy') || q.match(/should i/) || q.includes('buy this')) {
    return buyResponse(addr, price, rent, cashFlow, capRate, score, roi, type, port);
  }
  if (q.includes('cash flow') || q.includes('improve') || q.includes('increase income')) {
    return cashFlowResponse(addr, price, rent, cashFlow, capRate, score, type);
  }
  if (q.includes('risk') || q.includes('concern') || q.includes('danger')) {
    return riskResponse(addr, price, rent, cashFlow, capRate, score, type, port);
  }
  if (q.includes('portfolio') || q.includes('compare') || q.includes('my properties')) {
    return compareResponse(addr, price, cashFlow, capRate, score, port);
  }
  if (q.includes('offer') || (q.includes('price') && q.includes('make')) || q.includes('negotiate')) {
    return offerResponse(addr, price, rent, capRate, score);
  }
  if (q.includes('beginner') || q.includes('first time') || q.includes('new investor') || q.includes('starter')) {
    return beginnerResponse(addr, price, cashFlow, capRate, score, type);
  }
  return generalResponse(question, addr, price, cashFlow, capRate, score, type, port);
}

function buyResponse(addr, price, rent, cashFlow, capRate, score, roi, type, port) {
  const verdict = score >= 78 ? 'Strong Buy' : score >= 60 ? 'Proceed with Caution' : 'Pass on This Deal';
  const color   = score >= 78 ? 'green'      : score >= 60 ? 'gold'                 : 'red';

  const strengths = [];
  const risks     = [];

  if (capRate >= 6)  strengths.push(`Strong cap rate of ${fmtP(capRate)} — exceeds the 5% investor benchmark, indicating solid income relative to purchase price.`);
  else if (capRate >= 4) strengths.push(`Cap rate of ${fmtP(capRate)} is acceptable in appreciation-driven markets, though income coverage is thin.`);
  if (cashFlow > 200) strengths.push(`Positive cash flow of ${fmtM(cashFlow)}/mo provides a real buffer for vacancies, maintenance, and rate changes.`);
  if (roi > 8)        strengths.push(`Projected ROI of ${fmtP(roi)} outpaces most fixed-income alternatives at current rates.`);
  if (score >= 70)    strengths.push(`AI deal score of ${score}/100 reflects strong fundamentals across income, debt coverage, and equity spread.`);
  if (price < 400000) strengths.push(`Price point of ${fmtM(price)} limits concentrated capital-at-risk for a single asset.`);
  if (strengths.length < 2) strengths.push(`${type} properties have broad rental demand and historically stable vacancy rates.`);

  if (cashFlow < 0)  risks.push(`Negative cash flow of ${fmtM(Math.abs(cashFlow))}/mo requires ongoing out-of-pocket contributions — build a 6-month reserve before closing.`);
  if (capRate < 4)   risks.push(`Cap rate below 4% makes this an appreciation play, not an income play. Ensure you have conviction on neighborhood trajectory.`);
  if (score < 55)    risks.push(`AI score of ${score}/100 reflects multiple metrics below investment thresholds — run the Deal Analyzer before proceeding.`);
  if (rent === 0)    risks.push(`No rent estimate on file — verify current market rents with at least 3 nearby comparable leases before financing.`);
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
      ? `Bottom line: the fundamentals support moving forward. Order an inspection, get 3 rent comps, and lock in financing within the next 30 days if the inspection is clean.`
      : score >= 60
      ? `Bottom line: negotiate the price down or improve the income story before committing. A 5–8% price reduction could move this from marginal to strong.`
      : `Bottom line: the current numbers don't justify the risk. Either negotiate to a significantly lower price or focus on a different opportunity.` },
    { type: 'action', text: 'Open Deal Analyzer →', route: '/deal-analyzer' },
  ];
}

function cashFlowResponse(addr, price, rent, cashFlow, capRate, score, type) {
  const mgmtSavings  = Math.round(rent * 0.08);
  const rentIncrease = Math.max(50, Math.round(Math.abs(cashFlow) * 1.2));
  const refiBenefit  = Math.round(price * 0.80 * 0.005); // ~0.5% rate improvement on 80% LTV

  return [
    { type: 'text', text: `Current cash flow on ${addr} is ${sgn(cashFlow)}${fmtM(cashFlow)}/mo. Here are the highest-leverage improvement strategies:` },
    { type: 'heading', text: 'Income-Side Improvements' },
    { type: 'bullets', items: [
      `Raise rent to market rate — verify 3 recent comparable leases within 0.5 miles. Even a ${fmtM(rentIncrease)}/mo increase covers ${Math.abs(cashFlow) < rentIncrease ? 'the entire current shortfall' : 'most of the gap'}.`,
      rent > 0 ? `Add ancillary income: storage ($50–100/mo), parking ($75–150/mo), or laundry ($40–80/mo) can add $165–330/mo without tenant turnover.` : `Establish a rent baseline — pull current market comps before finalizing any purchase assumptions.`,
      `Consider a short-term rental strategy (Airbnb) for ${type === 'Single Family' ? 'single-family properties' : 'this property type'} if local regulations permit — can increase gross income by 40–80%.`,
    ]},
    { type: 'heading', text: 'Expense-Side Reductions' },
    { type: 'bullets', items: [
      `Property management at 8% typically costs ${fmtM(mgmtSavings)}/mo — self-management (if local) recaptures ${fmtM(mgmtSavings * 12)}/yr in annual cash flow.`,
      `Shop homeowner's insurance annually — most landlords overpay 15–25% on year-2+ renewals. Savings of $50–100/mo are common.`,
      `Review HOA, utilities, and other line items for renegotiation. Even a 10% reduction in operating costs is additive dollar-for-dollar to NOI.`,
    ]},
    { type: 'heading', text: 'Financing Optimization' },
    { type: 'bullets', items: [
      `A 0.5% interest rate reduction on an 80% LTV loan on ${fmtM(price)} saves approximately ${fmtM(refiBenefit)}/mo — worth shopping 3+ lenders.`,
      `Extending to a 30-year term (if shorter) reduces monthly debt service at the cost of more total interest. Use the Mortgage Calculator to model the trade-off.`,
    ]},
    { type: 'action', text: 'Open Cash Flow Analyzer →', route: '/cash-flow' },
  ];
}

function riskResponse(addr, price, rent, cashFlow, capRate, score, type, port) {
  const risks = [];

  if (cashFlow < 0) risks.push({ severity: 'high', text: `Negative cash flow (${fmtM(Math.abs(cashFlow))}/mo shortfall) — the property operates at a loss. One month of vacancy could require ${fmtM(Math.abs(cashFlow) * 2)} out of pocket.` });
  if (capRate < 4)  risks.push({ severity: 'high', text: `Cap rate of ${fmtP(capRate)} means income alone doesn't justify the price — you're underwriting appreciation, which is speculative.` });
  if (score < 55)   risks.push({ severity: 'high', text: `AI deal score of ${score}/100 — multiple investment metrics fall below viable thresholds. Requires significant improvement before committing capital.` });
  if (cashFlow > 0 && cashFlow < 200) risks.push({ severity: 'medium', text: `Thin margin of ${fmtM(cashFlow)}/mo — a single repair event ($2,000–5,000) or one month of vacancy would eliminate 10–25 months of profit.` });
  if (capRate >= 4 && capRate < 5.5) risks.push({ severity: 'medium', text: `Moderate cap rate of ${fmtP(capRate)} — underperforms in a rising interest rate environment. Verify your exit assumptions don't rely on sub-4% rates.` });

  // Always include these systemic risks
  risks.push({ severity: 'medium', text: `Vacancy risk: even at 6% vacancy (national average), you lose ${fmtM(rent * 0.06)}/mo in effective income — model a stress test at 10–15% vacancy.` });
  risks.push({ severity: 'low', text: `Maintenance risk: $${type === 'Single Family' ? '5,000–12,000' : '3,000–6,000 per unit'}/yr in deferred maintenance is common in years 5–10. Build capital reserves from day one.` });
  risks.push({ severity: 'low', text: `Market risk: local rent growth can stall or reverse. Confirm job market health, population trends, and new supply pipeline in the submarket.` });
  risks.push({ severity: 'low', text: `Financing risk: if using variable-rate financing or a balloon structure, model a 2% rate increase scenario before committing.` });

  const high   = risks.filter(r => r.severity === 'high');
  const medium = risks.filter(r => r.severity === 'medium');
  const low    = risks.filter(r => r.severity === 'low');

  const portNote = port && port.count > 1
    ? `Your portfolio already holds ${port.count} properties — adding this deal ${high.length > 0 ? 'adds elevated risk concentration' : 'appears consistent with your current risk profile'}.`
    : '';

  return [
    { type: 'text', text: `Risk assessment for ${addr} (${fmtM(price)}). ${portNote}`.trim() },
    ...(high.length   ? [{ type: 'heading', text: '🔴 High Risk' },   { type: 'bullets', items: high.map(r => r.text) }] : []),
    ...(medium.length ? [{ type: 'heading', text: '🟡 Moderate Risk' }, { type: 'bullets', items: medium.slice(0, 3).map(r => r.text) }] : []),
    ...(low.length    ? [{ type: 'heading', text: '🟢 Low Risk' },    { type: 'bullets', items: low.slice(0, 2).map(r => r.text) }] : []),
    { type: 'text', text: high.length > 0
      ? `With ${high.length} high-risk flag${high.length > 1 ? 's' : ''}, I'd recommend resolving the cash flow or cap rate issue before moving forward. Run the Deal Analyzer to model different purchase price scenarios.`
      : `No critical red flags detected. The key mitigation is maintaining a 3–6 month cash reserve to absorb vacancy and repair events.` },
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

  const capDiff   = capRate - port.avgCap;
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
      capDiff > 0.5 ? `This deal improves your blended portfolio cap rate — a positive signal for portfolio yield.` : capDiff < -0.5 ? `This deal dilutes your blended cap rate slightly. Ensure the trade-off (location, appreciation potential) justifies it.` : `This deal is broadly consistent with your existing portfolio profile.`,
    ]},
    { type: 'action', text: 'View Portfolio Dashboard →', route: '/portfolio' },
  ];
}

function offerResponse(addr, price, rent, capRate, score) {
  // Max offer at 6% cap rate target
  const annualNOI        = rent * 12 * 0.65; // rough: 35% expense ratio
  const targetCapOffer   = annualNOI / 0.06;
  const rule70           = rent * 12 * 0.7 - 20000; // rough repair estimate
  const negotiationRoom  = Math.max(0, price - targetCapOffer);
  const offerLow         = Math.round(targetCapOffer / 5000) * 5000;
  const offerHigh        = Math.round(price * 0.96 / 5000) * 5000;

  return [
    { type: 'text', text: `Based on the income profile of ${addr}, here's my offer strategy analysis:` },
    { type: 'heading', text: 'Offer Price Scenarios' },
    { type: 'bullets', items: [
      `Target price (6% cap rate): ${fmtM(targetCapOffer)} — at this price, the NOI justifies the investment risk. ${price > targetCapOffer ? `That's ${fmtM(price - targetCapOffer)} below list.` : `List price is already at or below this threshold.`}`,
      `Conservative offer (4% below ask): ${fmtM(Math.round(price * 0.96))} — tests seller motivation without aggressive anchoring. Many listings have 3–6% negotiation room.`,
      `70% rule for value-add: ${fmtM(Math.max(0, rule70))} — used primarily for fix-and-flip, not buy-and-hold, but establishes a floor.`,
    ]},
    { type: 'heading', text: 'Negotiation Strategy' },
    { type: 'bullets', items: [
      `Start with a written offer at ${fmtM(offerLow)} and justify it with cap rate math — not guesswork. Sellers respond better to data-backed offers.`,
      `Request seller concessions on closing costs (1–2% of purchase price, or ${fmtM(Math.round(price * 0.015))}) rather than pure price cuts — often easier for sellers to accept.`,
      `Use inspection results as a secondary negotiation trigger. Budget $500–800 for a comprehensive inspection before finalizing price.`,
      `If a buyer's market: escalation clauses hurt you — set a firm ceiling at ${fmtM(Math.min(price, offerHigh))} and walk away if exceeded.`,
    ]},
    { type: 'text', text: `${negotiationRoom > 10000 ? `There appears to be ${fmtM(negotiationRoom)} of negotiation room between list price and the 6% cap rate threshold — use that in your offer letter.` : `List price is close to income-justified value. Negotiate on terms (contingencies, closing timeline, repairs) rather than price alone.`}` },
    { type: 'action', text: 'Model Max Offer in Deal Analyzer →', route: '/deal-analyzer' },
  ];
}

function beginnerResponse(addr, price, cashFlow, capRate, score, type) {
  const complexity = type === 'Multifamily' ? 'High' : price > 600000 ? 'Medium-High' : cashFlow < 0 ? 'Medium' : 'Low';
  const complexColor = complexity === 'Low' ? 'green' : complexity === 'Medium' ? 'gold' : 'red';
  const isGood = score >= 65 && cashFlow >= 0 && capRate >= 4.5;

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
      cashFlow < 0   ? `Negative cash flow of ${fmtM(Math.abs(cashFlow))}/mo requires monthly out-of-pocket contributions — not ideal for a first property where cash flow stability is critical.` : `Positive cash flow is one of the most important factors for a first investment.`,
      type === 'Multifamily' ? `Multifamily properties have more tenants, more maintenance coordination, and more complex financing — consider starting with a single-family or small duplex.` : `Property management will be your biggest learning curve — budget 3 months of hands-on time in year one.`,
    ]},
    { type: 'heading', text: 'Key Lessons for Your First Deal' },
    { type: 'bullets', items: [
      `Never skip an inspection — budget ${fmtM(500)}-${fmtM(800)} for a full report. Hidden issues (roof, foundation, HVAC) are the most common first-timer mistake.`,
      `Build a 6-month cash reserve (${fmtM(Math.abs(cashFlow) * 6 + 3000)}) before closing — covers vacancy, repairs, and surprises without panic selling.`,
      `Don't over-optimize the purchase price — paying ${fmtM(10000)}-${fmtM(20000)} more on a ${fmtM(price)} property matters less than choosing the right neighborhood and tenant profile.`,
      `Hire a property manager for year one (7–10% of rent) to learn the operation without burning out.`,
    ]},
    { type: 'action', text: 'Run Deal Analyzer →', route: '/deal-analyzer' },
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
    { type: 'text', text: `${port ? `This compares to your ${port.count}-property portfolio with an average AI score of ${Math.round(port.avgScore)} and ${sgn(port.totalCF)}${fmtM(port.totalCF)}/mo total cash flow.` : ''}` },
    { type: 'text', text: `Try one of the suggested questions above for a deeper analysis, or run the tools below to model specific scenarios.` },
    { type: 'action', text: 'Open Deal Analyzer →', route: '/deal-analyzer' },
  ];
}

/* ── Main component ──────────────────────────────────────────────────── */
export default function AIAdvisor() {
  const navigate  = useNavigate();
  const property  = getSelectedProperty();
  const portfolio = useMemo(() => getPortfolio(), []);

  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [thinking, setThinking] = useState(false);
  const [saved,    setSaved]    = useState(false);
  const msgEndRef = useRef(null);

  /* ── Portfolio summary ─────────────────── */
  const port = useMemo(() => {
    if (!portfolio.length) return null;
    const n         = portfolio.length;
    const totalVal  = portfolio.reduce((s, p) => s + (p.price || 0), 0);
    const totalCF   = portfolio.reduce((s, p) => s + (p.cashFlow || 0), 0);
    const withCap   = portfolio.filter(p => p.capRate > 0);
    const withScore = portfolio.filter(p => p.score  > 0);
    const avgCap    = withCap.length   ? withCap.reduce((s, p)   => s + p.capRate, 0)  / withCap.length   : 0;
    const avgScore  = withScore.length ? withScore.reduce((s, p) => s + p.score,   0)  / withScore.length : 0;
    return { count: n, totalValue: totalVal, totalCF, avgCap, avgScore };
  }, [portfolio]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const sendMessage = text => {
    if (!text.trim() || thinking) return;
    setMessages(prev => [...prev, { role: 'user', text: text.trim(), id: Date.now() }]);
    setInput('');
    setThinking(true);
    const delay = 700 + Math.random() * 700;
    setTimeout(() => {
      const blocks = buildResponse(text.trim(), property, port);
      setMessages(prev => [...prev, { role: 'ai', blocks, id: Date.now() }]);
      setThinking(false);
    }, delay);
  };

  const handleSave = () => {
    if (!property) return;
    addToPortfolio({
      id:       property.id ?? Date.now(),
      address:  property.address || property.fullAddress || '',
      city:     property.city || '',
      price:    property.price || 0,
      type:     property.type || 'Single Family',
      beds:     property.beds, baths: property.baths, sqft: property.sqft,
      rent:     property.rent || 0,
      cashFlow: property.cashFlow || 0,
      capRate:  property.capRate || 0,
      roi:      property.roi || 0,
      score:    property.score || 0,
      equity:   Math.round((property.price || 0) * 0.20),
    });
    saveWorkflowAnalysis(property);
    setSaved(true);
  };

  const scoreColor = property
    ? property.score >= 75 ? 'var(--success)' : property.score >= 55 ? 'var(--gold)' : 'var(--danger)'
    : 'var(--gray-400)';

  /* ── Render ──────────────────────────────── */
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">AI Advisor</h1>
        <p className="page-subtitle">Personalized real estate strategy powered by your selected property and portfolio.</p>
      </div>

      <div className="adv-layout">

        {/* LEFT — Context */}
        <div className="adv-left">

          {/* Selected property card */}
          {property ? (
            <div className="card adv-prop-card">
              <div className="adv-prop-header">
                <span className="adv-prop-type-chip">{property.type || 'Property'}</span>
                <span className="adv-score-chip" style={{ color: scoreColor, borderColor: scoreColor }}>
                  AI {property.score ?? '—'}
                </span>
              </div>
              <p className="adv-prop-addr">{property.fullAddress || property.address}</p>
              <p className="adv-prop-price">{fmtM(property.price || 0)}</p>
              <div className="adv-prop-metrics">
                {[
                  { label: 'Est. Rent',    val: `${fmtM(property.rent || 0)}/mo`,                              cls: '' },
                  { label: 'Cash Flow',    val: `${sgn(property.cashFlow||0)}${fmtM(property.cashFlow||0)}/mo`,cls: (property.cashFlow||0) >= 0 ? 'pos' : 'neg' },
                  { label: 'Cap Rate',     val: fmtP(property.capRate || 0),                                   cls: '' },
                  { label: 'ROI',          val: fmtP(property.roi || 0),                                       cls: '' },
                ].map(m => (
                  <div key={m.label} className="adv-prop-metric">
                    <span>{m.label}</span>
                    <strong className={m.cls}>{m.val}</strong>
                  </div>
                ))}
              </div>
              <div className="adv-prop-btns">
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/deal-analyzer')}>Deal Analyzer</button>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/mortgage-calc')}>Mortgage</button>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/cash-flow')}>Cash Flow</button>
              </div>
              <button className="btn btn-primary btn-full adv-save-btn" onClick={handleSave}>
                {saved ? '✓ Saved to Portfolio' : 'Save to Portfolio'}
              </button>
            </div>
          ) : (
            <div className="card adv-no-prop-card">
              <div className="adv-no-prop-icon">🏠</div>
              <p><strong>No property selected</strong></p>
              <p>Search for a property to unlock personalized AI analysis and deal recommendations.</p>
              <button className="btn btn-primary btn-full" onClick={() => navigate('/property-search')}>
                Search Properties →
              </button>
            </div>
          )}

          {/* Portfolio summary */}
          {port && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">My Portfolio</h2>
                <span className="badge badge-blue">{port.count} Properties</span>
              </div>
              <div className="adv-port-grid">
                {[
                  { label: 'Total Value',   val: fmtM(port.totalValue),                                     cls: '' },
                  { label: 'Monthly CF',    val: `${sgn(port.totalCF)}${fmtM(port.totalCF)}/mo`,           cls: port.totalCF >= 0 ? 'pos' : 'neg' },
                  { label: 'Avg Cap Rate',  val: fmtP(port.avgCap),                                         cls: '' },
                  { label: 'Avg AI Score',  val: String(Math.round(port.avgScore)),                          cls: '' },
                ].map(m => (
                  <div key={m.label} className="adv-port-item">
                    <span>{m.label}</span>
                    <strong className={m.cls}>{m.val}</strong>
                  </div>
                ))}
              </div>
              <button className="btn btn-ghost btn-full btn-sm adv-port-link"
                onClick={() => navigate('/portfolio')}>
                View Portfolio Dashboard →
              </button>
            </div>
          )}

          {/* Quick actions */}
          <div className="card">
            <div className="card-header"><h2 className="card-title">Quick Actions</h2></div>
            <div className="adv-quick-btns">
              {[
                { icon: '🔍', label: 'Analyze Deal',  route: '/deal-analyzer' },
                { icon: '🏦', label: 'Mortgage',      route: '/mortgage-calc' },
                { icon: '💵', label: 'Cash Flow',     route: '/cash-flow' },
                { icon: '🏘️', label: 'Search Properties', route: '/property-search' },
              ].map(a => (
                <button key={a.label} className="btn btn-ghost adv-quick-btn"
                  onClick={() => navigate(a.route)}>
                  <span>{a.icon}</span>{a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Chat */}
        <div className="card adv-chat-card">

          {/* Message area */}
          <div className="adv-messages">

            {/* Welcome */}
            <div className="adv-welcome">
              <div className="adv-ai-avatar">
                <svg width="20" height="20" viewBox="0 0 36 36" fill="none">
                  <rect x="4" y="11" width="28" height="18" rx="5" stroke="currentColor" strokeWidth="1.8"/>
                  <circle cx="12" cy="20" r="2" fill="currentColor"/>
                  <circle cx="18" cy="20" r="2" fill="currentColor"/>
                  <circle cx="24" cy="20" r="2" fill="currentColor"/>
                  <path d="M18 4V11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <circle cx="18" cy="3.5" r="2.5" fill="currentColor"/>
                </svg>
              </div>
              <div className="adv-welcome-body">
                <p className="adv-welcome-name">CinNova AI Advisor</p>
                <p className="adv-welcome-text">
                  {property
                    ? `I'm ready to analyze ${property.address || property.fullAddress} at ${fmtM(property.price || 0)}. Click a prompt or ask anything about this deal.`
                    : `Select a property from Property Search to get personalized deal analysis, risk flags, and investment recommendations.`
                  }
                </p>
              </div>
            </div>

            {/* Suggested prompts — shown before first message */}
            {messages.length === 0 && property && (
              <div className="adv-prompts-block">
                <p className="adv-prompts-label">Suggested questions</p>
                <div className="adv-prompt-grid">
                  {PROMPTS.map(p => (
                    <button key={p.id} className="adv-prompt-chip"
                      onClick={() => sendMessage(p.label)}>
                      <span className="adv-prompt-icon">{p.icon}</span>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map(msg =>
              msg.role === 'user'
                ? <UserBubble key={msg.id} text={msg.text} />
                : <AIBubble key={msg.id} blocks={msg.blocks} navigate={navigate} />
            )}

            {/* Thinking animation */}
            {thinking && (
              <div className="adv-thinking">
                <div className="adv-ai-avatar adv-ai-avatar--sm">
                  <svg width="14" height="14" viewBox="0 0 36 36" fill="none">
                    <rect x="4" y="11" width="28" height="18" rx="5" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="20" r="2" fill="currentColor"/>
                    <circle cx="18" cy="20" r="2" fill="currentColor"/>
                    <circle cx="24" cy="20" r="2" fill="currentColor"/>
                  </svg>
                </div>
                <div className="adv-dots"><span/><span/><span/></div>
              </div>
            )}

            <div ref={msgEndRef} />
          </div>

          {/* Compact prompts bar (visible after conversation starts) */}
          {messages.length > 0 && property && (
            <div className="adv-prompts-bar">
              {PROMPTS.slice(0, 4).map(p => (
                <button key={p.id} className="adv-prompt-bar-chip"
                  onClick={() => sendMessage(p.label)}>
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="adv-input-bar">
            <input
              className="adv-input"
              placeholder={property ? `Ask about ${property.address || 'this property'}…` : 'Select a property to start…'}
              value={input}
              disabled={!property || thinking}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            />
            <button className="btn btn-primary adv-send-btn"
              disabled={!input.trim() || !property || thinking}
              onClick={() => sendMessage(input)}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Message sub-components ──────────────────────────────────────────── */
function UserBubble({ text }) {
  return (
    <div className="adv-msg adv-msg--user">
      <div className="adv-bubble adv-bubble--user">{text}</div>
    </div>
  );
}

function AIBubble({ blocks, navigate }) {
  return (
    <div className="adv-msg adv-msg--ai">
      <div className="adv-ai-avatar adv-ai-avatar--sm">
        <svg width="14" height="14" viewBox="0 0 36 36" fill="none">
          <rect x="4" y="11" width="28" height="18" rx="5" stroke="currentColor" strokeWidth="2"/>
          <circle cx="12" cy="20" r="2" fill="currentColor"/>
          <circle cx="18" cy="20" r="2" fill="currentColor"/>
          <circle cx="24" cy="20" r="2" fill="currentColor"/>
        </svg>
      </div>
      <div className="adv-bubble adv-bubble--ai">
        {blocks.map((block, i) => {
          if (block.type === 'text')     return <p key={i} className="adv-block-text">{block.text}</p>;
          if (block.type === 'heading')  return <p key={i} className="adv-block-heading">{block.text}</p>;
          if (block.type === 'bullets')  return (
            <ul key={i} className="adv-block-bullets">
              {block.items.map((item, j) => <li key={j}>{item}</li>)}
            </ul>
          );
          if (block.type === 'verdict')  return (
            <div key={i} className={`adv-verdict adv-verdict--${block.color}`}>{block.label}</div>
          );
          if (block.type === 'action')   return (
            <button key={i} className="adv-block-action btn btn-ghost btn-sm"
              onClick={() => navigate(block.route)}>
              {block.text}
            </button>
          );
          return null;
        })}
      </div>
    </div>
  );
}
