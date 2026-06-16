import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSelectedProperty } from '../services/propertyWorkflow';
import './DocumentCenter.css';

const DOC_TYPES = [
  { id: 'purchase-contract',   label: 'Purchase Contract' },
  { id: 'lease-agreement',     label: 'Lease Agreement' },
  { id: 'inspection-report',   label: 'Inspection Report' },
  { id: 'appraisal',           label: 'Appraisal' },
  { id: 'rent-roll',           label: 'Rent Roll' },
  { id: 'financial-statement', label: 'Financial Statement' },
  { id: 'floor-plan',          label: 'Floor Plan / Blueprint' },
  { id: 'zoning-document',     label: 'Zoning Document' },
  { id: 'insurance-document',  label: 'Insurance Document' },
];

const SAMPLE_DOCS = [
  { id: 'doc-1', type: 'purchase-contract',   icon: '📝', name: '2847 Elmwood Ave — Purchase Agreement',     date: 'Jun 12, 2026', size: '1.2 MB', pages: 14 },
  { id: 'doc-2', type: 'lease-agreement',      icon: '🔑', name: 'Unit 4C Residential Lease — 12-Month Term',  date: 'Jun 10, 2026', size: '840 KB', pages: 8  },
  { id: 'doc-3', type: 'inspection-report',    icon: '🔍', name: 'Full Home Inspection — 2847 Elmwood Ave',    date: 'Jun 10, 2026', size: '4.8 MB', pages: 32 },
  { id: 'doc-4', type: 'appraisal',            icon: '📊', name: 'Market Value Appraisal — 2847 Elmwood Ave',  date: 'Jun 8, 2026',  size: '2.1 MB', pages: 22 },
  { id: 'doc-5', type: 'rent-roll',            icon: '📋', name: '12-Unit Portfolio Rent Roll — Q2 2026',      date: 'Jun 6, 2026',  size: '380 KB', pages: 3  },
  { id: 'doc-6', type: 'financial-statement',  icon: '💰', name: 'Trailing 12-Month Income Statement',          date: 'Jun 5, 2026',  size: '520 KB', pages: 6  },
  { id: 'doc-7', type: 'floor-plan',           icon: '📐', name: 'Architectural Floor Plan Set — 3/2 SFR',     date: 'Jun 3, 2026',  size: '6.2 MB', pages: 4  },
  { id: 'doc-8', type: 'zoning-document',      icon: '🏛️', name: 'Zoning Verification Letter — R-2 District',  date: 'Jun 1, 2026',  size: '240 KB', pages: 2  },
  { id: 'doc-9', type: 'insurance-document',   icon: '🛡️', name: 'Dwelling Policy — DP-3 Insurance Binder',    date: 'May 29, 2026', size: '680 KB', pages: 5  },
];

