import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './TopNav.css';

/* ── Destinations ─────────────────────────────────────────────
   Every route that used to live in the sidebar is preserved here:
   8 primary items shown inline, the remaining 21 grouped inside the
   "More" dropdown (and all of them in the mobile menu). */

const PRIMARY = [
  { to: '/',                label: 'Home',             end: true  },
  { to: '/main-dashboard',  label: 'Dashboard',        end: true  },
  { to: '/property-search', label: 'Property Search',  end: false },
  { to: '/analyzer',        label: 'Property Analyzer', end: false },
  { to: '/score-engine',    label: 'Score Engine',     end: false },
  { to: '/deal-pipeline',   label: 'Deal Pipeline',    end: false },
  { to: '/market-heat-map', label: 'Market Heat Map',  end: false },
  { to: '/advisor',         label: 'AI Advisor',       end: false },
];

const MORE_GROUPS = [
  {
    label: 'Start',
    items: [
      { to: '/getting-started', label: 'Getting Started' },
    ],
  },
  {
    label: 'Analyze',
    items: [
      { to: '/deal-analyzer', label: 'Deal Analyzer' },
      { to: '/gallery',       label: 'Photo Gallery' },
      { to: '/workspace',     label: 'Property Workspace' },
      { to: '/comparison',    label: 'Comparison Center' },
    ],
  },
  {
    label: 'Market & Neighborhood',
    items: [
      { to: '/map',          label: 'Interactive Map' },
      { to: '/neighborhood', label: 'Neighborhood Intel' },
      { to: '/market',       label: 'Market Intelligence' },
    ],
  },
  {
    label: 'Money & Taxes',
    items: [
      { to: '/mortgage-calc',     label: 'Mortgage Calculator' },
      { to: '/cash-flow',         label: 'Cash Flow Analyzer' },
      { to: '/portfolio',         label: 'Portfolio Dashboard' },
      { to: '/portfolio-tracker', label: 'Portfolio Tracker' },
      { to: '/rental-roi',        label: 'Rental ROI' },
      { to: '/tax-center',        label: 'Tax Center' },
      { to: '/benefits',          label: 'Benefits Finder' },
    ],
  },
  {
    label: 'Documents',
    items: [
      { to: '/documents',       label: 'Document Center' },
      { to: '/reports-library', label: 'Reports Library' },
      { to: '/negotiation',     label: 'Negotiation' },
    ],
  },
  {
    label: 'AI Advisor',
    items: [
      { to: '/ai-advisor-chat', label: 'AI Advisor Chat' },
    ],
  },
  {
    label: 'Development / BIM',
    items: [
      { to: '/dev-studio',   label: 'Development Studio' },
      { to: '/architecture', label: 'Architecture & BIM' },
    ],
  },
];

function ChevronIcon({ open }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function TopNav() {
  const [moreOpen, setMoreOpen]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const moreRef   = useRef(null);
  const moreBtnRef = useRef(null);
  const location = useLocation();

  // Close both menus whenever the route changes.
  useEffect(() => {
    setMoreOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  // Outside-click + Escape close the "More" dropdown; Escape returns focus to its button.
  useEffect(() => {
    if (!moreOpen) return;
    function onDown(e) {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        setMoreOpen(false);
        moreBtnRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  // Escape closes the mobile menu too.
  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e) { if (e.key === 'Escape') setMobileOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const linkClass = ({ isActive }) => `tn-link${isActive ? ' tn-link--active' : ''}`;

  return (
    <header className="tn">
      <div className="tn-inner">
        {/* Brand */}
        <NavLink to="/main-dashboard" className="tn-brand" aria-label="CinNova — Property Intelligence">
          <span className="tn-brand-logo" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
              <rect width="22" height="22" rx="7" fill="rgba(255,255,255,0.15)"/>
              <path d="M5 17L9 8L13 13L16 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="17" cy="8" r="2.5" fill="#E8C46A"/>
            </svg>
          </span>
          <span className="tn-brand-text">
            <span className="tn-brand-name">CinNova</span>
            <span className="tn-brand-sub">Property Intelligence</span>
          </span>
        </NavLink>

        {/* Desktop primary nav */}
        <nav className="tn-nav" aria-label="Primary">
          {PRIMARY.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>{label}</NavLink>
          ))}

          {/* More dropdown */}
          <div className="tn-more" ref={moreRef}>
            <button
              ref={moreBtnRef}
              type="button"
              className={`tn-link tn-more-btn${moreOpen ? ' tn-link--active' : ''}`}
              aria-haspopup="true"
              aria-expanded={moreOpen}
              aria-controls="tn-more-menu"
              onClick={() => setMoreOpen(o => !o)}
            >
              More <ChevronIcon open={moreOpen} />
            </button>
            {moreOpen && (
              <div className="tn-more-menu" id="tn-more-menu" role="menu" aria-label="More navigation">
                {MORE_GROUPS.map(group => (
                  <div key={group.label} className="tn-more-group" role="group" aria-label={group.label}>
                    <div className="tn-more-group-label">{group.label}</div>
                    {group.items.map(({ to, label }) => (
                      <NavLink
                        key={to}
                        to={to}
                        role="menuitem"
                        className={({ isActive }) => `tn-more-item${isActive ? ' tn-more-item--active' : ''}`}
                      >
                        {label}
                      </NavLink>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          className="tn-burger"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          aria-controls="tn-mobile-menu"
          onClick={() => setMobileOpen(o => !o)}
        >
          <span className={`tn-burger-box${mobileOpen ? ' tn-burger-box--open' : ''}`} aria-hidden>
            <span /><span /><span />
          </span>
        </button>
      </div>

      {/* Mobile menu: every destination */}
      {mobileOpen && (
        <div className="tn-mobile-menu" id="tn-mobile-menu">
          <div className="tn-mobile-group">
            <div className="tn-more-group-label">Main</div>
            {PRIMARY.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => `tn-mobile-item${isActive ? ' tn-mobile-item--active' : ''}`}>
                {label}
              </NavLink>
            ))}
          </div>
          {MORE_GROUPS.map(group => (
            <div key={group.label} className="tn-mobile-group">
              <div className="tn-more-group-label">{group.label}</div>
              {group.items.map(({ to, label }) => (
                <NavLink key={to} to={to}
                  className={({ isActive }) => `tn-mobile-item${isActive ? ' tn-mobile-item--active' : ''}`}>
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
