import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

/* ── Icons ──────────────────────────────────────────────── */
const HomeIcon       = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M2 7.8L9 2L16 7.8V16.5H11.5V11H6.5V16.5H2V7.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>;
const DashboardIcon  = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg>;
const SearchIcon     = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><circle cx="7.5" cy="7.5" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11.5 11.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
const AnalyzerIcon   = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><circle cx="7.5" cy="7.5" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11.5 11.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M5.5 7.5H9.5M7.5 5.5V9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const ScoreIcon      = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M3 12.5C3 9.46 5.69 7 9 7s6 2.46 6 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M9 7V4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M5.5 8L3.8 6.3M12.5 8L14.2 6.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M9 12.5L6.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="12.5" r="1.4" fill="currentColor"/></svg>;
const PipelineIcon   = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="3.5" height="12" rx="1" stroke="currentColor" strokeWidth="1.4"/><rect x="7.25" y="3" width="3.5" height="8" rx="1" stroke="currentColor" strokeWidth="1.4"/><rect x="12.5" y="3" width="3.5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/></svg>;
const DealIcon       = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><rect x="2.5" y="4" width="13" height="10.5" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5.5 4V3C5.5 2.2 6.1 1.7 6.9 1.7H11.1C11.9 1.7 12.5 2.2 12.5 3V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M5.5 10.5L7.7 8.3L9.5 10L12.7 6.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const GalleryIcon    = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="6.5" cy="6" r="1.5" fill="currentColor" opacity="0.7"/><path d="M2 10.5L5.5 7.5L8 9.5L11 6.5L16 10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const WorkspaceIcon  = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M2.5 5.2C2.5 4.1 3.1 3.5 4.2 3.5H7L8.4 5H13.8C14.9 5 15.5 5.6 15.5 6.7V13.3C15.5 14.4 14.9 15 13.8 15H4.2C3.1 15 2.5 14.4 2.5 13.3V5.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M5.5 9.2H12.5M5.5 12H9.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
const CompareIcon    = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><rect x="2.5" y="4" width="4" height="10" rx="1.3" stroke="currentColor" strokeWidth="1.5"/><rect x="11.5" y="4" width="4" height="10" rx="1.3" stroke="currentColor" strokeWidth="1.5"/><path d="M7.5 9H10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const MapIcon        = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M3 5.2L7 3.5L11 5.2L15 3.5V12.8L11 14.5L7 12.8L3 14.5V5.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 3.5V12.8M11 5.2V14.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="9" cy="8.8" r="1.4" fill="currentColor"/></svg>;
const NeighIcon      = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M9 2C6.8 2 5 3.8 5 6C5 9.5 9 14 9 14C9 14 13 9.5 13 6C13 3.8 11.2 2 9 2Z" stroke="currentColor" strokeWidth="1.5"/><circle cx="9" cy="6" r="1.8" fill="currentColor"/></svg>;
const ChartIcon      = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><polyline points="2,14 6,9 10,12 16,5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="16" cy="5" r="1.8" fill="currentColor"/></svg>;
const HeatMapIcon    = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><rect x="2.5" y="2.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="5" y="5" width="3" height="3" rx="0.6" fill="currentColor" opacity="0.35"/><rect x="10" y="5" width="3" height="3" rx="0.6" fill="currentColor"/><rect x="5" y="10" width="3" height="3" rx="0.6" fill="currentColor"/><rect x="10" y="10" width="3" height="3" rx="0.6" fill="currentColor" opacity="0.55"/></svg>;
const CalcIcon       = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><rect x="3" y="2.5" width="12" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M6 6.5H12M6 9H12M6 11.5H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const CashFlowIcon   = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><polyline points="2,13 5.5,8.5 8.5,10.5 12,6 15.5,7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const PortfolioIcon  = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><rect x="2" y="7" width="3" height="9" rx="1" stroke="currentColor" strokeWidth="1.4"/><rect x="7.5" y="4" width="3" height="12" rx="1" stroke="currentColor" strokeWidth="1.4"/><rect x="13" y="1.5" width="3" height="14.5" rx="1" stroke="currentColor" strokeWidth="1.4"/></svg>;
const ROIIcon        = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><circle cx="6.5" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.4"/><circle cx="11.5" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M4 13.5L13.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
const TaxIcon        = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><rect x="3" y="2" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="6.5" cy="7.5" r="1.2" stroke="currentColor" strokeWidth="1.2"/><circle cx="11.5" cy="10.5" r="1.2" stroke="currentColor" strokeWidth="1.2"/><path d="M7.2 11.2L10.8 6.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const StarIcon       = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M9 1.5L10.9 6.8H16.5L11.8 10L13.7 15.5L9 12.3L4.3 15.5L6.2 10L1.5 6.8H7.1L9 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>;
const DocumentIcon   = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M4.5 2.5H10.7L13.5 5.4V15.5H4.5V2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M10.7 2.5V5.4H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M6.8 9H11.2M6.8 11.7H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const NegIcon        = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M3 9.5L5.8 6.7C6.6 5.9 7.8 5.8 8.7 6.5L9.4 7.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 9.4L12.1 6.6C11.3 5.9 10.1 5.8 9.3 6.5L7.8 7.8C7.4 8.2 7.4 8.8 7.8 9.2L10.3 8.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M5.8 10.6L8.7 13.2C9.5 13.9 10.7 13.9 11.5 13.1L13.1 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const BotIcon        = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><rect x="2" y="6" width="14" height="9" rx="2.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="6.5" cy="10.5" r="1" fill="currentColor"/><circle cx="11.5" cy="10.5" r="1" fill="currentColor"/><path d="M9 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="1.8" r="1.2" fill="currentColor"/></svg>;
const DevIcon        = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5.5 9L8 11.5L12.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 5.5H16" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const ArchIcon       = () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><rect x="2.5" y="4" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M2.5 7.5H15.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M6.5 4V7.5M11.5 4V7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M5.5 10.5h2.5M5.5 12.5h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
const ChevronIcon    = ({ open }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>
    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ── Nav sections ───────────────────────────────────────── */
const SECTIONS = [
  {
    id: 'start',
    label: 'Start Here',
    primary: [
      { to: '/',               label: 'Home',      icon: HomeIcon,      end: true  },
      { to: '/main-dashboard', label: 'Dashboard', icon: DashboardIcon, end: true  },
    ],
  },
  {
    id: 'analyze',
    label: 'Analyze Property',
    primary: [
      { to: '/property-search', label: 'Property Search',   icon: SearchIcon,   end: false },
      { to: '/analyzer',        label: 'Property Analyzer', icon: AnalyzerIcon, end: false },
      { to: '/score-engine',    label: 'Score Engine',      icon: ScoreIcon,    end: false },
      { to: '/deal-analyzer',   label: 'Deal Analyzer',     icon: DealIcon,     end: false },
      { to: '/deal-pipeline',   label: 'Deal Pipeline',     icon: PipelineIcon, end: false },
    ],
    secondary: [
      { to: '/gallery',     label: 'Photo Gallery',       icon: GalleryIcon,   end: false },
      { to: '/workspace',   label: 'Property Workspace',  icon: WorkspaceIcon, end: false },
      { to: '/comparison',  label: 'Comparison Center',   icon: CompareIcon,   end: false },
    ],
  },
  {
    id: 'market',
    label: 'Market & Neighborhood',
    primary: [
      { to: '/market-heat-map', label: 'Market Heat Map',     icon: HeatMapIcon, end: false },
      { to: '/map',             label: 'Interactive Map',     icon: MapIcon,     end: false },
      { to: '/neighborhood',    label: 'Neighborhood Intel',  icon: NeighIcon,   end: false },
      { to: '/market',          label: 'Market Intelligence', icon: ChartIcon,   end: false },
    ],
  },
  {
    id: 'money',
    label: 'Money & Taxes',
    primary: [
      { to: '/mortgage-calc', label: 'Mortgage Calculator', icon: CalcIcon,     end: false },
      { to: '/cash-flow',     label: 'Cash Flow Analyzer',  icon: CashFlowIcon, end: false },
      { to: '/portfolio',     label: 'Portfolio Dashboard', icon: PortfolioIcon,end: false },
    ],
    secondary: [
      { to: '/rental-roi',  label: 'Rental ROI',     icon: ROIIcon, end: false },
      { to: '/tax-center',  label: 'Tax Center',     icon: TaxIcon, end: false },
      { to: '/benefits',    label: 'Benefits Finder', icon: StarIcon, end: false },
    ],
  },
  {
    id: 'docs',
    label: 'Documents',
    primary: [
      { to: '/documents',   label: 'Document Center', icon: DocumentIcon, end: false },
      { to: '/negotiation', label: 'Negotiation',     icon: NegIcon,      end: false },
    ],
  },
  {
    id: 'advisor',
    label: 'AI Advisor',
    primary: [
      { to: '/advisor', label: 'AI Advisor', icon: BotIcon, end: false },
    ],
  },
  {
    id: 'bim',
    label: 'Development / BIM',
    primary: [
      { to: '/dev-studio',    label: 'Development Studio',      icon: DevIcon,  end: false },
      { to: '/architecture',  label: 'Architecture & BIM',      icon: ArchIcon, end: false },
    ],
  },
];

/* ── Sidebar ────────────────────────────────────────────── */
export default function Sidebar() {
  const [expanded, setExpanded] = useState({});

  function toggle(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-logo">
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <rect width="22" height="22" rx="7" fill="rgba(255,255,255,0.15)"/>
            <path d="M5 17L9 8L13 13L16 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="17" cy="8" r="2.5" fill="#E8C46A"/>
          </svg>
        </div>
        <div className="brand-text">
          <span className="brand-name">CinNova</span>
          <span className="brand-sub">Property Intelligence</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {SECTIONS.map(section => {
          const isOpen = expanded[section.id];
          const hasMore = section.secondary && section.secondary.length > 0;
          return (
            <div key={section.id} className="sb-section">
              <div className="sb-section-label">{section.label}</div>
              {section.primary.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end}
                  className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}>
                  <span className="nav-icon"><Icon /></span>
                  <span className="nav-text">{label}</span>
                </NavLink>
              ))}
              {hasMore && (
                <>
                  {isOpen && section.secondary.map(({ to, label, icon: Icon, end }) => (
                    <NavLink key={to} to={to} end={end}
                      className={({ isActive }) => `nav-link nav-link--secondary${isActive ? ' nav-link--active' : ''}`}>
                      <span className="nav-icon"><Icon /></span>
                      <span className="nav-text">{label}</span>
                    </NavLink>
                  ))}
                  <button className="sb-more-btn" onClick={() => toggle(section.id)}>
                    <ChevronIcon open={isOpen} />
                    {isOpen ? 'Show less' : `${section.secondary.length} more tools`}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="ai-status">
          <span className="ai-dot" />
          <span>AI Engine Active</span>
        </div>
        <p className="sidebar-ver">CinNova · Beta v1.0</p>
      </div>
    </aside>
  );
}
