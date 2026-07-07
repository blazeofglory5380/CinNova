// BetaReadiness — /beta-readiness    CSS prefix: br-
import { useNavigate } from 'react-router-dom';
import BetaFooter from '../components/BetaFooter';
import './BetaReadiness.css';

const FEATURES = [
  { label: 'Core Dashboard',                     note: 'Live — KPI overview, checklists, quick actions, and AI advisor panel' },
  { label: 'Score Engine',                       note: 'Live · local calc — cap rate, cash flow, DSCR, and a 100-point score' },
  { label: 'Market Heat Map',                    note: 'Live · demo data — 12 U.S. markets with scores, cap rates, and trends' },
  { label: 'Deal Pipeline (Kanban)',             note: 'Live — 6-column board: New Lead → Closed, with move controls' },
  { label: 'Portfolio Tracker',                  note: 'Live — KPI cards, sortable table, filters, and portfolio summary' },
  { label: 'Real Interactive Map',               note: 'Live — MapLibre + OpenFreeMap tiles with clustered, scored markers' },
  { label: 'AI Advisor Chat',                    note: 'Live · local engine — Q&A over your saved properties (no external AI)' },
  { label: 'Property Report Generator',          note: 'Live — investor report from any saved Score Engine analysis' },
  { label: 'Reports Library',                    note: 'Live — every scored property as a report card with filters and actions' },
];

const LIMITATIONS = [
  { label: 'All calculations are estimates',     note: 'Not based on live MLS, tax records, or verified rental data' },
  { label: 'Market data is illustrative',        note: 'City scores use Q2 2025 reference data — not real-time feeds' },
  { label: 'AI is rule-based, not live',         note: 'AI Advisor responses use logic trees, not Claude or GPT API calls' },
  { label: 'No user authentication',             note: 'Data is stored in browser localStorage — not synced across devices' },
  { label: 'No real property data',              note: 'No Zillow, Redfin, or MLS integration yet' },
  { label: 'Reports export as text only',        note: 'PDF generation is planned but not yet implemented' },
  { label: 'No email or notification system',    note: 'Deal alerts and portfolio digests are not yet connected' },
  { label: 'Demo data only — no live APIs',      note: 'Score Engine uses your inputs, not live comps or tax data' },
];

const NEXT_UPGRADES = [
  { label: 'Live AI API (Claude / GPT)',         note: 'Natural language property Q&A and personalized deal coaching' },
  { label: 'Real account login and cloud sync',  note: 'Sign in to access your portfolio from any device' },
  { label: 'Payments (Stripe)',                  note: 'Paid plans and billing — not wired in the beta' },
  { label: 'Backend database',                   note: 'Server-side storage replacing browser localStorage' },
  { label: 'Export PDF and Share Report',        note: 'One-click branded investor reports ready to send' },
  { label: 'MLS / Zillow data integration',      note: 'Pull real prices, rent comps, and historical data automatically' },
  { label: 'Email deal alerts',                  note: 'Notify when a saved deal crosses a score threshold' },
  { label: 'Live market data feeds',             note: 'Real-time cap rates, vacancy rates, and rent trends by ZIP code' },
];

function CheckItem({ label, note, icon, iconClass }) {
  return (
    <div className="br-item">
      <span className={`br-item-icon ${iconClass}`}>{icon}</span>
      <div className="br-item-body">
        <span className="br-item-label">{label}</span>
        {note && <span className="br-item-note">{note}</span>}
      </div>
    </div>
  );
}

function Section({ title, badge, badgeClass, items, icon, iconClass, children }) {
  return (
    <div className="card br-section">
      <div className="card-header">
        <h2 className="card-title">{title}</h2>
        <span className={`badge ${badgeClass}`}>{badge}</span>
      </div>
      {children}
      <div className="br-items">
        {items.map((item, i) => (
          <CheckItem key={i} label={item.label} note={item.note} icon={icon} iconClass={iconClass} />
        ))}
      </div>
    </div>
  );
}

