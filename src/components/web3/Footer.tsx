import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-brand-border bg-brand-bg/90 px-4 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-semibold text-brand-text">AleoJob</p>
          <p className="text-xs text-brand-text-muted">Work private. Build public proof.</p>
        </div>

        <div className="flex items-center gap-5 text-sm text-brand-text-muted">
          <Link to="/jobs" className="transition-colors hover:text-brand-text">Opportunities</Link>
          <Link to="/leaderboard" className="transition-colors hover:text-brand-text">Reputation</Link>
          <a href="https://aleo.org" target="_blank" rel="noreferrer" className="transition-colors hover:text-brand-text">
            Aleo Network
          </a>
        </div>
      </div>
    </footer>
  );
}
