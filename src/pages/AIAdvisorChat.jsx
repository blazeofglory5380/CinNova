// AIAdvisorChat.jsx — /ai-advisor-chat    CSS prefix: aac-
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProperties } from '../services/propertyStorage';
import BetaFooter from '../components/BetaFooter';
import './AIAdvisorChat.css';

// ── Parsers ────────────────────────────────────────────────────────────────────

function parseCF(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number') return raw;
  const s = String(raw);
  const neg = s.trimStart().startsWith('-') || s.includes('(');
  const n = parseFloat(s.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : (neg ? -n : n);
}

function parseNum(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number') return raw;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : n;
}

function parsePrice(raw) {
  if (!raw) return null;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  return isNaN(n) || n === 0 ? null : n;
}

function getScore(a) {
  return a?.dealScore ?? a?.opportunityScore ?? a?.investmentScore ?? null;
}

// ── Formatters ─────────────────────────────────────────────────────────────────

function fmtCF(n) {
  if (n == null) return '—';
  const abs = Math.abs(Math.round(n));
  return (n >= 0 ? '+$' : '-$') + abs.toLocaleString() + '/mo';
}

function fmtValue(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  return '$' + Math.round(n).toLocaleString();
}

function fmtCR(n) {
  return n != null ? n.toFixed(1) + '%' : '—';
}

function plural(n, singular, customPlural) {
  if (n === 1) return `1 ${singular}`;
  return `${n} ${customPlural ?? singular + 's'}`;
}

// ── Row builder ────────────────────────────────────────────────────────────────

function buildRows(entries) {
  return entries.map(e => {
    const a = e.analysis || {};
    const f = e.form || {};
    return {
      id:        String(e.id),
      address:   f.address || a.address || 'Unknown Address',
      shortAddr: (f.address || a.address || 'Unknown').split(',')[0],
      city:      [f.city || a.city, f.state].filter(Boolean).join(', '),
      type:      f.type || 'Property',
      price:     parsePrice(a.price),
      cashFlow:  parseCF(a.cashFlow),
      capRate:   parseNum(a.capRate),
      score:     getScore(a),
      riskLevel: a.riskLevel || null,
      rec:       a.recommendation || a.status || null,
    };
  });
}

// ── Response engine ────────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  'Which deal is my best investment?',
  'Which property has the most risk?',
  'How is my portfolio performing?',
  'Which market should I explore next?',
  'What should I do next?',
];

const MARKET_IDEAS = [
  { name: 'Nashville, TN',  why: 'strong rent growth (8.2% YoY) and historically low vacancy' },
  { name: 'Raleigh, NC',    why: 'top-tier job market expansion driving rental demand' },
  { name: 'Dallas, TX',     why: 'landlord-friendly laws and solid long-term appreciation' },
  { name: 'Phoenix, AZ',    why: 'rapid population growth creating sustained rental demand' },
  { name: 'Charlotte, NC',  why: 'emerging tech hub with affordable entry-level pricing' },
  { name: 'Tampa, FL',      why: 'no state income tax and a diversifying economy' },
  { name: 'Atlanta, GA',    why: 'diverse economy with below-average acquisition costs' },
  { name: 'Austin, TX',     why: 'tech sector strength with high long-run appreciation upside' },
];

function respondNoData() {
  return {
    text: "I don't have any saved property analyses to work with yet.\n\nRun the **Score Engine** on at least one property and I'll be able to give you data-driven advice on your best deals, risk exposure, cash flow trends, and which market to target next.",
    followup: null,
  };
}

