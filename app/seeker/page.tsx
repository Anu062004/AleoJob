'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Briefcase, TrendingUp, CheckCircle, Shield, Loader2, ArrowRight } from 'lucide-react';
import { PaymentGate } from '@/components/PaymentGate';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { CVUpload } from '@/components/CVUpload';
import { ProfileEditor } from '@/components/ProfileEditor';
import { supabase } from '@/lib/supabaseClient';
import { Badge } from '@/components/ui/Badge';

function JobSeekerContent() {
  const { address } = useWallet();
  const [reputation, setReputation] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [completedJobsCount, setCompletedJobsCount] = useState(0);

  useEffect(() => {
    if (address) fetchData();
  }, [address]);

  const fetchData = async () => {
    if (!address) return;
    try {
      setLoading(true);
      const { data: userData, error: userError } = await supabase
        .from('users').select('*').eq('aleo_address', address).single();
      if (userError && userError.code !== 'PGRST116') {
        console.error('Error fetching user:', userError);
      } else if (userData) {
        setProfile(userData);
        setReputation(userData.reputation_score || 0);
        const { data: appsData, error: appsError } = await supabase
          .from('applications')
          .select('id, status, created_at, job:jobs ( title )')
          .eq('seeker_id', userData.id)
          .order('created_at', { ascending: false });
        if (appsError) console.error('Error fetching applications:', appsError);
        else {
          setApplications(appsData || []);
          setCompletedJobsCount(appsData?.filter((a: any) => a.status === 'accepted').length || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = () => fetchData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
      </div>
    );
  }

  const stats = [
    { label: 'Applications', value: applications.length, icon: Briefcase, color: 'indigo' },
    { label: 'Completed', value: completedJobsCount, icon: CheckCircle, color: 'green' },
    { label: 'Reputation', value: reputation, suffix: '/1000', icon: TrendingUp, color: 'violet' },
  ];

  const statusVariant = (status: string) =>
    status === 'accepted' ? 'success' : status === 'rejected' ? 'destructive' : 'info';

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    return days > 0 ? `${days}d ago` : 'Today';
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Soft top gradient */}
      <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-violet-600" />

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Job Seeker Dashboard</h1>
            <p className="text-gray-500">Welcome back. Your privacy is protected.</p>
          </div>
          {address && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-700 text-sm font-medium">Connected:</span>
              <span className="text-gray-700 font-mono text-sm">{address.slice(0, 10)}...{address.slice(-6)}</span>
            </div>
          )}
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            const colorMap: Record<string, string> = { indigo: 'bg-indigo-50 text-indigo-600', green: 'bg-green-50 text-green-600', violet: 'bg-violet-50 text-violet-600' };
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
                <div className="flex items-baseline gap-1">
                  <p className="text-3xl font-extrabold text-gray-900">{stat.value}</p>
                  {stat.suffix && <span className="text-gray-400 text-sm">{stat.suffix}</span>}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Reputation Ring */}
            <div className="bg-white border border-gray-100 rounded-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Profile Summary</h2>
                <div className="flex items-center gap-2 text-sm text-indigo-600">
                  <Shield size={15} />
                  <span className="text-xs">ZK protected identity</span>
                </div>
              </div>
              <div className="relative w-36 h-36 mx-auto">
                <svg className="transform -rotate-90 w-36 h-36">
                  <circle cx="72" cy="72" r="64" stroke="#f3f4f6" strokeWidth="8" fill="none" />
                  <circle
                    cx="72" cy="72" r="64"
                    stroke="url(#rep-gradient)" strokeWidth="8" fill="none"
                    strokeDasharray={`${(reputation / 1000) * 402} 402`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="rep-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-4xl font-extrabold text-gray-900">{reputation}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Score</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Applications */}
            <div className="bg-white border border-gray-100 rounded-2xl p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Your Applications</h2>
              {applications.length > 0 ? (
                <div className="space-y-3">
                  {applications.map(app => (
                    <div key={app.id}
                      className="bg-gray-50 rounded-xl p-5 border border-gray-100 flex items-center justify-between hover:border-indigo-200 hover:bg-indigo-50/30 transition-all"
                    >
                      <div>
                        <h3 className="text-gray-900 font-semibold text-sm">{app.job?.title || 'Unknown Job'}</h3>
                        <p className="text-gray-500 text-xs mt-0.5">Applied {timeAgo(app.created_at)}</p>
                      </div>
                      <Badge variant={statusVariant(app.status)}>{app.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-14">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="text-indigo-400" size={26} />
                  </div>
                  <p className="text-gray-700 font-semibold mb-1">No applications yet</p>
                  <p className="text-gray-400 text-sm mb-5">Start applying to jobs to see them here.</p>
                  <Link href="/jobs" className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:shadow-lg hover:shadow-indigo-100 transition-all">
                    Browse Jobs <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-5">
            {address && <ProfileEditor aleoAddress={address} onUpdate={handleProfileUpdate} />}
            {address && <CVUpload aleoAddress={address} existingCV={profile?.cv} onUploadSuccess={handleProfileUpdate} />}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
              <Link href="/jobs" className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-semibold py-3 rounded-xl hover:shadow-lg hover:shadow-indigo-100 transition-all">
                Browse Jobs <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JobSeekerDashboard() {
  return (
    <PaymentGate
      requiredAmount={1}
      featureType="job_search"
      title="Unlock Job Access"
      description="Pay 1 Aleo credit to access all job listings and apply for opportunities"
    >
      <JobSeekerContent />
    </PaymentGate>
  );
}
