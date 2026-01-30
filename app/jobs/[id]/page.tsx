'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, DollarSign, Star, Loader2, Calendar, Shield } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabaseClient';

export default function JobDetail({ params }: { params: { id: string } }) {
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJob();
  }, [params.id]);

  const fetchJob = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          giver:users (
            aleo_address,
            reputation_score
          )
        `)
        .eq('id', params.id)
        .single();

      if (error) throw error;
      setJob(data);
    } catch (error) {
      console.error('Error fetching job details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-400" size={48} />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Job Not Found</h1>
          <a href="/jobs" className="text-purple-400 hover:text-purple-300 transition-colors">
            ← Back to All Jobs
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <a href="/jobs" className="text-purple-400 hover:text-purple-300 mb-6 inline-block transition-colors">
              ← Back to All Jobs
            </a>

            <Card className="p-8 bg-gray-800/50 border-purple-500/30">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
                <div>
                  <h1 className="text-4xl font-bold mb-2">{job.title}</h1>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock size={16} />
                      <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
                    </div>
                    {job.budget && (
                      <div className="flex items-center gap-1">
                        <DollarSign size={16} className="text-emerald-400" />
                        <span>{job.budget}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-purple-900/40 px-4 py-2 rounded-xl border border-purple-500/20">
                  <Star size={16} className="text-yellow-400" />
                  <span className="text-sm">Giver Rep: {job.giver?.reputation_score || 0}</span>
                </div>
              </div>

              <div className="prose prose-invert max-w-none mb-8">
                <h3 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">Description</h3>
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {job.description}
                </p>
              </div>

              {job.skills && job.skills.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill: string) => (
                      <span
                        key={skill}
                        className="px-4 py-2 bg-purple-600/20 text-purple-300 rounded-lg text-sm border border-purple-500/10"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6 p-6 bg-gray-900/50 rounded-2xl border border-gray-700/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Status</p>
                    <p className="font-semibold">{job.is_active ? 'Active' : 'Expired'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                    <Shield size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Verification</p>
                    <p className="font-semibold">ZK Proof Verified</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
