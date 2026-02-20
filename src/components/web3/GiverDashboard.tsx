import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, DollarSign, FileStack, PlusCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from './EmptyState';

export interface GiverApplicationRow {
  id: string;
  seekerName: string;
  seekerAddress: string;
  status: string;
  appliedAt: string;
  score?: number;
  skills?: string[];
}

export interface GiverJobRow {
  id: string;
  title: string;
  summary: string;
  skills: string[];
  budget?: string | null;
  isActive: boolean;
  paymentStatus?: string;
  escrowStatus?: string;
  escrowAmount?: number;
  applications: GiverApplicationRow[];
}

interface GiverDashboardProps {
  walletAddress?: string;
  jobs: GiverJobRow[];
  expandedJobIds: Set<string>;
  onToggleExpanded: (jobId: string) => void;
  onAccept: (applicationId: string) => void;
  onReject: (applicationId: string) => void;
  isSubmitting?: boolean;
  onOpenCreateJob: () => void;
}

export function GiverDashboard({
  walletAddress,
  jobs,
  expandedJobIds,
  onToggleExpanded,
  onAccept,
  onReject,
  isSubmitting = false,
  onOpenCreateJob,
}: GiverDashboardProps) {
  const activeJobs = jobs.filter((job) => job.isActive).length;
  const totalApplications = jobs.reduce((sum, job) => sum + job.applications.length, 0);

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand-text">Giver Control Panel</h1>
          <p className="mt-1 text-sm text-brand-text-muted">Publish work, manage candidates, and lock payments in escrow.</p>
          {walletAddress && <p className="mt-2 font-mono text-xs text-brand-text-muted">{walletAddress}</p>}
        </div>
        <Button onClick={onOpenCreateJob} variant="primary" disabled={isSubmitting}>
          <PlusCircle size={16} />
          New Opportunity
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 text-sm text-brand-text-muted">
            <FileStack size={15} className="text-brand-secondary" />
            Active Listings
          </div>
          <p className="mt-2 text-2xl font-semibold text-brand-text">{activeJobs}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 text-sm text-brand-text-muted">
            <ShieldCheck size={15} className="text-brand-primary" />
            Incoming Applications
          </div>
          <p className="mt-2 text-2xl font-semibold text-brand-text">{totalApplications}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 text-sm text-brand-text-muted">
            <DollarSign size={15} className="text-emerald-300" />
            Escrow Positions
          </div>
          <p className="mt-2 text-2xl font-semibold text-brand-text">
            {jobs.filter((job) => job.escrowStatus === 'locked').length}
          </p>
        </div>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          title="No Opportunities Yet"
          description="No Opportunities Yet — Be the first to interact with the protocol."
          actionLabel="Create First Job"
          onAction={onOpenCreateJob}
        />
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const expanded = expandedJobIds.has(job.id);

            return (
              <motion.article
                key={job.id}
                whileHover={{ scale: 1.005 }}
                className="glass-card rounded-2xl p-5 transition-shadow hover:glow-outline"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <h3 className="text-lg font-semibold text-brand-text">{job.title}</h3>
                    <p className="mt-1 text-sm text-brand-text-muted">{job.summary}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {job.skills.map((skill) => (
                        <span
                          key={`${job.id}-${skill}`}
                          className="rounded-full border border-brand-border bg-brand-surface-elevated px-2.5 py-1 text-xs text-brand-text-muted"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-brand-text-muted">
                      <span>{job.budget || 'Budget on request'}</span>
                      <span>{job.applications.length} applicants</span>
                      {job.paymentStatus && <span>Payment: {job.paymentStatus}</span>}
                      {job.escrowStatus && <span>Escrow: {job.escrowStatus}</span>}
                      {typeof job.escrowAmount === 'number' && <span>{job.escrowAmount} credits locked</span>}
                    </div>
                  </div>

                  <Button variant="ghost" size="sm" onClick={() => onToggleExpanded(job.id)}>
                    {expanded ? (
                      <>
                        Hide Applicants
                        <ChevronUp size={14} />
                      </>
                    ) : (
                      <>
                        View Applicants
                        <ChevronDown size={14} />
                      </>
                    )}
                  </Button>
                </div>

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 overflow-hidden border-t border-brand-border pt-4"
                    >
                      {job.applications.length === 0 ? (
                        <p className="text-sm text-brand-text-muted">No applications received yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {job.applications.map((application) => (
                            <div
                              key={application.id}
                              className="rounded-xl border border-brand-border bg-brand-surface-elevated p-3"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium text-brand-text">{application.seekerName || 'Anonymous'}</p>
                                  <p className="mt-1 font-mono text-xs text-brand-text-muted">
                                    {application.seekerAddress}
                                  </p>
                                  {application.skills && application.skills.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {application.skills.slice(0, 4).map((skill) => (
                                        <span
                                          key={`${application.id}-${skill}`}
                                          className="rounded-full border border-brand-border px-2 py-0.5 text-[11px] text-brand-text-muted"
                                        >
                                          {skill}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <span className="rounded-full border border-brand-border px-2.5 py-1 text-xs text-brand-text-muted">
                                    {application.status}
                                  </span>
                                  {typeof application.score === 'number' && (
                                    <span className="text-xs text-brand-text-muted">Score: {application.score}</span>
                                  )}
                                  {application.status.trim().toLowerCase() === 'pending' && (
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="primary"
                                        disabled={isSubmitting}
                                        onClick={() => onAccept(application.id)}
                                      >
                                        Accept
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={isSubmitting}
                                        onClick={() => onReject(application.id)}
                                      >
                                        Reject
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </div>
      )}
    </section>
  );
}
