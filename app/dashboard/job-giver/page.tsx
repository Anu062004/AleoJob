'use client';

import { useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { aleoClient } from '@/lib/aleo-client';

export default function JobGiverDashboard() {
  const { address, connected } = useWallet();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    budgetMin: '',
    budgetMax: '',
    deadlineDays: '7',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected || !address) {
      return;
    }

    setLoading(true);

    try {
      // Calculate deadline block (approximate: 1 block = 2 seconds, 7 days = ~302,400 blocks)
      const currentBlock = Math.floor(Date.now() / 2000); // Approximate current block
      const deadlineBlock = currentBlock + (parseInt(formData.deadlineDays) * 86400 / 2);

      const response = await aleoClient.createJob(
        address, // Use connected wallet address
        parseInt(formData.budgetMin),
        parseInt(formData.budgetMax),
        deadlineBlock,
        '' // Private key handled by wallet adapter
      );

      if (response.success) {
        // Add new job to list
        const newJob = {
          id: response.transaction?.id || Date.now().toString(),
          budgetMin: formData.budgetMin,
          budgetMax: formData.budgetMax,
          deadlineDays: formData.deadlineDays,
          status: 'pending',
        };
        setJobs([...jobs, newJob]);

        // Reset form
        setFormData({
          budgetMin: '',
          budgetMax: '',
          deadlineDays: '7',
        });
        setShowForm(false);
        alert('Job posted successfully! Transaction ID: ' + (response.transaction?.id || 'N/A'));
      } else {
        throw new Error(response.error || 'Failed to create job');
      }
    } catch (error: any) {
      console.error('Error creating job:', error);
      alert('Error creating job: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const activeJobs = jobs.filter(job => job.status === 'pending' || job.status === 'in_progress').length;
  const totalPosted = jobs.length;

  // Show connect prompt if not connected
  if (!connected || !address) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">Please connect your Leo Wallet to access the dashboard</p>
          <button
            onClick={() => setVisible(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Job Giver Dashboard</h1>

          {/* Connected Wallet Info */}
          <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-xl">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 text-sm">Connected:</span>
            <span className="text-white font-mono text-sm">{address.slice(0, 10)}...{address.slice(-6)}</span>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-purple-500/30">
              <h3 className="text-lg font-semibold mb-2">Active Jobs</h3>
              <p className="text-3xl font-bold text-purple-400">{activeJobs}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-purple-500/30">
              <h3 className="text-lg font-semibold mb-2">Total Posted</h3>
              <p className="text-3xl font-bold text-purple-400">{totalPosted}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-purple-500/30">
              <h3 className="text-lg font-semibold mb-2">Reputation</h3>
              <p className="text-3xl font-bold text-purple-400">--</p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-8 border border-purple-500/30 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Your Jobs</h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {showForm ? 'Cancel' : 'Post New Job'}
              </button>
            </div>

            {showForm && (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4 bg-gray-700 p-6 rounded-lg">
                <div>
                  <label className="block text-sm font-medium mb-2">Budget Min (Aleo Credits)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.budgetMin}
                    onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
                    className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-500 focus:border-purple-500 focus:outline-none"
                    placeholder="Minimum budget"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Budget Max (Aleo Credits)</label>
                  <input
                    type="number"
                    required
                    min={formData.budgetMin || 1}
                    value={formData.budgetMax}
                    onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
                    className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-500 focus:border-purple-500 focus:outline-none"
                    placeholder="Maximum budget"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Deadline (Days)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.deadlineDays}
                    onChange={(e) => setFormData({ ...formData, deadlineDays: e.target.value })}
                    className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-500 focus:border-purple-500 focus:outline-none"
                    placeholder="7"
                  />
                </div>

                {/* Wallet Info Display */}
                <div className="bg-gray-600/50 rounded-lg p-4 border border-gray-500">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Posting from wallet</span>
                    <span className="text-xs text-green-400">✓ Connected</span>
                  </div>
                  <p className="text-white font-mono text-sm break-all">{address}</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {loading ? 'Posting Job...' : 'Post Job'}
                </button>
              </form>
            )}

            {jobs.length === 0 && !showForm && (
              <p className="text-gray-400 mt-4">No jobs posted yet.</p>
            )}

            {jobs.length > 0 && (
              <div className="mt-6 space-y-4">
                {jobs.map((job) => (
                  <div key={job.id} className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">Budget: {job.budgetMin} - {job.budgetMax} credits</p>
                        <p className="text-sm text-gray-400">Deadline: {job.deadlineDays} days</p>
                        <p className="text-sm text-gray-400">Status: {job.status}</p>
                      </div>
                      <span className="px-2 py-1 bg-purple-600/30 text-purple-300 rounded text-xs">
                        {job.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
