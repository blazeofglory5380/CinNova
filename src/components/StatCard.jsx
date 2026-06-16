import './StatCard.css';

export default function StatCard({ icon, label, value, change, changeType = 'neutral', accent, onClick }) {
  return (
    <div
      className={[
        'stat-card',
        accent   ? 'stat-card--accent'    : '',
        onClick  ? 'stat-card--clickable' : '',
      ].join(' ')}
      onClick={onClick}
    >
      {icon && <div className="stat-icon">{icon}</div>}
      <div className="stat-body">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {change && (
          <p className={`stat-change stat-change--${changeType}`}>{change}</p>
        )}
      </div>
    </div>
  );
}
