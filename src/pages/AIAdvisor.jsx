import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSelectedProperty, saveWorkflowAnalysis } from '../services/propertyWorkflow';
import { addToPortfolio, getPortfolio } from '../services/propertyStorage';
import { generateAIResponse, getSavedDocs, getNegotiationResult, fmtM, fmtP, sgn } from '../services/aiService';
import './AIAdvisor.css';

const PROMPTS = [
  { id: 'buy',        icon: '🏠', label: 'Should I buy this property?' },
  { id: 'cashflow',   icon: '💵', label: 'How can I improve cash flow?' },
  { id: 'risks',      icon: '⚠️', label: 'What risks do you see?' },
  { id: 'compare',    icon: '📊', label: 'Compare this to my portfolio' },
  { id: 'offer',      icon: '🤝', label: 'What offer price should I make?' },
  { id: 'renovation', icon: '🔨', label: 'Renovation opportunities?' },
  { id: 'hold',       icon: '📅', label: 'How long should I hold this?' },
  { id: 'beginner',   icon: '🎓', label: 'Is this good for a beginner investor?' },
];

/* ── Main component ──────────────────────────────────────────────────── */
export default function AIAdvisor() {
  const navigate  = useNavigate();
  const property  = getSelectedProperty();
  const portfolio = useMemo(() => getPortfolio(), []);

  const [messages,          setMessages]          = useState([]);
  const [input,             setInput]             = useState('');
  const [thinking,          setThinking]          = useState(false);
  const [saved,             setSaved]             = useState(false);
  const [savedDocs,         setSavedDocs]         = useState(() => getSavedDocs());
  const [negotiationResult, setNegotiationResult] = useState(() => getNegotiationResult());
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

  const hasContext = savedDocs.length > 0 || Boolean(negotiationResult);

  const sendMessage = async text => {
    if (!text.trim() || thinking) return;
    setMessages(prev => [...prev, { role: 'user', text: text.trim(), id: Date.now() }]);
    setInput('');
    setThinking(true);
    const delay = 700 + Math.random() * 700;
    setTimeout(async () => {
      const blocks = await generateAIResponse({
        prompt: text.trim(),
        property,
        portfolio: port,
        documents: savedDocs,
        negotiation: negotiationResult,
      });
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

          {/* Context Available card */}
          {hasContext && (
            <div className="card" style={{ borderLeft: '3px solid var(--primary)' }}>
              <div className="card-header">
                <h2 className="card-title" style={{ fontSize: '13px' }}>Context Available</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--gray-600)' }}>
                {savedDocs.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📄</span>
                    <span>{savedDocs.length} saved document{savedDocs.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {negotiationResult && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🤝</span>
                    <span>Negotiation result · {negotiationResult.property || 'Property'}</span>
                  </div>
                )}
              </div>
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {savedDocs.length > 0 && (
                  <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', fontSize: '12px' }}
                    onClick={() => sendMessage('Review my latest document risks')}>
                    Review my latest document risks →
                  </button>
                )}
                {negotiationResult && (
                  <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', fontSize: '12px' }}
                    onClick={() => sendMessage('Use my negotiation result')}>
                    Use my negotiation result →
                  </button>
                )}
              </div>
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
                    : hasContext
                    ? `I have access to your saved ${savedDocs.length > 0 ? `${savedDocs.length} document${savedDocs.length !== 1 ? 's' : ''}` : ''}${savedDocs.length > 0 && negotiationResult ? ' and ' : ''}${negotiationResult ? 'negotiation result' : ''}. Ask me to review them, or select a property for full deal analysis.`
                    : `Select a property from Property Search to get personalized deal analysis, risk flags, and investment recommendations.`
                  }
                </p>
              </div>
            </div>

            {/* Suggested prompts — shown before first message */}
            {messages.length === 0 && (property || hasContext) && (
              <div className="adv-prompts-block">
                <p className="adv-prompts-label">Suggested questions</p>
                {hasContext && (
                  <div style={{ marginBottom: '10px' }}>
                    <p className="adv-prompts-label" style={{ color: 'var(--primary)', marginBottom: '6px' }}>From your saved context</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {savedDocs.length > 0 && (
                        <button className="adv-prompt-chip"
                          onClick={() => sendMessage('Review my latest document risks')}>
                          <span className="adv-prompt-icon">📄</span>
                          Review my latest document risks
                        </button>
                      )}
                      {negotiationResult && (
                        <button className="adv-prompt-chip"
                          onClick={() => sendMessage('Use my negotiation result')}>
                          <span className="adv-prompt-icon">🤝</span>
                          Use my negotiation result
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {property && (
                  <div className="adv-prompt-grid">
                    {PROMPTS.map(p => (
                      <button key={p.id} className="adv-prompt-chip"
                        onClick={() => sendMessage(p.label)}>
                        <span className="adv-prompt-icon">{p.icon}</span>
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
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
          {messages.length > 0 && (property || hasContext) && (
            <div className="adv-prompts-bar">
              {savedDocs.length > 0 && (
                <button className="adv-prompt-bar-chip"
                  onClick={() => sendMessage('Review my latest document risks')}>
                  📄 Document risks
                </button>
              )}
              {negotiationResult && (
                <button className="adv-prompt-bar-chip"
                  onClick={() => sendMessage('Use my negotiation result')}>
                  🤝 Negotiation result
                </button>
              )}
              {property && PROMPTS.slice(0, 4).map(p => (
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
              placeholder={
                property
                  ? `Ask about ${property.address || 'this property'}…`
                  : hasContext
                  ? 'Ask about your saved documents or negotiation…'
                  : 'Select a property to start…'
              }
              value={input}
              disabled={(!property && !hasContext) || thinking}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            />
            <button className="btn btn-primary adv-send-btn"
              disabled={!input.trim() || (!property && !hasContext) || thinking}
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
