import { Link, useNavigate } from 'react-router-dom';
import { User, Briefcase, ArrowRight, Loader2 } from 'lucide-react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import ConnectWallet from '../components/ConnectWallet';
import { ensureWalletRole, fetchMarketplaceProfile, type MarketplaceRole } from '@/lib/profileRole';

function GetStarted() {
  const { connected, address } = useWallet();
  const navigate = useNavigate();
  const [loadingRole, setLoadingRole] = useState(false);
  const [assignedRole, setAssignedRole] = useState<MarketplaceRole | null>(null);

  useEffect(() => {
    if (!connected || !address) {
      setAssignedRole(null);
      return;
    }

    void (async () => {
      setLoadingRole(true);
      try {
        const profile = await fetchMarketplaceProfile(address);
        setAssignedRole(profile?.role || null);
      } catch (error) {
        console.error('[GetStarted] Failed to load role:', error);
        setAssignedRole(null);
      } finally {
        setLoadingRole(false);
      }
    })();
  }, [connected, address]);

  const lockRoleAndContinue = async (role: MarketplaceRole) => {
    if (!address) return;

    setLoadingRole(true);
    try {
      const profile = await ensureWalletRole(address, role);
      setAssignedRole(profile.role);
      navigate(role === 'seeker' ? '/seeker' : '/giver');
    } catch (error: any) {
      alert(error?.message || 'Unable to assign role');
    } finally {
      setLoadingRole(false);
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto max-w-2xl px-6">
        <div className="mb-10 text-center">
          <h1 className="mb-2 text-2xl font-semibold text-white">Get Started</h1>
          <p className="text-slate-500">Choose role once per wallet. Role is immutable after assignment.</p>
        </div>

        {!connected && (
          <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900 p-5 text-center">
            <p className="mb-4 text-slate-400">Connect wallet to continue</p>
            <div className="flex justify-center">
              <ConnectWallet />
            </div>
          </div>
        )}

        {connected && loadingRole && (
          <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900 p-5 text-center text-slate-400">
            <div className="inline-flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} />
              Resolving role lock...
            </div>
          </div>
        )}

        {connected && !loadingRole && assignedRole && (
          <div className="mb-8 rounded-xl border border-brand-border bg-brand-surface p-5 text-center">
            <p className="font-medium text-brand-text">Wallet role locked as: {assignedRole}</p>
            <p className="mt-1 text-sm text-brand-text-muted">
              This wallet cannot switch to {assignedRole === 'seeker' ? 'giver' : 'seeker'}.
            </p>
            <div className="mt-4 flex justify-center">
              <Link to={assignedRole === 'seeker' ? '/seeker' : '/giver'}>
                <Button variant="secondary">
                  Open {assignedRole === 'seeker' ? 'Seeker' : 'Giver'} Panel
                  <ArrowRight className="ml-2" size={14} />
                </Button>
              </Link>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div
            className={`rounded-xl border p-6 ${
              !connected || assignedRole === 'giver'
                ? 'pointer-events-none border-slate-800 bg-slate-900/50 opacity-50'
                : 'border-slate-800 bg-slate-900/50 transition-colors hover:border-slate-700'
            }`}
          >
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800">
                <User className="text-violet-400" size={20} />
              </div>
              <h2 className="mb-2 font-medium text-white">Job Seeker</h2>
              <p className="mb-4 text-sm text-slate-500">Find work, submit proof, build reputation</p>
              <ul className="mb-6 space-y-2 text-left text-sm text-slate-500">
                <li>- Mandatory onboarding: email, qualification, experience, CV</li>
                <li>- Submit proof of work on-chain</li>
                <li>- 1 credit seeker access</li>
              </ul>
              <Button
                variant="primary"
                className="w-full"
                disabled={!connected || Boolean(assignedRole) || loadingRole}
                onClick={() => lockRoleAndContinue('seeker')}
              >
                Continue As Seeker
                <ArrowRight className="ml-2" size={14} />
              </Button>
            </div>
          </div>

          <div
            className={`rounded-xl border p-6 ${
              !connected || assignedRole === 'seeker'
                ? 'pointer-events-none border-slate-800 bg-slate-900/50 opacity-50'
                : 'border-slate-800 bg-slate-900/50 transition-colors hover:border-slate-700'
            }`}
          >
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800">
                <Briefcase className="text-violet-400" size={20} />
              </div>
              <h2 className="mb-2 font-medium text-white">Job Giver</h2>
              <p className="mb-4 text-sm text-slate-500">Post jobs, verify proof, release escrow</p>
              <ul className="mb-6 space-y-2 text-left text-sm text-slate-500">
                <li>- Reputation from jobs posted and escrow generated</li>
                <li>- Verify seeker proof before release</li>
                <li>- 3 credits giver access</li>
              </ul>
              <Button
                variant="primary"
                className="w-full"
                disabled={!connected || Boolean(assignedRole) || loadingRole}
                onClick={() => lockRoleAndContinue('giver')}
              >
                Continue As Giver
                <ArrowRight className="ml-2" size={14} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GetStarted;
