import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { SeekerDashboard } from '@/components/web3/SeekerDashboard';
import { CVUpload } from '@/components/CVUpload';
import { ProfileEditor } from '@/components/ProfileEditor';
import { EmptyState } from '@/components/web3/EmptyState';
import { createSupabaseClientWithToken } from '@/lib/supabaseClient';
import { apiRequest } from '@/lib/apiClient';
import { fetchMarketplaceProfile, isSeekerOnboardingComplete } from '@/lib/profileRole';
import { Button } from '@/components/ui/Button';

interface SeekerApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  status: string;
  createdAt: string;
  paymentStatus?: 'pending' | 'locked' | 'completed' | 'refunded';
  workProofStatus: 'not_submitted' | 'submitted' | 'verified' | 'rejected';
  workProofHash?: string;
  workProofTx?: string;
  workProofNotes?: string;
  workProofUrl?: string;
  workProofSubmittedAt?: string;
}

interface WorkProofResponse {
  success: boolean;
  error?: string;
}

function decodeProofUrl(notes: unknown): string {
  const text = typeof notes === 'string' ? notes.trim() : '';
  if (!text) return '';
  if (text.toLowerCase().startsWith('url:')) {
    return text.slice(4).trim();
  }
  return '';
}

interface ReputationResponse {
  success: boolean;
  data?: {
    score?: number;
  };
}

