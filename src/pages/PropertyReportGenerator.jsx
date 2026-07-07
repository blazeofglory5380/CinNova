import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProperties } from '../services/propertyStorage';
import BetaFooter from '../components/BetaFooter';
import './PropertyReportGenerator.css';

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseCF(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number') return raw;
  const s = String(raw);
  const isNeg = s.trimStart().startsWith('-') || s.includes('(');
  const num   = parseFloat(s.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? null : (isNeg ? -num : num);
}

function parseCR(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number') return raw;
  return parseFloat(String(raw).replace(/[^0-9.]/g, '')) || null;
}

function getScore(a) {
  return a?.dealScore || a?.opportunityScore || a?.investmentScore || null;
}

function getRec(a) {
  return a?.recommendation || a?.status || null;
}

function fmtCF(n) {
  if (n == null) return '—';
  const abs = Math.abs(Math.round(n));
  return (n >= 0 ? '+$' : '-$') + abs.toLocaleString() + ' / mo';
}

function fmtPrice(raw) {
  if (!raw) return '—';
  if (typeof raw === 'number') return '$' + Math.round(raw).toLocaleString();
  return String(raw);
}

function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return iso; }
}

function scoreColor(s) {
  if (s == null) return '#94a3b8';
  return s >= 70 ? '#059669' : s >= 55 ? '#2563eb' : s >= 40 ? '#d97706' : '#dc2626';
}

function recConfig(label) {
  switch ((label || '').toLowerCase()) {
    case 'strong buy': return { badge: 'badge-green', bg: '#f0fdf4', border: '#16a34a' };
    case 'buy':        return { badge: 'badge-blue',  bg: '#eff6ff', border: '#2563eb' };
    case 'review':     return { badge: 'badge-teal',  bg: '#f0fdfa', border: '#0d9488' };
    case 'high risk':  return { badge: 'badge-gold',  bg: '#fffbeb', border: '#d97706' };
    default:           return { badge: 'badge-red',   bg: '#fef2f2', border: '#dc2626' };
  }
}

function deriveStrengths(score, cf, capRate, riskLevel) {
  const out = [];
  if (capRate != null && capRate >= 7)   out.push({ icon: '📈', text: `Excellent cap rate of ${capRate.toFixed(1)}% — well above the 5% investor threshold` });
  else if (capRate != null && capRate >= 5) out.push({ icon: '📈', text: `Cap rate of ${capRate.toFixed(1)}% meets standard investor return targets` });
  if (cf != null && cf > 300)            out.push({ icon: '💵', text: `Strong positive cash flow of +$${Math.round(cf).toLocaleString()}/mo from day one` });
  else if (cf != null && cf > 0)         out.push({ icon: '💵', text: `Positive cash flow of +$${Math.round(cf).toLocaleString()}/mo — all costs covered by income` });
  if (score != null && score >= 80)      out.push({ icon: '⭐', text: `Intelligence score of ${score}/100 indicates exceptional investment fundamentals` });
  else if (score != null && score >= 70) out.push({ icon: '⭐', text: `Intelligence score of ${score}/100 indicates solid investment fundamentals` });
  const rl = (riskLevel || '').toLowerCase();
  if (rl === 'low')                      out.push({ icon: '🛡️', text: 'Low risk profile — strong return characteristics relative to risk taken' });
  if (capRate != null && cf != null && capRate >= 5 && cf > 0)
                                         out.push({ icon: '🔁', text: 'Positive cash flow combined with solid cap rate creates a resilient income foundation' });
  return out.slice(0, 5);
}

