const ANALYSES_KEY  = 'cinnova_properties';  // recent analyses (backward-compat key)
const FAVORITES_KEY = 'cinnova_favorites';   // bookmarked from property search
const PORTFOLIO_KEY = 'cinnova_portfolio';   // properties saved to portfolio

/* ── Recent analyses ───────────────────────────────── */

export function saveProperty(form, analysis, rawProperty = null) {
  const existing = getProperties();
  const entry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    form,
    analysis,
    ...(rawProperty ? { property: rawProperty } : {}),
  };
  const updated = [entry, ...existing].slice(0, 20);
  try { localStorage.setItem(ANALYSES_KEY, JSON.stringify(updated)); } catch {}
  return entry;
}

export function getProperties() {
  try { return JSON.parse(localStorage.getItem(ANALYSES_KEY) || '[]'); }
  catch { return []; }
}

export function clearProperties() {
  localStorage.removeItem(ANALYSES_KEY);
}

/* ── Favorites (bookmark from PropertySearch) ──────── */

export function saveFavorite(property) {
  const existing = getFavorites();
  if (existing.some(f => f.id === property.id)) return existing;
  const item = { ...property, savedAt: new Date().toISOString() };
  const updated = [item, ...existing].slice(0, 50);
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated)); } catch {}
  return updated;
}

export function removeFavorite(id) {
  const updated = getFavorites().filter(f => f.id !== id);
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated)); } catch {}
  return updated;
}

export function getFavorites() {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); }
  catch { return []; }
}

export function isFavorite(id) {
  return getFavorites().some(f => f.id === id);
}

/* ── Portfolio (saved to portfolio) ────────────────── */

export function addToPortfolio(property) {
  const existing = getPortfolio();
  const portfolioId = property.id ?? property.portfolioId ?? Date.now();
  const item = {
    ...property,
    portfolioId,
    addedAt: property.addedAt || new Date().toISOString(),
    equity: property.equity ?? Math.round((property.price || 0) * 0.20),
    status: property.status || 'Saved',
  };
  const idx = existing.findIndex(p => p.portfolioId === portfolioId);
  const updated = idx >= 0
    ? existing.map((p, i) => i === idx ? item : p)
    : [item, ...existing].slice(0, 50);
  try { localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(updated)); } catch {}
  return updated;
}

export function removeFromPortfolio(portfolioId) {
  const updated = getPortfolio().filter(p => p.portfolioId !== portfolioId);
  try { localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(updated)); } catch {}
  return updated;
}

export function getPortfolio() {
  try { return JSON.parse(localStorage.getItem(PORTFOLIO_KEY) || '[]'); }
  catch { return []; }
}

export function clearPortfolio() {
  localStorage.removeItem(PORTFOLIO_KEY);
}
