'use client';

import Link from 'next/link';
import { Search, Briefcase, Code, PenTool, BarChart3, Users, Shield, CheckCircle2, ArrowRight, Zap, Lock, TrendingUp } from 'lucide-react';

const categories = [
  { icon: Code, title: 'Development', description: 'Web, mobile, blockchain' },
  { icon: PenTool, title: 'Design', description: 'UI/UX, graphics, branding' },
  { icon: BarChart3, title: 'Marketing', description: 'SEO, content, social' },
  { icon: Briefcase, title: 'Business', description: 'Consulting, strategy' },
  { icon: Users, title: 'Support', description: 'Customer service, admin' },
];

const howItWorks = [
  {
    title: 'Post a Job',
    description: 'Create a job posting with your requirements. Set your budget and timeline.',
    image: '👔',
  },
  {
    title: 'Get Matched',
    description: 'Our system matches you with qualified talent based on skills and reputation.',
    image: '🎯',
  },
  {
    title: 'Work Securely',
    description: 'Complete projects with escrow protection and build your reputation.',
    image: '🔒',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200" style={{ height: '72px' }}>
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-gray-900">
            AleoJob
          </Link>

          {/* Center Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/jobs" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Find Talent
            </Link>
            <Link href="/jobs" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Find Work
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Why Us
            </Link>
            <Link href="#pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Pricing
            </Link>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
              Login
            </Link>
            <Link 
              href="/get-started" 
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div>
              <h1 className="text-5xl font-bold leading-tight text-gray-900 mb-4">
                Find the perfect talent for your next project
              </h1>
              <p className="text-lg text-gray-600 mt-4 mb-8">
                Connect with skilled professionals. Work securely with escrow protection. Build your reputation privately.
              </p>

              {/* Search Card */}
              <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-200 hover:-translate-y-1">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="What are you looking for?"
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2">
                    <Search size={18} />
                    Search
                  </button>
                </div>
              </div>
            </div>

            {/* Right Image Placeholder */}
            <div className="hidden lg:block">
              <div className="rounded-2xl shadow-xl overflow-hidden bg-gradient-to-br from-green-50 to-green-100 aspect-[4/3] flex items-center justify-center">
                <div className="text-center">
                  <Briefcase className="mx-auto text-green-600 mb-4" size={64} />
                  <p className="text-gray-600 text-sm">Hero Image</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-semibold text-gray-900 mb-12 text-center">
            Browse by Category
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {categories.map((category, index) => {
              const Icon = category.icon;
              return (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group"
                >
                  <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-100 transition-colors">
                    <Icon className="text-green-600" size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{category.title}</h3>
                  <p className="text-sm text-gray-500">{category.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-semibold text-gray-900 mb-4 text-center">
            How It Works
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Get started in three simple steps
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((step, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200"
              >
                <div className="h-48 bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
                  <span className="text-6xl">{step.image}</span>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-semibold text-gray-900 mb-12 text-center">
            Why Choose AleoJob?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                <Shield className="text-green-600" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Privacy First</h3>
              <p className="text-gray-600">
                Your identity stays private. Zero-knowledge proofs verify credentials without revealing who you are.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                <Lock className="text-green-600" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Secure Escrow</h3>
              <p className="text-gray-600">
                Payments held in escrow until job completion. Transparent, secure, and automated.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="text-green-600" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Build Reputation</h3>
              <p className="text-gray-600">
                Build verifiable on-chain reputation scores without compromising your privacy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h2 className="text-3xl font-semibold text-gray-900 mb-4">
              Ready to get started?
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of professionals working securely and building their reputation privately.
            </p>
            <Link
              href="/get-started"
              className="inline-block bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-full font-medium text-lg transition-all duration-200 hover:scale-105"
            >
              Get Started Now
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/jobs" className="hover:text-gray-900 transition-colors">
                    Browse Jobs
                  </Link>
                </li>
                <li>
                  <Link href="/leaderboard" className="hover:text-gray-900 transition-colors">
                    Leaderboard
                  </Link>
                </li>
                <li>
                  <Link href="/get-started" className="hover:text-gray-900 transition-colors">
                    Get Started
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="#" className="hover:text-gray-900 transition-colors">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-gray-900 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-gray-900 transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="#how-it-works" className="hover:text-gray-900 transition-colors">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="hover:text-gray-900 transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-gray-900 transition-colors">
                    About Us
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="#" className="hover:text-gray-900 transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-gray-900 transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-gray-900 transition-colors">
                    Community
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8 text-center text-sm text-gray-500">
            <p>&copy; 2024 AleoJob. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
