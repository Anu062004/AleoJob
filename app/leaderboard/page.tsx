'use client';

import { motion } from 'framer-motion';
import { Trophy, Users, TrendingUp, Star, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function Leaderboard() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Soft background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full opacity-15 blur-3xl"
          style={{ width: 400, height: 400, background: 'radial-gradient(circle, #818cf8 0%, transparent 70%)', top: '-80px', right: '10%' }} />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-12 lg:py-16">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors font-medium mb-10">
          <ArrowLeft size={15} />
          Back to Home
        </Link>

        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-100">
            <Trophy className="text-white" size={30} />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">Leaderboard</h1>
          <p className="text-gray-500 text-lg">Top performers in the AleoJob marketplace</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Top Job Seekers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Users className="text-indigo-600" size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Top Job Seekers</h2>
                  <p className="text-sm text-gray-500">Highest reputation scores</p>
                </div>
              </div>

              <div className="text-center py-16">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <TrendingUp className="text-gray-300" size={28} />
                </div>
                <p className="text-gray-700 font-semibold mb-1">No rankings yet</p>
                <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                  Complete jobs to build your on-chain reputation and appear here.
                </p>
                <Link href="/jobs" className="inline-flex items-center gap-2 mt-6 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:shadow-lg hover:shadow-indigo-100 transition-all">
                  Browse Jobs
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Top Job Givers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm hover:shadow-lg hover:border-violet-200 transition-all">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-11 h-11 bg-violet-50 rounded-xl flex items-center justify-center">
                  <Trophy className="text-violet-600" size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Top Job Givers</h2>
                  <p className="text-sm text-gray-500">Most active employers</p>
                </div>
              </div>

              <div className="text-center py-16">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Star className="text-gray-300" size={28} />
                </div>
                <p className="text-gray-700 font-semibold mb-1">No rankings yet</p>
                <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                  Post jobs and complete projects to climb the employer leaderboard.
                </p>
                <Link href="/giver" className="inline-flex items-center gap-2 mt-6 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:shadow-lg hover:shadow-violet-100 transition-all">
                  Post a Job
                </Link>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Coming Soon strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 text-center"
        >
          <p className="text-indigo-700 font-medium text-sm">
            Full leaderboard rankings with on-chain reputation scores coming soon.
            Complete jobs to build your score!
          </p>
        </motion.div>
      </div>
    </div>
  );
}
