'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, DollarSign, Star, Loader2, Briefcase, Search, SlidersHorizontal, ShieldCheck } from 'lucide-react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { transferCredits } from '@/lib/credit-transfer';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

interface Job {
  id: string;
  title: string;
  description: string;
  skills: string[];
  budget: string | null;
  createdAt: string;
  giverReputation: number;
}

export default function JobsPage() {
  const { connected, address, executeTransaction } = useWallet();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const [hasPaid, setHasPaid] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select(`id, title, description, skills, budget, is_active, created_at, giver:users ( reputation_score )`)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const formattedJobs = data?.map((job: any) => ({
        id: job.id,
        title: job.title,
        description: job.description,
        skills: job.skills || [],
        budget: job.budget,
        createdAt: job.created_at,
        giverReputation: job.giver?.reputation_score || 0,
      })) || [];
      setJobs(formattedJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!address) { setHasPaid(false); return; }
    const key = `payment_job_seeker_${address}`;
    setHasPaid(localStorage.getItem(key) === 'paid');
  }, [address]);

  const handlePayToBrowse = async () => {
    if (!connected || !address || !executeTransaction) {
      alert('Please connect your wallet first');
      return;
    }
    const confirmed = window.confirm('To browse jobs, you must pay 1 Aleo credit. Continue?');
    if (!confirmed) return;
    setIsPaying(true);
    try {
      const res = await transferCredits(executeTransaction, address, false);
      if (!res.success) throw new Error(res.error || 'Payment failed');
      const key = `payment_job_seeker_${address}`;
      localStorage.setItem(key, 'paid');
      setHasPaid(true);
      alert(`Payment successful!\n\nTransaction ID: ${res.transactionId || 'N/A'}\n\nYou can now browse and apply to jobs.`);
    } catch (e: any) {
      console.error('Pay-to-browse failed:', e);
      alert(`Payment failed: ${e.message || 'Unknown error'}`);
    } finally {
      setIsPaying(false);
    }
  };

  const handleApply = async (jobId: string) => {
    if (!connected || !address) { alert('Please connect your wallet first'); return; }
    if (!hasPaid) { alert('You must pay 1 credit before browsing/applying.'); return; }
    setProcessingJobId(jobId);
    try {
      let userId: string;
      const { data: user, error: userError } = await supabase.from('users').select('id').eq('aleo_address', address).single();
      if (userError && userError.code === 'PGRST116') {
        const { data: newUser, error: createError } = await supabase.from('users').insert({ aleo_address: address, role: 'seeker' }).select('id').single();
        if (createError) throw createError;
        userId = newUser.id;
      } else if (userError) {
        throw userError;
      } else {
        userId = user.id;
      }
      const zkHash = `zk_app_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const { error: appError } = await supabase.from('applications').insert({ job_id: jobId, seeker_id: userId, zk_application_hash: zkHash, status: 'pending' });
      if (appError) {
        if (appError.code === '23505') { alert('You have already applied for this job.'); }
        else { throw appError; }
      } else {
        alert('Application submitted successfully!');
      }
    } catch (error: any) {
      console.error('Failed to apply:', error);
      alert(`Failed to apply: ${error.message || 'Unknown error'}`);
    } finally {
      setProcessingJobId(null);
    }
  };

  const filteredJobs = jobs.filter(j =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.description.toLowerCase().includes(search.toLowerCase()) ||
    j.skills.some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor(diff / 3600000);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Page Header */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Browse Jobs</h1>
            <p className="text-sm text-gray-500 mt-0.5">{filteredJobs.length} positions available</p>
          </div>
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
            <input
              type="text"
              placeholder="Search jobs, skills..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Not connected banner */}
        {!connected && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-8 flex items-center gap-4">
            <ShieldCheck className="text-indigo-500 shrink-0" size={22} />
            <p className="text-indigo-700 text-sm font-medium">
              Connect your wallet to apply for jobs and unlock all features.
            </p>
            <Link href="/login" className="ml-auto shrink-0 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-semibold px-5 py-2 rounded-full hover:shadow-md transition-all">
              Connect
            </Link>
          </div>
        )}

        {/* Pay-to-browse banner */}
        {connected && address && !hasPaid && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold text-amber-800 mb-1">1 credit required to browse jobs</p>
              <p className="text-amber-700 text-sm">Pay once to unlock all job listings and applications with this wallet.</p>
            </div>
            <button
              onClick={handlePayToBrowse}
              disabled={isPaying}
              className="shrink-0 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:shadow-lg hover:shadow-indigo-200 disabled:opacity-60 transition-all flex items-center gap-2"
            >
              {isPaying && <Loader2 size={15} className="animate-spin" />}
              {isPaying ? 'Processing...' : 'Pay 1 credit to unlock'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="animate-spin text-indigo-500" size={36} />
            <span className="ml-3 text-gray-500 font-medium">Loading jobs...</span>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-32">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Briefcase className="text-indigo-400" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-500 text-sm">{search ? 'Try a different search term' : 'Check back later or be the first to post!'}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredJobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.04 }}
              >
                <div className="group bg-white border border-gray-100 rounded-2xl p-7 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50 hover:-translate-y-0.5 transition-all duration-200">
                  <div className="flex flex-col md:flex-row md:items-start gap-6">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                          <Briefcase size={18} className="text-indigo-600" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-gray-900 group-hover:text-indigo-700 transition-colors leading-snug">{job.title}</h2>
                          {job.giverReputation > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Star size={12} className="text-amber-400 fill-amber-400" />
                              <span className="text-xs text-gray-500">{job.giverReputation} rep</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-2">{job.description}</p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {job.skills?.map(skill => (
                          <span key={skill} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-5 text-sm text-gray-500">
                        {job.budget && (
                          <div className="flex items-center gap-1.5">
                            <DollarSign size={15} className="text-green-500" />
                            <span className="font-semibold text-gray-900">{job.budget}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Clock size={15} className="text-gray-400" />
                          <span>{timeAgo(job.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 md:min-w-[140px] md:items-end">
                      <button
                        disabled={!connected || !hasPaid || processingJobId === job.id}
                        onClick={() => handleApply(job.id)}
                        className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:shadow-lg hover:shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                      >
                        {processingJobId === job.id ? (
                          <><Loader2 size={15} className="animate-spin" /> Processing...</>
                        ) : hasPaid ? 'Apply Now' : 'Unlock to Apply'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