export default function BetaReadiness() {
  const navigate = useNavigate();

  return (
    <div className="page">

      {/* Header */}
      <div className="page-header">
        <div>
          <div className="br-header-badges">
            <span className="badge badge-blue">CinNova</span>
            <span className="badge badge-gold">Beta v0.1</span>
          </div>
          <h1 className="page-title">Beta Readiness</h1>
          <p className="page-subtitle">
            What's built, what's limited, and what's coming next in CinNova Real Estate AI.
          </p>
        </div>
        <div className="br-header-actions">
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/score-engine')}>
            Start Testing →
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/main-dashboard')}>
            Dashboard
          </button>
        </div>
      </div>

      {/* Beta Status Banner */}
      <div className="br-status-banner">
        <div className="br-status-left">
          <span className="br-status-dot" />
          <div>
            <div className="br-status-title">Beta v0.1 — Active</div>
            <div className="br-status-sub">
              {FEATURES.length} features complete · {LIMITATIONS.length} known limitations · {NEXT_UPGRADES.length} planned upgrades
            </div>
          </div>
        </div>
        <a
          href={`mailto:thin_line_99@yahoo.com?subject=${encodeURIComponent('CinNova Real Estate AI Beta Feedback')}&body=${encodeURIComponent('Page: Beta Readiness\n\nFeedback:\n')}`}
          className="btn btn-primary btn-sm"
        >
          Send Feedback
        </a>
      </div>

      {/* 3-column stats */}
      <div className="br-stats-row">
        <div className="br-stat-card br-stat-card--green">
          <div className="br-stat-num">{FEATURES.length}</div>
          <div className="br-stat-label">Features Complete</div>
        </div>
        <div className="br-stat-card br-stat-card--gold">
          <div className="br-stat-num">{LIMITATIONS.length}</div>
          <div className="br-stat-label">Known Limitations</div>
        </div>
        <div className="br-stat-card br-stat-card--blue">
          <div className="br-stat-num">{NEXT_UPGRADES.length}</div>
          <div className="br-stat-label">Planned Upgrades</div>
        </div>
      </div>

      {/* Completed Features */}
      <Section
        title="Completed Features"
        badge={`${FEATURES.length} complete`}
        badgeClass="badge-green"
        items={FEATURES}
        icon="✓"
        iconClass="br-icon--green"
      />

      {/* Known Limitations */}
      <Section
        title="Known Limitations"
        badge="Beta scope"
        badgeClass="badge-gold"
        items={LIMITATIONS}
        icon="⚠"
        iconClass="br-icon--gold"
      >
        <p className="br-section-note">
          These are expected constraints for the beta phase. All financial outputs are estimates for
          educational use. Please do not make real investment decisions based solely on this tool.
        </p>
      </Section>

      {/* Next Planned Upgrades */}
      <Section
        title="Next Planned Upgrades"
        badge="Coming soon"
        badgeClass="badge-blue"
        items={NEXT_UPGRADES}
        icon="→"
        iconClass="br-icon--blue"
      >
        <p className="br-section-note">
          Features are prioritized based on beta tester feedback. Use the Send Feedback button
          on any page to share what matters most to you.
        </p>
      </Section>

      {/* Quick links */}
      <div className="card br-quick-links">
        <div className="card-header">
          <h2 className="card-title">Jump Into Testing</h2>
          <span className="badge badge-teal">Beta Checklist</span>
        </div>
        <div className="br-links-grid">
          {[
            { label: 'Score Engine',         sub: 'Analyze a property',        path: '/score-engine',              badge: 'Start here' },
            { label: 'Report Generator',     sub: 'Build an investor report',  path: '/property-report-generator', badge: 'After scoring' },
            { label: 'Reports Library',      sub: 'All saved reports',         path: '/reports-library',           badge: 'Documents' },
            { label: 'Deal Pipeline',        sub: 'Kanban board',              path: '/deal-pipeline',             badge: 'Track deals' },
            { label: 'Portfolio Tracker',    sub: 'KPIs + sortable table',     path: '/portfolio-tracker',         badge: 'Overview' },
            { label: 'Market Heat Map',      sub: 'Compare 12 markets',        path: '/market-heat-map',           badge: 'Explore' },
            { label: 'Interactive Map',      sub: 'Real map with scored pins', path: '/map',                       badge: 'Live map' },
            { label: 'AI Advisor Chat',      sub: 'Ask about your portfolio',  path: '/ai-advisor-chat',           badge: 'AI chat' },
            { label: 'Main Dashboard',       sub: 'KPIs and quick actions',    path: '/main-dashboard',            badge: 'Home' },
          ].map(link => (
            <button
              key={link.path}
              className="br-link-btn"
              onClick={() => navigate(link.path)}
            >
              <div className="br-link-top">
                <span className="br-link-label">{link.label}</span>
                <span className="br-link-badge">{link.badge}</span>
              </div>
              <span className="br-link-sub">{link.sub}</span>
            </button>
          ))}
        </div>
      </div>

      <BetaFooter page="Beta Readiness" />
    </div>
  );
}
