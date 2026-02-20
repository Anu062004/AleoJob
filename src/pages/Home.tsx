import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Lock, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { Hero } from '@/components/web3/Hero';
import { JobCard } from '@/components/web3/JobCard';
import { ReputationCard } from '@/components/web3/ReputationCard';
import { EmptyState } from '@/components/web3/EmptyState';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabaseClient';
import { OpportunityJob, ReputationEntry } from '@/components/web3/types';

const privacyReasons = [
  {
    icon: Lock,
    title: 'Identity stays private',
    description: 'Operate under pseudonymous addresses while preserving professional continuity.',
  },
  {
    icon: ShieldCheck,
    title: 'Proofs replace paperwork',
    description: 'Zero-knowledge attestations verify capability without exposing raw documents.',
  },
  {
    icon: Activity,
    title: 'Escrow enforces trust',
    description: 'Funds lock on-chain and release only when the protocol validates completion.',
  },
];

function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [jobs, setJobs] = useState<OpportunityJob[]>([]);
  const [leaderboard, setLeaderboard] = useState<ReputationEntry[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [{ data: jobsData, error: jobsError }, { data: profilesData, error: profilesError }] = await Promise.all([
          supabase
            .from('jobs')
            .select('id, title, description, skills, budget, created_at')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(6),
          supabase
            .from('profiles')
            .select('id, aleo_address, profile_score, completed_jobs, jobs_posted, role')
            .order('profile_score', { ascending: false })
            .limit(5),
        ]);

        if (!jobsError && jobsData) {
          setJobs(
            jobsData.map((job: any) => ({
              id: job.id,
              title: job.title,
              summary: job.description,
              skills: job.skills || [],
              budget: job.budget,
              zkVerified: true,
              createdAt: job.created_at,
            }))
          );
        }

        if (!profilesError && profilesData) {
          setLeaderboard(
            profilesData.map((profile: any, index: number) => ({
              id: profile.id,
              alias: `Anonymous #${index + 1}`,
              address: profile.aleo_address || 'aleo1unknown',
              score: profile.profile_score || 0,
              proofCount: Math.max(1, profile.role === 'giver' ? profile.jobs_posted || 0 : profile.completed_jobs || 0),
              role: profile.role === 'giver' ? 'giver' : 'seeker',
            }))
          );
        }
      } finally {
        setLoadingJobs(false);
      }
    };

    loadData();
  }, []);

  const filteredJobs = useMemo(() => {
    if (!query.trim()) return jobs;
    const term = query.toLowerCase();
    return jobs.filter((job) => {
      return (
        job.title.toLowerCase().includes(term) ||
        job.summary.toLowerCase().includes(term) ||
        job.skills.some((skill) => skill.toLowerCase().includes(term))
      );
    });
  }, [jobs, query]);

  return (
    <div className="protocol-shell">
      <Hero />

      <section id="privacy" className="section-anchor mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="mb-10 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-secondary">Why Privacy Matters</p>
          <h2 className="mt-3 text-3xl font-semibold text-brand-text">Trustless hiring, privacy-first by design.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {privacyReasons.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06 }}
                className="glass-card rounded-2xl p-5"
              >
                <div className="mb-4 inline-flex rounded-xl bg-brand-primary/15 p-2 text-brand-primary">
                  <Icon size={18} />
                </div>
                <h3 className="text-lg font-semibold text-brand-text">{item.title}</h3>
                <p className="mt-2 text-sm text-brand-text-muted">{item.description}</p>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section id="opportunities" className="section-anchor mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-secondary">Opportunities</p>
            <h2 className="mt-2 text-3xl font-semibold text-brand-text">Discover active protocol listings.</h2>
          </div>
          <Link to="/jobs">
            <Button variant="secondary">Open Full Marketplace</Button>
          </Link>
        </div>

        <div className="mb-5 max-w-md">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, skill, or proof type"
            className="w-full rounded-2xl border border-brand-border bg-brand-surface px-4 py-3 text-sm text-brand-text outline-none transition-colors focus:border-brand-secondary/60"
          />
        </div>

        {loadingJobs ? (
          <div className="glass-card rounded-2xl p-10 text-center text-brand-text-muted">Syncing opportunities from the ledger...</div>
        ) : filteredJobs.length === 0 ? (
          <EmptyState description="No Opportunities Yet — Be the first to interact with the protocol." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} canApply onQuickApply={() => navigate('/jobs')} />
            ))}
          </div>
        )}
      </section>

      <section id="ledger" className="section-anchor mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-secondary">Reputation Ledger</p>
            <h2 className="mt-2 text-3xl font-semibold text-brand-text">Proof-based reputation, not profile theater.</h2>
          </div>
          <Link to="/leaderboard">
            <Button variant="outline">View Full Leaderboard</Button>
          </Link>
        </div>

        {leaderboard.length === 0 ? (
          <EmptyState
            title="Ledger Warming Up"
            description="As proofs settle, top contributors will appear here with circular reputation rings."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {leaderboard.slice(0, 3).map((entry) => (
              <ReputationCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </section>

      <section id="control-panels" className="section-anchor mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-secondary">Control Panels</p>
          <h2 className="mt-2 text-3xl font-semibold text-brand-text">Operate as a seeker or giver with protocol-native dashboards.</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <article className="glass-card rounded-2xl p-6">
            <div className="mb-3 inline-flex rounded-xl bg-brand-primary/15 p-2 text-brand-primary">
              <UserRoundCheck size={18} />
            </div>
            <h3 className="text-xl font-semibold text-brand-text">Seeker Control Panel</h3>
            <p className="mt-2 text-sm text-brand-text-muted">
              Track applications, update verifiable profiles, and monitor escrow-backed payouts.
            </p>
            <div className="mt-5">
              <Link to="/seeker">
                <Button variant="secondary">Open Seeker Panel</Button>
              </Link>
            </div>
          </article>

          <article className="glass-card rounded-2xl p-6">
            <div className="mb-3 inline-flex rounded-xl bg-brand-secondary/15 p-2 text-brand-secondary">
              <ShieldCheck size={18} />
            </div>
            <h3 className="text-xl font-semibold text-brand-text">Giver Control Panel</h3>
            <p className="mt-2 text-sm text-brand-text-muted">
              Post opportunities, review ZK-verified applicants, and create escrow for accepted matches.
            </p>
            <div className="mt-5">
              <Link to="/giver">
                <Button variant="secondary">Open Giver Panel</Button>
              </Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

export default Home;