function respondBestDeal(rows) {
  const scored = rows.filter(r => r.score != null).sort((a, b) => b.score - a.score);
  if (scored.length === 0) {
    return {
      text: "None of your saved properties have a full investment score yet.\n\nRun each one through the **Score Engine** to unlock deal rankings and I'll be able to tell you exactly which to prioritize.",
      followup: ['How is my portfolio performing?', 'What should I do next?'],
    };
  }

  const best = scored[0];
  const runner = scored[1];
  const tier = best.score >= 70 ? 'a compelling, high-conviction deal' : best.score >= 55 ? 'a solid opportunity worth pursuing' : 'your strongest option, though with room for improvement';
  const cfLine = best.cashFlow != null
    ? (best.cashFlow >= 0
        ? `estimated to generate **${fmtCF(best.cashFlow)}** in cash flow`
        : `currently cash-flow negative at **${fmtCF(best.cashFlow)}**`)
    : 'cash flow data not yet available';

  let text = `Out of your ${plural(rows.length, 'saved analysis', 'saved analyses')}, **${best.shortAddr}** in **${best.city}** ranks #1 with an investment score of **${best.score}/100** — ${tier}.\n\nIt's ${cfLine}${best.capRate != null ? ` with a **${fmtCR(best.capRate)} cap rate**` : ''}.`;

  if (runner) {
    text += `\n\nYour second-best option is **${runner.shortAddr}** (score: **${runner.score}/100**) — worth keeping on the shortlist.`;
  }

  const highlights = [
    { label: 'Investment Score', value: best.score + '/100',          accent: best.score >= 70 ? 'green' : best.score >= 55 ? 'blue' : 'gold' },
    { label: 'Cash Flow',        value: fmtCF(best.cashFlow),         accent: (best.cashFlow ?? 0) >= 0 ? 'green' : 'red' },
    { label: 'Cap Rate',         value: fmtCR(best.capRate),          accent: 'blue' },
    { label: 'Recommendation',   value: best.rec || '—',              accent: 'teal' },
  ].filter(h => h.value !== '—');

  return {
    text,
    highlights,
    followup: ['What should I do next?', 'Which property has the most risk?', 'How is my portfolio performing?'],
  };
}

function respondMostRisk(rows) {
  const highRisk = rows.filter(r => (r.riskLevel || '').toLowerCase() === 'high');
  const byRisk = [...rows].sort((a, b) => (a.score ?? 100) - (b.score ?? 100));
  const riskiest = highRisk.length > 0 ? highRisk[0] : byRisk[0];

  if (!riskiest) {
    return { text: "No risk data is available yet. Run the Score Engine on your properties to get risk assessments.", followup: null };
  }

  const flag = highRisk.length > 0
    ? `formally flagged as **High Risk**`
    : `not formally high-risk but carries your lowest investment score at **${riskiest.score}/100**`;

  let text = `**${riskiest.shortAddr}** in **${riskiest.city}** is ${flag}.`;

  if (highRisk.length > 1) {
    text += `\n\nYou have **${plural(highRisk.length, 'high-risk property', 'high-risk properties')}** in total. Each one deserves a closer look before you commit more capital.`;
  }

  const negCF = riskiest.cashFlow != null && riskiest.cashFlow < 0;
  if (negCF) {
    text += `\n\nCompounding the risk, this property is cash-flow negative (**${fmtCF(riskiest.cashFlow)}/mo**), meaning it's costing you money every month. Consider reviewing the pricing, rent assumptions, or running a sensitivity analysis in the Score Engine.`;
  } else {
    text += `\n\nThe good news: it${riskiest.cashFlow != null && riskiest.cashFlow >= 0 ? ` is still generating **${fmtCF(riskiest.cashFlow)}** in cash flow` : ' has limited downside if you hold'}. A renegotiated purchase price or higher rent target could significantly improve the risk profile.`;
  }

  const highlights = [
    { label: 'Risk Level',  value: riskiest.riskLevel || 'Elevated',   accent: 'red' },
    { label: 'Score',       value: riskiest.score != null ? riskiest.score + '/100' : '—', accent: 'gold' },
    { label: 'Cash Flow',   value: fmtCF(riskiest.cashFlow),            accent: (riskiest.cashFlow ?? 0) >= 0 ? 'teal' : 'red' },
    { label: 'Cap Rate',    value: fmtCR(riskiest.capRate),             accent: 'blue' },
  ].filter(h => h.value !== '—');

  return {
    text,
    highlights,
    followup: ['What should I do next?', 'Which deal is my best investment?', 'How is my portfolio performing?'],
  };
}

