import Link from 'next/link';
import { User, Briefcase, ArrowRight, Shield } from 'lucide-react';

export default function RoleSelect() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Soft BG */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full opacity-20 blur-3xl" style={{ width: 500, height: 500, background: 'radial-gradient(circle, #818cf8, transparent 70%)', top: '-100px', left: '-100px' }} />
        <div className="absolute rounded-full opacity-10 blur-3xl" style={{ width: 400, height: 400, background: 'radial-gradient(circle, #a78bfa, transparent 70%)', bottom: 0, right: 0 }} />
      </div>

      <div className="relative w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-4">Choose Your Role</h1>
          <p className="text-gray-500 text-lg">Select to continue. Privacy guaranteed.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Seeker */}
          <Link href="/login/job-seeker">
            <div className="group bg-white border border-gray-100 rounded-3xl p-9 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-50 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-6 shadow-md">
                <User className="text-white" size={26} />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Job Seeker</h2>
              <p className="text-gray-500 mb-5 text-sm">Find and apply for jobs. Build your reputation privately.</p>
              <div className="flex items-center gap-2 text-sm text-indigo-600 font-semibold group-hover:gap-4 transition-all">
                Get Started <ArrowRight size={16} />
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 font-medium">1 Aleo credit</div>
            </div>
          </Link>

          {/* Giver */}
          <Link href="/login/job-giver">
            <div className="group bg-white border border-gray-100 rounded-3xl p-9 hover:border-violet-200 hover:shadow-2xl hover:shadow-violet-50 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-6 shadow-md">
                <Briefcase className="text-white" size={26} />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Job Giver</h2>
              <p className="text-gray-500 mb-5 text-sm">Post jobs and find talented ZK developers.</p>
              <div className="flex items-center gap-2 text-sm text-violet-600 font-semibold group-hover:gap-4 transition-all">
                Get Started <ArrowRight size={16} />
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 font-medium">3 Aleo credits</div>
            </div>
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-6">
          <Shield size={15} className="text-indigo-400" />
          Privacy-preserving — we don't track or store your identity
        </div>

        <div className="text-center">
          <Link href="/" className="text-sm text-gray-400 hover:text-indigo-600 transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
