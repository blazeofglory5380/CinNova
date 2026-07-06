// BetaFooter — shared disclaimer + feedback link for all major pages
import { useNavigate } from 'react-router-dom';
import './BetaFooter.css';

export default function BetaFooter({ page = '', readinessSoon = false }) {
  const navigate = useNavigate();
  const subject  = encodeURIComponent('CinNova Real Estate AI Beta Feedback');
  const body     = encodeURIComponent(`Page: ${page || 'CinNova'}\n\nFeedback:\n`);
  const mailto   = `mailto:thin_line_99@yahoo.com?subject=${subject}&body=${body}`;

  return (
    <footer className="beta-footer">
      <div className="beta-footer-left">
        <span className="beta-footer-badge">BETA v0.1</span>
        <p className="beta-footer-text">
          For educational and informational purposes only. Not financial, legal, tax, or investment advice.
        </p>
      </div>
      <div className="beta-footer-right">
        <button
          type="button"
          className="beta-footer-readiness"
          onClick={() => { if (!readinessSoon) navigate('/beta-readiness'); }}
          disabled={readinessSoon}
        >
          Beta Readiness {readinessSoon ? '· Soon' : '→'}
        </button>
        <a href={mailto} className="beta-footer-feedback">
          <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M2 7l7 4.5L16 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Send Feedback
        </a>
      </div>
    </footer>
  );
}
