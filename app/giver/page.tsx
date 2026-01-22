'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, TrendingUp, DollarSign, Plus, Eye, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PaymentGate } from '@/components/PaymentGate';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { aleoClient } from '@/lib/aleo-client';

const mockJobs = [
  { id: '1', title: 'Frontend Developer', applicants: 5, status: 'open', budget: '8-12' },
  { id: '2', title: 'Smart Contract Auditor', applicants: 12, status: 'in_progress', budget: '15-20' },
];

function JobGiverContent() {
  const { address } = useWallet();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState(mockJobs);
  const [formData, setFormData] = useState({
    budgetMin: '',
    budgetMax: '',
    deadlineDays: '7',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);

    try {
      const currentBlock = Math.floor(Date.now() / 2000);
      const deadlineBlock = currentBlock + (parseInt(formData.deadlineDays) * 86400 / 2);

      // Note: createJob will automatically deduct 3 credits before posting
      const response = await aleoClient.createJob(
        address, // Use connected wallet address
        parseInt(formData.budgetMin),
        parseInt(formData.budgetMax),
        deadlineBlock,
        '' // Private key is handled by wallet adapter
      );

      if (response.success) {
        const newJob = {
          id: response.transaction?.id || Date.now().toString(),
          title: `Job ${jobs.length + 1}`,
          applicants: 0,
          status: 'open' as const,
          budget: `${formData.budgetMin}-${formData.budgetMax}`,
        };
        setJobs([...jobs, newJob]);
        setFormData({
          budgetMin: '',
          budgetMax: '',
          deadlineDays: '7',
        });
        setShowForm(false);
        alert('Job posted successfully!');
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const activeJobs = jobs.filter(j => j.status === 'open' || j.status === 'in_progress').length;
  const totalPosted = jobs.length;

  return (
    <div className="min-h-screen container mx-auto px-4 py-8 lg:py-12">
      {/* Header */}
      <motion.div
        className="mb-8 flex items-center justify-between"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-4xl md:text-5xl font-bold mb-2 text-white">Job Giver Dashboard</h1>
          <p className="text-slate-400">Manage your job postings and applicants</p>
        </div>
        <Button
          variant="primary"
          size="md"
          glow
          onClick={() => setShowForm(true)}
        >
          <Plus className="mr-2" size={20} />
          Post New Job
        </Button>
      </motion.div>

      {/* Connected Wallet Info */}
      {address && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-xl">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 text-sm">Connected:</span>
            <span className="text-white font-mono text-sm">{address.slice(0, 10)}...{address.slice(-6)}</span>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card glow className="p-6">
            <div className="w-12 h-12 bg-aleo-purple/20 rounded-xl flex items-center justify-center mb-4">
              <Briefcase className="text-aleo-purple-light" size={24} />
            </div>
            <p className="text-slate-400 text-sm mb-2">Active Jobs</p>
            <p className="text-4xl font-bold text-white">{activeJobs}</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card glow className="p-6">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp className="text-cyan-400" size={24} />
            </div>
            <p className="text-slate-400 text-sm mb-2">Total Posted</p>
            <p className="text-4xl font-bold text-white">{totalPosted}</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card glow className="p-6">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
              <DollarSign className="text-emerald-400" size={24} />
            </div>
            <p className="text-slate-400 text-sm mb-2">Reputation</p>
            <p className="text-4xl font-bold text-white">--</p>
          </Card>
        </motion.div>
      </div>

      {/* Jobs List */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Your Jobs</h2>
        {jobs.length > 0 ? (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-slate-700/50 rounded-xl p-6 border border-slate-600 hover:border-aleo-purple/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">{job.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Users size={16} />
                        {job.applicants} applicants
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign size={16} />
                        {job.budget} credits
                      </span>
                    </div>
                  </div>
                  <Badge variant={job.status === 'open' ? 'success' : 'info'}>
                    {job.status}
                  </Badge>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm">
                    <Eye className="mr-2" size={16} />
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Briefcase className="mx-auto mb-4 text-slate-600" size={48} />
            <p className="text-slate-400 mb-4">No jobs posted yet.</p>
            <Button variant="primary" onClick={() => setShowForm(true)}>
              Post Your First Job
            </Button>
          </div>
        )}
      </Card>

      {/* Post Job Modal - Simplified without Address/PrivateKey fields */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Post New Job">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Budget Min (Aleo Credits)
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.budgetMin}
              onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
              className="w-full bg-slate-700 text-white px-4 py-3 rounded-xl border border-slate-600 focus:border-aleo-purple focus:outline-none"
              placeholder="Minimum budget"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Budget Max (Aleo Credits)
            </label>
            <input
              type="number"
              required
              min={formData.budgetMin || 1}
              value={formData.budgetMax}
              onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
              className="w-full bg-slate-700 text-white px-4 py-3 rounded-xl border border-slate-600 focus:border-aleo-purple focus:outline-none"
              placeholder="Maximum budget"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Deadline (Days)
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.deadlineDays}
              onChange={(e) => setFormData({ ...formData, deadlineDays: e.target.value })}
              className="w-full bg-slate-700 text-white px-4 py-3 rounded-xl border border-slate-600 focus:border-aleo-purple focus:outline-none"
            />
          </div>

          {/* Wallet Info Display */}
          <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Posting from wallet</span>
              <span className="text-xs text-green-400">✓ Connected</span>
            </div>
            <p className="text-white font-mono text-sm break-all">
              {address}
            </p>
          </div>

          <div className="bg-aleo-purple/10 border border-aleo-purple/30 rounded-xl p-4">
            <p className="text-sm text-slate-300">
              💡 <strong>Privacy Notice:</strong> Budget details are private. Only matched applicants will see them.
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={loading}
            glow
          >
            {loading ? 'Posting Job...' : 'Post Job'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export default function JobGiverDashboard() {
  return (
    <PaymentGate
      requiredAmount={3}
      featureType="job_posting"
      title="Unlock Job Posting"
      description="Pay 3 Aleo credits to post unlimited jobs and find the best talent"
    >
      <JobGiverContent />
    </PaymentGate>
  );
}




