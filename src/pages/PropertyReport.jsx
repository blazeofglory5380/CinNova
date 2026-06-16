import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MARKET_DATA } from '../data/marketData';
import { NEIGHBORHOOD_MAP, NEIGHBORHOODS } from '../data/neighborhoodData';
import { getProperties } from '../services/propertyStorage';
import { createAnalysisFromProperty, getSelectedProperty } from '../services/propertyWorkflow';
import './PropertyReport.css';

const money = value => `$${Math.round(value || 0).toLocaleString()}`;
const pct = value => `${Number(value || 0).toFixed(1)}%`;

function safeJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

function pickMarket(property) {
  const haystack = `${property?.city || ''} ${property?.fullAddress || ''} ${property?.address || ''}`.toLowerCase();
  return MARKET_DATA.find(m => haystack.includes(m.name.toLowerCase())) || MARKET_DATA[0];
}

function pickNeighborhood(property, market) {
  const haystack = `${property?.fullAddress || ''} ${property?.address || ''}`.toLowerCase();
  return NEIGHBORHOODS.find(n => haystack.includes(n.name.toLowerCase()))
    || NEIGHBORHOODS.find(n => n.city === market.name)
    || NEIGHBORHOOD_MAP.brickell
    || NEIGHBORHOODS[0];
}

