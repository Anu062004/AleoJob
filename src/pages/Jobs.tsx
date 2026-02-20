import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { transferCredits } from '@/lib/credit-transfer';
import { getAccessProofHash, verifyAccessOnChain } from '@/lib/accessVerification';
import { createSupabaseClientWithToken, supabase } from '@/lib/supabaseClient';
import { JobCard } from '@/components/web3/JobCard';
import { EmptyState } from '@/components/web3/EmptyState';
import { Button } from '@/components/ui/Button';
import { OpportunityJob } from '@/components/web3/types';
import { fetchMarketplaceProfile, isSeekerOnboardingComplete } from '@/lib/profileRole';

const FAILED_TX_STATUSES = new Set(['failed', 'failure', 'rejected', 'aborted', 'error', 'invalid']);

function Jobs() {
  const { connected, address, executeTransaction, transactionStatus } = useWallet();
  const [roleStatus, setRoleStatus] = useState<'loading' | 'unassigned' | 'seeker' | 'giver'>('loading');
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [jobs, setJobs] = useState<OpportunityJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const [hasPaid, setHasPaid] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [accessProofHash, setAccessProofHash] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('jobs')
          .select('id, title, description, skills, budget, created_at')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setJobs(
          (data || []).map((job: any) => ({
            id: job.id,
            title: job.title,
            summary: job.description,
            skills: job.skills || [],
            budget: job.budget,
            zkVerified: true,
            createdAt: job.created_at,
          }))
        );
      } catch (error) {
        console.error('[Jobs] Failed to fetch jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  useEffect(() => {
    if (!connected || !address) {
      setRoleStatus('loading');
      setOnboardingComplete(false);
      setHasPaid(false);
      setAccessProofHash('');
      return;
    }

    void (async () => {
      try {
        const profile = await fetchMarketplaceProfile(address);
        if (!profile?.role) {
          setRoleStatus('unassigned');
          setOnboardingComplete(false);
          setHasPaid(false);
          setAccessProofHash('');
          return;
        }

        if (profile.role !== 'seeker') {
          setRoleStatus('giver');
          setOnboardingComplete(false);
          setHasPaid(false);
          setAccessProofHash('');
          return;
        }

        const client = createSupabaseClientWithToken(address);
        const { count: cvCount } = await client
          .from('cvs')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id);

        const hasCv = Number(cvCount || 0) > 0;
        const complete = isSeekerOnboardingComplete(profile, hasCv);

        setRoleStatus('seeker');
        setOnboardingComplete(complete);
      } catch (error) {
        console.error('[Jobs] Failed to resolve wallet role:', error);
        setRoleStatus('unassigned');
        setOnboardingComplete(false);
        setHasPaid(false);
        setAccessProofHash('');
      }
    })();
  }, [connected, address]);

  const refreshAccessStatus = useCallback(async (transactionId?: string) => {
    if (!connected || !address || roleStatus !== 'seeker' || !onboardingComplete) {
      setHasPaid(false);
      setAccessProofHash('');
      return null;
    }

    setIsCheckingAccess(true);
    try {
      const verification = await verifyAccessOnChain({
        aleoAddress: address,
        role: 'seeker',
        transactionId,
      });

      setHasPaid(verification.hasAccess);
      setAccessProofHash(verification.hasAccess ? getAccessProofHash(verification) : '');
      return verification;
    } catch (error) {
      console.error('[Jobs] Access verification failed:', error);
      if (transactionId) {
        setHasPaid(true);
        setAccessProofHash(`tx:${transactionId}`);
      } else {
        setHasPaid(false);
        setAccessProofHash('');
      }
      return null;
    } finally {
      setIsCheckingAccess(false);
    }
  }, [connected, address, roleStatus, onboardingComplete]);

  useEffect(() => {
    if (roleStatus === 'seeker' && onboardingComplete) {
      void refreshAccessStatus();
    }
  }, [refreshAccessStatus]);

  const filteredJobs = useMemo(() => {
    if (!search.trim()) return jobs;
    const term = search.toLowerCase();
    return jobs.filter((job) => {
      return (
        job.title.toLowerCase().includes(term) ||
        job.summary.toLowerCase().includes(term) ||
        job.skills.some((skill) => skill.toLowerCase().includes(term))
      );
    });
  }, [jobs, search]);

  const handlePayToBrowse = async () => {
    if (!connected || !address || !executeTransaction || roleStatus !== 'seeker' || !onboardingComplete) return;
    const confirmPay = window.confirm('Pay 1 Aleo credit to unlock quick apply?');
    if (!confirmPay) return;

    setIsPaying(true);
    try {
      const result = await transferCredits(executeTransaction, transactionStatus, address, false);
      if (!result.success) {
        throw new Error(result.error || 'Payment failed');
      }

      setHasPaid(true);
      setAccessProofHash(`tx:${result.transactionId}`);

      const verification = await refreshAccessStatus(result.transactionId);
      if (!verification) {
        alert('Payment submitted. Access unlocked provisionally while Aleo indexing completes.');
        window.setTimeout(() => {
          void refreshAccessStatus(result.transactionId);
        }, 6000);
        return;
      }

      const verificationStatus = String(verification.transaction?.status || '').toLowerCase();
      if (FAILED_TX_STATUSES.has(verificationStatus)) {
        setHasPaid(false);
        setAccessProofHash('');
        throw new Error(`Payment transaction failed on-chain (${verificationStatus}).`);
      }

      if (verification.hasAccess) {
        alert('Applicant access unlocked and verified on Aleo testnet.');
      } else {
        alert('Payment submitted. Access proof is still syncing from Aleo network, retrying shortly.');
        window.setTimeout(() => {
          void refreshAccessStatus(result.transactionId);
        }, 6000);
      }
    } catch (error: any) {
      alert(`Payment failed: ${error.message}`);
    } finally {
      setIsPaying(false);
    }
  };

  const handleApply = async (jobId: string) => {
    if (!connected || !address || roleStatus !== 'seeker' || !onboardingComplete || !hasPaid || isCheckingAccess) return;

    setProcessingJobId(jobId);
    try {
      const client = createSupabaseClientWithToken(address);

      let userId: string;
      const { data: user, error: userError } = await client
        .from('profiles')
        .select('id, role')
        .eq('aleo_address', address)
        .single();

      if (userError || !user?.id) {
        throw new Error(userError?.message || 'Seeker profile not found. Complete onboarding first.');
      }

      if (user.role !== 'seeker') {
        throw new Error('This wallet is not registered as a seeker.');
      }

      userId = user.id;

      const { count: cvCount } = await client
        .from('cvs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (!cvCount || Number(cvCount) <= 0) {
        throw new Error('Upload your CV in Seeker panel before applying.');
      }

      const { error: applyError } = await client.from('applications').insert({
        job_id: jobId,
        seeker_id: userId,
        zk_application_hash: accessProofHash || `proof:pending:${Date.now()}`,
        status: 'pending',
      });

      if (applyError?.code === '23505') {
        alert('You already applied to this opportunity.');
        return;
      }

      if (applyError) throw applyError;
      alert('Application submitted to protocol queue.');
    } catch (error: any) {
      alert(`Failed to apply: ${error.message}`);
    } finally {
      setProcessingJobId(null);
    }
  };

  const seekerActionEnabled = connected && roleStatus === 'seeker' && onboardingComplete;

  const roleBanner = useMemo(() => {
    if (!connected) return null;
    if (roleStatus === 'loading') {
      return 'Resolving wallet role...';
    }
    if (roleStatus === 'unassigned') {
      return 'Select Job Seeker role first in onboarding before unlocking seeker access.';
    }
    if (roleStatus === 'giver') {
      return 'This wallet is locked as Job Giver and cannot perform seeker actions.';
    }
    if (!onboardingComplete) {
      return 'Complete seeker onboarding (email, qualification, experience, CV) in Seeker panel before applying.';
    }
    return null;
  }, [connected, roleStatus, onboardingComplete]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-brand-text">Opportunities</h1>
          <p className="mt-1 text-sm text-brand-text-muted">Search active jobs and apply with ZK-compatible profiles.</p>
        </div>
      </div>

      {roleBanner && (
        <div className="glass-card mb-6 rounded-2xl p-4">
          <p className="text-sm text-brand-text-muted">{roleBanner}</p>
        </div>
      )}

      {seekerActionEnabled && isCheckingAccess && (
        <div className="glass-card mb-6 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-sm text-brand-text-muted">
            <Loader2 className="animate-spin" size={15} />
            Verifying access proof on Aleo testnet...
          </div>
        </div>
      )}

      {seekerActionEnabled && !isCheckingAccess && !hasPaid && (
        <div className="glass-card mb-6 rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-brand-text">Applicant access required</p>
              <p className="text-sm text-brand-text-muted">Unlock quick apply by paying 1 Aleo credit on-chain.</p>
            </div>
            <Button onClick={handlePayToBrowse} disabled={isPaying}>
              {isPaying ? <Loader2 className="animate-spin" size={15} /> : 'Unlock Access'}
            </Button>
          </div>
        </div>
      )}

      <div className="mb-6 max-w-lg">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find jobs by title, skills, or role"
            className="w-full rounded-2xl border border-brand-border bg-brand-surface py-3 pl-9 pr-4 text-sm text-brand-text outline-none transition-colors focus:border-brand-secondary/60"
          />
        </div>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-10 text-center text-brand-text-muted">Syncing opportunities...</div>
      ) : filteredJobs.length === 0 ? (
        <EmptyState description="No Opportunities Yet — Be the first to interact with the protocol." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              canApply={seekerActionEnabled && hasPaid && !isCheckingAccess}
              applying={processingJobId === job.id}
              onQuickApply={handleApply}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Jobs;