function respondPortfolio(rows) {
  const withCF    = rows.filter(r => r.cashFlow != null);
  const withScore = rows.filter(r => r.score != null);
  const withCR    = rows.filter(r => r.capRate != null);
  const totalCF   = withCF.reduce((s, r) => s + r.cashFlow, 0);
  const avgScore  = withScore.length ? withScore.reduce((s, r) => s + r.score, 0) / withScore.length : null;
  const avgCR     = withCR.length ? withCR.reduce((s, r) => s + r.capRate, 0) / withCR.length : null;
  const posCount  = withCF.filter(r => r.cashFlow > 0).length;
  const negCount  = withCF.filter(r => r.cashFlow < 0).length;
  const strongCount = rows.filter(r => ['strong buy','buy'].includes((r.rec||'').toLowerCase())).length;
  const highRiskCount = rows.filter(r => (r.riskLevel||'').toLowerCase() === 'high').length;
  const totalValue = rows.filter(r => r.price).reduce((s, r) => s + r.price, 0);

  let verdict = 'building momentum';
  if (avgScore != null && avgScore >= 70 && totalCF > 0) verdict = 'performing strongly';
  else if (avgScore != null && avgScore >= 55 && posCount >= negCount) verdict = 'performing solidly';
  else if (negCount > posCount || (avgScore != null && avgScore < 45)) verdict = 'under pressure — several items need attention';

  let text = `Your portfolio of **${plural(rows.length, 'property', 'properties')}** is ${verdict}.`;

  if (totalValue > 0) {
    text += ` Total estimated value: **${fmtValue(totalValue)}**.`;
  }

  if (withCF.length > 0) {
    text += `\n\n**Cash flow**: ${posCount > 0 ? `${posCount} ${posCount === 1 ? 'property is' : 'properties are'} cash-flow positive` : 'none of your properties are cash-flow positive yet'}${negCount > 0 ? `, ${negCount} ${negCount === 1 ? 'is' : 'are'} negative` : ''}. Net monthly across the portfolio: **${fmtCF(totalCF)}**.`;
  }

  if (avgScore != null) {
    text += `\n\n**Deal quality**: Average investment score of **${avgScore.toFixed(0)}/100**${strongCount > 0 ? ` with ${plural(strongCount, 'Strong Buy/Buy rating', 'Strong Buy/Buy ratings')}` : ''}${highRiskCount > 0 ? ` and ${plural(highRiskCount, 'high-risk flag', 'high-risk flags')}` : ''}.`;
  }

  if (avgCR != null) {
    const crJudge = avgCR >= 6 ? 'excellent' : avgCR >= 5 ? 'solid' : avgCR >= 4 ? 'acceptable' : 'below benchmark';
    text += `\n\n**Cap rate**: Portfolio average of **${avgCR.toFixed(1)}%** — ${crJudge} relative to a 5–6% investor benchmark.`;
  }

  const highlights = [
    { label: 'Properties',      value: String(rows.length),                         accent: 'blue' },
    { label: 'Net Cash Flow',   value: withCF.length ? fmtCF(totalCF) : '—',        accent: totalCF >= 0 ? 'green' : 'red' },
    { label: 'Avg Score',       value: avgScore != null ? avgScore.toFixed(0)+'/100' : '—', accent: avgScore != null && avgScore >= 65 ? 'green' : 'gold' },
    { label: 'Avg Cap Rate',    value: fmtCR(avgCR),                                accent: avgCR != null && avgCR >= 5 ? 'teal' : 'gold' },
  ].filter(h => h.value !== '—');

  return {
    text,
    highlights,
    followup: ['Which deal is my best investment?', 'Which property has the most risk?', 'What should I do next?'],
  };
}

function respondMarket(rows) {
  const usedCities = new Set(rows.map(r => r.city?.split(',')[0]?.trim().toLowerCase()).filter(Boolean));
  const unused = MARKET_IDEAS.filter(m => !usedCities.has(m.name.split(',')[0].toLowerCase()));
  const pick = unused.length > 0 ? unused[0] : MARKET_IDEAS[0];
  const second = (unused.length > 1 ? unused[1] : MARKET_IDEAS[1]);

  const avgCR = rows.filter(r => r.capRate).length
    ? rows.filter(r => r.capRate).reduce((s,r) => s + r.capRate, 0) / rows.filter(r => r.capRate).length
    : null;

  let text = `Based on your current portfolio${avgCR ? ` (avg cap rate **${avgCR.toFixed(1)}%**)` : ''}, **${pick.name}** is a strong candidate for your next acquisition.\n\n${pick.name} offers ${pick.why} — complementing the markets you're already in.`;

  if (second) {
    text += `\n\n**${second.name}** is also worth evaluating: ${second.why}.`;
  }

  text += `\n\nUse the **Market Heat Map** to compare city-level scores, or open the **Score Engine** and enter an address in one of these markets to get a full investment analysis.`;

  const highlights = [
    { label: 'Top Pick',      value: pick.name,   accent: 'blue' },
    { label: 'Also Consider', value: second?.name || '—', accent: 'teal' },
  ];

  return {
    text,
    highlights,
    followup: ['Which deal is my best investment?', 'How is my portfolio performing?', 'What should I do next?'],
  };
}

