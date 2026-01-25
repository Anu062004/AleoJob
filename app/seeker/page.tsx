'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { User, Briefcase, TrendingUp, Clock, CheckCircle2, Shield } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PaymentGate } from '@/components/PaymentGate';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

// Mock data
const mockApplications = [
  { id: '1', title: 'Frontend Developer', status: 'pending', appliedDate: '2 days ago' },
  { id: '2', title: 'Smart Contract Developer', status: 'accepted', appliedDate: '5 days ago' },
];

const mockJobs = [
  {
    id: '1',
    title: 'Backend Engineer',
    budget: '5-8 credits',
    deadline: '7 days',
    reputationReq: '50+',
  },
  {
    id: '2',
    title: 'Full Stack Developer',
    budget: '8-12 credits',
    deadline: '14 days',
    reputationReq: '70+',
  },
];

function JobSeekerContent() {
  const { address } = useWallet();
  const [reputation] = useState(65);
  const [activeApplications] = useState(mockApplications.length);
  const [completedJobs] = useState(3);

  return (
    <div className="min-h-screen container mx-auto px-4 py-8 lg:py-12">
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-2 text-white">Job Seeker Dashboard</h1>
        <p className="text-slate-400">Welcome back. Your privacy is protected.</p>
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
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-aleo-purple/20 rounded-xl flex items-center justify-center">
                <Briefcase className="text-aleo-purple-light" size={24} />
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-2">Active Applications</p>
            <p className="text-4xl font-bold text-white">{activeApplications}</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card glow className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="text-emerald-400" size={24} />
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-2">Completed Jobs</p>
            <p className="text-4xl font-bold text-white">{completedJobs}</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card glow className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="text-cyan-400" size={24} />
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-2">Reputation</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-white">{reputation}</p>
              <span className="text-slate-400">/100</span>
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Summary */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Profile Summary</h2>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Shield size={16} className="text-aleo-purple-light" />
                  <span>Identity protected via ZK proofs</span>
                </div>
              </div>
            </div>

            {/* Reputation Ring */}
            <div className="relative w-32 h-32 mx-auto mb-6">
              <svg className="transform -rotate-90 w-32 h-32">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-slate-700"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(reputation / 100) * 352} 352`}
                  className="text-aleo-purple-light transition-all duration-1000"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{reputation}</p>
                  <p className="text-xs text-slate-400">Score</p>
                </div>
              </div>
            </div>

            {/* Subscription Status */}
            <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300 text-sm font-medium">Access Status</span>
                <Badge variant="success">Active</Badge>
              </div>
              <p className="text-slate-400 text-xs">Valid for 5 more days</p>
            </div>
          </Card>

          {/* Active Applications */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Active Applications</h2>
            {mockApplications.length > 0 ? (
              <div className="space-y-4">
                {mockApplications.map((app) => (
                  <div
                    key={app.id}
                    className="bg-slate-700/50 rounded-xl p-4 border border-slate-600 flex items-center justify-between"
                  >
                    <div>
                      <h3 className="text-white font-semibold mb-1">{app.title}</h3>
                      <p className="text-slate-400 text-sm">Applied {app.appliedDate}</p>
                    </div>
                    <Badge variant={app.status === 'accepted' ? 'success' : 'info'}>
                      {app.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">No active applications</p>
            )}
          </Card>

          {/* Recommended Jobs */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Recommended Jobs</h2>
              <a href="/jobs" className="text-aleo-purple-light hover:text-aleo-purple text-sm font-medium">
                View All →
              </a>
            </div>
            {mockJobs.length > 0 ? (
              <div className="space-y-4">
                {mockJobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-slate-700/50 rounded-xl p-4 border border-slate-600 hover:border-aleo-purple/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-white font-semibold text-lg">{job.title}</h3>
                      <Badge variant="info">{job.reputationReq} rep</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                      <span>💰 {job.budget}</span>
                      <span>⏱️ {job.deadline} left</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      Apply Now
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">No jobs available</p>
            )}
          </Card>
        </div>

        {/* Right Column - Quick Actions */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link href="/jobs">
                <Button variant="primary" size="md" className="w-full" glow>
                  Browse Jobs
                </Button>
              </Link>
              <Button variant="secondary" size="md" className="w-full">
                View Profile
              </Button>
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