function deriveRisks(score, cf, capRate, riskLevel) {
  const out = [];
  if (cf != null && cf < -500)           out.push({ icon: '⚠️', text: `Negative cash flow of -$${Math.abs(Math.round(cf)).toLocaleString()}/mo requires ongoing capital reserves` });
  else if (cf != null && cf < 0)         out.push({ icon: '⚠️', text: `Negative cash flow of -$${Math.abs(Math.round(cf)).toLocaleString()}/mo — monthly contributions required to carry costs` });
  if (capRate != null && capRate < 4)    out.push({ icon: '📉', text: `Cap rate of ${capRate.toFixed(1)}% is below the 4% minimum — current pricing may be above market value` });
  else if (capRate != null && capRate < 5) out.push({ icon: '📉', text: `Cap rate of ${capRate.toFixed(1)}% is below the 5% investor target — consider negotiating a lower price` });
  const rl = (riskLevel || '').toLowerCase();
  if (rl === 'high')                     out.push({ icon: '🔴', text: 'High overall risk profile — significant due diligence required before committing capital' });
  else if (rl === 'elevated')            out.push({ icon: '🟡', text: 'Elevated risk profile — address key risk factors before proceeding with an offer' });
  if (score != null && score < 55)       out.push({ icon: '📊', text: `Score of ${score}/100 is below the Buy threshold — consider negotiating price or improving income side` });
  if (out.length === 0)                  out.push({ icon: '✅', text: 'No significant risk factors identified — standard due diligence and inspection are recommended' });
  return out.slice(0, 5);
}

function deriveNextSteps(score) {
  if (score == null) return [
    'Run a full analysis in the Score Engine to unlock tailored next steps',
    'Schedule a professional property inspection',
    'Pull rent comparables within 0.5 miles to validate income assumptions',
    'Consult a licensed real estate professional before making any offer',
  ];
  if (score >= 70) return [
    'Obtain lender pre-approval to move within 48 hours of inspection clearance',
    'Schedule a licensed property inspection ($500–$800) as your first step',
    'Pull 3 active rent comparables within 0.5 miles to confirm income assumptions',
    'Submit a Letter of Intent with financing, inspection, and appraisal contingencies',
  ];
  if (score >= 55) return [
    'Negotiate 5–10% price reduction to improve score above the Buy threshold',
    'Re-quote insurance and property management to optimize operating expenses',
    'Verify rent comparables — a 10% rent increase can flip negative to positive cash flow',
    'Re-run the Score Engine at the lower negotiated price to confirm viability',
  ];
  if (score >= 40) return [
    'Model a 15–20% price reduction in the Score Engine to test deal viability',
    'Identify value-add opportunities (ADU, renovation) to improve the income side',
    'Compare alternative properties in the same market with stronger fundamentals',
    'Consult a property manager on realistic rents before making any offer',
  ];
  return [
    'Avoid at current pricing — returns do not meet minimum investment thresholds',
    'The property requires a significant price reduction to become viable',
    'Use this analysis as a benchmark to evaluate your next opportunity',
    'Explore high-opportunity markets: Dallas, Atlanta, or Phoenix for better entry points',
  ];
}

// ── Report builder ─────────────────────────────────────────────────────────────

