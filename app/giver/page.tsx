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
        className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 text-text-primary tracking-tight">Job Giver Dashboard</h1>
          <p className="text-text-secondary text-lg">Manage your job postings and applicants</p>
        </div>
        <Button
          variant="primary"
          size="md"
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
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 border border-success/20 rounded-xl">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-success text-sm font-medium">Connected:</span>
            <span className="text-text-primary font-mono text-sm">{address.slice(0, 10)}...{address.slice(-6)}</span>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="w-14 h-14 bg-accent-primary/10 rounded-xl flex items-center justify-center mb-5 border border-accent-primary/20">
              <Briefcase className="text-accent-primary" size={24} />
            </div>
            <p className="text-text-secondary text-sm mb-2 font-medium">Active Jobs</p>
            <p className="text-4xl font-bold text-text-primary">{activeJobs}</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6">
            <div className="w-14 h-14 bg-accent-secondary/10 rounded-xl flex items-center justify-center mb-5 border border-accent-secondary/20">
              <TrendingUp className="text-accent-secondary" size={24} />
            </div>
            <p className="text-text-secondary text-sm mb-2 font-medium">Total Posted</p>
            <p className="text-4xl font-bold text-text-primary">{totalPosted}</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6">
            <div className="w-14 h-14 bg-success/10 rounded-xl flex items-center justify-center mb-5 border border-success/20">
              <DollarSign className="text-success" size={24} />
            </div>
            <p className="text-text-secondary text-sm mb-2 font-medium">Reputation</p>
            <p className="text-4xl font-bold text-text-primary">--</p>
          </Card>
        </motion.div>
      </div>

      {/* Jobs List */}
      <Card className="p-6 md:p-8">
        <h2 className="text-2xl font-bold text-text-primary mb-8">Your Jobs</h2>
        {jobs.length > 0 ? (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-bg-hover rounded-xl p-6 border border-border-subtle hover:border-border-accent transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-text-primary mb-3">{job.title}</h3>
                    <div className="flex items-center gap-6 text-sm text-text-secondary">
                      <span className="flex items-center gap-2">
                        <Users size={16} />
                        {job.applicants} applicants
                      </span>
                      <span className="flex items-center gap-2">
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
          <div className="text-center py-16">
            <Briefcase className="mx-auto mb-6 text-text-muted" size={56} />
            <p className="text-text-secondary mb-2 text-lg">No jobs posted yet.</p>
            <p className="text-text-muted mb-6 text-sm">Get started by posting your first job opportunity.</p>
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
            <label className="block text-sm font-medium text-text-primary mb-2">
              Budget Min (Aleo Credits)
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.budgetMin}
              onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
              className="w-full bg-bg-elevated text-text-primary px-4 py-3 rounded-xl border border-border-subtle focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary/20 transition-colors"
              placeholder="Minimum budget"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Budget Max (Aleo Credits)
            </label>
            <input
              type="number"
              required
              min={formData.budgetMin || 1}
              value={formData.budgetMax}
              onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
              className="w-full bg-bg-elevated text-text-primary px-4 py-3 rounded-xl border border-border-subtle focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary/20 transition-colors"
              placeholder="Maximum budget"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Deadline (Days)
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.deadlineDays}
              onChange={(e) => setFormData({ ...formData, deadlineDays: e.target.value })}
              className="w-full bg-bg-elevated text-text-primary px-4 py-3 rounded-xl border border-border-subtle focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary/20 transition-colors"
            />
          </div>

          {/* Wallet Info Display */}
          <div className="bg-bg-elevated rounded-xl p-4 border border-border-subtle">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">Posting from wallet</span>
              <span className="text-xs text-success font-medium">✓ Connected</span>
            </div>
            <p className="text-text-primary font-mono text-sm break-all">
              {address}
            </p>
          </div>

          <div className="bg-accent-primary/5 border border-accent-primary/20 rounded-xl p-4">
            <p className="text-sm text-text-secondary">
              💡 <strong className="text-text-primary">Privacy Notice:</strong> Budget details are private. Only matched applicants will see them.
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={loading}
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




