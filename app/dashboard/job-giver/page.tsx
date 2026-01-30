'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { supabase } from '@/lib/supabaseClient';

interface Job {
  id: string;
  title: string;
  description: string;
  skills: string[];
  budget: string;
  is_active: boolean;
  created_at: string;
}

export default function JobGiverDashboard() {
  const { address, connected } = useWallet();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingJobs, setFetchingJobs] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    skills: '',
    budgetMin: '',
    budgetMax: '',
    deadlineDays: '7',
  });

  // Fetch jobs from Supabase on mount
  useEffect(() => {
    if (connected && address) {
      fetchJobs();
    }
  }, [connected, address]);

  const fetchJobs = async () => {
    if (!address) return;

    try {
      setFetchingJobs(true);

      // First, get or create the user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('aleo_address', address)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error fetching user:', userError);
        return;
      }

      if (user) {
        // Fetch jobs for this user
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select('*')
          .eq('giver_id', user.id)
          .order('created_at', { ascending: false });

        if (jobsError) {
          console.error('Error fetching jobs:', jobsError);
        } else {
          setJobs(jobsData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setFetchingJobs(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected || !address) {
      alert('Please connect your wallet first');
      return;
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      // Get or create user
      let userId: string;

      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('aleo_address', address)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        // User doesn't exist, create one
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            aleo_address: address,
            role: 'giver',
            reputation_score: 0,
          })
          .select('id')
          .single();

        if (createError) {
          throw new Error(`Failed to create user: ${createError.message}`);
        }
        userId = newUser.id;
      } else if (fetchError) {
        throw new Error(`Failed to fetch user: ${fetchError.message}`);
      } else {
        userId = existingUser.id;
      }

      // Parse skills from comma-separated string
      const skillsArray = formData.skills
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      // Create budget string
      const budget = `${formData.budgetMin}-${formData.budgetMax} credits`;

      // Generate a placeholder ZK hash (in production, this would be a real proof)
      const zkHash = `zk_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Insert job into Supabase
      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert({
          giver_id: userId,
          title: formData.title.trim(),
          description: formData.description.trim(),
          skills: skillsArray,
          budget: budget,
          is_active: true,
          zk_membership_hash: zkHash,
        })
        .select()
        .single();

      if (jobError) {
        throw new Error(`Failed to create job: ${jobError.message}`);
      }

      // Add new job to local state
      setJobs([newJob, ...jobs]);

      // Reset form
      setFormData({
        title: '',
        description: '',
        skills: '',
        budgetMin: '',
        budgetMax: '',
        deadlineDays: '7',
      });
      setShowForm(false);
      alert('Job posted successfully!');
    } catch (error: any) {
      console.error('Error creating job:', error);
      alert('Error creating job: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const activeJobs = jobs.filter((job) => job.is_active).length;
  const totalPosted = jobs.length;

  // Show connect prompt if not connected
  if (!connected || !address) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">
            Please connect your Leo Wallet to access the dashboard
          </p>
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
            <span className="text-white font-mono text-sm">
              {address.slice(0, 10)}...{address.slice(-6)}
            </span>
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
              <form
                onSubmit={handleSubmit}
                className="mt-6 space-y-4 bg-gray-700 p-6 rounded-lg"
              >
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-500 focus:border-purple-500 focus:outline-none"
                    placeholder="e.g. Frontend Developer, Smart Contract Engineer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-500 focus:border-purple-500 focus:outline-none resize-none"
                    placeholder="Describe the job requirements, responsibilities, and expectations..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Required Skills (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.skills}
                    onChange={(e) =>
                      setFormData({ ...formData, skills: e.target.value })
                    }
                    className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-500 focus:border-purple-500 focus:outline-none"
                    placeholder="e.g. React, TypeScript, Solidity, Aleo"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Budget Min (Aleo Credits)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.budgetMin}
                      onChange={(e) =>
                        setFormData({ ...formData, budgetMin: e.target.value })
                      }
                      className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-500 focus:border-purple-500 focus:outline-none"
                      placeholder="Minimum"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Budget Max (Aleo Credits)
                    </label>
                    <input
                      type="number"
                      required
                      min={formData.budgetMin || 1}
                      value={formData.budgetMax}
                      onChange={(e) =>
                        setFormData({ ...formData, budgetMax: e.target.value })
                      }
                      className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-500 focus:border-purple-500 focus:outline-none"
                      placeholder="Maximum"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Deadline (Days)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.deadlineDays}
                    onChange={(e) =>
                      setFormData({ ...formData, deadlineDays: e.target.value })
                    }
                    className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-500 focus:border-purple-500 focus:outline-none"
                    placeholder="7"
                  />
                </div>

                {/* Wallet Info Display */}
                <div className="bg-gray-600/50 rounded-lg p-4 border border-gray-500">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">
                      Posting from wallet
                    </span>
                    <span className="text-xs text-green-400">Connected</span>
                  </div>
                  <p className="text-white font-mono text-sm break-all">
                    {address}
                  </p>
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

            {fetchingJobs && (
              <div className="text-center py-8">
                <p className="text-gray-400">Loading your jobs...</p>
              </div>
            )}

            {!fetchingJobs && jobs.length === 0 && !showForm && (
              <p className="text-gray-400 mt-4">No jobs posted yet.</p>
            )}

            {!fetchingJobs && jobs.length > 0 && (
              <div className="mt-6 space-y-4">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-gray-700 p-4 rounded-lg border border-gray-600"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg text-white mb-1">
                          {job.title}
                        </h3>
                        <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                          {job.description}
                        </p>
                        <p className="text-sm text-gray-400">
                          Budget: {job.budget}
                        </p>
                        {job.skills && job.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {job.skills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-purple-600/20 text-purple-300 rounded text-xs"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${job.is_active
                            ? 'bg-green-600/30 text-green-300'
                            : 'bg-gray-600/30 text-gray-300'
                          }`}
                      >
                        {job.is_active ? 'Active' : 'Closed'}
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
