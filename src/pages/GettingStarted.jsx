// GettingStarted — /getting-started    CSS prefix: gs-
import { useNavigate } from 'react-router-dom';
import BetaFooter from '../components/BetaFooter';
import './GettingStarted.css';

const STEPS = [
  {
    n: 1, icon: '🏠', title: 'Start from the Main Dashboard',
    text: 'Your home base. KPI cards, checklists, and quick actions show where everything lives and what to do next.',
    path: '/main-dashboard', cta: 'Open Dashboard',
  },
  {
    n: 2, icon: '🎯', title: 'Score a property in the Score Engine',
    text: 'Enter an address, purchase price, and monthly rent. CinNova calculates cap rate, cash flow, and a 100-point investment score.',
    path: '/score-engine', cta: 'Open Score Engine',
  },
  {
    n: 3, icon: '💾', title: 'Save the property',
    text: 'After calculating, click "Save Analysis". Saved properties power your reports, portfolio, and AI advisor answers.',
    path: '/score-engine', cta: 'Score & Save',
  },
  {
    n: 4, icon: '📋', title: 'View saved deals in the Deal Pipeline',
    text: 'Track every deal on a Kanban board from New Lead to Closed. Move deals through stages as they progress.',
    path: '/deal-pipeline', cta: 'Open Deal Pipeline',
  },
  {
    n: 5, icon: '📊', title: 'Track portfolio metrics in Portfolio Tracker',
    text: 'KPI cards and a sortable table summarize equity, cash flow, and performance across everything you own or track.',
    path: '/portfolio-tracker', cta: 'Open Portfolio Tracker',
  },
  {
    n: 6, icon: '🗺️', title: 'Explore properties on the Interactive Map',
    text: 'A real map with clustered, score-colored markers. Click a pin to see price, score, and jump into analysis tools.',
    path: '/map', cta: 'Open Interactive Map',
  },
  {
    n: 7, icon: '🤖', title: 'Ask questions in AI Advisor Chat',
    text: 'Ask plain-English questions like "Which of my properties has the best cash flow?" — answers use your saved analyses.',
    path: '/ai-advisor-chat', cta: 'Open AI Advisor',
  },
  {
    n: 8, icon: '📄', title: 'Generate an investor report',
    text: 'Turn any saved analysis into a polished investor report with score, financials, strengths, risks, and next steps.',
    path: '/property-report-generator', cta: 'Open Report Generator',
  },
  {
    n: 9, icon: '🗂️', title: 'View saved reports in the Reports Library',
    text: 'Every scored property collected as a report card — filter by Strong Buy, Watchlist, High Cash Flow, or High Risk.',
    path: '/reports-library', cta: 'Open Reports Library',
  },
  {
    n: 10, icon: '✅', title: 'Check Beta Readiness',
    text: 'See exactly what is live, what runs on local/demo data, and what is coming later in the beta.',
    path: '/beta-readiness', cta: 'View Beta Status',
  },
];

export default function GettingStarted() {
  const navigate = useNavigate();

  return (
    <div className="page">

      {/* Header */}
      <div className="page-header">
        <div>
          <div className="gs-header-badges">
            <span className="badge badge-blue">CinNova</span>
            <span className="badge badge-teal">Guide</span>
          </div>
          <h1 className="page-title">Getting Started</h1>
          <p className="page-subtitle">
            New to CinNova Real Estate AI? Follow these ten steps to go from first visit to a scored,
            tracked, and reported deal.
          </p>
        </div>
        <div className="gs-header-actions">
          <button className="btn btn-primary" onClick={() => navigate('/score-engine')}>
            Start here →
          </button>
          <button className="btn btn-outline" onClick={() => navigate('/beta-readiness')}>
            View beta status
          </button>
        </div>
      </div>

      {/* Intro strip */}
      <div className="gs-intro">
        <span className="gs-intro-dot" />
        <p>
          Everything below runs locally in your browser during the beta — no account needed.
          Your analyses are saved on this device and power the advisor, reports, and portfolio views.
        </p>
      </div>

      {/* Step cards */}
      <div className="gs-steps">
        {STEPS.map(s => (
          <div key={s.n} className="gs-step-card">
            <div className="gs-step-num">{s.n}</div>
            <div className="gs-step-body">
              <div className="gs-step-top">
                <span className="gs-step-icon">{s.icon}</span>
                <h2 className="gs-step-title">{s.title}</h2>
              </div>
              <p className="gs-step-text">{s.text}</p>
              <button className="btn btn-ghost btn-sm gs-step-btn" onClick={() => navigate(s.path)}>
                {s.cta} →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Wrap-up CTA */}
      <div className="card gs-cta">
        <div>
          <h2 className="gs-cta-title">Ready to score your first deal?</h2>
          <p className="gs-cta-sub">The Score Engine only needs an address, a price, and a rent estimate.</p>
        </div>
        <div className="gs-cta-actions">
          <button className="btn btn-primary" onClick={() => navigate('/score-engine')}>
            Start here →
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/beta-readiness')}>
            View beta status
          </button>
        </div>
      </div>

      <BetaFooter page="Getting Started" />
    </div>
  );
}