function respondNextSteps(rows) {
  const highRisk  = rows.filter(r => (r.riskLevel||'').toLowerCase() === 'high');
  const negCF     = rows.filter(r => (r.cashFlow ?? 0) < 0);
  const strongBuy = rows.filter(r => ['strong buy'].includes((r.rec||'').toLowerCase()));
  const buy       = rows.filter(r => ['buy'].includes((r.rec||'').toLowerCase()));
  const withScore = rows.filter(r => r.score != null).sort((a,b) => b.score - a.score);
  const topDeal   = withScore[0];

  const steps = [];

  if (strongBuy.length > 0) {
    steps.push(`**Move on ${strongBuy[0].shortAddr}** — it carries a Strong Buy recommendation. Draft your offer or get a lender pre-approval started while conditions hold.`);
  } else if (buy.length > 0) {
    steps.push(`**Advance ${buy[0].shortAddr}** — it's a Buy. Schedule an inspection or further due diligence to move it closer to offer.`);
  } else if (topDeal) {
    steps.push(`**Review ${topDeal.shortAddr}** more closely — with a score of **${topDeal.score}/100**, it's your best current option. Consider whether the numbers improve with a lower offer price.`);
  }

  if (highRisk.length > 0) {
    steps.push(`**Address high-risk properties**: ${highRisk.map(r => r.shortAddr).join(', ')} — run a sensitivity analysis or negotiate on price before committing.`);
  }

  if (negCF.length > 0 && negCF.length !== highRisk.length) {
    steps.push(`**Review cash-flow-negative properties** (${negCF.map(r => r.shortAddr).join(', ')}) — a 5–10% rent increase or expense reduction could flip them positive.`);
  }

  if (rows.length < 3) {
    steps.push(`**Expand your pipeline** — you have ${rows.length} saved ${rows.length === 1 ? 'property' : 'properties'}. Analyzing 2–3 more comparables in different markets helps you build conviction before committing.`);
  }

  steps.push(`**Stay disciplined**: run every new deal through the **Score Engine** before any offer. One below-score acquisition can drag the entire portfolio's return.`);

  const text = `Here's your prioritized action list based on your current portfolio of **${plural(rows.length, 'property', 'properties')}**:\n\n${steps.map((s, i) => `${i+1}. ${s}`).join('\n\n')}`;

  return {
    text,
    followup: ['Which deal is my best investment?', 'Which property has the most risk?', 'How is my portfolio performing?'],
  };
}

function respondBestCF(rows) {
  const withCF = rows.filter(r => r.cashFlow != null).sort((a, b) => b.cashFlow - a.cashFlow);
  if (withCF.length === 0) {
    return { text: "No cash flow data is available yet. Run your properties through the Score Engine to generate cash flow estimates.", followup: null };
  }

  const best = withCF[0];
  const worst = withCF[withCF.length - 1];
  const total = withCF.reduce((s, r) => s + r.cashFlow, 0);

  let text = `**${best.shortAddr}** in **${best.city}** produces the strongest cash flow at **${fmtCF(best.cashFlow)}**${best.capRate ? ` with a **${fmtCR(best.capRate)} cap rate**` : ''}.`;

  if (withCF.length > 1 && worst.cashFlow < 0) {
    text += `\n\nAt the other end, **${worst.shortAddr}** is your weakest at **${fmtCF(worst.cashFlow)}**.`;
  }

  text += `\n\nNet portfolio cash flow across all ${plural(withCF.length, 'tracked property', 'tracked properties')}: **${fmtCF(total)}**.`;

  const highlights = [
    { label: 'Best Cash Flow', value: fmtCF(best.cashFlow), accent: best.cashFlow >= 0 ? 'green' : 'red' },
    { label: 'Property',       value: best.shortAddr,        accent: 'blue' },
    { label: 'Net Portfolio',  value: fmtCF(total),          accent: total >= 0 ? 'teal' : 'gold' },
  ];

  return {
    text,
    highlights,
    followup: ['Which deal is my best investment?', 'How is my portfolio performing?', 'What should I do next?'],
  };
}

