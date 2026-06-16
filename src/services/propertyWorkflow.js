import { saveProperty } from './propertyStorage';

const SELECTED_KEY = 'cinnova_selected_property';
const COMPARE_KEY = 'cinnova_compare_properties';

function money(value) {
  return `$${Math.round(value || 0).toLocaleString()}`;
}

export function normalizeProperty(property) {
  if (!property) return null;
  const address = property.address || property.addr || property.form?.address || property.analysis?.address || '';
  const city = property.city || '';
  const price = Number(property.price ?? property.value ?? 0);
  const rent = Number(property.rent ?? property.monthlyRent ?? Math.max(1200, Math.round(price * 0.0062)));
  return {
    ...property,
    id: property.id ?? Date.now(),
    address,
    city,
    fullAddress: city && !address.includes(city) ? `${address}, ${city}` : address,
    price,
    beds: Number(property.beds ?? property.form?.beds ?? 3),
    baths: Number(property.baths ?? property.form?.baths ?? 2),
    sqft: Number(property.sqft ?? property.form?.sqft ?? 1600),
    units: Number(property.units ?? property.form?.units ?? 1),
    type: property.type || property.form?.type || 'Single Family',
    rent,
    cashFlow: Number(property.cashFlow ?? 0),
    capRate: Number(property.capRate ?? 0),
    roi: Number(property.roi ?? 0),
    score: Number(property.score ?? property.analysis?.dealScore ?? 82),
  };
}

export function selectProperty(property) {
  const selected = normalizeProperty(property);
  if (!selected) return null;
  localStorage.setItem(SELECTED_KEY, JSON.stringify(selected));
  return selected;
}

export function getSelectedProperty() {
  try {
    return normalizeProperty(JSON.parse(localStorage.getItem(SELECTED_KEY) || 'null'));
  } catch {
    return null;
  }
}

export function propertyToForm(property) {
  const selected = normalizeProperty(property);
  if (!selected) return null;
  return {
    address: selected.fullAddress,
    price: String(selected.price || ''),
    beds: String(selected.beds || ''),
    baths: String(selected.baths || ''),
    sqft: String(selected.sqft || ''),
    type: selected.type === 'Condo'
      ? 'condo'
      : selected.type === 'Commercial'
      ? 'commercial'
      : selected.type === 'Land'
      ? 'land'
      : selected.type === 'Multifamily' || selected.type === 'Duplex'
      ? 'multi-family'
      : selected.type === 'Townhouse'
      ? 'townhouse'
      : 'single-family',
  };
}

export function createAnalysisFromProperty(property, overrides = {}) {
  const selected = normalizeProperty(property);
  if (!selected) return null;
  const price = selected.price;
  const rent = Number(overrides.monthlyRent ?? selected.rent);
  const mortgage = Number(overrides.mortgage ?? Math.round(price * 0.8 * 0.0065));
  const propTax = Number(overrides.propertyTax ?? Math.round(price * 0.012 / 12));
  const insurance = Number(overrides.insurance ?? Math.max(85, Math.round(price * 0.004 / 12)));
  const expenses = Number(overrides.expenses ?? Math.max(250, Math.round(rent * 0.18)));
  const vacancyPct = Number(overrides.vacancy ?? 6);
  const vacancyLoss = rent * vacancyPct / 100;
  const noi = rent - vacancyLoss - propTax - insurance - expenses;
  const cashFlow = Number(overrides.cashFlow ?? Math.round(noi - mortgage));
  const annualNOI = noi * 12;
  const capRate = price > 0 ? annualNOI / price * 100 : 0;
  const downPayment = Number(overrides.downPayment ?? price * 0.2);
  const cashOnCash = downPayment > 0 ? cashFlow * 12 / downPayment * 100 : 0;
  const dealScore = Math.max(0, Math.min(100, Math.round(overrides.score ?? (
    48 + (capRate - 5) * 5 + cashOnCash * 1.2 + (cashFlow > 0 ? 10 : -10)
  ))));
  const riskLevel = dealScore >= 82 && cashFlow > 0 ? 'Low' : dealScore >= 65 ? 'Moderate' : dealScore >= 45 ? 'Elevated' : 'High';

  return {
    address: selected.fullAddress,
    price: money(price),
    beds: selected.beds || '—',
    baths: selected.baths || '—',
    sqft: selected.sqft ? selected.sqft.toLocaleString() : '—',
    type: selected.type,
    dealScore,
    opportunityScore: Math.max(0, Math.min(100, Math.round(dealScore + 3))),
    riskLevel,
    offerLow: money(price * 0.94),
    offerHigh: money(price * 0.98),
    suggestedOffer: `${money(price * 0.94)} - ${money(price * 0.98)}`,
    rehabCost: `${money(selected.sqft * 18 || 18000)} - ${money(selected.sqft * 34 || 34000)}`,
    arv: money(price * 1.12),
    capRate: `${capRate.toFixed(1)}%`,
    cashFlow: `${cashFlow >= 0 ? '+' : ''}${money(cashFlow)} / mo`,
    cashOnCash: `${cashOnCash.toFixed(1)}%`,
    roi: `${(overrides.roi ?? selected.roi ?? cashOnCash).toFixed(1)}%`,
    programs: 3,
    portfolio: {
      value: price,
      rent,
      cashFlow,
      roi: Number(overrides.roi ?? selected.roi ?? cashOnCash),
      score: dealScore,
      city: selected.city,
      type: selected.type,
    },
    tco: {
      mortgage: money(mortgage),
      propTax: money(propTax),
      insurance: money(insurance),
      hoa: money(0),
      total: money(mortgage + propTax + insurance),
      downPayment: money(downPayment),
      note: `${money(downPayment)} down · ${riskLevel} risk · ${capRate.toFixed(1)}% cap rate`,
    },
  };
}

export function saveWorkflowAnalysis(property, overrides = {}) {
  const selected = normalizeProperty(property) || getSelectedProperty();
  if (!selected) return null;
  const form = propertyToForm(selected);
  const analysis = createAnalysisFromProperty(selected, overrides);
  return saveProperty(form, analysis, selected);
}

export function addCompareProperty(property) {
  const selected = normalizeProperty(property);
  if (!selected) return [];
  const existing = getCompareProperties();
  const updated = [selected, ...existing.filter(p => p.id !== selected.id)].slice(0, 3);
  localStorage.setItem(COMPARE_KEY, JSON.stringify(updated));
  return updated;
}

export function getCompareProperties() {
  try {
    return JSON.parse(localStorage.getItem(COMPARE_KEY) || '[]').map(normalizeProperty).filter(Boolean);
  } catch {
    return [];
  }
}
