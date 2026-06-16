import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MARKET_DATA } from '../data/marketData';
import { NEIGHBORHOOD_MAP, NEIGHBORHOODS } from '../data/neighborhoodData';
import { getProperties, getPortfolio } from '../services/propertyStorage';
import { getSavedDocs, getNegotiationResult } from '../services/aiService';
import { createAnalysisFromProperty, getSelectedProperty } from '../services/propertyWorkflow';
import './PropertyReport.css';

/* ── Formatters ──────────────────────────────────────────── */
const money = v => `$${Math.round(v || 0).toLocaleString()}`;
const pct   = v => `${Number(v || 0).toFixed(1)}%`;
const fmt$K = v => { const n = Math.abs(v || 0); return n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1000 ? `$${Math.round(n/1000)}K` : `$${Math.round(n)}`; };

/* ── localStorage helpers ────────────────────────────────── */
function safeJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); }
  catch { return null; }
}

/* ── Data pickers ────────────────────────────────────────── */
function pickMarket(property) {
  const h = `${property?.city || ''} ${property?.fullAddress || ''} ${property?.address || ''}`.toLowerCase();
  return MARKET_DATA.find(m => h.includes(m.name.toLowerCase())) || MARKET_DATA[0];
}

function pickNeighborhood(property, market) {
  const h = `${property?.fullAddress || ''} ${property?.address || ''}`.toLowerCase();
  return NEIGHBORHOODS.find(n => h.includes(n.name.toLowerCase()))
    || NEIGHBORHOODS.find(n => n.city === market.name)
    || NEIGHBORHOOD_MAP.brickell
    || NEIGHBORHOODS[0];
}

/* ── Scoring / recommendation ────────────────────────────── */
function computeOverallScore(dealScore, cashFlow, negStrength, marketScore, neighScore) {
  const cfScore  = Math.min(100, Math.max(0, 50 + cashFlow / 15));
  const negScore = negStrength ?? 60;
  return Math.round(
    dealScore   * 0.40 +
    cfScore     * 0.20 +
    negScore    * 0.15 +
    marketScore * 0.15 +
    neighScore  * 0.10
  );
}

const VERDICT_MAP = {
  'Strong Buy': { color: 'green', badge: 'badge-green', border: 'var(--success)',  bg: 'var(--success-bg)',  hex: '#16a34a' },
  'Buy':        { color: 'blue',  badge: 'badge-blue',  border: 'var(--blue-600)', bg: 'var(--blue-50)',     hex: '#2563eb' },
  'Consider':   { color: 'gold',  badge: 'badge-gold',  border: 'var(--gold)',     bg: 'var(--gold-50)',     hex: '#d97706' },
  'Pass':       { color: 'red',   badge: 'badge-red',   border: 'var(--danger)',   bg: 'var(--danger-bg)',   hex: '#dc2626' },
};

function getVerdict(score) {
  if (score >= 80) return 'Strong Buy';
  if (score >= 67) return 'Buy';
  if (score >= 53) return 'Consider';
  return 'Pass';
}

function scoreColor(s) {
  if (s >= 80) return 'green';
  if (s >= 67) return 'blue';
  if (s >= 53) return 'gold';
  return 'red';
}

const RISK_LEVEL_COLOR = { Low: 'green', Moderate: 'gold', Elevated: 'gold', High: 'red', Unknown: 'gray' };
const RISK_BADGE       = { Low: 'badge-green', Moderate: 'badge-gold', Elevated: 'badge-gold', High: 'badge-red', Unknown: 'badge-gray' };