function respondBestCR(rows) {
  const withCR = rows.filter(r => r.capRate != null).sort((a, b) => b.capRate - a.capRate);
  if (withCR.length === 0) {
    return { text: "No cap rate data is available yet. Run your properties through the Score Engine to generate cap rate estimates.", followup: null };
  }

  const best = withCR[0];
  const avg = withCR.reduce((s, r) => s + r.capRate, 0) / withCR.length;

  let text = `**${best.shortAddr}** in **${best.city}** has your highest cap rate at **${fmtCR(best.capRate)}** — ${best.capRate >= 6 ? 'well above the investor benchmark' : best.capRate >= 5 ? 'solid, near the benchmark' : 'in the acceptable range'}.`;
  text += `\n\nPortfolio cap rate average: **${avg.toFixed(1)}%** across ${plural(withCR.length, 'property', 'properties')}.`;

  if (avg < 5) {
    text += ` This is below the 5% benchmark — consider targeting properties above 5.5% in your next search to bring the average up.`;
  }

  const highlights = [
    { label: 'Best Cap Rate',    value: fmtCR(best.capRate), accent: best.capRate >= 6 ? 'green' : 'blue' },
    { label: 'Property',         value: best.shortAddr,      accent: 'blue' },
    { label: 'Portfolio Avg CR', value: avg.toFixed(1) + '%', accent: avg >= 5 ? 'teal' : 'gold' },
  ];

  return {
    text,
    highlights,
    followup: ['Which deal is my best investment?', 'How is my portfolio performing?', 'Which market should I explore next?'],
  };
}

function respondDefault(rows) {
  const withScore = rows.filter(r => r.score != null).sort((a, b) => b.score - a.score);
  const top = withScore[0];

  let text = `I can help you analyze your real estate portfolio! Here's a quick snapshot of what I know:\n\nYou have **${plural(rows.length, 'saved property', 'saved properties')}** in your portfolio.`;

  if (top) {
    text += ` Your top-scored deal is **${top.shortAddr}** (score: **${top.score}/100**).`;
  }

  text += `\n\nTry one of these to get started:`;

  return {
    text,
    followup: [...SUGGESTED_PROMPTS],
  };
}

function buildResponse(input, rows) {
  const lc = input.toLowerCase().trim();

  if (rows.length === 0) return respondNoData();

  if (lc.includes('best') && (lc.includes('invest') || lc.includes('deal') || lc.includes('overall') || lc.includes('top')))
    return respondBestDeal(rows);
  if (lc.includes('risk')) return respondMostRisk(rows);
  if (lc.includes('portfolio') || lc.includes('performing') || lc.includes('performance'))
    return respondPortfolio(rows);
  if (lc.includes('market') || lc.includes('explore') || lc.includes('where') || lc.includes('city') || lc.includes('location'))
    return respondMarket(rows);
  if (lc.includes('cash flow') || lc.includes('cashflow') || lc.includes('income') || lc.includes('rental income'))
    return respondBestCF(rows);
  if (lc.includes('cap rate') || lc.includes('caprate') || lc.includes('yield'))
    return respondBestCR(rows);
  if (lc.includes('next') || lc.includes('should') || lc.includes('action') || lc.includes('step') || lc.includes('recommend'))
    return respondNextSteps(rows);
  if (lc.includes('score') || lc.includes('rank') || lc.includes('rating') || lc.includes('best'))
    return respondBestDeal(rows);
  if (lc.includes('how') && (lc.includes('doing') || lc.includes('going') || lc.includes('overall')))
    return respondPortfolio(rows);

  return respondDefault(rows);
}

// ── Text renderer (supports **bold** and \n) ───────────────────────────────────

