'use client';

import { motion } from 'framer-motion';
import { Trophy, Users, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function Leaderboard() {
  return (
    <div className="min-h-screen container mx-auto px-4 py-12 lg:py-16">
      <motion.div
        className="max-w-5xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-primary/10 rounded-2xl mb-6 border border-accent-primary/20">
            <Trophy className="text-accent-primary" size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-text-primary tracking-tight">Leaderboard</h1>
          <p className="text-text-secondary text-lg">Top performers in the AleoJob marketplace</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Top Job Seekers */}
          <Card className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-accent-primary/10 rounded-xl flex items-center justify-center border border-accent-primary/20">
                <Users className="text-accent-primary" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Top Job Seekers</h2>
                <p className="text-text-secondary text-sm">Highest reputation scores</p>
              </div>
            </div>
            <div className="text-center py-12">
              <TrendingUp className="mx-auto mb-4 text-text-muted" size={48} />
              <p className="text-text-secondary mb-2">No rankings available yet.</p>
              <p className="text-text-muted text-sm">Complete jobs to build your reputation and appear here.</p>
            </div>
          </Card>

          {/* Top Job Givers */}
          <Card className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-accent-secondary/10 rounded-xl flex items-center justify-center border border-accent-secondary/20">
                <Trophy className="text-accent-secondary" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Top Job Givers</h2>
                <p className="text-text-secondary text-sm">Most active employers</p>
              </div>
            </div>
            <div className="text-center py-12">
              <TrendingUp className="mx-auto mb-4 text-text-muted" size={48} />
              <p className="text-text-secondary mb-2">No rankings available yet.</p>
              <p className="text-text-muted text-sm">Post jobs and complete projects to climb the leaderboard.</p>
            </div>
          </Card>
        </div>

        <div className="text-center">
          <Link href="/">
            <Button variant="outline">
              ← Back to Home
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}






