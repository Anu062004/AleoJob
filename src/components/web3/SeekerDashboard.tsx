import { motion } from 'framer-motion';
import { BadgeCheck, BriefcaseBusiness, Compass, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from './EmptyState';

interface SeekerApplication {
  id: string;
  jobTitle: string;
  status: string;
  createdAt: string;
}

interface SeekerDashboardProps {
  walletAddress?: string;
  reputation: number;
  completedJobs: number;
  applications: SeekerApplication[];
}

export function SeekerDashboard({ walletAddress, reputation, completedJobs, applications }: SeekerDashboardProps) {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-brand-text">Seeker Control Panel</h1>
        <p className="mt-1 text-sm text-brand-text-muted">Track applications, identity score, and verified delivery history.</p>
        {walletAddress && <p className="mt-2 font-mono text-xs text-brand-text-muted">{walletAddress}</p>}
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-3 text-brand-text-muted">
            <Compass size={16} className="text-brand-secondary" />
            Applications
          </div>
          <p className="mt-3 text-2xl font-semibold text-brand-text">{applications.length}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-3 text-brand-text-muted">
            <BadgeCheck size={16} className="text-emerald-300" />
            Jobs Completed
          </div>
          <p className="mt-3 text-2xl font-semibold text-brand-text">{completedJobs}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-3 text-brand-text-muted">
            <Star size={16} className="text-amber-300" />
            Reputation Score
          </div>
          <p className="mt-3 text-2xl font-semibold text-brand-text">{reputation}/100</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-text">Live Applications</h2>
          <Link to="/jobs">
            <Button variant="secondary" size="sm">
              Browse Opportunities
            </Button>
          </Link>
        </div>

        {applications.length === 0 ? (
          <EmptyState
            title="No Active Applications"
            description="No Opportunities Yet — Be the first to interact with the protocol."
            actionLabel="Explore Jobs"
            onAction={() => {
              window.location.assign('/jobs');
            }}
          />
        ) : (
          <div className="space-y-3">
            {applications.map((application, index) => (
              <motion.div
                key={application.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="rounded-xl border border-brand-border bg-brand-surface-elevated p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-brand-text">{application.jobTitle}</p>
                    <p className="mt-1 text-xs text-brand-text-muted">
                      Applied {new Date(application.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full border border-brand-border px-2.5 py-1 text-xs text-brand-text-muted">
                    {application.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="glass-card rounded-2xl p-4">
          <div className="mb-2 flex items-center gap-2 text-brand-text">
            <BriefcaseBusiness size={16} className="text-brand-primary" />
            Skill Proof Upload
          </div>
          <p className="text-sm text-brand-text-muted">Attach private credentials and ZK-verifiable portfolio proofs.</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="mb-2 flex items-center gap-2 text-brand-text">
            <BadgeCheck size={16} className="text-brand-secondary" />
            Reputation Ledger Sync
          </div>
          <p className="text-sm text-brand-text-muted">Your completion score updates automatically after escrow release.</p>
        </div>
      </div>
    </section>
  );
}