function Seeker() {
  const { connected, address } = useWallet();
  const [loading, setLoading] = useState(true);
  const [roleStatus, setRoleStatus] = useState<'loading' | 'unassigned' | 'seeker' | 'giver'>('loading');
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [reputation, setReputation] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [applications, setApplications] = useState<SeekerApplication[]>([]);
  const [completedJobsCount, setCompletedJobsCount] = useState(0);
  const [proofDrafts, setProofDrafts] = useState<Record<string, string>>({});
  const [submittingProofId, setSubmittingProofId] = useState<string | null>(null);

  const refreshReputation = async (aleoAddress: string) => {
    try {
      const response = await apiRequest<ReputationResponse>('/api/reputation/recalculate', {
        method: 'POST',
        body: { aleoAddress },
      });

      if (response.success) {
        setReputation(Number(response.data?.score || 0));
      }
    } catch (error) {
      console.warn('[Seeker] Reputation refresh failed:', error);
    }
  };

  const fetchData = async () => {
    if (!address) return;

    try {
      setLoading(true);
      const roleProfile = await fetchMarketplaceProfile(address);

      if (!roleProfile?.role) {
        setRoleStatus('unassigned');
        setProfile(null);
        setApplications([]);
        setReputation(0);
        setCompletedJobsCount(0);
        setOnboardingComplete(false);
        return;
      }

      if (roleProfile.role !== 'seeker') {
        setRoleStatus('giver');
        setProfile(null);
        setApplications([]);
        setReputation(0);
        setCompletedJobsCount(0);
        setOnboardingComplete(false);
        return;
      }

      setRoleStatus('seeker');
      const client = createSupabaseClientWithToken(address);

      const { data: userData, error: userError } = await client
        .from('profiles')
        .select(
          `
            id,
            role,
            email,
            education_level,
            experience_years,
            profile_score,
            completed_jobs,
            cvs (
              file_path,
              uploaded_at
            )
          `
        )
        .eq('aleo_address', address)
        .single();

      if (userError || !userData) {
        throw userError || new Error('Seeker profile not found.');
      }

      const hasCv = Array.isArray(userData.cvs) && userData.cvs.length > 0;
      setOnboardingComplete(isSeekerOnboardingComplete(roleProfile, hasCv));
      setProfile(userData);

      const { data: appsData, error: appsError } = await client
        .from('applications')
        .select(
          `
            id,
            job_id,
            status,
            created_at,
            work_proof_status,
            work_proof_hash,
            work_proof_tx,
            work_proof_notes,
            work_proof_submitted_at,
            jobs (
              title,
              payment_status
            )
          `
        )
        .eq('seeker_id', userData.id)
        .order('created_at', { ascending: false });

      if (appsError) throw appsError;

      const mappedApps: SeekerApplication[] = (appsData || []).map((application: any) => ({
        id: application.id,
        jobId: application.job_id,
        jobTitle: application.jobs?.title || 'Unknown job',
        status: application.status,
        createdAt: application.created_at,
        paymentStatus: application.jobs?.payment_status,
        workProofStatus: application.work_proof_status || 'not_submitted',
        workProofHash: application.work_proof_hash || '',
        workProofTx: application.work_proof_tx || '',
        workProofNotes: application.work_proof_notes || '',
        workProofUrl: decodeProofUrl(application.work_proof_notes),
        workProofSubmittedAt: application.work_proof_submitted_at || '',
      }));

      setApplications(mappedApps);
      setCompletedJobsCount(Number(userData.completed_jobs || 0));
      setReputation(Number(userData.profile_score || 0));

      await refreshReputation(address);
    } catch (error) {
      console.error('[Seeker] fetchData failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connected && address) {
      void fetchData();
    } else {
      setRoleStatus('loading');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, address]);

  const proofTargets = useMemo(() => {
    return applications.filter(
      (application) => application.status === 'accepted' && application.paymentStatus === 'locked'
    );
  }, [applications]);

  const submitProof = async (application: SeekerApplication) => {
    if (!address) {
      alert('Wallet address is required.');
      return;
    }

    const draft = String(proofDrafts[application.id] || '').trim();
    if (!draft) {
      alert('Enter a proof URL first.');
      return;
    }

    setSubmittingProofId(application.id);
    try {
      const response = await apiRequest<WorkProofResponse>('/api/work-proofs/submit', {
        method: 'POST',
        body: {
          applicationId: application.id,
          aleoAddress: address,
          proofUrl: draft,
        },
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to store work proof');
      }

      setProofDrafts((prev) => ({ ...prev, [application.id]: '' }));
      await fetchData();
      alert('Proof URL submitted. Waiting for giver verification.');
    } catch (error: any) {
      console.error('[Seeker] Proof submission failed:', error);
      alert(`Failed to submit proof: ${error?.message || 'Unknown error'}`);
    } finally {
      setSubmittingProofId(null);
    }
  };

  if (!connected) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 md:px-6">
        <EmptyState
          title="Wallet Not Initialized"
          description="Initialize Wallet to unlock your Seeker Control Panel."
        />
      </div>
    );
  }

  if (loading || roleStatus === 'loading') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-brand-text-muted md:px-6">
        Syncing seeker control panel...
      </div>
    );
  }

  if (roleStatus === 'unassigned') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 md:px-6">
        <EmptyState
          title="Role Selection Required"
          description="Select Job Seeker in onboarding first. This wallet cannot use seeker actions until role is assigned."
          actionLabel="Go To Role Selection"
          onAction={() => window.location.assign('/get-started')}
        />
      </div>
    );
  }

  if (roleStatus !== 'seeker') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 md:px-6">
        <EmptyState
          title="Wallet Locked As Giver"
          description="This wallet cannot switch to Job Seeker. Use your Giver panel or connect a different wallet."
          actionLabel="Open Giver Panel"
          onAction={() => window.location.assign('/giver')}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 md:px-6">
      {!onboardingComplete && (
        <section className="glass-card rounded-2xl p-4">
          <p className="font-medium text-brand-text">Seeker onboarding incomplete</p>
          <p className="mt-1 text-sm text-brand-text-muted">
            Add email, qualification, experience, and upload your CV to fully activate seeker reputation features.
          </p>
        </section>
      )}

      <SeekerDashboard
        walletAddress={address || ''}
        reputation={reputation}
        completedJobs={completedJobsCount}
        applications={applications}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {address && <ProfileEditor aleoAddress={address} onUpdate={fetchData} requireSeekerFields />}
        {address && (
          <CVUpload
            aleoAddress={address}
            existingCV={
              profile?.cvs?.[0]
                ? {
                  filePath: profile.cvs[0].file_path,
                  uploadedAt: profile.cvs[0].uploaded_at,
                }
                : null
            }
            onUploadSuccess={fetchData}
            forceSeekerRole
          />
        )}
      </div>

      {proofTargets.length > 0 && (
        <section className="glass-card rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-brand-text">Submit Proof Of Work</h2>
          <p className="mt-1 text-sm text-brand-text-muted">
            For accepted jobs with locked escrow, submit a delivery proof URL. Giver verifies this proof before release.
          </p>

          <div className="mt-4 space-y-3">
            {proofTargets.map((application) => (
              <div key={application.id} className="rounded-xl border border-brand-border bg-brand-surface-elevated p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-brand-text">{application.jobTitle}</p>
                    <p className="mt-1 text-xs text-brand-text-muted">Proof status: {application.workProofStatus}</p>
                    {application.workProofTx && (
                      <p className="mt-1 text-xs font-mono text-brand-text-muted">tx: {application.workProofTx}</p>
                    )}
                    {application.workProofUrl && (
                      <p className="mt-1 text-xs text-brand-text-muted break-all">url: {application.workProofUrl}</p>
                    )}
                  </div>
                  {application.workProofStatus === 'verified' ? (
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-300">
                      Verified
                    </span>
                  ) : application.workProofStatus === 'submitted' ? (
                    <span className="rounded-full border border-brand-border px-2.5 py-1 text-xs text-brand-text-muted">
                      Awaiting Giver Verification
                    </span>
                  ) : null}
                </div>

                {application.workProofStatus !== 'verified' && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={proofDrafts[application.id] || ''}
                      onChange={(event) => setProofDrafts((prev) => ({ ...prev, [application.id]: event.target.value }))}
                      className="min-h-[90px] w-full rounded-xl border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-secondary/60"
                      placeholder="Paste proof URL (GitHub PR, demo link, docs, IPFS URL)"
                      disabled={submittingProofId === application.id}
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        disabled={submittingProofId === application.id}
                        onClick={() => submitProof(application)}
                      >
                        {submittingProofId === application.id ? <Loader2 className="animate-spin" size={14} /> : 'Submit Proof URL'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default Seeker;