const ANALYSIS = {
  'purchase-contract': {
    status: 'Review Required', statusBadge: 'badge-gold',
    keyTerms: [
      { label: 'Purchase Price',         value: '$485,000' },
      { label: 'Earnest Money',          value: '$9,700 (2%)' },
      { label: 'Contingency Period',     value: '14 calendar days' },
      { label: 'Closing Date',           value: 'July 15, 2026' },
      { label: 'Financing Contingency',  value: 'Yes — 30-day approval window' },
      { label: 'Inspection Contingency', value: 'Yes — 10 business days' },
      { label: 'Possession',             value: 'At closing' },
      { label: 'HOA Transfer Fee',       value: '$450 (buyer responsibility)' },
    ],
    riskFlags: [
      { text: 'As-is clause limits post-inspection renegotiation — seller can reject all repair requests.', severity: 'high' },
      { text: 'No liquidated damages cap — buyer exposure is uncapped if deal falls through after contingency removal.', severity: 'medium' },
      { text: 'Seller retains right to continue showing property through the full contingency period.', severity: 'medium' },
      { text: 'Wire fraud disclosure present but no escrow verification language included in agreement.', severity: 'low' },
    ],
    missingItems: [
      'Seller disclosure statement (property condition report)',
      'Lead paint disclosure (required for pre-1978 structures)',
      'HOA resale certificate and recent meeting minutes',
      'Survey or legal description as a signed attachment',
    ],
    aiSummary: 'This purchase agreement contains standard residential terms but includes an as-is clause that significantly limits post-inspection renegotiation. The 14-day contingency window is tight for a property that warrants thorough due diligence. Earnest money at 2% is within market norms. The 30-day financing contingency window may be insufficient for portfolio lenders or non-conventional products — request an extension before signing. The seller disclosure statement is missing and must be received before the contingency period opens.',
    nextSteps: [
      'Request seller disclosure and lead paint disclosure before the contingency period opens',
      'Order a home inspection within 5 days to stay inside the 10-day inspection window',
      'Confirm lender approval timeline against the 30-day financing contingency',
      'Have a real estate attorney review the as-is clause before removing contingencies',
      'Obtain the HOA resale certificate and verify the $450 transfer fee is correctly assigned',
    ],
  },
  'lease-agreement': {
    status: 'Active', statusBadge: 'badge-green',
    keyTerms: [
      { label: 'Tenant',           value: 'James & Maria Thornton' },
      { label: 'Monthly Rent',     value: '$2,400' },
      { label: 'Lease Term',       value: '12 months (Aug 1, 2026 – Jul 31, 2027)' },
      { label: 'Security Deposit', value: '$4,800 (2 months)' },
      { label: 'Late Fee',         value: '$100 after 5-day grace period' },
      { label: 'Pet Policy',       value: 'No pets — strict prohibition' },
      { label: 'Utilities',        value: 'Tenant pays electric/gas; owner pays water/sewer' },
      { label: 'Renewal Notice',   value: '60 days prior to expiration' },
    ],
    riskFlags: [
      { text: 'No rent escalation clause — rent is locked for 12 months regardless of market movement.', severity: 'medium' },
      { text: 'No early termination fee — tenant can exit on 30-day notice; deposit forfeiture is the only recourse.', severity: 'medium' },
      { text: 'Security deposit at 2x monthly may exceed local cap in some jurisdictions — verify before collecting.', severity: 'medium' },
    ],
    missingItems: [
      'Move-in condition checklist (signed by both parties at key handover)',
      'Lead paint disclosure acknowledgment (required for pre-1978 structures)',
      'Bedbug disclosure (required in NY, IL, OH, and other states)',
      'Renter\'s insurance requirement (not addressed in current lease)',
    ],
    aiSummary: 'This 12-month residential lease is straightforward but has several gaps that could create friction for the landlord. The absence of a rent escalation clause is a missed opportunity in an appreciating market. The 60-day renewal notice window is favorable and gives the owner time to relist if needed. The lack of an early termination fee creates unexpected vacancy exposure. Verify the security deposit amount against local ordinance caps before accepting funds.',
    nextSteps: [
      'Verify security deposit cap under the local landlord-tenant ordinance before accepting funds',
      'Execute a move-in condition checklist with photos at key handover',
      'Add a renter\'s insurance requirement as a signed lease addendum',
      'Include a rent escalation clause (CPI or fixed %) for the next renewal cycle',
      'Confirm bedbug and lead paint disclosure requirements for this property\'s state and county',
    ],
  },
  'inspection-report': {
    status: 'Critical Items', statusBadge: 'badge-red',
    keyTerms: [
      { label: 'Inspector',           value: 'Westside Home Inspections LLC' },
      { label: 'Inspection Date',     value: 'June 10, 2026' },
      { label: 'Property Age',        value: 'Est. 1962 (64 years old)' },
      { label: 'Total Deficiencies',  value: '18 items (3 major, 11 moderate, 4 minor)' },
      { label: 'Roof Remaining Life', value: 'Estimated 5–8 years' },
      { label: 'HVAC Age',            value: '22 years (past expected service life)' },
      { label: 'Electrical Service',  value: '100A — undersized for modern loads' },
      { label: 'Plumbing',            value: 'Galvanized — active corrosion in kitchen' },
    ],
    riskFlags: [
      { text: 'Active galvanized pipe corrosion in kitchen — replacement strongly recommended within 12 months.', severity: 'high' },
      { text: 'Foundation crack on northwest corner — structural engineer review required before close.', severity: 'high' },
      { text: 'HVAC furnace at 22 years — well past expected service life; imminent failure risk.', severity: 'high' },
      { text: '100A electrical panel undersized — cannot support EV charging or modern appliance loads without upgrade.', severity: 'medium' },
      { text: 'Roof at 5–8 years remaining life — full replacement likely within planned hold period.', severity: 'medium' },
    ],
    missingItems: [
      'Sewer scope / lateral inspection (not included in standard report)',
      'Radon test (not yet performed)',
      'Mold assessment for crawl space moisture (noted on page 4 but not scoped)',
      'Structural engineer evaluation for the foundation crack (page 9)',
      'Chimney sweep and flue inspection',
    ],
    aiSummary: 'This inspection reveals significant deferred maintenance consistent with a 64-year-old structure. The three critical findings — galvanized plumbing corrosion, an overdue HVAC system, and an uncharacterized foundation crack — must be quantified by licensed specialists before the contingency expires. Total remediation cost for major items is estimated in the $35,000–$58,000 range, which should anchor a price renegotiation. Missing scopes (sewer, radon, mold, foundation) represent additional unknown exposure and must be completed before removing the inspection contingency.',
    nextSteps: [
      'Order sewer scope and radon test immediately — both require 5–7 day lead times',
      'Engage a licensed structural engineer for the foundation crack evaluation on page 9',
      'Obtain licensed plumbing and HVAC contractor bids to quantify deferred maintenance costs',
      'Negotiate a price reduction or seller credits of $35,000–$55,000 based on major findings',
      'Request a 7-day contingency extension to complete all specialist evaluations before deadline',
    ],
  },
  'appraisal': {
    status: 'Completed', statusBadge: 'badge-green',
    keyTerms: [
      { label: 'Appraised Value',   value: '$492,000' },
      { label: 'Contract Price',    value: '$485,000' },
      { label: 'Value Variance',    value: '+$7,000 above contract (favorable)' },
      { label: 'Approach Used',     value: 'Sales comparison + income approach' },
      { label: 'Effective Date',    value: 'June 8, 2026' },
      { label: 'Comparable Sales',  value: '3 comps within 0.4 miles' },
      { label: 'GRM',               value: '14.8x (market range: 13–16x)' },
      { label: 'Condition Rating',  value: 'C3 — Average, deferred maintenance noted' },
    ],
    riskFlags: [
      { text: 'C3 condition rating may trigger lender escrow holdbacks or repair-before-close conditions.', severity: 'medium' },
      { text: 'Closest comparable sold 6 months ago — market conditions may have shifted since the comp date.', severity: 'low' },
    ],
    missingItems: [
      'Rental income verification (if income approach was weighted significantly)',
      'Flood zone determination certificate',
      'Prior appraisal (if available) to confirm value trend over time',
    ],
    aiSummary: 'The appraisal comes in at $492,000, which is $7,000 above the contract price — a favorable outcome confirming the property is not overpriced. The C3 condition rating reflects the deferred maintenance found in the inspection report and may trigger lender conditions. The GRM of 14.8x is within the acceptable range for this submarket. Confirm with the lender whether the C3 rating triggers any escrow holdbacks or mandatory repairs before close.',
    nextSteps: [
      'Confirm with lender whether the C3 condition rating triggers any repair escrows or holdbacks',
      'Verify flood zone status via FEMA map service center and obtain a flood zone determination certificate',
      'Cross-reference appraisal comps with current MLS data to validate the pricing trend',
      'Share the appraisal with your property manager to calibrate rental pricing expectations',
    ],
  },
  'rent-roll': {
    status: 'Verified', statusBadge: 'badge-blue',
    keyTerms: [
      { label: 'Total Units',           value: '12' },
      { label: 'Occupied Units',        value: '11 (91.7% occupancy)' },
      { label: 'Gross Monthly Rent',    value: '$26,400 at full occupancy' },
      { label: 'Actual Collection',     value: '$24,200 (current month)' },
      { label: 'Avg Rent / Unit',       value: '$2,200' },
      { label: 'Below-Market Units',    value: '3 units — est. $220/unit below market' },
      { label: 'Longest Tenancy',       value: '8 years (Unit 6)' },
      { label: 'Month-to-Month Leases', value: '4 units' },
    ],
    riskFlags: [
      { text: '4 units on month-to-month leases — elevated short-term vacancy exposure if tenants exit together.', severity: 'medium' },
      { text: '3 below-market units represent $660/month in uncaptured income — rent bump friction likely at renewal.', severity: 'medium' },
    ],
    missingItems: [
      'Actual signed lease copies for all 12 units (only 8 provided with offer documents)',
      'Security deposit reconciliation and escrow account statements',
      'Delinquency aging report (30/60/90 days past due)',
      'Utility reimbursement history if tenants pay utilities directly',
    ],
    aiSummary: 'The rent roll shows a healthy portfolio at 91.7% occupancy with $26,400 gross monthly potential. The 3 below-market units represent meaningful upside if rents can be brought to market at renewal — verify lease renewal terms before assuming this is achievable. The 4 month-to-month leases are a near-term risk. Request the missing lease copies and the delinquency aging report before finalizing your underwriting assumptions.',
    nextSteps: [
      'Obtain signed lease copies for all 12 units and verify terms independently',
      'Request a 90-day delinquency aging report to identify any collections risk',
      'Verify security deposit amounts and confirm they are held in a compliant escrow account',
      'Model rental income at current vs. market rate to quantify the value-add upside',
      'Negotiate with seller to execute 12-month renewals on month-to-month units before close',
    ],
  },
  'financial-statement': {
    status: 'Under Review', statusBadge: 'badge-teal',
    keyTerms: [
      { label: 'Gross Revenue (T12)',    value: '$287,400' },
      { label: 'Vacancy Loss',           value: '$14,370 (5%)' },
      { label: 'Effective Gross Income', value: '$273,030' },
      { label: 'Operating Expenses',     value: '$109,212 (40% expense ratio)' },
      { label: 'Net Operating Income',   value: '$163,818' },
      { label: 'Reported Cap Rate',      value: '5.8% at $2.825M list price' },
      { label: 'Repairs & Maintenance',  value: '$38,400 (largest expense line)' },
      { label: 'Management Fee',         value: '8% of EGI — included in expenses' },
    ],
    riskFlags: [
      { text: 'Property tax line is based on 2023 assessment — reassessment at purchase price may add $14,000+/year.', severity: 'high' },
      { text: 'Repairs & maintenance at $38,400 is elevated — may mask capex that should be underwritten separately.', severity: 'medium' },
      { text: 'Vacancy assumption of 5% may be understated for the current market — model at 7.5% conservatively.', severity: 'medium' },
    ],
    missingItems: [
      'Bank statements to verify gross revenue (trailing 12 months)',
      'Utility bills to cross-reference operating expense line items',
      'Current year property tax bill with assessed value',
      'Insurance premium schedule and current policy documentation',
    ],
    aiSummary: 'The T12 financials show a 40% expense ratio within the acceptable range for a stabilized multifamily asset. However, the $38,400 repair line warrants detailed itemization — it may reflect genuine maintenance or could be masking deferred capex. The property tax is based on a 2023 assessment; reassessment at purchase price could add $12,000–$18,000 to annual expenses, materially reducing NOI. Rerun underwriting with bank-verified income and a tax-reassessed expense figure before making an offer.',
    nextSteps: [
      'Request 12 months of bank statements to independently verify gross revenue figures',
      'Obtain the current year property tax bill and model reassessment impact at purchase price',
      'Itemize the $38,400 repair expense to separate recurring maintenance from deferred capex',
      'Verify insurance premium against current market rates for comparable assets',
      'Rerun underwriting at 7.5% vacancy and with the reassessed tax figure before finalizing LOI',
    ],
  },
  'floor-plan': {
    status: 'Reviewed', statusBadge: 'badge-blue',
    keyTerms: [
      { label: 'Total Building Area',    value: '2,840 sqft (per plan)' },
      { label: 'Bedrooms / Bathrooms',   value: '3 bed / 2 full + 1 half bath' },
      { label: 'Garage',                 value: '2-car attached (480 sqft)' },
      { label: 'Estimated Lot Coverage', value: '~38% (verify against zoning limit)' },
      { label: 'Ceiling Heights',        value: '9 ft main / 8 ft upper / 8 ft basement' },
      { label: 'Egress Windows',         value: 'Present in all bedrooms (IBC compliant)' },
      { label: 'Plan Scale',             value: '1/4" = 1\'-0" (architectural standard)' },
      { label: 'Drawing Date',           value: 'Undated — verify as-built status' },
    ],
    riskFlags: [
      { text: 'Plan set is undated — confirm this reflects the current as-built condition, not original construction drawings.', severity: 'medium' },
    ],
    missingItems: [
      'Electrical plan (not included in this plan set)',
      'Plumbing plan or riser diagram',
      'Site plan with setbacks and dimensioned property lines',
      'As-built verification against existing structure (field measurement)',
    ],
    aiSummary: 'The architectural floor plan set covers the layout at standard scale with egress windows in all bedrooms — critical for code compliance. The building area of 2,840 sqft is consistent with the tax record but should be independently confirmed with a field measurement. The plan set is missing the electrical and plumbing plans, which are essential for any renovation scope or contractor estimate. Confirm with the seller whether this is an as-built drawing or the original permitted set before relying on it for cost estimation.',
    nextSteps: [
      'Confirm the plan is as-built by comparing to the current structure with a field measurement',
      'Request electrical and plumbing plans from the seller or pull from the original permit office',
      'Measure total square footage independently to verify against the plan and tax record',
      'Share floor plans with the GC for preliminary renovation scope and hard bid development',
      'Obtain a site plan with setbacks for any ADU or addition feasibility analysis',
    ],
  },
  'zoning-document': {
    status: 'Verified', statusBadge: 'badge-green',
    keyTerms: [
      { label: 'Zoning District',     value: 'R-2 (Low-Density Residential)' },
      { label: 'Permitted Uses',      value: 'SFR, duplex, ADU by-right' },
      { label: 'Max Lot Coverage',    value: '40%' },
      { label: 'Max Building Height', value: '35 ft / 2.5 stories' },
      { label: 'Min Front Setback',   value: '20 ft' },
      { label: 'Min Side Setback',    value: '5 ft each side' },
      { label: 'Min Rear Setback',    value: '15 ft' },
      { label: 'FAR Limit',           value: '0.5 (floor area ratio)' },
    ],
    riskFlags: [
      { text: 'Proposed ADU may require a variance if existing structure already approaches 40% lot coverage.', severity: 'medium' },
      { text: 'R-2 zoning does not permit STR use without a conditional use permit in this jurisdiction.', severity: 'medium' },
    ],
    missingItems: [
      'Current lot coverage calculation based on as-built site plan',
      'Overlay district confirmation (historic preservation, flood, fire hazard)',
      'Conditional use permit application (if STR or commercial use is intended)',
      'Parking requirement documentation for any increase in unit count',
    ],
    aiSummary: 'The zoning determination letter confirms R-2 designation with by-right ADU entitlement — a meaningful value-add option for this parcel. The 40% lot coverage limit and 0.5 FAR are the binding development constraints. Before commissioning an ADU design, calculate the current lot coverage and verify the available buildable footprint. If short-term rental use is part of the investment thesis, a conditional use permit is required, which adds timeline and approval risk.',
    nextSteps: [
      'Calculate the current lot coverage and compare to the 40% limit before commissioning ADU design',
      'Confirm overlay district status (historic, flood, and fire hazard zones) with the planning department',
      'Verify the STR permit process and approval odds if Airbnb income is part of the underwriting',
      'Engage a land use attorney or permit expediter if a variance or CUP is likely to be required',
      'Confirm parking requirements with planning for any increase in unit count beyond the current SFR',
    ],
  },
  'insurance-document': {
    status: 'Active', statusBadge: 'badge-green',
    keyTerms: [
      { label: 'Policy Type',    value: 'Dwelling Policy (DP-3)' },
      { label: 'Annual Premium', value: '$2,840 ($237/month)' },
      { label: 'Coverage Amount',value: '$485,000 (dwelling replacement cost)' },
      { label: 'Liability',      value: '$300,000 per occurrence' },
      { label: 'Deductible',     value: '$2,500 (all-perils)' },
      { label: 'Flood Coverage', value: 'Not included — separate policy required' },
      { label: 'Loss of Rents',  value: '12 months at actual fair rental value' },
      { label: 'Policy Period',  value: 'May 1, 2026 – May 1, 2027' },
    ],
    riskFlags: [
      { text: 'Flood coverage excluded — property must be verified outside FEMA Zone A/AE before waiving flood policy.', severity: 'high' },
      { text: 'Liability limit of $300,000 is below the $1M standard recommendation for investment rental properties.', severity: 'medium' },
    ],
    missingItems: [
      'Flood zone determination certificate (FEMA status for this parcel)',
      'Umbrella liability policy documentation ($1M+ recommended)',
      'Itemized replacement cost schedule (dwelling component breakdown)',
      'Loss history / CLUE report for prior claims on this property',
    ],
    aiSummary: 'The DP-3 dwelling policy is the appropriate form for a non-owner-occupied rental property. The $485,000 replacement cost aligns with the contract price, but should be rechecked against a current replacement cost estimator — construction costs have risen significantly since this figure may have been set. The $300,000 liability limit is below the recommended $1M for investment properties. The absence of flood coverage is an immediate gap that must be resolved before close if the property is in any FEMA flood zone. Request the prior claims history (CLUE report) to identify any losses not disclosed by the seller.',
    nextSteps: [
      'Obtain a FEMA flood zone determination before close — add a separate flood policy if in Zone A, AE, or VE',
      'Increase liability coverage to $1M per occurrence or add a commercial umbrella policy',
      'Verify dwelling replacement cost against a current construction cost estimator, not the purchase price',
      'Request the CLUE report (prior claims history) from the seller or directly from the insurer',
      'Confirm loss of rents coverage is sufficient to cover debt service during an extended vacancy event',
    ],
  },
};

