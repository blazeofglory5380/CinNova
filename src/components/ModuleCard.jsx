import './ModuleCard.css';

const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8H13M9 4L13 8L9 12"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function ModuleCard({ icon, title, description, status = 'active', badge, onClick }) {
  return (
    <div
      className={`module-card module-card--${status}`}
      onClick={status === 'active' ? onClick : undefined}
      role={status === 'active' ? 'button' : undefined}
      tabIndex={status === 'active' ? 0 : undefined}
      onKeyDown={status === 'active' && onClick
        ? e => e.key === 'Enter' && onClick()
        : undefined}
    >
      <div className="mc-icon">{icon}</div>
      <div className="mc-body">
        <h4 className="mc-title">{title}</h4>
        <p className="mc-desc">{description}</p>
      </div>
      <div className="mc-right">
        {status === 'coming-soon' && <span className="mc-soon">Soon</span>}
        {status === 'active'      && <span className="mc-arrow"><ArrowIcon /></span>}
        {badge                    && <span className="mc-badge">{badge}</span>}
      </div>
    </div>
  );
}
