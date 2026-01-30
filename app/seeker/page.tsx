'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Briefcase, TrendingUp, CheckCircle2, Shield, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PaymentGate } from '@/components/PaymentGate';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { CVUpload } from '@/components/CVUpload';
import { ProfileEditor } from '@/components/ProfileEditor';
import { supabase } from '@/lib/supabaseClient';

function JobSeekerContent() {
  const { address } = useWallet();
  const [reputation, setReputation] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [completedJobsCount, setCompletedJobsCount] = useState(0);

  useEffect(() => {
    if (address) {
      fetchData();
    }
  }, [address]);

  const fetchData = async () => {
    if (!address) return;

    try {
      setLoading(true);

      // 1. Fetch User Profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('aleo_address', address)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error fetching user:', userError);
      } else if (userData) {
        setProfile(userData);
        setReputation(userData.reputation_score || 0);

        // 2. Fetch Applications
        const { data: appsData, error: appsError } = await supabase
          .from('applications')
          .select(`
            id,
            status,
            created_at,
            job:jobs (
              title
            )
          `)
          .eq('seeker_id', userData.id)
          .order('created_at', { ascending: false });

        if (appsError) {
          console.error('Error fetching applications:', appsError);
        } else {
          setApplications(appsData || []);

          // Count completed (accepted) jobs for display
          const completed = appsData?.filter((a: any) => a.status === 'accepted').length || 0;
          setCompletedJobsCount(completed);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = () => {
    fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-500" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen container mx-auto px-4 py-8 lg:py-12">
      {/* Header */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-3 text-text-primary tracking-tight">Job Seeker Dashboard</h1>
        <p className="text-text-secondary text-lg">Welcome back. Your privacy is protected.</p>
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
            <p className="text-text-secondary text-sm mb-2 font-medium">Active Applications</p>
            <p className="text-4xl font-bold text-text-primary">{applications.length}</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6">
            <div className="w-14 h-14 bg-success/10 rounded-xl flex items-center justify-center mb-5 border border-success/20">
              <CheckCircle2 className="text-success" size={24} />
            </div>
            <p className="text-text-secondary text-sm mb-2 font-medium">Completed Jobs</p>
            <p className="text-4xl font-bold text-text-primary">{completedJobsCount}</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6">
            <div className="w-14 h-14 bg-accent-secondary/10 rounded-xl flex items-center justify-center mb-5 border border-accent-secondary/20">
              <TrendingUp className="text-accent-secondary" size={24} />
            </div>
            <p className="text-text-secondary text-sm mb-2 font-medium">Reputation</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-text-primary">{reputation}</p>
              <span className="text-text-muted">/1000</span>
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Summary */}
          <Card className="p-6 md:p-8">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-3">Profile Summary</h2>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Shield size={16} className="text-accent-primary" />
                  <span>Identity protected via ZK proofs</span>
                </div>
              </div>
            </div>

            {/* Reputation Ring */}
            <div className="relative w-36 h-36 mx-auto mb-6">
              <svg className="transform -rotate-90 w-36 h-36">
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-bg-hover"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(reputation / 1000) * 402} 402`}
                  className="text-accent-primary transition-all duration-1000"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-4xl font-bold text-text-primary">{reputation}</p>
                  <p className="text-xs text-text-muted mt-1">Score</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Active Applications */}
          <Card className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-text-primary mb-6">Your Applications</h2>
            {applications.length > 0 ? (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="bg-bg-hover rounded-xl p-5 border border-border-subtle flex items-center justify-between hover:border-border-accent transition-colors"
                  >
                    <div>
                      <h3 className="text-text-primary font-semibold mb-1">{app.job?.title || 'Unknown Job'}</h3>
                      <p className="text-text-secondary text-sm">Applied {new Date(app.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={app.status === 'accepted' ? 'success' : app.status === 'rejected' ? 'destructive' : 'info'}>
                      {app.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Briefcase className="mx-auto mb-4 text-text-muted" size={48} />
                <p className="text-text-secondary mb-2">No applications found.</p>
                <p className="text-text-muted text-sm">Start applying to jobs to see them here.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - Profile & CV */}
        <div className="space-y-6">
          {/* Profile Editor */}
          {address && (
            <ProfileEditor aleoAddress={address} onUpdate={handleProfileUpdate} />
          )}

          {/* CV Upload */}
          {address && (
            <CVUpload
              aleoAddress={address}
              existingCV={profile?.cv}
              onUploadSuccess={handleProfileUpdate}
            />
          )}

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="text-xl font-bold text-text-primary mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link href="/jobs">
                <Button variant="primary" size="md" className="w-full">
                  Browse Jobs
                </Button>
              </Link>
            </div>
          </Card>
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

