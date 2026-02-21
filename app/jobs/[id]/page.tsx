'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, DollarSign, Star, Loader2, Calendar, Shield, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function JobDetail({ params }: { params: { id: string } }) {
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchJob(); }, [params.id]);

  const fetchJob = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select('*, giver:users ( aleo_address, reputation_score )')
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Job Not Found</h1>
          <Link href="/jobs" className="text-indigo-600 hover:text-indigo-800 font-medium text-sm">
            ← Back to All Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link href="/jobs" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors font-medium mb-8">
            <ArrowLeft size={15} /> Back to All Jobs
          </Link>

          <div className="bg-white border border-gray-100 rounded-3xl p-10 shadow-sm">
            {/* Job Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8 pb-8 border-b border-gray-100">
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 mb-3">{job.title}</h1>
                <div className="flex flex-wrap gap-5 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Clock size={15} className="text-gray-400" />
                    <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
                  </div>
                  {job.budget && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign size={15} className="text-green-500" />
                      <span className="font-semibold text-gray-900">{job.budget}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl">
                <Star size={15} className="text-amber-500 fill-amber-400" />
                <span className="text-sm font-semibold text-amber-800">Giver Rep: {job.giver?.reputation_score || 0}</span>
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Description</h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{job.description}</p>
            </div>

            {/* Skills */}
            {job.skills && job.skills.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill: string) => (
                    <span key={skill} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1.5 rounded-full font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Meta Grid */}
            <div className="grid md:grid-cols-2 gap-4 bg-gray-50 rounded-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Calendar size={20} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Status</p>
                  <p className="font-bold text-gray-900">{job.is_active ? 'Active' : 'Expired'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center">
                  <Shield size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Verification</p>
                  <p className="font-bold text-gray-900">ZK Proof Verified</p>
                </div>
              </div>
            </div>

            {/* Apply CTA */}
            <div className="mt-8 flex gap-4">
              <Link
                href="/jobs"
                className="flex-1 text-center bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold py-3.5 rounded-xl hover:shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all"
              >
                Apply Now
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
