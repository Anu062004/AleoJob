'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, DollarSign, Star, Loader2, Briefcase } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { transferCredits } from '@/lib/credit-transfer';
import { supabase } from '@/lib/supabaseClient';

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

  // Fetch jobs from Supabase
  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          description,
          skills,
          budget,
          is_active,
          created_at,
          giver:users (
            reputation_score
          )
        `)
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

  // Check payment status
  useEffect(() => {
    if (!address) {
      setHasPaid(false);
      return;
    }
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
      const res = await transferCredits(executeTransaction, address, false); // 1 credit
      if (!res.success) throw new Error(res.error || 'Payment failed');

      const key = `payment_job_seeker_${address}`;
      localStorage.setItem(key, 'paid');
      setHasPaid(true);

      alert(`✅ Payment successful!\n\nTransaction ID: ${res.transactionId || 'N/A'}\n\nYou can now browse and apply to jobs.`);
    } catch (e: any) {
      console.error('Pay-to-browse failed:', e);
      alert(`❌ Payment failed: ${e.message || 'Unknown error'}`);
    } finally {
      setIsPaying(false);
    }
  };

  const handleApply = async (jobId: string) => {
    if (!connected || !address) {
      alert('Please connect your wallet first');
      return;
    }

    if (!hasPaid) {
      alert('You must pay 1 credit before browsing/applying. Click "Pay 1 credit to browse jobs" first.');
      return;
    }

    setProcessingJobId(jobId);

    try {
      // 1. Get or create seeker user
      let userId: string;
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('aleo_address', address)
        .single();

      if (userError && userError.code === 'PGRST116') {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({ aleo_address: address, role: 'seeker' })
          .select('id')
          .single();
        if (createError) throw createError;
        userId = newUser.id;
      } else if (userError) {
        throw userError;
      } else {
        userId = user.id;
      }

      // 2. Submit application
      const zkHash = `zk_app_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const { error: appError } = await supabase
        .from('applications')
        .insert({
          job_id: jobId,
          seeker_id: userId,
          zk_application_hash: zkHash,
          status: 'pending'
        });

      if (appError) {
        if (appError.code === '23505') {
          alert('You have already applied for this job.');
        } else {
          throw appError;
        }
      } else {
        alert('✅ Application submitted successfully!');
      }
    } catch (error: any) {
      console.error('Failed to apply:', error);
      alert(`❌ Failed to apply: ${error.message || 'Unknown error'}`);
    } finally {
      setProcessingJobId(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 lg:py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 text-text-primary tracking-tight">Browse Jobs</h1>
          <p className="text-text-secondary text-lg">Find privacy-preserving work opportunities</p>
        </div>

        {!connected && (
          <Card className="p-6 mb-8 border-accent-primary/20 bg-accent-primary/5">
            <p className="text-text-secondary">
              Connect your wallet to apply for jobs and view more details.
            </p>
          </Card>
        )}

        {connected && address && !hasPaid && (
          <Card className="p-6 mb-8 border-accent-primary/20 bg-accent-primary/5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-text-primary font-semibold mb-1">1 credit required to browse jobs</p>
                <p className="text-text-secondary text-sm">
                  Pay once to unlock browsing + applying for jobs with this wallet.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={handlePayToBrowse}
                disabled={isPaying}
              >
                {isPaying ? (
                  <>
                    <Loader2 className="inline mr-2 animate-spin" size={16} />
                    Processing...
                  </>
                ) : (
                  'Pay 1 credit to browse jobs'
                )}
              </Button>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-accent-primary" size={32} />
            <span className="ml-3 text-text-secondary">Loading jobs...</span>
          </div>
        ) : jobs.length === 0 ? (
          <Card className="p-16 text-center">
            <Briefcase className="mx-auto mb-4 text-text-muted" size={48} />
            <p className="text-text-secondary text-lg mb-2">No jobs available at the moment</p>
            <p className="text-text-muted text-sm">Check back later or be the first to post a job!</p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {jobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Card hover className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-text-primary mb-3">{job.title}</h2>
                      <p className="text-text-secondary mb-5 leading-relaxed line-clamp-2">{job.description}</p>

                      <div className="flex flex-wrap gap-2 mb-5">
                        {job.skills?.map((skill) => (
                          <span
                            key={skill}
                            className="px-3 py-1 bg-accent-primary/10 text-accent-primary rounded-lg text-xs font-medium border border-accent-primary/20"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-6 text-sm text-text-secondary">
                        {job.budget && (
                          <div className="flex items-center gap-2">
                            <DollarSign size={16} className="text-success" />
                            <span className="font-medium">{job.budget}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-text-muted" />
                          <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                        </div>
                        {job.giverReputation > 0 && (
                          <div className="flex items-center gap-2">
                            <Star size={16} className="text-warning fill-warning/20" />
                            <span>{job.giverReputation} rep</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 md:min-w-[140px]">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={!connected || !hasPaid || processingJobId === job.id}
                        onClick={() => handleApply(job.id)}
                        className="w-full md:w-auto"
                      >
                        {processingJobId === job.id ? (
                          <>
                            <Loader2 className="inline mr-2 animate-spin" size={16} />
                            Processing...
                          </>
                        ) : (
                          hasPaid ? 'Apply Now' : 'Pay 1 credit to browse first'
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