/* ── localStorage persistence ─────────────────────────────── */
const LS_KEY = 'cinnova_documents';

function getSavedDocs() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
  catch { return []; }
}

function upsertDoc(record) {
  const docs = getSavedDocs();
  const idx  = docs.findIndex(d => d.id === record.id);
  if (idx >= 0) docs[idx] = { ...docs[idx], ...record };
  else docs.unshift(record);
  localStorage.setItem(LS_KEY, JSON.stringify(docs));
}

function makeId() {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ── Component ────────────────────────────────────────────── */
export default function DocumentCenter() {
  const navigate         = useNavigate();
  const selectedProperty = getSelectedProperty();
  const fileInputRef     = useRef(null);

  const [docTypeId,     setDocTypeId]     = useState('purchase-contract');
  const [activeDoc,     setActiveDoc]     = useState(null);
  const [analyzing,     setAnalyzing]     = useState(false);
  const [analyzed,      setAnalyzed]      = useState(false);
  const [uploadedFile,  setUploadedFile]  = useState(null);
  const [dragOver,      setDragOver]      = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [attached,      setAttached]      = useState(false);
  const [currentDocId,  setCurrentDocId]  = useState(null);
  const [savedDocs,     setSavedDocs]     = useState(() => getSavedDocs());

  const analysis    = ANALYSIS[activeDoc?.type || docTypeId];
  const displayName = activeDoc?.name || uploadedFile?.name || null;
  const typeLabel   = DOC_TYPES.find(dt => dt.id === (activeDoc?.type || docTypeId))?.label;
  /* Show honesty banner when file was uploaded (not read) or when restoring a demo-flagged saved record */
  const isDemo      = Boolean(uploadedFile) || Boolean(activeDoc?.isDemo);

  /* Start analysis cycle — optionally preserve saved/attached state when restoring a record */
  const startAnalysis = (ms, docId, keepState = false) => {
    setCurrentDocId(docId);
    setAnalyzing(true);
    setAnalyzed(false);
    if (!keepState) { setSaved(false); setAttached(false); }
    setTimeout(() => { setAnalyzing(false); setAnalyzed(true); }, ms);
  };

  const handleDocClick = doc => {
    setActiveDoc(doc);
    setDocTypeId(doc.type);
    setUploadedFile(null);
    startAnalysis(800, doc.id);
  };

  const handleAnalyze = () => {
    if (!activeDoc && !uploadedFile) return;
    startAnalysis(1100, activeDoc?.id || currentDocId || makeId());
  };

  const handleFileChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setActiveDoc(null);
    setAnalyzed(false);
    setCurrentDocId(makeId());
  };

  const handleDrop = e => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setActiveDoc(null);
    setAnalyzed(false);
    setCurrentDocId(makeId());
  };

  /* Restore a saved record (sample or user-uploaded) from the Saved Documents section */
  const handleSavedDocClick = savedDoc => {
    const matchingSample = SAMPLE_DOCS.find(s => s.id === savedDoc.id);
    if (matchingSample) {
      handleDocClick(matchingSample);
      return;
    }
    /* User-uploaded doc — restore synthetic activeDoc so analysis panel renders correctly */
    setActiveDoc({
      id:     savedDoc.id,
      type:   savedDoc.type,
      name:   savedDoc.name,
      size:   savedDoc.size,
      pages:  savedDoc.pages,
      date:   savedDoc.savedAt ? fmtDate(savedDoc.savedAt) : '—',
      isDemo: savedDoc.isDemo,
    });
    setDocTypeId(savedDoc.type);
    setUploadedFile(null);
    setCurrentDocId(savedDoc.id);
    setSaved(Boolean(savedDoc.savedAt));
    setAttached(Boolean(savedDoc.propertyAddress));
    setAnalyzing(true);
    setAnalyzed(false);
    setTimeout(() => { setAnalyzing(false); setAnalyzed(true); }, 600);
  };

  /* Persist report to localStorage */
  const handleSaveReport = () => {
    if (!analyzed) return;
    const typeId  = activeDoc?.type || docTypeId;
    const id      = currentDocId || makeId();
    const record  = {
      id,
      name:                displayName || 'Unnamed Document',
      type:                typeId,
      typeLabel:           DOC_TYPES.find(dt => dt.id === typeId)?.label || typeId,
      size:                uploadedFile ? formatSize(uploadedFile.size) : (activeDoc?.size || '—'),
      pages:               activeDoc?.pages ?? null,
      uploadDate:          new Date().toISOString(),
      savedAt:             new Date().toISOString(),
      isUpload:            Boolean(uploadedFile),
      isDemo:              Boolean(uploadedFile) || Boolean(activeDoc?.isDemo),
      propertyAddress:     attached ? (selectedProperty?.fullAddress || selectedProperty?.address || null) : null,
      propertyAttachedAt:  attached ? new Date().toISOString() : null,
      analysisSnapshot:    analysis,
    };
    upsertDoc(record);
    setSavedDocs(getSavedDocs());
    setSaved(true);
  };

  /* Persist property attachment to localStorage */
  const handleAttach = () => {
    if (!selectedProperty || !analyzed) return;
    const typeId          = activeDoc?.type || docTypeId;
    const id              = currentDocId || makeId();
    const propertyAddress = selectedProperty.fullAddress || selectedProperty.address;
    const existing        = getSavedDocs().find(d => d.id === id);
    const record          = {
      id,
      name:                displayName || 'Unnamed Document',
      type:                typeId,
      typeLabel:           DOC_TYPES.find(dt => dt.id === typeId)?.label || typeId,
      size:                uploadedFile ? formatSize(uploadedFile.size) : (activeDoc?.size || existing?.size || '—'),
      pages:               activeDoc?.pages ?? existing?.pages ?? null,
      uploadDate:          existing?.uploadDate || new Date().toISOString(),
      savedAt:             existing?.savedAt || null,
      isUpload:            Boolean(uploadedFile) || Boolean(existing?.isUpload),
      isDemo:              Boolean(uploadedFile) || Boolean(activeDoc?.isDemo) || Boolean(existing?.isDemo),
      propertyAddress,
      propertyAttachedAt:  new Date().toISOString(),
      analysisSnapshot:    existing?.analysisSnapshot || analysis,
    };
    upsertDoc(record);
    setSavedDocs(getSavedDocs());
    setCurrentDocId(id);
    setAttached(true);
  };

  const canAnalyze = Boolean(activeDoc || uploadedFile);

  return (
    <div className="page">

      {/* Header */}
      <div className="dc-header">
        <div>
          <h1 className="page-title">Document Center</h1>
          <p className="page-subtitle">
            Analyze purchase contracts, leases, inspection reports, and financial documents — extract key terms, surface risk flags, and identify missing items.
          </p>
        </div>
        <div className="dc-summary">
          <span className="dc-summary-value">{savedDocs.length + SAMPLE_DOCS.length}</span>
          <span className="dc-summary-label">
            {savedDocs.length > 0
              ? `${savedDocs.length} saved · ${SAMPLE_DOCS.length} samples`
              : `${SAMPLE_DOCS.length} Sample Documents`}
          </span>
        </div>
      </div>

      {/* Upload + Type Selector */}
      <div className="card section">
        <div className="card-header">
          <h2 className="card-title">Upload & Analyze</h2>
          <span className="badge badge-blue">Document Intelligence</span>
        </div>
        <div className="dc-upload-row">
          <div
            className={`dc-upload-zone${dragOver ? ' dc-upload-zone--over' : ''}${uploadedFile ? ' dc-upload-zone--ready' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx,.csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {uploadedFile ? (
              <>
                <span className="dc-upload-zone-icon">📄</span>
                <p className="dc-upload-zone-filename">{uploadedFile.name}</p>
                <p className="dc-upload-zone-hint">Select a document type and click Analyze Document</p>
              </>
            ) : (
              <>
                <span className="dc-upload-zone-icon">⬆</span>
                <p className="dc-upload-zone-text">Drop a document here</p>
                <p className="dc-upload-zone-hint">PDF, Word, Excel, or image files · or click to browse</p>
              </>
            )}
          </div>

          <div className="dc-upload-controls">
            <div className="form-group">
              <label className="form-label">Document Type</label>
              <select
                className="form-select"
                value={docTypeId}
                onChange={e => {
                  setDocTypeId(e.target.value);
                  if (activeDoc && activeDoc.type !== e.target.value) setActiveDoc(null);
                }}
              >
                {DOC_TYPES.map(dt => (
                  <option key={dt.id} value={dt.id}>{dt.label}</option>
                ))}
              </select>
            </div>
            <p className="dc-upload-hint-text">
              Select a sample document or upload your own. Analysis uses template data for the selected document type.
            </p>
            <button
              className="btn btn-primary btn-full"
              type="button"
              onClick={handleAnalyze}
              disabled={!canAnalyze || analyzing}
            >
              {analyzing ? 'Analyzing…' : 'Analyze Document'}
            </button>
          </div>
        </div>
      </div>

      {/* Selected Property Context */}
      {selectedProperty && (
        <div className="dc-property-ctx section">
          <span className="badge badge-teal">Active Property</span>
          <p className="dc-property-addr">{selectedProperty.fullAddress || selectedProperty.address}</p>
          <p className="dc-property-meta">
            {selectedProperty.price ? `$${Number(selectedProperty.price).toLocaleString()}` : ''}
            {selectedProperty.beds  ? ` · ${selectedProperty.beds} bd` : ''}
            {selectedProperty.baths ? ` ${selectedProperty.baths} ba` : ''}
            {selectedProperty.sqft  ? ` · ${Number(selectedProperty.sqft).toLocaleString()} sqft` : ''}
          </p>
        </div>
      )}

      {/* Saved Documents — persisted across sessions */}
      {savedDocs.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">Saved Documents</h2>
            <span className="badge badge-teal">{savedDocs.length} saved · click to view</span>
          </div>
          <div className="dc-doc-grid">
            {savedDocs.map(doc => {
              const ad         = doc.analysisSnapshot || ANALYSIS[doc.type];
              const isActive   = currentDocId === doc.id && analyzed;
              const dateStr    = doc.savedAt
                ? fmtDate(doc.savedAt)
                : doc.propertyAttachedAt ? fmtDate(doc.propertyAttachedAt) : '—';
              return (
                <div
                  key={doc.id}
                  className={`dc-doc-tile${isActive ? ' active' : ''}`}
                  onClick={() => handleSavedDocClick(doc)}
                >
                  <div className="dc-doc-tile-top">
                    <span className="dc-doc-tile-icon">{doc.isUpload ? '📤' : '📝'}</span>
                    <span className={`badge ${ad?.statusBadge || 'badge-gray'}`}>
                      {ad?.status || 'Saved'}
                    </span>
                  </div>
                  <h3 className="dc-doc-tile-name">{doc.name}</h3>
                  <p className="dc-doc-tile-type">{doc.typeLabel}</p>
                  <div className="dc-doc-tile-meta">
                    <span>{dateStr}</span>
                    <span>{doc.size}</span>
                    {doc.pages && <span>{doc.pages}p</span>}
                  </div>
                  <div className="dc-doc-tile-flags">
                    {doc.isDemo && (
                      <span className="dc-missing-chip">Demo analysis</span>
                    )}
                    {doc.propertyAddress && (
                      <span className="dc-risk-chip dc-risk-chip--med" title={doc.propertyAddress}>📍 Attached</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Document Library — sample documents */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Document Library</h2>
          <span className="badge badge-gray">{SAMPLE_DOCS.length} sample documents · click to analyze</span>
        </div>
        <div className="dc-doc-grid">
          {SAMPLE_DOCS.map(doc => {
            const a          = ANALYSIS[doc.type];
            const hasHighRisk = a.riskFlags.some(r => r.severity === 'high');
            return (
              <div
                key={doc.id}
                className={`dc-doc-tile${activeDoc?.id === doc.id ? ' active' : ''}`}
                onClick={() => handleDocClick(doc)}
              >
                <div className="dc-doc-tile-top">
                  <span className="dc-doc-tile-icon">{doc.icon}</span>
                  <span className={`badge ${a.statusBadge}`}>{a.status}</span>
                </div>
                <h3 className="dc-doc-tile-name">{doc.name}</h3>
                <p className="dc-doc-tile-type">{DOC_TYPES.find(dt => dt.id === doc.type)?.label}</p>
                <div className="dc-doc-tile-meta">
                  <span>{doc.date}</span>
                  <span>{doc.size}</span>
                  <span>{doc.pages}p</span>
                </div>
                <div className="dc-doc-tile-flags">
                  <span className={`dc-risk-chip dc-risk-chip--${hasHighRisk ? 'high' : 'med'}`}>
                    {a.riskFlags.length} risk flag{a.riskFlags.length !== 1 ? 's' : ''}
                  </span>
                  <span className="dc-missing-chip">{a.missingItems.length} missing</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Analysis Panel */}
      {(analyzing || analyzed) && (
        <div className="section">
          {analyzing ? (
            <div className="dc-analyzing-card card">
              <div className="dc-analyzing-spinner" />
              <p>Analyzing document — extracting key terms, risk flags, and missing items…</p>
            </div>
          ) : (
            <>
              {/* Honesty banner — shown whenever file was uploaded (contents not read) */}
              {isDemo && (
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px 16px',
                  background: '#fffbeb',
                  border: '1.5px solid #f59e0b',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#78350f',
                  lineHeight: '1.6',
                }}>
                  <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>ℹ️</span>
                  <div>
                    <strong>Demo analysis based on document type — file contents were not read.</strong>{' '}
                    This analysis shows template data for <em>{typeLabel}</em> documents.{' '}
                    Actual text extraction and parsing is coming soon.
                  </div>
                </div>
              )}

              {/* Document Analysis Header */}
              <div className="card dc-analysis-header section">
                <div className="dc-analysis-header-row">
                  <div>
                    <span className="badge badge-blue">{typeLabel}</span>
                    <h2 className="dc-analysis-doc-name">{displayName || 'Uploaded Document'}</h2>
                    {activeDoc && !activeDoc.isDemo && (
                      <p className="dc-analysis-doc-sub">
                        {activeDoc.pages} pages · {activeDoc.size} · {activeDoc.date}
                      </p>
                    )}
                    {(uploadedFile || activeDoc?.isDemo) && (
                      <p className="dc-analysis-doc-sub">
                        {uploadedFile ? formatSize(uploadedFile.size) : activeDoc?.size} · Uploaded
                      </p>
                    )}
                  </div>
                  <span className={`badge ${analysis.statusBadge} dc-analysis-status`}>{analysis.status}</span>
                </div>
                <div className="dc-analysis-stats">
                  <div className="dc-analysis-stat">
                    <strong>{analysis.keyTerms.length}</strong>
                    <span>Key Terms</span>
                  </div>
                  <div className="dc-analysis-stat dc-analysis-stat--risk">
                    <strong>{analysis.riskFlags.length}</strong>
                    <span>Risk Flags</span>
                  </div>
                  <div className="dc-analysis-stat dc-analysis-stat--missing">
                    <strong>{analysis.missingItems.length}</strong>
                    <span>Missing Items</span>
                  </div>
                  <div className="dc-analysis-stat dc-analysis-stat--steps">
                    <strong>{analysis.nextSteps.length}</strong>
                    <span>Next Steps</span>
                  </div>
                </div>
              </div>

              {/* Two-column analysis */}
              <div className="dc-analysis-grid section">

                {/* Left: Key Terms + Risk Flags */}
                <div className="dc-analysis-col">
                  <div className="card">
                    <div className="card-header">
                      <h2 className="card-title">Extracted Key Terms</h2>
                      <span className="badge badge-teal">{analysis.keyTerms.length} found</span>
                    </div>
                    <div className="dc-terms-table">
                      {analysis.keyTerms.map(term => (
                        <div key={term.label} className="dc-terms-row">
                          <span className="dc-terms-label">{term.label}</span>
                          <span className="dc-terms-value">{term.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <h2 className="card-title">Risk Flags</h2>
                      <span className={`badge ${analysis.riskFlags.some(r => r.severity === 'high') ? 'badge-red' : 'badge-gold'}`}>
                        {analysis.riskFlags.length} flagged
                      </span>
                    </div>
                    <div className="dc-risk-list">
                      {analysis.riskFlags.map((flag, i) => (
                        <div key={i} className={`dc-risk-flag dc-risk-flag--${flag.severity}`}>
                          <span className="dc-risk-dot" />
                          <div className="dc-risk-body">
                            <span className={`dc-risk-level dc-risk-level--${flag.severity}`}>
                              {flag.severity === 'high' ? 'High' : flag.severity === 'medium' ? 'Medium' : 'Low'}
                            </span>
                            <p>{flag.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Missing Items + AI Summary */}
                <div className="dc-analysis-col">
                  <div className="card">
                    <div className="card-header">
                      <h2 className="card-title">Missing Items</h2>
                      <span className="badge badge-gold">{analysis.missingItems.length} gaps</span>
                    </div>
                    <div className="dc-missing-list">
                      {analysis.missingItems.map((item, i) => (
                        <div key={i} className="dc-missing-item">
                          <span className="dc-missing-dot" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <h2 className="card-title">AI Document Summary</h2>
                      <span className="badge badge-blue">CinNova Analysis</span>
                    </div>
                    <p className="dc-ai-summary-text">{analysis.aiSummary}</p>
                  </div>
                </div>
              </div>

              {/* Recommended Next Steps */}
              <div className="card section">
                <div className="card-header">
                  <h2 className="card-title">Recommended Next Steps</h2>
                  <span className="badge badge-green">{analysis.nextSteps.length} actions</span>
                </div>
                <div className="dc-next-steps">
                  {analysis.nextSteps.map((step, i) => (
                    <div key={i} className="dc-next-step">
                      <span className="dc-next-step-num">{String(i + 1).padStart(2, '0')}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="dc-actions">
                <button className="btn btn-primary" type="button" onClick={handleAnalyze}>
                  Analyze Document
                </button>
                <button className="btn btn-teal" type="button" onClick={() => navigate('/advisor')}>
                  Send to AI Advisor
                </button>
                <button
                  className={`btn ${attached ? 'btn-ghost' : 'btn-outline'}`}
                  type="button"
                  onClick={handleAttach}
                  disabled={!selectedProperty || attached}
                  title={!selectedProperty ? 'Select a property first via Property Search' : undefined}
                >
                  {attached ? '📍 Attached to Property' : 'Attach to Selected Property'}
                </button>
                <button
                  className={`btn ${saved ? 'btn-ghost' : 'btn-outline'}`}
                  type="button"
                  onClick={handleSaveReport}
                  disabled={saved}
                >
                  {saved ? '✓ Report Saved' : 'Save Report'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}
