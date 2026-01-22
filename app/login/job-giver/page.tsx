'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JobGiverLogin() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    // TODO: Implement wallet connection
    setTimeout(() => {
      router.push('/dashboard/job-giver');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">Job Giver Login</h1>
          
          <div className="bg-gray-800 rounded-lg p-8 border border-purple-500/30">
            <p className="text-gray-400 mb-6">
              Connect your Aleo wallet to post jobs. Cost: 3 Aleo credits.
            </p>
            
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <a href="/role-select" className="text-purple-400 hover:text-purple-300">
              ← Back to Role Selection
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}