function ReportSection({ title, badge, children }) {
  return (
    <section className="card pr-section">
      <div className="card-header">
        <h2 className="card-title">{title}</h2>
        {badge && <span className="badge badge-blue">{badge}</span>}
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

function Row({ label, value }) {
  return (
    <div className="pr-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function PropertyReport() {
  const navigate = useNavigate();
  const selectedProperty = getSelectedProperty();
  const [saved, setSaved] = useState(false);

  const report = useMemo(() => {
    if (!selectedProperty) return null;
    const analyses = getProperties();
    const recent = analyses.find(item =>
      item.property?.id === selectedProperty.id
      || item.form?.address === selectedProperty.fullAddress
      || item.analysis?.address === selectedProperty.fullAddress
    );
    const analysis = recent?.analysis || createAnalysisFromProperty(selectedProperty);
    const market = pickMarket(selectedProperty);
    const neighborhood = pickNeighborhood(selectedProperty, market);
    const negotiation = safeJson('cinnova_negotiation_result');
    const documents = safeJson('cinnova_document_report');

    const price = selectedProperty.price || 0;
    const rent = selectedProperty.rent || Math.round(price * 0.0062);
    const mortgage = Math.round(price * 0.8 * 0.0065);
    const taxes = Math.round(price * 0.012 / 12);
    const insurance = Math.max(85, Math.round(price * 0.004 / 12));
    const expenses = Math.max(250, Math.round(rent * 0.18));
    const vacancy = Math.round(rent * 0.06);
    const noi = rent - vacancy - taxes - insurance - expenses;
    const cashFlow = selectedProperty.cashFlow || Math.round(noi - mortgage);
    const capRate = price > 0 ? (noi * 12 / price) * 100 : 0;
    const downPayment = price * 0.2;
    const cashOnCash = downPayment > 0 ? (cashFlow * 12 / downPayment) * 100 : 0;
    const devCost = Math.max(12000, Math.round((selectedProperty.sqft || 1600) * 120));
    const devValue = Math.round(price * 1.22);
    const devProfit = devValue - price - devCost;
    const devRoi = price + devCost > 0 ? devProfit / (price + devCost) * 100 : 0;

    const score = analysis?.dealScore ?? selectedProperty.score ?? 82;
    const recommendation = score >= 82
      ? 'Proceed with diligence. The property shows strong investment fundamentals, but final commitment should depend on inspection, title, financing, and insurance verification.'
      : score >= 65
        ? 'Proceed selectively. The deal is workable if price, concessions, or operating assumptions improve before closing.'
        : 'Renegotiate or pause. Current assumptions do not leave enough margin for normal vacancy, repairs, and financing pressure.';

    return {
      property: selectedProperty,
      analysis,
      market,
      neighborhood,
      negotiation,
      documents,
      finance: {
        price,
        rent,
        mortgage,
        taxes,
        insurance,
        expenses,
        vacancy,
        noi,
        cashFlow,
        capRate,
        downPayment,
        cashOnCash,
      },
      development: {
        cost: devCost,
        value: devValue,
        profit: devProfit,
        roi: devRoi,
        feasibility: Math.max(0, Math.min(100, Math.round(58 + devRoi * 1.4 + (devProfit > 0 ? 8 : -12)))),
      },
      recommendation,
      score,
    };
  }, [selectedProperty]);

  const handlePrint = () => window.print();

  const handleSave = () => {
    if (!report) return;
    localStorage.setItem('cinnova_property_report', JSON.stringify({
      propertyId: report.property.id,
      address: report.property.fullAddress || report.property.address,
      score: report.score,
      savedAt: new Date().toISOString(),
      report,
    }));
    setSaved(true);
  };

  const sendToAdvisor = () => {
    if (report) {
      localStorage.setItem('cinnova_advisor_report_context', JSON.stringify({
        source: 'Property Report',
        address: report.property.fullAddress || report.property.address,
        score: report.score,
        recommendation: report.recommendation,
        createdAt: new Date().toISOString(),
      }));
    }
    navigate('/advisor');
  };

  if (!report) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Property Report</h1>
          <p className="page-subtitle">Generate a clean investment report after selecting a property.</p>
        </div>
        <div className="card pr-empty">
          <div className="pr-empty-icon">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="7" y="4" width="22" height="28" rx="3" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 12h12M12 17h12M12 22h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h2>No property selected</h2>
          <p>Choose a listing from Property Search or open a saved property, then return here to generate a full report.</p>
          <div className="pr-actions">
            <button className="btn btn-primary" type="button" onClick={() => navigate('/property-search')}>Search Properties</button>
            <button className="btn btn-outline" type="button" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  const { property, analysis, market, neighborhood, negotiation, documents, finance, development } = report;

  return (
    <div className="page pr-page">
      <div className="pr-report-shell">
        <div className="pr-report-header">
          <div>
            <span className="badge badge-blue">CinNova Investment Report</span>
            <h1 className="page-title">{property.fullAddress || property.address}</h1>
            <p className="page-subtitle">
              {property.type} report with deal metrics, mortgage, cash flow, market context, neighborhood intelligence, development feasibility, and AI recommendations.
            </p>
          </div>
          <div className="pr-score">
            <strong>{report.score}</strong>
            <span>AI Score</span>
          </div>
        </div>

        <div className="pr-actions pr-no-print">
          <button className="btn btn-primary" type="button" onClick={handlePrint}>Print Report</button>
          <button className={`btn ${saved ? 'btn-ghost' : 'btn-teal'}`} type="button" onClick={handleSave} disabled={saved}>
            {saved ? 'Report Saved' : 'Save Report'}
          </button>
          <button className="btn btn-outline" type="button" onClick={sendToAdvisor}>Send to AI Advisor</button>
          <button className="btn btn-ghost" type="button" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>

        <ReportSection title="Selected Property Summary" badge={property.type}>
          <div className="pr-summary-grid">
            <Metric label="Purchase Price" value={money(property.price)} tone="blue" />
            <Metric label="Beds / Baths" value={`${property.beds || '-'} / ${property.baths || '-'}`} tone="teal" />
            <Metric label="Square Feet" value={property.sqft ? property.sqft.toLocaleString() : '-'} tone="green" />
            <Metric label="Estimated Rent" value={`${money(finance.rent)}/mo`} tone="gold" />
          </div>
        </ReportSection>

        <div className="pr-two-col">
          <ReportSection title="Deal Metrics" badge={analysis?.riskLevel || 'Investment'}>
            <div className="pr-summary-grid pr-summary-grid--two">
              <Metric label="Deal Score" value={`${report.score}/100`} tone={report.score >= 82 ? 'green' : report.score >= 65 ? 'blue' : 'gold'} />
              <Metric label="Suggested Offer" value={analysis?.suggestedOffer || `${money(finance.price * 0.94)} - ${money(finance.price * 0.98)}`} tone="blue" />
              <Metric label="Cap Rate" value={analysis?.capRate || pct(finance.capRate)} tone="teal" />
              <Metric label="Cash-on-Cash" value={analysis?.cashOnCash || pct(finance.cashOnCash)} tone="green" />
            </div>
          </ReportSection>

          <ReportSection title="Mortgage Summary" badge="Financing">
            <div className="pr-row-list">
              <Row label="Estimated Down Payment" value={analysis?.tco?.downPayment || money(finance.downPayment)} />
              <Row label="Monthly Mortgage" value={`${analysis?.tco?.mortgage || money(finance.mortgage)} / mo`} />
              <Row label="Property Taxes" value={`${analysis?.tco?.propTax || money(finance.taxes)} / mo`} />
              <Row label="Insurance" value={`${analysis?.tco?.insurance || money(finance.insurance)} / mo`} />
            </div>
          </ReportSection>
        </div>

        <div className="pr-two-col">
          <ReportSection title="Cash Flow Summary" badge={finance.cashFlow >= 0 ? 'Positive' : 'Needs Work'}>
            <div className="pr-row-list">
              <Row label="Gross Monthly Rent" value={`${money(finance.rent)} / mo`} />
              <Row label="Vacancy Reserve" value={`-${money(finance.vacancy)} / mo`} />
              <Row label="Operating Expenses" value={`-${money(finance.expenses + finance.taxes + finance.insurance)} / mo`} />
              <Row label="Net Operating Income" value={`${money(finance.noi)} / mo`} />
              <Row label="Monthly Cash Flow" value={`${finance.cashFlow >= 0 ? '+' : '-'}${money(Math.abs(finance.cashFlow))} / mo`} />
            </div>
          </ReportSection>

          <ReportSection title="Development Feasibility" badge={`${development.feasibility}/100`}>
            <div className="pr-summary-grid pr-summary-grid--two">
              <Metric label="Value-Add Budget" value={money(development.cost)} tone="gold" />
              <Metric label="Stabilized Value" value={money(development.value)} tone="teal" />
              <Metric label="Projected Profit" value={money(development.profit)} tone={development.profit >= 0 ? 'green' : 'gold'} />
              <Metric label="Development ROI" value={pct(development.roi)} tone="blue" />
            </div>
          </ReportSection>
        </div>

        <div className="pr-two-col">
          <ReportSection title="Market Intelligence Summary" badge={market.name}>
            <p className="pr-copy">{market.insight}</p>
            <div className="pr-mini-grid">
              <Row label="CinNova Market Score" value={`${market.cinnovaMarketScore}/100`} />
              <Row label="Median Price" value={money(market.medianHomePrice)} />
              <Row label="Average Rent" value={`${money(market.averageRent)}/mo`} />
              <Row label="Forecast" value={market.forecast} />
            </div>
          </ReportSection>

          <ReportSection title="Neighborhood Intelligence Summary" badge={neighborhood.investmentGrade}>
            <p className="pr-copy">{neighborhood.insight}</p>
            <div className="pr-mini-grid">
              <Row label="Neighborhood Score" value={`${neighborhood.neighborhoodScore}/100`} />
              <Row label="Investor Confidence" value={`${neighborhood.investorConfidence}/100`} />
              <Row label="Walk Score" value={`${neighborhood.walkScore}/100`} />
              <Row label="Vacancy" value={pct(neighborhood.vacancyRate)} />
            </div>
          </ReportSection>
        </div>

        <ReportSection title="Document & Negotiation Notes" badge="Context">
          <div className="pr-note-grid">
            <div className="pr-note">
              <span>Document Notes</span>
              <p>
                {documents?.summary
                  || 'No saved document analysis found. Use Document Center to analyze contracts, inspections, appraisals, leases, and missing due diligence items.'}
              </p>
            </div>
            <div className="pr-note">
              <span>Negotiation Notes</span>
              <p>
                {negotiation
                  ? `${negotiation.mode} strategy: next offer ${money(negotiation.suggestedNextOffer)}, strength ${negotiation.strength}/100. ${negotiation.advice}`
                  : 'No saved negotiation packet found. Use Negotiation AI to model offers, concessions, counteroffers, and walk-away risk.'}
              </p>
            </div>
          </div>
        </ReportSection>

        <ReportSection title="AI Recommendation Summary" badge={analysis?.riskLevel || 'CinNova'}>
          <p className="pr-recommendation">{report.recommendation}</p>
          <div className="pr-checklist">
            <span>Confirm inspection and repair scope before contingency removal.</span>
            <span>Verify lender terms, insurance quote, taxes, and HOA obligations.</span>
            <span>Compare final offer against market and neighborhood risk indicators.</span>
          </div>
        </ReportSection>
      </div>
    </div>
  );
}