function RichText({ text }) {
  return (
    <>
      {text.split('\n').map((para, pi, arr) => {
        const chunks = para.split(/(\*\*[^*]+\*\*)/g);
        return (
          <span key={pi}>
            {chunks.map((chunk, ci) =>
              chunk.startsWith('**') && chunk.endsWith('**')
                ? <strong key={ci}>{chunk.slice(2, -2)}</strong>
                : chunk
            )}
            {pi < arr.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}

// ── Advisor avatar ─────────────────────────────────────────────────────────────

function AdvisorAvatar() {
  return (
    <div className="aac-avatar">
      <svg width="14" height="14" viewBox="0 0 22 22" fill="none">
        <path d="M5 17L9 8L13 13L16 9" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="17" cy="8" r="2.5" fill="#E8C46A"/>
      </svg>
    </div>
  );
}

// ── Typing indicator ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="aac-message aac-message--advisor">
      <AdvisorAvatar />
      <div className="aac-bubble aac-bubble--advisor aac-bubble--typing">
        <span className="aac-dot" />
        <span className="aac-dot" />
        <span className="aac-dot" />
      </div>
    </div>
  );
}

// ── Message component ──────────────────────────────────────────────────────────

function Message({ msg, onFollowup }) {
  const isAdvisor = msg.role === 'advisor';
  const [feedback, setFeedback] = useState(null);

  return (
    <div className={`aac-message aac-message--${msg.role}`}>
      {isAdvisor && <AdvisorAvatar />}
      <div className={`aac-bubble aac-bubble--${msg.role}`}>
        <p className="aac-text">
          <RichText text={msg.text} />
        </p>

        {isAdvisor && msg.highlights && msg.highlights.length > 0 && (
          <div className="aac-highlights">
            {msg.highlights.map((h, i) => (
              <div key={i} className={`aac-hl aac-hl--${h.accent}`}>
                <span className="aac-hl-label">{h.label}</span>
                <strong className="aac-hl-value">{h.value}</strong>
              </div>
            ))}
          </div>
        )}

        {isAdvisor && msg.followup && msg.followup.length > 0 && (
          <div className="aac-followup">
            <span className="aac-followup-label">Ask me:</span>
            {msg.followup.map((f, i) => (
              <button
                key={i}
                type="button"
                className="aac-followup-btn"
                onClick={() => onFollowup(f)}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        <div className="aac-bubble-footer">
          <span className="aac-ts">{msg.time}</span>
          {isAdvisor && (
            <div className="aac-feedback">
              <button
                type="button"
                className={`aac-fb-btn${feedback === 'up' ? ' aac-fb-btn--active aac-fb-btn--up' : ''}`}
                title="Helpful"
                onClick={() => setFeedback(f => f === 'up' ? null : 'up')}
              >👍</button>
              <button
                type="button"
                className={`aac-fb-btn${feedback === 'down' ? ' aac-fb-btn--active aac-fb-btn--down' : ''}`}
                title="Not helpful"
                onClick={() => setFeedback(f => f === 'down' ? null : 'down')}
              >👎</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

function mkTime() {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function mkId() {
  return Date.now() + Math.random().toString(36).slice(2);
}

export default function AIAdvisorChat() {
  const navigate  = useNavigate();
  const entries   = useMemo(() => getProperties(), []);
  const rows      = useMemo(() => buildRows(entries), [entries]);

  const welcome = useMemo(() => ({
    id: 'welcome',
    role: 'advisor',
    time: mkTime(),
    text: entries.length > 0
      ? `Hi! I'm your **CinNova AI Advisor**. I've reviewed your **${plural(entries.length, 'saved analysis', 'saved analyses')}** and I'm ready to help you make smarter investment decisions.\n\nAsk me about your best deals, risk exposure, portfolio performance, or which markets to explore next.`
      : `Hi! I'm your **CinNova AI Advisor**.\n\nOnce you run the Score Engine on a property and save your analysis, I can help you identify your best deals, flag risk, summarize portfolio performance, and suggest your next move.`,
  }), [entries.length]);

  const [messages, setMessages] = useState([welcome]);
  const [input,    setInput]    = useState('');
  const [typing,   setTyping]   = useState(false);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const messagesId = messages.length + (typing ? 0.5 : 0);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesId]);

  const handleSend = useCallback((text) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;

    const userMsg = { id: mkId(), role: 'user', time: mkTime(), text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);
    localStorage.setItem('cinnova_advisor_used', 'true');

    const response = buildResponse(trimmed, rows);
    const delay = Math.min(800 + trimmed.length * 8 + (response.text?.length ?? 0) * 3, 2400);

    setTimeout(() => {
      const advisorMsg = { id: mkId(), role: 'advisor', time: mkTime(), ...response };
      setMessages(prev => [...prev, advisorMsg]);
      setTyping(false);
    }, delay);
  }, [typing, rows]);

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  }

  // ── Empty state ──────────────────────────────────────────────────────────────

  if (entries.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <div className="aac-header-badges">
              <span className="badge badge-blue">CinNova</span>
              <span className="badge badge-teal">AI Advisor</span>
            </div>
            <h1 className="page-title">AI Advisor Chat</h1>
            <p className="page-subtitle">Personalized investment intelligence powered by your saved analyses.</p>
          </div>
        </div>

        <div className="card aac-empty-card">
          <div className="aac-empty-icon">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
              <rect x="4" y="10" width="52" height="40" rx="8" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5"/>
              <circle cx="22" cy="26" r="8" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1.5"/>
              <path d="M19 26l2 2.5 4.5-5" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="34" y="20" width="15" height="2.5" rx="1.25" fill="#e2e8f0"/>
              <rect x="34" y="25" width="11" height="2.5" rx="1.25" fill="#e2e8f0"/>
              <rect x="34" y="30" width="13" height="2.5" rx="1.25" fill="#e2e8f0"/>
              <circle cx="44" cy="42" r="10" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.5"/>
              <path d="M40.5 42h7M44 38.5v7" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h3>Analyze your first property to unlock personalized AI advice.</h3>
          <p>The AI Advisor reads your saved Score Engine analyses and provides data-driven guidance — your best deals, risk flags, portfolio trends, and market recommendations.</p>
          <div className="aac-empty-btns">
            <button className="btn btn-primary" onClick={() => navigate('/score-engine')}>Open Score Engine</button>
            <button className="btn btn-outline" onClick={() => navigate('/market-heat-map')}>Explore Markets</button>
          </div>
        </div>
        <BetaFooter page="AI Advisor Chat" />
      </div>
    );
  }

  // ── Full chat UI ─────────────────────────────────────────────────────────────

  return (
    <div className="page">

      <div className="page-header aac-page-header">
        <div>
          <div className="aac-header-badges">
            <span className="badge badge-blue">CinNova</span>
            <span className="badge badge-teal">AI Advisor</span>
            <span className="badge badge-gray">{plural(entries.length, 'property', 'properties')}</span>
          </div>
          <h1 className="page-title">AI Advisor Chat</h1>
          <p className="page-subtitle">Personalized investment intelligence powered by your saved property analyses.</p>
        </div>
        <div className="aac-header-status">
          <span className="aac-status-dot" />
          <span className="aac-status-label">Advisor Active</span>
        </div>
      </div>

      {/* Chat card */}
      <div className="card aac-chat-card">

        {/* Message thread */}
        <div className="aac-messages">
          {messages.map(msg => (
            <Message key={msg.id} msg={msg} onFollowup={handleSend} />
          ))}
          {typing && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="aac-input-section">

          {/* Suggested prompt chips */}
          <div className="aac-chips-row">
            {SUGGESTED_PROMPTS.map((p, i) => (
              <button
                key={i}
                type="button"
                className="aac-chip"
                onClick={() => handleSend(p)}
                disabled={typing}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div className="aac-input-row">
            <textarea
              ref={inputRef}
              className="aac-input"
              placeholder="Ask anything about your portfolio…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              disabled={typing}
            />
            <button
              type="button"
              className="aac-send-btn"
              onClick={() => handleSend(input)}
              disabled={!input.trim() || typing}
              aria-label="Send message"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 9L16 2L9 16L8 10L2 9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <p className="aac-hint">Press Enter to send · Shift+Enter for newline</p>
        </div>

      </div>

      <BetaFooter page="AI Advisor Chat" />
    </div>
  );
}
