'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import { Briefcase, Plus, Loader2, X, Wallet } from 'lucide-react';
import Link from 'next/link';

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
  const [formData, setFormData] = useState({ title: '', description: '', skills: '', budgetMin: '', budgetMax: '', deadlineDays: '7' });

  useEffect(() => {
    if (connected && address) fetchJobs();
  }, [connected, address]);

  const fetchJobs = async () => {
    if (!address) return;
    try {
      setFetchingJobs(true);
      const { data: user, error: userError } = await supabase.from('users').select('id').eq('aleo_address', address).single();
      if (userError && userError.code !== 'PGRST116') { console.error('Error fetching user:', userError); return; }
      if (user) {
        const { data: jobsData, error: jobsError } = await supabase.from('jobs').select('*').eq('giver_id', user.id).order('created_at', { ascending: false });
        if (jobsError) console.error('Error fetching jobs:', jobsError);
        else setJobs(jobsData || []);
      }
    } catch (error) { console.error('Error fetching jobs:', error); }
    finally { setFetchingJobs(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !address) { alert('Please connect your wallet first'); return; }
    if (!formData.title.trim() || !formData.description.trim()) { alert('Please fill in all required fields'); return; }
    setLoading(true);
    try {
      let userId: string;
      const { data: existingUser, error: fetchError } = await supabase.from('users').select('id').eq('aleo_address', address).single();
      if (fetchError && fetchError.code === 'PGRST116') {
        const { data: newUser, error: createError } = await supabase.from('users').insert({ aleo_address: address, role: 'giver', reputation_score: 0 }).select('id').single();
        if (createError) throw new Error(`Failed to create user: ${createError.message}`);
        userId = newUser.id;
      } else if (fetchError) {
        throw new Error(`Failed to fetch user: ${fetchError.message}`);
      } else {
        userId = existingUser.id;
      }
      const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(s => s.length > 0);
      const budget = `${formData.budgetMin}-${formData.budgetMax} credits`;
      const zkHash = `zk_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const { data: newJob, error: jobError } = await supabase.from('jobs').insert({ giver_id: userId, title: formData.title.trim(), description: formData.description.trim(), skills: skillsArray, budget, is_active: true, zk_membership_hash: zkHash }).select().single();
      if (jobError) throw new Error(`Failed to create job: ${jobError.message}`);
      setJobs([newJob, ...jobs]);
      setFormData({ title: '', description: '', skills: '', budgetMin: '', budgetMax: '', deadlineDays: '7' });
      setShowForm(false);
      alert('Job posted successfully!');
    } catch (error: any) {
      console.error('Error creating job:', error);
      alert('Error creating job: ' + (error.message || 'Unknown error'));
    } finally { setLoading(false); }
  };

  if (!connected || !address) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="text-center p-10 max-w-sm">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Wallet className="text-indigo-500" size={30} />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-500 text-sm mb-6">Please connect your Leo Wallet to access the dashboard</p>
          <Link href="/login?role=giver" className="inline-flex items-center justify-center bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-full hover:shadow-lg hover:shadow-indigo-100 transition-all">
            Connect Wallet
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="h-1.5 bg-gradient-to-r from-violet-500 to-indigo-600" />
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Job Giver Dashboard</h1>
            <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-xl">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-gray-600 font-mono text-xs">{address.slice(0, 12)}...{address.slice(-6)}</span>
            </div>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:shadow-lg hover:shadow-violet-100 hover:-translate-y-0.5 transition-all">
            <Plus size={16} /> Post New Job
          </button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Active Jobs', value: jobs.filter(j => j.is_active).length },
            { label: 'Total Posted', value: jobs.length },
            { label: 'Reputation', value: '--' },
          ].map((s, i) => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-indigo-200 hover:shadow-md transition-all">
              <p className="text-gray-500 text-xs font-medium mb-1">{s.label}</p>
              <p className="text-3xl font-extrabold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Jobs */}
        <div className="bg-white border border-gray-100 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Your Jobs</h2>
          {fetchingJobs ? (
            <div className="flex items-center justify-center py-12 gap-3 text-gray-400">
              <Loader2 className="animate-spin" size={20} /> Loading jobs...
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Briefcase className="text-indigo-400" size={26} />
              </div>
              <p className="text-gray-700 font-semibold mb-1">No jobs posted yet</p>
              <p className="text-gray-400 text-sm mb-5">Get started by posting your first opportunity.</p>
              <button onClick={() => setShowForm(true)}
                className="mx-auto flex items-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:shadow-lg hover:shadow-violet-100 transition-all">
                <Plus size={15} /> Post a Job
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map(job => (
                <div key={job.id} className="bg-gray-50 border border-gray-100 rounded-xl p-6 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-gray-900">{job.title}</h3>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${job.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500'}`}>
                      {job.is_active ? 'Active' : 'Closed'}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm mb-3 line-clamp-2">{job.description}</p>
                  <p className="text-xs text-gray-400 mb-3">Budget: {job.budget}</p>
                  {job.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {job.skills.map((skill: string, idx: number) => (
                        <span key={idx} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-extrabold text-gray-900">Post New Job</h2>
              <button onClick={() => setShowForm(false)}
                className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              {[{ label: 'Job Title *', key: 'title', type: 'text', placeholder: 'e.g. ZK Developer, Smart Contract Engineer' },
              { label: 'Budget Min (Credits)', key: 'budgetMin', type: 'number', placeholder: 'Minimum budget' },
              { label: 'Budget Max (Credits)', key: 'budgetMax', type: 'number', placeholder: 'Maximum budget' },
              { label: 'Deadline (Days)', key: 'deadlineDays', type: 'number', placeholder: '7' },
              { label: 'Required Skills (comma-separated)', key: 'skills', type: 'text', placeholder: 'React, TypeScript, Aleo' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{field.label}</label>
                  <input
                    type={field.type}
                    required={field.key !== 'skills'}
                    value={(formData as any)[field.key]}
                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                <textarea
                  required rows={4}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all resize-none"
                  placeholder="Describe the requirements, responsibilities, and expectations..."
                />
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Posting from wallet</span>
                  <span className="text-xs text-green-600 font-semibold">Connected</span>
                </div>
                <p className="text-gray-700 font-mono text-xs break-all">{address}</p>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-semibold py-3.5 rounded-xl hover:shadow-lg hover:shadow-violet-200 disabled:opacity-60 transition-all">
                {loading ? 'Posting Job...' : 'Post Job'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