function buildReportText(entry) {
  const a     = entry.analysis || {};
  const f     = entry.form || {};
  const score = getScore(a);
  const rec   = getRec(a);
  const cf    = parseCF(a.cashFlow);
  const cr    = parseCR(a.capRate);
  const addr  = [f.address, f.city, f.state].filter(Boolean).join(', ') || a.address || 'Unknown';
  const date  = fmtDate(entry.timestamp);
  const P     = (lbl, val) => `  ${lbl.padEnd(26)}${val}`;
  const lines = [];

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('         CINNOVA INVESTOR PROPERTY REPORT');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push(`Generated: ${date}`);
  lines.push('');
  lines.push('PROPERTY SUMMARY');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push(P('Address:',         addr));
  lines.push(P('Property Type:',   f.type || '—'));
  lines.push(P('Purchase Price:',  fmtPrice(a.price)));
  lines.push('');
  lines.push('INTELLIGENCE SCORE');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push(P('Score:',           score != null ? `${score} / 100` : '—'));
  lines.push(P('Recommendation:',  rec || '—'));
  lines.push(P('Risk Level:',      a.riskLevel || '—'));
  lines.push('');
  lines.push('KEY FINANCIAL METRICS');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push(P('Monthly Cash Flow:', cf != null ? fmtCF(cf) : '—'));
  lines.push(P('Annual Cash Flow:',  cf != null ? `${cf >= 0 ? '+' : '-'}$${Math.abs(Math.round(cf * 12)).toLocaleString()} / yr` : '—'));
  lines.push(P('Cap Rate:',          cr != null ? cr.toFixed(1) + '%' : '—'));
  lines.push('');
  lines.push('STRENGTHS');
  lines.push('───────────────────────────────────────────────────────────────');
  deriveStrengths(score, cf, cr, a.riskLevel).forEach(s => lines.push(`  • ${s.text}`));
  lines.push('');
  lines.push('RISK FACTORS');
  lines.push('───────────────────────────────────────────────────────────────');
  deriveRisks(score, cf, cr, a.riskLevel).forEach(r => lines.push(`  • ${r.text}`));
  lines.push('');
  lines.push('SUGGESTED NEXT STEPS');
  lines.push('───────────────────────────────────────────────────────────────');
  deriveNextSteps(score).forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
  lines.push('');
  lines.push('MARKET ASSUMPTIONS (Reference · Q2 2025)');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('  30-Yr Fixed Rate         6.75% (national average)');
  lines.push('  Target Cap Rate          5.0–7.5% (by market)');
  lines.push('  Target CoC Return        8–12% (investor benchmark)');
  lines.push('  Annual Appreciation      3–5% (historical average)');
  lines.push('');
  lines.push('DISCLAIMER');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('  This report is for educational and informational purposes only');
  lines.push('  and is not financial, legal, tax, or investment advice.');
  lines.push('');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push(`Generated by CinNova Real Estate Intelligence Platform · ${date}`);
  return lines.join('\n');
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PropertyListItem({ entry, selected, onClick }) {
  const a     = entry.analysis || {};
  const f     = entry.form || {};
  const score = getScore(a);
  const addr  = f.address || a.address || 'Unknown address';
  const city  = [f.city, f.state].filter(Boolean).join(', ') || a.city || '';
  const color = scoreColor(score);

  return (
    <button
      className={`rg-prop-item${selected ? ' rg-prop-item--active' : ''}`}
      onClick={onClick}
    >
      <span className="rg-prop-score" style={{ color, borderColor: color }}>
        {score != null ? score : '—'}
      </span>
      <div className="rg-prop-info">
        <div className="rg-prop-addr">{addr}</div>
        {city && <div className="rg-prop-city">{city}</div>}
        <div className="rg-prop-date">{fmtDate(entry.timestamp)}</div>
      </div>
      {score != null && (
        <span className="rg-prop-rec"
          style={{ color, background: color + '15', border: `1px solid ${color}40` }}>
          {getRec(a) || '—'}
        </span>
      )}
    </button>
  );
}

function ReportPreview({ entry }) {
  const a      = entry.analysis || {};
  const f      = entry.form || {};
  const score  = getScore(a);
  const rec    = getRec(a);
  const cf     = parseCF(a.cashFlow);
  const cr     = parseCR(a.capRate);
  const addr   = [f.address, f.city, f.state].filter(Boolean).join(', ') || a.address || '—';
  const color  = scoreColor(score);
  const rcfg   = recConfig(rec);
  const str    = deriveStrengths(score, cf, cr, a.riskLevel);
  const risks  = deriveRisks(score, cf, cr, a.riskLevel);
  const steps  = deriveNextSteps(score);

  return (
    <div id="rg-report-content" className="rg-report">

      {/* Report header */}
      <div className="rg-report-header">
        <div>
          <div className="rg-report-brand">CinNova Real Estate Intelligence</div>
          <div className="rg-report-subtitle">Investor Property Report</div>
        </div>
        <div className="rg-report-date">{fmtDate(entry.timestamp)}</div>
      </div>

      <div className="rg-report-divider" />

      {/* Property summary */}
      <div className="rg-section">
        <div className="rg-section-title">Property Summary</div>
        <div className="rg-summary-grid">
          <div className="rg-summary-item">
            <span>Address</span>
            <strong>{addr}</strong>
          </div>
          <div className="rg-summary-item">
            <span>Property Type</span>
            <strong>{f.type || '—'}</strong>
          </div>
          <div className="rg-summary-item">
            <span>Purchase Price</span>
            <strong>{fmtPrice(a.price)}</strong>
          </div>
          <div className="rg-summary-item">
            <span>Analysis Date</span>
            <strong>{fmtDate(entry.timestamp)}</strong>
          </div>
        </div>
      </div>

      {/* Intelligence score */}
      <div className="rg-score-section" style={{ background: rcfg.bg, borderColor: rcfg.border }}>
        <div className="rg-score-left">
          <div className="rg-score-ring-wrap">
            <svg viewBox="0 0 80 80" width="80" height="80">
              <circle cx="40" cy="40" r="33" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
              <circle cx="40" cy="40" r="33" fill="none"
                stroke={color} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${((score || 0) / 100) * 207.3} 207.3`}
                transform="rotate(-90 40 40)"
              />
            </svg>
            <div className="rg-score-inner">
              <strong style={{ color }}>{score ?? '—'}</strong>
              <small>/100</small>
            </div>
          </div>
          <div>
            <div className="rg-score-label">Intelligence Score</div>
            {rec && (
              <span className={`${rcfg.badge} rg-rec-badge`}>{rec}</span>
            )}
            {a.riskLevel && (
              <div className="rg-risk-label">Risk Level: <strong>{a.riskLevel}</strong></div>
            )}
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="rg-section">
        <div className="rg-section-title">Key Financial Metrics</div>
        <div className="rg-metrics-row">
          <div className="rg-metric">
            <span>Monthly Cash Flow</span>
            <strong style={{ color: cf != null ? (cf >= 0 ? '#059669' : '#dc2626') : '#94a3b8' }}>
              {cf != null ? fmtCF(cf) : '—'}
            </strong>
          </div>
          <div className="rg-metric">
            <span>Annual Cash Flow</span>
            <strong style={{ color: cf != null ? (cf >= 0 ? '#059669' : '#dc2626') : '#94a3b8' }}>
              {cf != null
                ? `${cf >= 0 ? '+' : '-'}$${Math.abs(Math.round(cf * 12)).toLocaleString()} / yr`
                : '—'}
            </strong>
          </div>
          <div className="rg-metric">
            <span>Cap Rate</span>
            <strong style={{ color: cr != null ? (cr >= 5.5 ? '#059669' : cr >= 4 ? '#2563eb' : '#d97706') : '#94a3b8' }}>
              {cr != null ? cr.toFixed(1) + '%' : '—'}
            </strong>
          </div>
          <div className="rg-metric">
            <span>Risk Level</span>
            <strong>{a.riskLevel || '—'}</strong>
          </div>
        </div>
      </div>

      {/* Strengths */}
      <div className="rg-section">
        <div className="rg-section-title">Strengths</div>
        <ul className="rg-list">
          {str.map((s, i) => (
            <li key={i} className="rg-list-item rg-list-item--strength">
              <span className="rg-list-icon">{s.icon}</span>
              <span>{s.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Risks */}
      <div className="rg-section">
        <div className="rg-section-title">Risk Factors</div>
        <ul className="rg-list">
          {risks.map((r, i) => (
            <li key={i} className="rg-list-item rg-list-item--risk">
              <span className="rg-list-icon">{r.icon}</span>
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Next steps */}
      <div className="rg-section">
        <div className="rg-section-title">Suggested Next Steps</div>
        <ol className="rg-steps">
          {steps.map((s, i) => (
            <li key={i} className="rg-step">
              <span className="rg-step-num">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Market assumptions */}
      <div className="rg-section">
        <div className="rg-section-title">Market Assumptions <span className="rg-ref-tag">Reference · Q2 2025</span></div>
        <div className="rg-assumptions">
          {[
            ['30-Yr Fixed Rate',    '6.75%',    'National average reference'],
            ['Target Cap Rate',     '5.0–7.5%', 'By market and property type'],
            ['Target CoC Return',   '8–12%',    'Typical investor benchmark'],
            ['Min. Lender DSCR',    '1.25×',    'Most conventional lenders'],
            ['Annual Appreciation', '3–5%',     'Historical national average'],
          ].map(([label, val, note]) => (
            <div key={label} className="rg-assumption">
              <div className="rg-assumption-label">{label}</div>
              <div className="rg-assumption-val">{val}</div>
              <div className="rg-assumption-note">{note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rg-disclaimer">
        <strong>Disclaimer</strong>
        <p>This report is for educational and informational purposes only and is not financial, legal, tax, or investment advice. Always consult a licensed real estate professional, attorney, and financial advisor before making any investment decision.</p>
      </div>

      <div className="rg-report-footer">
        Generated by CinNova Real Estate Intelligence Platform · {fmtDate(entry.timestamp)}
      </div>

    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PropertyReportGenerator() {
  const navigate  = useNavigate();
  const entries   = useMemo(() => getProperties(), []);
  const [selId,   setSelId]   = useState(entries[0]?.id ?? null);
  const [copied,  setCopied]  = useState(false);

  const selected = useMemo(
    () => entries.find(e => e.id === selId) ?? null,
    [entries, selId]
  );

  function handleCopy() {
    if (!selected) return;
    navigator.clipboard.writeText(buildReportText(selected)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function handlePrint() {
    window.print();
  }

  const hasEntries = entries.length > 0;

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-header rg-page-header">
        <div>
          <div className="rg-header-badges">
            <span className="badge badge-blue">CinNova</span>
            <span className="badge badge-teal">Report Generator</span>
          </div>
          <h1 className="page-title">Property Report Generator</h1>
          <p className="page-subtitle">Generate a professional investor report from any saved Score Engine analysis.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/score-engine')}>
          ← Score Engine
        </button>
      </div>

      {/* ── Empty state ── */}
      {!hasEntries && (
        <div className="rg-empty card">
          <div className="rg-empty-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="8" y="6" width="32" height="36" rx="4" stroke="#94a3b8" strokeWidth="2"/>
              <path d="M16 16h16M16 22h16M16 28h10" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="36" cy="36" r="8" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.5"/>
              <path d="M33 36h6M36 33v6" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h3>No saved analyses yet</h3>
          <p>Run the Score Engine on a property and save the analysis to generate your first investor report.</p>
          <div className="rg-empty-actions">
            <button className="btn btn-primary" onClick={() => navigate('/score-engine')}>
              Analyze a Property
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/main-dashboard')}>
              Dashboard
            </button>
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      {hasEntries && (
        <div className="rg-layout">

          {/* Left — property selector */}
          <div className="rg-sidebar">
            <div className="rg-sidebar-header">
              <span className="rg-sidebar-title">Saved Analyses</span>
              <span className="badge badge-gray">{entries.length}</span>
            </div>
            <div className="rg-prop-list">
              {entries.map(e => (
                <PropertyListItem
                  key={e.id}
                  entry={e}
                  selected={e.id === selId}
                  onClick={() => setSelId(e.id)}
                />
              ))}
            </div>
          </div>

          {/* Right — report area */}
          <div className="rg-main">
            {selected ? (
              <>
                {/* Action bar */}
                <div className="rg-action-bar">
                  <div className="rg-action-left">
                    <span className="rg-action-label">
                      {selected.form?.address || selected.analysis?.address || 'Selected property'}
                    </span>
                  </div>
                  <div className="rg-action-btns">
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/score-engine')}>
                      ← Score Engine
                    </button>
                    <button
                      className={`btn btn-sm ${copied ? 'btn-ghost' : 'btn-outline'}`}
                      onClick={handleCopy}
                    >
                      {copied ? '✓ Copied' : 'Copy Report'}
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handlePrint}>
                      Print / Save PDF
                    </button>
                  </div>
                </div>

                {/* Report preview */}
                <div className="rg-preview-wrap">
                  <ReportPreview entry={selected} />
                </div>
              </>
            ) : (
              <div className="rg-no-selection card">
                <p>Select a saved analysis from the list to generate a report.</p>
              </div>
            )}
          </div>

        </div>
      )}

      <BetaFooter page="Property Report Generator" />

    </div>
  );
}
