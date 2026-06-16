import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSelectedProperty } from '../services/propertyWorkflow';
import './NegotiationCenter.css';

const DEFAULTS = {
  mode: 'Buyer',
  propertyAddress: '',
  listPrice: '425000',
  marketValue: '438000',
  offerPrice: '398000',
  counterOffer: '414000',
  repairEstimate: '28000',
  closingCostPct: '3.2',
  sellerCredit: '8500',
  daysOnMarket: '42',
  competingOffers: '1',
  earnestMoneyPct: '2',
  inspectionDays: '10',
  financingDays: '24',
  sellerMotivation: 'Moderate',
};

const MOTIVATION_SCORE = {
  Low: -10,
  Moderate: 4,
  High: 16,
};

const fmtMoney = value => {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(Math.round(value || 0)).toLocaleString()}`;
};

const parseNum = value => {
  const n = parseFloat(String(value ?? '').replace(/[$,%\s,]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function initFromSelected() {
  const property = getSelectedProperty();
  if (!property) return DEFAULTS;
  const price = property.price || 425000;
  return {
    ...DEFAULTS,
    propertyAddress: property.fullAddress || property.address || '',
    listPrice: String(price),
    marketValue: String(Math.round(price * 1.03)),
    offerPrice: String(Math.round(price * 0.94)),
    counterOffer: String(Math.round(price * 0.975)),
    repairEstimate: String(Math.max(12000, Math.round((property.sqft || 1600) * 14))),
  };
}

function MetricCard({ label, value, sub, tone = 'blue' }) {
  return (
    <div className={`nc-metric nc-metric--${tone}`}>
      <span className="nc-metric-label">{label}</span>
      <strong>{value}</strong>
      {sub && <span className="nc-metric-sub">{sub}</span>}
    </div>
  );
}

function StrengthBar({ value }) {
  const tone = value >= 76 ? 'green' : value >= 56 ? 'blue' : value >= 38 ? 'gold' : 'red';
  return (
    <div className="nc-strength-card">
      <div className="nc-strength-top">
        <span className={`badge badge-${tone}`}>Negotiation Strength</span>
        <strong>{value}/100</strong>
      </div>
      <div className="nc-strength-track">
        <div className={`nc-strength-fill nc-strength-fill--${tone}`} style={{ width: `${value}%` }} />
      </div>
      <p>
        Score blends price position, days on market, repair leverage, competition, timing, and seller motivation.
      </p>
    </div>
  );
}

function ProbabilityRow({ label, value, tone }) {
  return (
    <div className="nc-prob-row">
      <div className="nc-prob-meta">
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="nc-prob-track">
        <div className={`nc-prob-fill nc-prob-fill--${tone}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function NegotiationCenter() {
  const navigate = useNavigate();
  const selectedProperty = getSelectedProperty();
  const [form, setForm] = useState(initFromSelected);
  const [connected, setConnected] = useState(Boolean(selectedProperty));
  const [sent, setSent] = useState(false);

  const result = useMemo(() => {
    const list = parseNum(form.listPrice);
    const market = parseNum(form.marketValue) || list;
    const offer = parseNum(form.offerPrice);
    const counter = parseNum(form.counterOffer);
    const repairs = parseNum(form.repairEstimate);
    const closingPct = parseNum(form.closingCostPct) / 100;
    const sellerCredit = parseNum(form.sellerCredit);
    const dom = parseNum(form.daysOnMarket);
    const competing = parseNum(form.competingOffers);
    const earnestPct = parseNum(form.earnestMoneyPct);
    const inspectionDays = parseNum(form.inspectionDays);
    const financingDays = parseNum(form.financingDays);
    const buyerMode = form.mode === 'Buyer';

    const marketGap = market ? (market - offer) / market : 0;
    const listGap = list ? (list - offer) / list : 0;
    const repairLeverage = list ? repairs / list : 0;
    const closingCosts = offer * closingPct;
    const cashToClose = offer * (earnestPct / 100) + closingCosts - sellerCredit;
    const netOfferToSeller = offer - sellerCredit;
    const counterGap = counter - offer;
    const midpoint = offer + counterGap * 0.5;
    const concessionAsk = sellerCredit + repairs * 0.42;
    const domLift = clamp((dom - 21) * 0.75, -12, 28);
    const competitionDrag = clamp(competing * 9, 0, 36);
    const contingencyDrag = clamp((inspectionDays - 7) * 1.1 + (financingDays - 21) * 0.45, -8, 16);
    const motivation = MOTIVATION_SCORE[form.sellerMotivation] ?? 0;

    const buyerStrength = clamp(Math.round(
      50 + marketGap * 110 + repairLeverage * 82 + domLift + motivation - competitionDrag - contingencyDrag
    ), 0, 100);
    const sellerStrength = clamp(Math.round(
      50 - listGap * 85 - repairLeverage * 55 - domLift - motivation + competitionDrag + contingencyDrag
    ), 0, 100);
    const strength = buyerMode ? buyerStrength : sellerStrength;

    const acceptance = clamp(Math.round(
      46 + (offer / Math.max(list, 1) - 0.94) * 170 + dom * 0.28 + motivation - competing * 8 - repairLeverage * 38
    ), 6, 92);
    const counterLikelihood = clamp(Math.round(70 - acceptance * 0.42 + competing * 4 + Math.abs(counterGap / Math.max(list, 1)) * 65), 8, 88);
    const walkRisk = clamp(100 - acceptance - Math.round(counterLikelihood * 0.52), 4, 72);

    const leverageAdjustment = buyerMode
      ? (strength >= 72 ? -0.014 : strength >= 52 ? 0.004 : 0.018)
      : (strength >= 72 ? 0.018 : strength >= 52 ? 0.006 : -0.012);
    const suggestedNextOffer = buyerMode
      ? Math.min(counter, Math.max(offer, midpoint + list * leverageAdjustment - repairs * 0.12))
      : Math.max(offer, Math.min(counter, midpoint + list * leverageAdjustment + repairs * 0.08));
    const maxWalkAway = buyerMode
      ? Math.min(market * 0.985, list * 0.992)
      : Math.max(market * 0.965, offer);

    const risks = [
      competing >= 3 ? 'High competition may limit price and concession leverage.' : null,
      inspectionDays < 7 ? 'Short inspection window can compress due diligence.' : null,
      financingDays < 21 ? 'Fast financing deadline could create approval pressure.' : null,
      sellerCredit > offer * 0.03 ? 'Seller credit request is above common 3% financing limits.' : null,
      repairs > list * 0.08 ? 'Repair exposure is large enough to warrant contractor bids before final terms.' : null,
      offer > market ? 'Offer is above estimated market value; appraisal gap risk increases.' : null,
    ].filter(Boolean);

    const concessions = buyerMode
      ? [
          `Ask for ${fmtMoney(Math.min(concessionAsk, offer * 0.035))} in seller-paid credits tied to repairs and closing costs.`,
          `Keep inspection at ${Math.max(7, inspectionDays)} days unless seller requires speed; preserve exit rights.`,
          competing > 1 ? 'Use stronger earnest money or lender proof instead of waiving key contingencies.' : 'Request appliance, warranty, or rate-buydown support before increasing price.',
        ]
      : [
          `Counter at ${fmtMoney(suggestedNextOffer)} and cap seller credits near ${fmtMoney(Math.max(2500, offer * 0.012))}.`,
          'Offer faster response deadlines in exchange for cleaner financing and inspection terms.',
          repairs > list * 0.06 ? 'Request buyer repair evidence before accepting broad concession language.' : 'Trade a small credit for a firmer closing date.',
        ];

    const advice = buyerMode
      ? strength >= 70
        ? 'You have useful leverage. Move modestly toward the counter, keep credits specific, and anchor requests in repair documentation.'
        : strength >= 50
          ? 'This is a balanced negotiation. Improve terms before raising price: earnest money, closing timeline, and proof of funds carry weight.'
          : 'Your leverage is thin. If this is a must-win property, simplify concessions and make your next offer close to the midpoint.'
      : strength >= 70
        ? 'Seller leverage is strong. Protect net proceeds, counter with clean deadlines, and require buyer proof before granting credits.'
        : strength >= 50
          ? 'Hold near the counter but trade selectively. Credits should buy speed, certainty, or contingency removal.'
          : 'The buyer has leverage. Preserve the deal by meeting near midpoint and narrowing repair language to documented items.';

    return {
      closingCosts,
      cashToClose,
      netOfferToSeller,
      concessionAsk,
      suggestedNextOffer,
      maxWalkAway,
      strength,
      acceptance,
      counterLikelihood,
      walkRisk,
      concessions,
      risks,
      advice,
    };
  }, [form]);

  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setSent(false);
  };

  const connectProperty = () => {
    const property = getSelectedProperty();
    if (!property) return;
    const price = property.price || parseNum(form.listPrice);
    setForm(prev => ({
      ...prev,
      propertyAddress: property.fullAddress || property.address || prev.propertyAddress,
      listPrice: String(price),
      marketValue: String(Math.round(price * 1.03)),
      offerPrice: String(Math.round(price * 0.94)),
      counterOffer: String(Math.round(price * 0.975)),
      repairEstimate: String(Math.max(12000, Math.round((property.sqft || 1600) * 14))),
    }));
    setConnected(true);
  };

  const sendToAdvisor = () => {
    const payload = {
      source: 'Negotiation AI',
      property: form.propertyAddress,
      mode: form.mode,
      offerPrice: parseNum(form.offerPrice),
      suggestedNextOffer: Math.round(result.suggestedNextOffer),
      strength: result.strength,
      risks: result.risks,
      concessions: result.concessions,
      advice: result.advice,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('cinnova_negotiation_result', JSON.stringify(payload));
    setSent(true);
    navigate('/advisor');
  };

  return (
    <div className="page">
      <div className="nc-header">
        <div>
          <h1 className="page-title">Negotiation AI</h1>
          <p className="page-subtitle">
            Model buyer and seller leverage, counteroffers, closing costs, concessions, risk, and the next best offer.
          </p>
        </div>
        <div className="nc-summary">
          <span className="nc-summary-value">{result.strength}</span>
          <span className="nc-summary-label">Strength Score</span>
        </div>
      </div>

      <div className="nc-mode-row section">
        {['Buyer', 'Seller'].map(mode => (
          <button
            key={mode}
            type="button"
            className={`nc-mode-btn${form.mode === mode ? ' active' : ''}`}
            onClick={() => setForm(prev => ({ ...prev, mode }))}
          >
            {mode} Mode
          </button>
        ))}
        <button className="btn btn-outline btn-sm" type="button" onClick={connectProperty} disabled={!selectedProperty}>
          {connected ? 'Property Connected' : 'Connect Selected Property'}
        </button>
        <button className="btn btn-teal btn-sm" type="button" onClick={sendToAdvisor}>
          {sent ? 'Sent to AI Advisor' : 'Send Results to AI Advisor'}
        </button>
      </div>

      {selectedProperty && (
        <div className="nc-property-strip section">
          <span className="badge badge-teal">Selected Property</span>
          <strong>{selectedProperty.fullAddress || selectedProperty.address}</strong>
          <span>{fmtMoney(selectedProperty.price)} list context</span>
        </div>
      )}

      <div className="nc-layout section">
        <div className="card nc-input-card">
          <div className="card-header">
            <h2 className="card-title">Negotiation Inputs</h2>
            <span className="badge badge-blue">{form.mode} Workspace</span>
          </div>
          <form className="nc-form">
            <div className="form-group col-span-2">
              <label className="form-label">Property</label>
              <input name="propertyAddress" className="form-input" value={form.propertyAddress} onChange={handleChange} placeholder="Connect or enter property address" />
            </div>
            <div className="form-group">
              <label className="form-label">List Price</label>
              <input name="listPrice" className="form-input" value={form.listPrice} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Estimated Market Value</label>
              <input name="marketValue" className="form-input" value={form.marketValue} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Offer Price</label>
              <input name="offerPrice" className="form-input" value={form.offerPrice} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Counteroffer</label>
              <input name="counterOffer" className="form-input" value={form.counterOffer} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Repair Estimate</label>
              <input name="repairEstimate" className="form-input" value={form.repairEstimate} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Seller Credit</label>
              <input name="sellerCredit" className="form-input" value={form.sellerCredit} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Closing Cost %</label>
              <input name="closingCostPct" className="form-input" value={form.closingCostPct} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Days on Market</label>
              <input name="daysOnMarket" className="form-input" value={form.daysOnMarket} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Competing Offers</label>
              <input name="competingOffers" className="form-input" value={form.competingOffers} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Earnest Money %</label>
              <input name="earnestMoneyPct" className="form-input" value={form.earnestMoneyPct} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Inspection Days</label>
              <input name="inspectionDays" className="form-input" value={form.inspectionDays} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Financing Days</label>
              <input name="financingDays" className="form-input" value={form.financingDays} onChange={handleChange} />
            </div>
            <div className="form-group col-span-2">
              <label className="form-label">Seller Motivation</label>
              <select name="sellerMotivation" className="form-select" value={form.sellerMotivation} onChange={handleChange}>
                <option>Low</option>
                <option>Moderate</option>
                <option>High</option>
              </select>
            </div>
          </form>
        </div>

        <div className="nc-results">
          <StrengthBar value={result.strength} />
          <div className="nc-metric-grid">
            <MetricCard label="Suggested Next Offer" value={fmtMoney(result.suggestedNextOffer)} sub={form.mode === 'Buyer' ? 'Recommended next buyer move' : 'Recommended seller counter'} tone="teal" />
            <MetricCard label="Walk-Away Anchor" value={fmtMoney(result.maxWalkAway)} sub="Do-not-cross reference point" tone="gold" />
            <MetricCard label="Net to Seller" value={fmtMoney(result.netOfferToSeller)} sub="Offer less credits" />
            <MetricCard label="Cash to Close" value={fmtMoney(result.cashToClose)} sub="Earnest money + closing costs - credits" tone="green" />
            <MetricCard label="Closing Costs" value={fmtMoney(result.closingCosts)} sub={`${form.closingCostPct}% of offer price`} />
            <MetricCard label="Concession Target" value={fmtMoney(result.concessionAsk)} sub="Credits plus repair leverage" tone="gold" />
          </div>
        </div>
      </div>

      <div className="grid-2 section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Counteroffer Simulator</h2>
            <span className="badge badge-gold">Response Odds</span>
          </div>
          <div className="nc-prob-list">
            <ProbabilityRow label="Accept likelihood" value={result.acceptance} tone="green" />
            <ProbabilityRow label="Counter likelihood" value={result.counterLikelihood} tone="blue" />
            <ProbabilityRow label="Walk-away risk" value={result.walkRisk} tone="gold" />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">AI Negotiation Advice</h2>
            <span className="badge badge-blue">{form.mode}</span>
          </div>
          <p className="nc-ai-advice">{result.advice}</p>
          <div className="nc-advice-list">
            {result.concessions.map(item => (
              <div key={item} className="nc-advice nc-advice--blue">
                <span>Recommended concession</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2 section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Closing Cost Analysis</h2>
            <span className="badge badge-teal">Estimated</span>
          </div>
          <div className="nc-row-list">
            <div><span>Offer price</span><strong>{fmtMoney(parseNum(form.offerPrice))}</strong></div>
            <div><span>Estimated closing costs</span><strong>{fmtMoney(result.closingCosts)}</strong></div>
            <div><span>Seller credit</span><strong>-{fmtMoney(parseNum(form.sellerCredit))}</strong></div>
            <div><span>Earnest money deposit</span><strong>{fmtMoney(parseNum(form.offerPrice) * (parseNum(form.earnestMoneyPct) / 100))}</strong></div>
            <div className="nc-row-total"><span>Modeled cash to close</span><strong>{fmtMoney(result.cashToClose)}</strong></div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Risk Indicators</h2>
            <span className={`badge ${result.risks.length ? 'badge-gold' : 'badge-green'}`}>
              {result.risks.length ? `${result.risks.length} flags` : 'Clean'}
            </span>
          </div>
          {result.risks.length ? (
            <div className="nc-risk-list">
              {result.risks.map(risk => (
                <div key={risk} className="nc-risk-item">
                  <span className="nc-risk-dot" />
                  <p>{risk}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="nc-clean-risk">
              <strong>No major negotiation risks under current assumptions.</strong>
              <span>Still confirm comps, lender limits, title status, and repair evidence before final signatures.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
