'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, DollarSign, Star, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { transferCredits } from '@/lib/credit-transfer';

const mockJobs = [
  {
    id: 1,
    title: 'Smart Contract Audit',
    description: 'Review and audit Leo smart contracts for security vulnerabilities.',
    skills: ['Leo', 'Security', 'ZK'],
    budget: '500 ALEO',
    duration: '2 weeks',
    postedBy: 'aleo1...xyz',
    rating: 4.8,
  },
  {
    id: 2,
    title: 'Frontend Development',
    description: 'Build a React frontend for Aleo dApp with wallet integration.',
    skills: ['React', 'TypeScript', 'Aleo'],
    budget: '300 ALEO',
    duration: '1 week',
    postedBy: 'aleo1...abc',
    rating: 4.5,
  },
  {
    id: 3,
    title: 'ZK Circuit Design',
    description: 'Design zero-knowledge circuits for private data verification.',
    skills: ['ZK-SNARKs', 'Leo', 'Cryptography'],
    budget: '800 ALEO',
    duration: '3 weeks',
    postedBy: 'aleo1...def',
    rating: 5.0,
  },
];

export default function JobsPage() {
  const { connected, address, executeTransaction } = useWallet();
  const [processingJobId, setProcessingJobId] = useState<number | null>(null);
  const [hasPaid, setHasPaid] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

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

  const handleApply = async (jobId: number) => {
    if (!connected || !address || !executeTransaction) {
      alert('Please connect your wallet first');
      return;
    }

    if (!hasPaid) {
      alert('You must pay 1 credit before browsing/applying. Click "Pay 1 credit to browse jobs" first.');
      return;
    }

    setProcessingJobId(jobId);

    try {
      // TODO: Implement actual job application to job_registry contract.
      // For now, we simulate success once the browse fee is paid.
      alert(
        `✅ Application submitted!\n\n` +
        `Your application is being processed.`
      );

      // In production, you would also call:
      // await applyToJob(jobId, address, proposedBudget);
    } catch (error: any) {
      console.error('Failed to apply:', error);
      alert(`❌ Failed to apply: ${error.message || 'Unknown error'}\n\nPlease ensure you have sufficient credits in your wallet.`);
    } finally {
      setProcessingJobId(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-2 text-white">Browse Jobs</h1>
        <p className="text-slate-400 mb-8">Find privacy-preserving work opportunities</p>

        {!connected && (
          <Card className="p-6 mb-8 bg-aleo-purple/10 border-aleo-purple/30">
            <p className="text-slate-300">
              Connect your wallet to apply for jobs and view more details.
            </p>
          </Card>
        )}

        {connected && address && !hasPaid && (
          <Card className="p-6 mb-8 bg-aleo-purple/10 border-aleo-purple/30">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-white font-semibold">1 credit required to browse jobs</p>
                <p className="text-slate-300 text-sm">
                  Pay once to unlock browsing + applying for jobs with this wallet.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={handlePayToBrowse}
                disabled={isPaying || !executeTransaction}
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

        <div className="grid gap-6">
          {mockJobs.map((job, index) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card hover className="p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-white mb-2">{job.title}</h2>
                    <p className="text-slate-400 mb-4">{job.description}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {job.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 bg-aleo-purple/20 text-aleo-purple-light rounded-full text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                      <div className="flex items-center gap-1">
                        <DollarSign size={16} className="text-aleo-emerald" />
                        <span>{job.budget}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={16} />
                        <span>{job.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star size={16} className="text-yellow-400" />
                        <span>{job.rating}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="primary" 
                      size="sm" 
                      disabled={!connected || !hasPaid || processingJobId === job.id}
                      onClick={() => handleApply(job.id)}
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
                    <Link href={`/jobs/${job.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