/* ── Shared sub-components ───────────────────────────────── */
function ReportSection({ title, badge, badgeTone = 'blue', number, pageBreak, children }) {
  return (
    <section className={`card pr-section${pageBreak ? ' pr-page-break' : ''}`}>
      <div className="card-header">
        <div className="pr-section-title-row">
          {number && <span className="pr-section-num">{number}</span>}
          <h2 className="card-title">{title}</h2>
        </div>
        {badge && <span className={`badge badge-${badgeTone}`}>{badge}</span>}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value, tone = 'blue', sub }) {
  return (
    <div className={`pr-metric pr-metric--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

function Row({ label, value, tone }) {
  return (
    <div className={`pr-row${tone ? ` pr-row--${tone}` : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RiskRow({ factor, level, note }) {
  const dot   = `pr-risk-dot--${RISK_LEVEL_COLOR[level] || 'gray'}`;
  const badge = RISK_BADGE[level] || 'badge-gray';
  return (
    <div className="pr-risk-row">
      <span className={`pr-risk-dot ${dot}`} />
      <div className="pr-risk-body">
        <strong>{factor}</strong>
        <span>{note}</span>
      </div>
      <span className={`badge ${badge}`}>{level}</span>
    </div>
  );
}

function ActionItem({ num, text, tag, tagTone = 'blue' }) {
  return (
    <div className="pr-action-item">
      <span className="pr-action-num">{num}</span>
      <span className="pr-action-text">{text}</span>
      {tag && <span className={`badge badge-${tagTone} pr-action-tag`}>{tag}</span>}
    </div>
  );
}

/* ── Report data assembler ───────────────────────────────── */
function buildReport(selectedProperty) {
  if (!selectedProperty) return null;

  /* Analysis */
  const analyses = getProperties();
  const recent   = analyses.find(item =>
    item.property?.id === selectedProperty.id
    || item.form?.address === selectedProperty.fullAddress
    || item.analysis?.address === selectedProperty.fullAddress
  );
  const analysis = recent?.analysis || createAnalysisFromProperty(selectedProperty);

  /* Context data */
  const market      = pickMarket(selectedProperty);
  const neighborhood = pickNeighborhood(selectedProperty, market);
  const negotiation = getNegotiationResult();
  const documents   = getSavedDocs();
  const portfolio   = getPortfolio();
  const devAnalyses = safeJson('cinnova_dev_analyses') || [];
  const devAnalysis = devAnalyses.find(d =>
    d.address === (selectedProperty.fullAddress || selectedProperty.address)
  ) || devAnalyses[0] || null;

  /* Is in portfolio? */
  const inPortfolio = portfolio.some(p =>
    p.id === selectedProperty.id || p.address === (selectedProperty.fullAddress || selectedProperty.address)
  );

  /* Finance */
  const price    = selectedProperty.price || 0;
  const rent     = selectedProperty.rent  || Math.round(price * 0.0062);
  const mortgage = Math.round(price * 0.8 * 0.0065);
  const taxes    = Math.round(price * 0.012 / 12);
  const insurance = Math.max(85, Math.round(price * 0.004 / 12));
  const expenses  = Math.max(250, Math.round(rent * 0.18));
  const vacancy   = Math.round(rent * 0.06);
  const noi       = rent - vacancy - taxes - insurance - expenses;
  const cashFlow  = selectedProperty.cashFlow || Math.round(noi - mortgage);
  const capRate   = price > 0 ? (noi * 12 / price) * 100 : 0;
  const downPmt   = price * 0.2;
  const loanAmt   = price * 0.8;
  const cashOnCash = downPmt > 0 ? (cashFlow * 12 / downPmt) * 100 : 0;
  const grm        = rent > 0 ? price / (rent * 12) : 0;
  const arv        = price * 1.14;
  const arvUpside  = arv - price;

  /* Development */
  const devCost    = devAnalysis?.calc?.totalDevCost || Math.max(12000, Math.round((selectedProperty.sqft || 1600) * 120));
  const devValue   = devAnalysis?.calc?.stabilizedValue || Math.round(price * 1.22);
  const devProfit  = devValue - price - devCost;
  const devRoi     = price + devCost > 0 ? devProfit / (price + devCost) * 100 : 0;
  const devFs      = devAnalysis?.feasibility ?? Math.max(0, Math.min(100, Math.round(58 + devRoi * 1.4 + (devProfit > 0 ? 8 : -12))));

  /* Scores */
  const dealScore  = analysis?.dealScore ?? selectedProperty.score ?? 75;
  const negScore   = negotiation?.strength ?? 60;
  const mktScore   = market?.cinnovaMarketScore ?? 70;
  const neighScore = neighborhood?.neighborhoodScore ?? 65;
  const overallScore = computeOverallScore(dealScore, cashFlow, negScore, mktScore, neighScore);
  const verdict    = getVerdict(overallScore);
  const verdictMeta = VERDICT_MAP[verdict];

  /* Risk breakdown */
  const riskBreakdown = analysis?.riskBreakdown || [
    { factor: 'Market Liquidity',     level: 'Low',      note: 'Active buyer demand supports quick resale if needed.' },
    { factor: 'Cash Flow Stability',  level: cashFlow >= 0 ? 'Low' : 'High', note: cashFlow >= 0 ? 'Positive cash flow provides an income buffer.' : 'Negative cash flow requires capital reserves.' },
    { factor: 'Financing Risk',       level: price >= 1e6 ? 'High' : price >= 600000 ? 'Moderate' : 'Low', note: price >= 1e6 ? 'Jumbo territory — fewer lenders.' : 'Conventional financing available.' },
    { factor: 'Renovation Exposure',  level: 'Moderate', note: 'Budget for inspection-driven repairs before closing.' },
    { factor: 'Valuation Risk',       level: analysis?.riskLevel ?? 'Moderate', note: 'Verify price-per-sqft against recent comparables.' },
  ];

  /* Verdict reasons */
  const verdictReasons = analysis?.verdict?.reasons || (overallScore >= 67
    ? [
        capRate > 0 ? `${capRate.toFixed(1)}% estimated cap rate` : 'Solid asset class fundamentals',
        `Offer range: ${money(price * 0.94)} – ${money(price * 0.98)} leaves room to negotiate`,
        `${money(Math.round(arvUpside))} appreciation upside estimated at 14% above basis`,
      ]
    : [
        'Current price leaves thin margin at conventional financing rates',
        capRate < 5 && capRate > 0 ? `${capRate.toFixed(1)}% cap rate is below the 5% investment threshold` : 'Verify rental income assumptions against market comps',
        'Negotiate price reduction or additional seller credits before committing',
      ]);

  /* Score breakdown components */
  const scoreComponents = [
    { label: 'Deal Fundamentals',   score: dealScore,  weight: '40%', note: 'From Property Analyzer' },
    { label: 'Cash Flow Quality',   score: Math.round(Math.min(100, Math.max(0, 50 + cashFlow / 15))), weight: '20%', note: cashFlow >= 0 ? `+${money(cashFlow)}/mo` : `${money(cashFlow)}/mo` },
    { label: 'Negotiation Strength', score: negScore,  weight: '15%', note: negotiation ? `${negotiation.mode} strategy` : 'No packet saved' },
    { label: 'Market Quality',      score: mktScore,   weight: '15%', note: market.name },
    { label: 'Neighborhood Score',  score: neighScore, weight: '10%', note: neighborhood.name || neighborhood.city },
  ];

  /* Recommended next actions */
  const actions = buildActions(overallScore, capRate, cashFlow, price, negotiation, documents, devProfit);

  return {
    property:   selectedProperty,
    analysis,
    market,
    neighborhood,
    negotiation,
    documents,
    portfolio,
    inPortfolio,
    devAnalysis,
    finance: { price, rent, mortgage, taxes, insurance, expenses, vacancy, noi, cashFlow, capRate, downPmt, loanAmt, cashOnCash, grm, arv, arvUpside },
    development: { cost: devCost, value: devValue, profit: devProfit, roi: devRoi, feasibility: devFs, hasStudioData: Boolean(devAnalysis) },
    riskBreakdown,
    verdictReasons,
    scoreComponents,
    overallScore,
    verdict,
    verdictMeta,
    actions,
  };
}

function buildActions(score, capRate, cashFlow, price, negotiation, documents, devProfit) {
  const items = [];
  items.push({ text: 'Order a professional home inspection within 10 business days — budget $400–$800 for a full structural, mechanical, and electrical assessment.', tag: 'Urgent', tagTone: 'red' });
  if (cashFlow < 0)
    items.push({ text: 'Renegotiate purchase price or request seller credits to close the cash-flow gap before waiving financing contingency.', tag: 'High', tagTone: 'gold' });
  else if (capRate < 5 && capRate > 0)
    items.push({ text: `Run updated rent comps within 0.5 miles — cap rate of ${capRate.toFixed(1)}% is at the lower threshold. Validate income assumptions before closing.`, tag: 'High', tagTone: 'gold' });
  else
    items.push({ text: 'Pull rent comparables within 0.5 miles and confirm rent assumption is achievable. Strong fundamentals — proceed with standard due diligence.', tag: 'Standard', tagTone: 'blue' });
  items.push({ text: 'Obtain lender pre-qualification or loan estimate. Lock rate once under contract. Compare at least 2 lender quotes for fees and points.', tag: 'Finance', tagTone: 'blue' });
  if (!negotiation)
    items.push({ text: 'Open Negotiation Center to model your offer, concessions, and counteroffer strategy before submitting.', tag: 'Strategy', tagTone: 'teal' });
  else
    items.push({ text: `Next offer: ${money(negotiation.suggestedNextOffer)}. Negotiation strength is ${negotiation.strength}/100 — ${negotiation.advice?.split('.')[0] || 'proceed with planned strategy'}.`, tag: 'Strategy', tagTone: 'teal' });
  if (!documents || documents.length === 0)
    items.push({ text: 'Upload purchase contract, inspection report, and appraisal to Document Center for AI analysis.', tag: 'Documents', tagTone: 'blue' });
  else
    items.push({ text: `Review findings from ${documents.length} saved document${documents.length !== 1 ? 's' : ''} in Document Center. Address open items before contingency removal.`, tag: 'Documents', tagTone: 'green' });
  items.push({ text: 'Obtain insurance quote from 2 carriers — confirm dwelling replacement cost coverage and loss-of-rents endorsement for investment use.', tag: 'Insurance', tagTone: 'blue' });
  if (devProfit > 20000)
    items.push({ text: 'Development upside is positive. Run a detailed scenario in Development Studio before making any renovation commitments.', tag: 'Dev', tagTone: 'teal' });
  items.push({ text: 'Request seller disclosure statements, HOA financials, and any recorded CC&Rs from the listing agent before final commitment.', tag: 'Legal', tagTone: 'blue' });
  if (score >= 80)
    items.push({ text: 'Strong fundamentals confirmed. Proceed to final commitment review with your attorney and CPA before signing closing documents.', tag: 'Close', tagTone: 'green' });
  else if (score < 53)
    items.push({ text: 'Deal score below threshold. Before proceeding, get a second broker opinion of value and review whether a price reduction of 5–8% changes the return profile.', tag: 'Review', tagTone: 'red' });
  return items.slice(0, 10);
}

/* ── Main component ──────────────────────────────────────── */
export default function PropertyReport() {
  const navigate = useNavigate();
  const selectedProperty = getSelectedProperty();
  const [saved, setSaved] = useState(false);

  const report = useMemo(() => buildReport(selectedProperty), [selectedProperty]);

  const handlePrint = () => window.print();

  const handleSave = () => {
    if (!report) return;
    localStorage.setItem('cinnova_property_report', JSON.stringify({
      propertyId: report.property.id,
      address:    report.property.fullAddress || report.property.address,
      score:      report.overallScore,
      verdict:    report.verdict,
      savedAt:    new Date().toISOString(),
    }));
    setSaved(true);
  };

  const sendToAdvisor = () => {
    if (report) {
      localStorage.setItem('cinnova_advisor_report_context', JSON.stringify({
        source:      'Property Report',
        address:     report.property.fullAddress || report.property.address,
        score:       report.overallScore,
        verdict:     report.verdict,
        capRate:     report.finance.capRate,
        cashFlow:    report.finance.cashFlow,
        createdAt:   new Date().toISOString(),
      }));
    }
    navigate('/advisor');
  };

  /* ── Empty state ── */
  if (!report) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Property Report</h1>
          <p className="page-subtitle">Generate a professional investment report after selecting a property.</p>
        </div>
        <div className="card pr-empty">
          <div className="pr-empty-icon">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="7" y="4" width="22" height="28" rx="3" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 12h12M12 17h12M12 22h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h2>No property selected</h2>
          <p>Choose a listing from Property Search or open a saved property, then return here to generate a full investment report.</p>
          <div className="pr-actions">
            <button className="btn btn-primary"  type="button" onClick={() => navigate('/property-search')}>Search Properties</button>
            <button className="btn btn-outline"  type="button" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  const { property, analysis, market, neighborhood, negotiation, documents, finance, development, riskBreakdown, verdictReasons, scoreComponents, overallScore, verdict, verdictMeta, actions } = report;
  const { color } = verdictMeta;

  return (
    <div className="page pr-page">
      {/* ── Print header (only visible when printing) ── */}
      <div className="pr-print-header">
        <div>
          <span className="pr-print-brand">CinNova Investment Report</span>
          <p>{property.fullAddress || property.address}</p>
        </div>
        <div>
          <span className="pr-print-score">{overallScore}/100</span>
          <p>{verdict}</p>
        </div>
      </div>

      <div className="pr-report-shell">

        {/* ── Report Header ── */}
        <div className="pr-report-header">
          <div className="pr-report-header-left">
            <div className="pr-no-print">
              <span className="badge badge-blue">CinNova Investment Report</span>
            </div>
            <h1 className="page-title pr-address-title">{property.fullAddress || property.address}</h1>
            <p className="page-subtitle pr-report-subtitle">
              {[property.type, property.beds && `${property.beds} bd`, property.baths && `${property.baths} ba`, property.sqft && `${Number(property.sqft).toLocaleString()} sqft`].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className={`pr-score-badge pr-score-badge--${color}`}>
            <span className="pr-score-num">{overallScore}</span>
            <span className="pr-score-label">Overall Score</span>
            <span className={`pr-score-verdict pr-score-verdict--${color}`}>{verdict}</span>
          </div>
        </div>

        {/* ── Action Bar ── */}
        <div className="pr-actions pr-no-print">
          <button className="btn btn-primary"  type="button" onClick={handlePrint}>Print Report</button>
          <button className={`btn ${saved ? 'btn-ghost' : 'btn-teal'}`} type="button" onClick={handleSave} disabled={saved}>
            {saved ? '✓ Report Saved' : 'Save Report'}
          </button>
          <button className="btn btn-outline"  type="button" onClick={sendToAdvisor}>Send to AI Advisor</button>
          <button className="btn btn-ghost"    type="button" onClick={() => navigate('/deal-analyzer')}>Deal Analyzer</button>
          <button className="btn btn-ghost"    type="button" onClick={() => navigate('/dashboard')}>Dashboard</button>
        </div>

        {/* ── Section 1: Executive Summary ── */}
        <ReportSection number="1" title="Executive Summary" badge={property.type}>
          <div className="pr-exec-grid">
            <div className="pr-exec-facts">
              <div className="pr-summary-grid pr-summary-grid--four">
                <Metric label="Purchase Price"  value={money(finance.price)}               tone="blue" />
                <Metric label="Monthly Rent"    value={`${money(finance.rent)}/mo`}         tone="teal" />
                <Metric label="Monthly Cash Flow" value={`${finance.cashFlow >= 0 ? '+' : ''}${money(finance.cashFlow)}/mo`} tone={finance.cashFlow >= 0 ? 'green' : 'red'} />
                <Metric label="Cap Rate"        value={pct(finance.capRate)}               tone="gold" />
              </div>
              <div className="pr-exec-summary">
                {overallScore >= 80
                  ? `This property presents a compelling investment opportunity with strong fundamentals across deal score, cash flow, and market quality. The ${neighborhood.investmentGrade || 'A'}-grade location and ${pct(finance.capRate)} estimated cap rate support an immediate purchase decision pending standard due diligence.`
                  : overallScore >= 67
                  ? `This property is a solid investment candidate with workable fundamentals. The cash flow profile and market conditions are favorable; proceed with standard due diligence, a robust inspection, and an aggressive offer strategy to improve the return profile.`
                  : overallScore >= 53
                  ? `This property has potential but the current assumptions are tight. A price reduction, seller credits, or improved rental income could bring this deal into strong-buy territory. Evaluate carefully before committing.`
                  : `The current deal does not meet minimum investment criteria. Significant price renegotiation — targeting ${pct(7)} (${money(finance.price - finance.price * 0.07)} reduction) — or alternative use scenarios are needed before committing capital.`
                }
              </div>
            </div>
            <div className="pr-score-components">
              <div className="pr-score-comp-title">Score Breakdown</div>
              {scoreComponents.map(c => (
                <div key={c.label} className="pr-score-comp-row">
                  <div className="pr-score-comp-left">
                    <span className="pr-score-comp-label">{c.label}</span>
                    <span className="pr-score-comp-note">{c.note}</span>
                  </div>
                  <div className="pr-score-comp-right">
                    <div className="pr-score-comp-bar-track">
                      <div className={`pr-score-comp-bar pr-score-comp-bar--${scoreColor(c.score)}`} style={{ width: `${c.score}%` }} />
                    </div>
                    <span className={`pr-score-comp-val pr-score-comp-val--${scoreColor(c.score)}`}>{c.score}</span>
                    <span className="pr-score-comp-weight">{c.weight}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ReportSection>

        {/* ── Section 2: Investment Verdict ── */}
        <ReportSection number="2" title="Investment Verdict" badge={verdict} badgeTone={color}>
          <div className={`pr-verdict pr-verdict--${color}`}>
            <div className="pr-verdict-left">
              <span className={`pr-verdict-label pr-verdict-label--${color}`}>{verdict}</span>
              <p className="pr-verdict-summary">
                {analysis?.verdict?.summary || (overallScore >= 80
                  ? 'Exceptional opportunity with strong fundamentals and favorable risk-adjusted returns across cash flow, market, and neighborhood quality.'
                  : overallScore >= 67
                  ? 'Solid deal with good cash flow potential. Minor concerns are manageable with proper due diligence and an aggressive offer approach.'
                  : overallScore >= 53
                  ? 'Borderline opportunity. Proceed with caution. Negotiate aggressively on price and verify income assumptions before committing.'
                  : 'This property does not meet minimum investment criteria at the current asking price. Restructure or pass.')}
              </p>
              <div className="pr-verdict-reasons">
                {verdictReasons.map((r, i) => (
                  <div key={i} className="pr-verdict-reason">
                    <span className={`pr-verdict-dot pr-verdict-dot--${color}`} />
                    {r}
                  </div>
                ))}
              </div>
            </div>
            <div className="pr-verdict-right">
              <div className="pr-score-donut">
                <svg viewBox="0 0 96 96" width="96" height="96">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="var(--gray-100)" strokeWidth="10" />
                  <circle cx="48" cy="48" r="40" fill="none"
                    stroke={verdictMeta.hex}
                    strokeWidth="10"
                    strokeDasharray={`${(overallScore / 100) * 251.2} 251.2`}
                    strokeLinecap="round"
                    transform="rotate(-90 48 48)"
                  />
                </svg>
                <div className="pr-score-donut-inner">
                  <strong>{overallScore}</strong>
                  <small>/100</small>
                </div>
              </div>
              <div className="pr-verdict-deal-score">
                <span>Deal Score</span>
                <strong>{analysis?.dealScore ?? 75}</strong>
              </div>
            </div>
          </div>
        </ReportSection>

        {/* ── Section 3: Risk Summary ── */}
        <ReportSection number="3" title="Risk Summary" badge={analysis?.riskLevel || 'Moderate'} badgeTone={RISK_LEVEL_COLOR[analysis?.riskLevel || 'Moderate'] || 'gold'} pageBreak>
          <p className="pr-copy">
            {riskBreakdown.filter(r => r.level === 'High').length >= 2
              ? 'Multiple high-risk factors identified. Resolve financing, valuation, and cash flow concerns before closing.'
              : riskBreakdown.filter(r => r.level === 'Low').length >= 3
              ? 'Risk profile is favorable. Standard due diligence and contingencies are sufficient for this deal.'
              : 'Mixed risk profile. Address elevated factors through negotiation, contingencies, and insurance before committing.'}
          </p>
          <div className="pr-risk-list">
            {riskBreakdown.map((r, i) => (
              <RiskRow key={i} factor={r.factor} level={r.level} note={r.note} />
            ))}
          </div>
        </ReportSection>

        {/* ── Sections 4–5: Financial Metrics + Market Snapshot ── */}
        <div className="pr-two-col">

          {/* Section 4: Financial Metrics */}
          <ReportSection number="4" title="Financial Metrics" badge={finance.cashFlow >= 0 ? 'Positive Cash Flow' : 'Negative Cash Flow'} badgeTone={finance.cashFlow >= 0 ? 'green' : 'red'}>
            <div className="pr-summary-grid pr-summary-grid--two">
              <Metric label="Down Payment"    value={fmt$K(finance.downPmt)}              tone="blue" sub="20% conventional" />
              <Metric label="Loan Amount"     value={fmt$K(finance.loanAmt)}              tone="blue" sub="80% LTV" />
              <Metric label="Monthly Mortgage" value={`${money(finance.mortgage)}/mo`}    tone="blue" sub="6.82% · 30yr" />
              <Metric label="Property Taxes"  value={`${money(finance.taxes)}/mo`}        tone="gold" sub="1.2% annual est." />
            </div>
            <div className="pr-row-list" style={{ marginTop: 14 }}>
              <Row label="Gross Monthly Rent"       value={`${money(finance.rent)}/mo`} />
              <Row label="Vacancy Reserve (6%)"     value={`−${money(finance.vacancy)}/mo`} />
              <Row label="Operating Expenses (18%)" value={`−${money(finance.expenses)}/mo`} />
              <Row label="Taxes + Insurance"        value={`−${money(finance.taxes + finance.insurance)}/mo`} />
              <Row label="Net Operating Income"     value={`${money(finance.noi)}/mo`}       tone="teal" />
              <Row label="Monthly Cash Flow"        value={`${finance.cashFlow >= 0 ? '+' : ''}${money(finance.cashFlow)}/mo`} tone={finance.cashFlow >= 0 ? 'green' : 'red'} />
            </div>
            <div className="pr-mini-metrics" style={{ marginTop: 14 }}>
              <div className="pr-mini-metric"><span>Cap Rate</span><strong>{pct(finance.capRate)}</strong></div>
              <div className="pr-mini-metric"><span>Cash-on-Cash</span><strong>{pct(finance.cashOnCash)}</strong></div>
              <div className="pr-mini-metric"><span>GRM</span><strong>{finance.grm.toFixed(1)}x</strong></div>
              <div className="pr-mini-metric"><span>ARV Upside</span><strong>{fmt$K(finance.arvUpside)}</strong></div>
            </div>
          </ReportSection>

          {/* Section 5: Market Snapshot */}
          <ReportSection number="5" title="Market Snapshot" badge={market.name}>
            <p className="pr-copy">{market.insight}</p>
            <div className="pr-row-list">
              <Row label="CinNova Market Score"    value={`${market.cinnovaMarketScore}/100`} tone={market.cinnovaMarketScore >= 80 ? 'green' : market.cinnovaMarketScore >= 60 ? 'teal' : 'gold'} />
              <Row label="Median Home Price"       value={money(market.medianHomePrice)} />
              <Row label="Average Rent"            value={`${money(market.averageRent)}/mo`} />
              <Row label="Price Appreciation (YoY)" value={pct(market.priceAppreciationYoY ?? market.yoyGrowth ?? 4.2)} />
              <Row label="Avg Days on Market"      value={`${market.avgDaysOnMarket ?? 28} days`} />
              <Row label="Inventory Level"         value={market.inventoryLevel ?? 'Moderate'} />
              <Row label="Market Forecast"         value={market.forecast} />
            </div>
          </ReportSection>
        </div>

        {/* ── Sections 6: Neighborhood Snapshot (full width) ── */}
        <ReportSection number="6" title="Neighborhood Snapshot" badge={neighborhood.investmentGrade || 'B+'} pageBreak>
          <div className="pr-two-col pr-two-col--inner">
            <div>
              <p className="pr-copy">{neighborhood.insight}</p>
              <div className="pr-row-list">
                <Row label="Neighborhood Score"   value={`${neighborhood.neighborhoodScore}/100`}    tone={neighborhood.neighborhoodScore >= 80 ? 'green' : 'teal'} />
                <Row label="Investor Confidence"  value={`${neighborhood.investorConfidence}/100`} />
                <Row label="Walk Score"           value={`${neighborhood.walkScore}/100`} />
                <Row label="Transit Score"        value={`${neighborhood.transitScore ?? neighborhood.walkScore}/100`} />
              </div>
            </div>
            <div>
              <div className="pr-row-list">
                <Row label="Vacancy Rate"         value={pct(neighborhood.vacancyRate)} tone={neighborhood.vacancyRate < 5 ? 'green' : neighborhood.vacancyRate < 8 ? 'teal' : 'gold'} />
                <Row label="Median Household Income" value={money(neighborhood.medianHouseholdIncome ?? 75000)} />
                <Row label="Crime Index"          value={neighborhood.crimeIndex ?? 'Below Average'} />
                <Row label="School Rating"        value={neighborhood.schoolRating ? `${neighborhood.schoolRating}/10` : '7/10'} />
                <Row label="Investment Grade"     value={neighborhood.investmentGrade || 'B+'} tone="blue" />
              </div>
            </div>
          </div>
        </ReportSection>

        {/* ── Section 7: Development Potential ── */}
        <ReportSection number="7" title="Development Potential" badge={`${development.feasibility}/100`} badgeTone={development.feasibility >= 70 ? 'green' : development.feasibility >= 50 ? 'blue' : development.feasibility >= 35 ? 'gold' : 'red'}>
          <div className="pr-summary-grid pr-summary-grid--four">
            <Metric label="Value-Add Budget"  value={fmt$K(development.cost)}   tone="gold"  sub={development.hasStudioData ? 'From Dev Studio' : 'Estimated'} />
            <Metric label="Stabilized Value"  value={fmt$K(development.value)}  tone="teal"  />
            <Metric label="Projected Profit"  value={fmt$K(development.profit)} tone={development.profit >= 0 ? 'green' : 'red'} />
            <Metric label="Development ROI"   value={pct(development.roi)}      tone="blue"  />
          </div>
          {development.hasStudioData && report.devAnalysis?.recommendation && (
            <div className="pr-dev-rec">
              <span className="pr-dev-rec-label">Dev Studio Recommendation</span>
              <span className={`badge badge-${development.feasibility >= 70 ? 'green' : development.feasibility >= 50 ? 'blue' : 'gold'}`}>
                {report.devAnalysis.recommendation}
              </span>
              {report.devAnalysis?.projectType && <span className="pr-dev-rec-type">{report.devAnalysis.projectType}</span>}
            </div>
          )}
          <p className="pr-copy" style={{ marginTop: 12 }}>
            {development.profit > 40000
              ? `Renovation upside of ${fmt$K(development.profit)} is meaningful. A ${development.hasStudioData ? 'full studio analysis has been run' : 'Development Studio analysis is recommended'} before committing capital to value-add improvements.`
              : development.profit > 0
              ? `Modest renovation upside available. Value-add improvements may be justified in high-rent or rapidly appreciating markets.`
              : `Development scenario does not pencil under current assumptions. Review scope or acquire at a lower price before pursuing improvements.`}
          </p>
          <div className="pr-no-print">
            <button className="btn btn-ghost" type="button" style={{ marginTop: 8 }} onClick={() => navigate('/dev-studio')}>Open Development Studio</button>
          </div>
        </ReportSection>

        {/* ── Sections 8–9: Negotiation + Documents ── */}
        <div className="pr-two-col" style={{ pageBreakBefore: 'always' }}>

          {/* Section 8: Negotiation Position */}
          <ReportSection number="8" title="Negotiation Position" badge={negotiation ? `${negotiation.strength}/100` : 'Not Analyzed'} badgeTone={negotiation ? (negotiation.strength >= 70 ? 'green' : negotiation.strength >= 50 ? 'blue' : 'gold') : 'gray'}>
            {negotiation ? (
              <>
                <div className="pr-summary-grid pr-summary-grid--two">
                  <Metric label="Strategy Mode"      value={negotiation.mode}                        tone="blue" />
                  <Metric label="Negotiation Strength" value={`${negotiation.strength}/100`}         tone={negotiation.strength >= 70 ? 'green' : negotiation.strength >= 50 ? 'blue' : 'gold'} />
                </div>
                <div className="pr-row-list" style={{ marginTop: 14 }}>
                  <Row label="Suggested Next Offer" value={money(negotiation.suggestedNextOffer)} tone="teal" />
                  <Row label="Midpoint"             value={money(negotiation.midpoint ?? (finance.price * 0.97))} />
                </div>
                <div className="pr-neg-advice">
                  <span>Advisor Guidance</span>
                  <p>{negotiation.advice}</p>
                </div>
                {Array.isArray(negotiation.leveragePoints) && negotiation.leveragePoints.filter(Boolean).length > 0 && (
                  <div className="pr-neg-leverage">
                    <span className="pr-neg-leverage-title">Leverage Points</span>
                    {negotiation.leveragePoints.filter(Boolean).map((pt, i) => (
                      <div key={i} className="pr-neg-point">
                        <span className="pr-neg-dot" />
                        {pt}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="pr-no-data">
                <p>No negotiation packet found. Open Negotiation Center to model your offer strategy, counteroffers, and leverage position.</p>
                <button className="btn btn-ghost pr-no-print" type="button" style={{ marginTop: 10 }} onClick={() => navigate('/negotiation')}>Open Negotiation Center</button>
              </div>
            )}
          </ReportSection>

          {/* Section 9: Document Findings */}
          <ReportSection number="9" title="Document Findings" badge={documents?.length ? `${documents.length} Document${documents.length !== 1 ? 's' : ''}` : 'No Documents'} badgeTone={documents?.length ? 'green' : 'gray'}>
            {documents && documents.length > 0 ? (
              <div className="pr-doc-list">
                {documents.slice(0, 6).map((doc, i) => (
                  <div key={doc.id || i} className="pr-doc-row">
                    <div className="pr-doc-icon">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M4 4.5h6M4 7h6M4 9.5h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="pr-doc-body">
                      <strong>{doc.name || doc.type || `Document ${i + 1}`}</strong>
                      <span>{doc.type || 'Uploaded document'}</span>
                    </div>
                    <span className="badge badge-green">Saved</span>
                  </div>
                ))}
                {documents.length > 6 && (
                  <p className="pr-doc-more">+{documents.length - 6} more document{documents.length - 6 !== 1 ? 's' : ''} in Document Center</p>
                )}
              </div>
            ) : (
              <div className="pr-no-data">
                <p>No documents analyzed yet. Upload purchase contract, inspection report, appraisal, and disclosures to Document Center for AI findings.</p>
                <button className="btn btn-ghost pr-no-print" type="button" style={{ marginTop: 10 }} onClick={() => navigate('/documents')}>Open Document Center</button>
              </div>
            )}
          </ReportSection>
        </div>

        {/* ── Section 10: Recommended Next Actions ── */}
        <ReportSection number="10" title="Recommended Next Actions" badge={`${actions.length} Actions`} badgeTone="teal" pageBreak>
          <p className="pr-copy">
            The following actions are prioritized based on deal score ({overallScore}/100), current due diligence status, and market conditions.
          </p>
          <div className="pr-actions-list">
            {actions.map((a, i) => (
              <ActionItem key={i} num={i + 1} text={a.text} tag={a.tag} tagTone={a.tagTone} />
            ))}
          </div>
        </ReportSection>

        {/* ── Print footer ── */}
        <div className="pr-print-footer">
          <p>Generated by CinNova · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · This report is for informational purposes only and does not constitute investment advice.</p>
        </div>

      </div>
    </div>
  );
}
