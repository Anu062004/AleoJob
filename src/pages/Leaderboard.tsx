import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { ReputationCard } from '@/components/web3/ReputationCard';
import { EmptyState } from '@/components/web3/EmptyState';
import { ReputationEntry } from '@/components/web3/types';

function Leaderboard() {
  const [entries, setEntries] = useState<ReputationEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, aleo_address, profile_score, completed_jobs, jobs_posted, role')
          .order('profile_score', { ascending: false })
          .limit(12);

        if (error) throw error;

        setEntries(
          (data || []).map((item: any, index: number) => ({
            id: item.id,
            alias: `Anonymous #${index + 1}`,
            address: item.aleo_address || 'aleo1unknown',
            score: item.profile_score || 0,
            proofCount: Math.max(1, item.role === 'giver' ? item.jobs_posted || 0 : item.completed_jobs || 0),
            role: item.role === 'giver' ? 'giver' : 'seeker',
          }))
        );
      } catch (error) {
        console.error('[Leaderboard] fetch failed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <header className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/20 text-brand-primary">
          <Trophy size={20} />
        </div>
        <h1 className="text-3xl font-semibold text-brand-text">Reputation Ledger</h1>
        <p className="mt-2 text-sm text-brand-text-muted">Zero-knowledge verified contributors ranked by delivery proof quality.</p>
      </header>

      {loading ? (
        <div className="glass-card rounded-2xl p-10 text-center text-brand-text-muted">Reading latest ledger state...</div>
      ) : entries.length === 0 ? (
        <EmptyState
          title="Ledger Empty"
          description="No reputation proofs indexed yet. Submit a job or complete one to appear here."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => (
            <ReputationCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Leaderboard;
