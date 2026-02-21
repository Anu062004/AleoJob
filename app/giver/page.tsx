'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, TrendingUp, DollarSign, Plus, Eye, Users, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
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
  const [formData, setFormData] = useState({ budgetMin: '', budgetMax: '', deadlineDays: '7' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) { alert('Please connect your wallet first'); return; }
    setLoading(true);
    try {
      const currentBlock = Math.floor(Date.now() / 2000);
      const deadlineBlock = currentBlock + (parseInt(formData.deadlineDays) * 86400 / 2);
      const response = await aleoClient.createJob(address, parseInt(formData.budgetMin), parseInt(formData.budgetMax), deadlineBlock, '');
      if (response.success) {
        const newJob = {
          id: response.transaction?.id || Date.now().toString(),
          title: `Job ${jobs.length + 1}`,
          applicants: 0,
          status: 'open' as const,
          budget: `${formData.budgetMin}-${formData.budgetMax}`,
        };
        setJobs([...jobs, newJob]);
        setFormData({ budgetMin: '', budgetMax: '', deadlineDays: '7' });
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
  const totalApplicants = jobs.reduce((a, j) => a + j.applicants, 0);

  const stats = [
    { label: 'Active Jobs', value: activeJobs, icon: Briefcase, color: 'indigo' },
    { label: 'Total Posted', value: jobs.length, icon: TrendingUp, color: 'violet' },
    { label: 'Total Applicants', value: totalApplicants, icon: Users, color: 'green' },
  ];

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="h-1.5 bg-gradient-to-r from-violet-500 to-indigo-600" />

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.div
          className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Job Giver Dashboard</h1>
            <p className="text-gray-500">Manage your postings and find top talent</p>
          </div>
          <div className="flex items-center gap-3">
            {address && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-gray-700 font-mono text-sm">{address.slice(0, 10)}...{address.slice(-6)}</span>
              </div>
            )}
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:shadow-lg hover:shadow-violet-200 hover:-translate-y-0.5 transition-all"
            >
              <Plus size={17} /> Post New Job
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            const colorMap: Record<string, string> = { indigo: 'bg-indigo-50 text-indigo-600', violet: 'bg-violet-50 text-violet-600', green: 'bg-green-50 text-green-600' };
            return (
              <motion.div key={stat.label}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-white border border-gray-100 rounded-2xl p-7 hover:border-indigo-200 hover:shadow-lg transition-all"
              >
                <div className={`w-12 h-12 rounded-xl ${colorMap[stat.color]} flex items-center justify-center mb-4`}>
                  <Icon size={22} />
                </div>
                <p className="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
                <p className="text-3xl font-extrabold text-gray-900">{stat.value}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Jobs List */}
        <div className="bg-white border border-gray-100 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Your Jobs</h2>
          {jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.map(job => (
                <div key={job.id}
                  className="bg-gray-50 border border-gray-100 rounded-xl p-6 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{job.title}</h3>
                      <div className="flex items-center gap-5 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5"><Users size={14} /> {job.applicants} applicants</span>
                        <span className="flex items-center gap-1.5"><DollarSign size={14} /> {job.budget} credits</span>
                      </div>
                    </div>
                    <Badge variant={job.status === 'open' ? 'success' : 'info'}>{job.status}</Badge>
                  </div>
                  <button className="flex items-center gap-1.5 text-sm text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
                    <Eye size={15} /> View Details
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Briefcase className="text-indigo-400" size={30} />
              </div>
              <p className="text-gray-700 font-bold text-lg mb-1">No jobs posted yet</p>
              <p className="text-gray-400 text-sm mb-6">Get started by posting your first opportunity.</p>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 mx-auto bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-full hover:shadow-lg hover:shadow-violet-100 transition-all"
              >
                <Plus size={16} /> Post Your First Job
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Post Job Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-extrabold text-gray-900">Post New Job</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X size={16} className="text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Budget Min (Credits)</label>
                <input
                  type="number" required min="1"
                  value={formData.budgetMin}
                  onChange={e => setFormData({ ...formData, budgetMin: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
                  placeholder="Minimum budget"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Budget Max (Credits)</label>
                <input
                  type="number" required min={formData.budgetMin || 1}
                  value={formData.budgetMax}
                  onChange={e => setFormData({ ...formData, budgetMax: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
                  placeholder="Maximum budget"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Deadline (Days)</label>
                <input
                  type="number" required min="1"
                  value={formData.deadlineDays}
                  onChange={e => setFormData({ ...formData, deadlineDays: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
                />
              </div>

              {/* Wallet info */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Posting from wallet</span>
                  <span className="text-xs text-green-600 font-semibold">Connected</span>
                </div>
                <p className="text-gray-700 font-mono text-xs break-all">{address}</p>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  <strong>Privacy Notice:</strong> Budget details are private. Only matched applicants will see them.
                </p>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-semibold py-3.5 rounded-xl hover:shadow-lg hover:shadow-violet-200 disabled:opacity-60 transition-all"
              >
                {loading ? 'Posting Job...' : 'Post Job'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
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
