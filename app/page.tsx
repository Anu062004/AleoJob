'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Code2, Cpu, Globe, Layers, BookOpen, Palette, Server,
  ArrowRight, Star, CheckCircle, Lock, TrendingUp, Users, Briefcase,
  Shield, Zap, Award, DollarSign, ChevronRight, Twitter, Github, Linkedin
} from 'lucide-react';

// ─── Typing animation ─────────────────────────────────────────────────────────
function useTypingAnimation(phrases: string[], typingSpeed = 60, pauseDuration = 2200) {
  const [displayText, setDisplayText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const cursorInterval = setInterval(() => setShowCursor(v => !v), 530);
    return () => clearInterval(cursorInterval);
  }, []);

  useEffect(() => {
    const current = phrases[phraseIndex];
    let timeout: ReturnType<typeof setTimeout>;
    if (!isDeleting && charIndex < current.length) {
      timeout = setTimeout(() => { setDisplayText(current.slice(0, charIndex + 1)); setCharIndex(c => c + 1); }, typingSpeed);
    } else if (!isDeleting && charIndex === current.length) {
      timeout = setTimeout(() => setIsDeleting(true), pauseDuration);
    } else if (isDeleting && charIndex > 0) {
      timeout = setTimeout(() => { setDisplayText(current.slice(0, charIndex - 1)); setCharIndex(c => c - 1); }, typingSpeed / 2);
    } else if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setPhraseIndex(i => (i + 1) % phrases.length);
    }
    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, phraseIndex, phrases, typingSpeed, pauseDuration]);

  return { displayText, showCursor };
}

// ─── FadeIn wrapper ────────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const TYPING_PHRASES = [
  'Hire Elite ZK Developers',
  'Build the Future on Aleo',
  'Where Privacy Meets Opportunity',
  'The Zero-Knowledge Talent Marketplace',
];

const STATS = [
  { value: '1,200+', label: 'Jobs Posted' },
  { value: '8,400+', label: 'Developers' },
  { value: '98%', label: 'Satisfaction' },
  { value: '$2.8M+', label: 'Paid Out' },
];

const CATEGORIES = [
  { icon: Code2, title: 'ZK Development', count: '340 jobs' },
  { icon: Cpu, title: 'Smart Contracts', count: '210 jobs' },
  { icon: Globe, title: 'Frontend', count: '185 jobs' },
  { icon: Server, title: 'Backend', count: '162 jobs' },
  { icon: Lock, title: 'Cryptography', count: '98 jobs' },
  { icon: BookOpen, title: 'Research', count: '74 jobs' },
  { icon: Palette, title: 'Design', count: '51 jobs' },
  { icon: Layers, title: 'DevOps', count: '43 jobs' },
];

const TALENT_STEPS = [
  { n: '01', title: 'Create Profile', desc: 'Showcase skills and ZK credentials privately.' },
  { n: '02', title: 'Browse & Apply', desc: 'Find curated opportunities matching your expertise.' },
  { n: '03', title: 'Get Hired', desc: 'Work with top companies in the Aleo ecosystem.' },
  { n: '04', title: 'Get Paid Securely', desc: 'Receive payments via on-chain escrow.' },
];

const EMPLOYER_STEPS = [
  { n: '01', title: 'Post a Job', desc: 'Define requirements and budget in minutes.' },
  { n: '02', title: 'Review Talent', desc: 'Browse verified developers with on-chain reputation.' },
  { n: '03', title: 'Hire Confidently', desc: 'Lock escrow and start collaboration immediately.' },
  { n: '04', title: 'Pay on Completion', desc: 'Release escrow when satisfied. Zero disputes.' },
];

const FEATURED_JOBS = [
  { title: 'Senior ZK Circuit Developer', company: 'Aleo Labs', budget: '$8,000 – $12,000', type: 'Full-time', skills: ['Leo', 'R1CS', 'Rust', 'ZK Proofs'] },
  { title: 'Aleo Smart Contract Engineer', company: 'PrivacyDAO', budget: '$6,000 – $10,000', type: 'Contract', skills: ['Leo', 'Aleo SDK', 'TypeScript'] },
  { title: 'Privacy Protocol Researcher', company: 'ZKverse Labs', budget: '$5,000 – $8,000', type: 'Part-time', skills: ['ZK-SNARKs', 'Cryptography', 'Rust'] },
  { title: 'Frontend Developer (Web3)', company: 'AleoDEX', budget: '$4,000 – $7,000', type: 'Contract', skills: ['React', 'Next.js', 'Aleo.js'] },
];

const FEATURED_TALENT = [
  { name: 'Alex K.', role: 'ZK Circuit Expert', rating: 5.0, jobs: 23, skills: ['Leo', 'R1CS', 'Rust'], initials: 'AK', color: 'from-indigo-400 to-violet-500' },
  { name: 'Priya S.', role: 'Smart Contract Dev', rating: 4.9, jobs: 17, skills: ['Leo', 'TypeScript', 'Aleo SDK'], initials: 'PS', color: 'from-violet-400 to-purple-500' },
  { name: 'Marco R.', role: 'Cryptography Researcher', rating: 4.8, jobs: 31, skills: ['ZK-SNARKs', 'Rust', 'Math'], initials: 'MR', color: 'from-blue-400 to-indigo-500' },
  { name: 'Yuki T.', role: 'Web3 Frontend Lead', rating: 4.9, jobs: 12, skills: ['React', 'Next.js', 'Aleo.js'], initials: 'YT', color: 'from-fuchsia-400 to-violet-500' },
];

const WHY_FEATURES = [
  { icon: Shield, title: 'True Privacy', desc: 'Zero-knowledge proofs protect your identity and credentials at every step.' },
  { icon: Lock, title: 'Secure Escrow', desc: 'Smart contract escrow ensures fair payment for every completed job.' },
  { icon: Award, title: 'On-Chain Reputation', desc: 'Verifiable reputation scores built from real completed work.' },
  { icon: Zap, title: 'Smart Matching', desc: 'AI-powered matching finds the right fit based on verified skills.' },
  { icon: Globe, title: 'Global Talent Pool', desc: 'Access 8,400+ ZK developers and researchers worldwide.' },
  { icon: TrendingUp, title: 'Verified Skills', desc: 'ZK proofs verify skills without exposing private information.' },
];

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { displayText, showCursor } = useTypingAnimation(TYPING_PHRASES);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="bg-white min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── NAVBAR ─────────────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.98)',
          backdropFilter: 'blur(16px)',
          borderBottom: scrolled ? '1px solid #f0f0f0' : '1px solid transparent',
          boxShadow: scrolled ? '0 1px 20px rgba(0,0,0,0.06)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <span className="text-white text-xs font-bold">AJ</span>
            </div>
            <span className="text-lg font-extrabold text-gray-900">AleoJob</span>
          </Link>

          <div className="hidden md:flex items-center gap-7">
            {[
              { label: 'Find Jobs', href: '/jobs' },
              { label: 'Find Talent', href: '/jobs' },
              { label: 'Leaderboard', href: '/leaderboard' },
              { label: 'How It Works', href: '#how-it-works' },
            ].map(link => (
              <Link key={link.label} href={link.href} className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
              Log In
            </Link>
            <Link
              href="/get-started"
              className="text-sm font-semibold text-white px-5 py-2.5 rounded-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────────── */}
      <section className="pt-24 pb-0 bg-white overflow-hidden" style={{ minHeight: '92vh' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center" style={{ minHeight: 'calc(92vh - 96px)' }}>

            {/* Left — Text */}
            <div className="py-12 lg:py-20">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-7 border"
                style={{ background: '#f0f4ff', borderColor: '#c7d2fe', color: '#4f46e5' }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#6366f1' }} />
                Powered by Zero-Knowledge Technology
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="font-extrabold leading-tight tracking-tight text-gray-900 mb-5"
                style={{ fontSize: 'clamp(2.5rem, 5vw, 3.75rem)', lineHeight: '1.08' }}
              >
                Where Privacy<br />
                <span style={{ backgroundImage: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Meets Opportunity
                </span>
              </motion.h1>

              {/* Typing line */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="text-sm font-medium mb-5 h-5 font-mono"
                style={{ color: '#6366f1' }}
              >
                {displayText}
                <span className="inline-block w-0.5 h-4 ml-0.5 align-middle" style={{ background: '#6366f1', opacity: showCursor ? 1 : 0, transition: 'opacity 0.1s' }} />
              </motion.p>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-lg leading-relaxed mb-10 max-w-md"
                style={{ color: '#475569' }}
              >
                AleoJob connects top-tier ZK developers and forward-thinking companies in a privacy-first ecosystem powered by Aleo blockchain.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-wrap gap-4 mb-10"
              >
                <Link
                  href="/jobs"
                  className="flex items-center gap-2 text-white text-sm font-semibold px-7 py-3.5 rounded-full transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 6px 20px rgba(99,102,241,0.35)' }}
                >
                  Find Jobs <ArrowRight size={16} />
                </Link>
                <Link
                  href="/get-started"
                  className="flex items-center gap-2 text-sm font-semibold px-7 py-3.5 rounded-full border border-gray-200 text-gray-700 hover:border-indigo-300 hover:text-indigo-700 transition-all duration-200 bg-white"
                >
                  Hire Talent <ChevronRight size={16} />
                </Link>
              </motion.div>

              {/* Trust line */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
                className="flex items-center gap-3 text-sm text-gray-500"
              >
                <div className="flex -space-x-2">
                  {['from-indigo-400 to-violet-500', 'from-violet-400 to-purple-500', 'from-blue-400 to-indigo-500'].map((g, i) => (
                    <div key={i} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold" style={{ background: `linear-gradient(135deg, ${g.includes('indigo-400') ? '#818cf8,#8b5cf6' : g.includes('violet') ? '#a78bfa,#7c3aed' : '#60a5fa,#6366f1'})` }}>
                      {['A', 'B', 'C'][i]}
                    </div>
                  ))}
                </div>
                <span><strong className="text-gray-700">8,400+</strong> developers worldwide</span>
                <span className="hidden sm:flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} size={13} className="fill-amber-400 text-amber-400" />)}
                  <span className="ml-1">4.9/5</span>
                </span>
              </motion.div>
            </div>

            {/* Right — Hero Image */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block relative"
              style={{ height: '580px' }}
            >
              {/* Main image */}
              <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl" style={{ boxShadow: '0 30px 80px rgba(99,102,241,0.15), 0 0 0 1px rgba(99,102,241,0.08)' }}>
                <Image
                  src="/hero-image.png"
                  alt="Developer team working on privacy-first Aleo blockchain projects"
                  fill
                  className="object-cover"
                  priority
                />
                {/* Subtle overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-24" style={{ background: 'linear-gradient(to top, rgba(255,255,255,0.5), transparent)' }} />
              </div>

              {/* Floating card 1 */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -left-6 top-16 bg-white rounded-2xl p-4 shadow-xl border border-gray-100"
                style={{ minWidth: '160px' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#f0f4ff' }}>
                    <Briefcase size={15} style={{ color: '#6366f1' }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">New Job</span>
                </div>
                <p className="text-sm font-bold text-gray-900 mb-1">ZK Developer</p>
                <p className="text-xs text-gray-500">$8,000 – $12,000</p>
              </motion.div>

              {/* Floating card 2 */}
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="absolute -right-4 bottom-20 bg-white rounded-2xl p-4 shadow-xl border border-gray-100"
                style={{ minWidth: '155px' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#f0fdf4' }}>
                    <CheckCircle size={15} style={{ color: '#22c55e' }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">Verified</span>
                </div>
                <p className="text-xs text-gray-500">ZK Proof confirmed</p>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} size={11} className="fill-amber-400 text-amber-400" />)}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ────────────────────────────────────────────────────────── */}
      <section className="py-14 border-y border-gray-100 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat, i) => (
            <FadeIn key={stat.label} delay={i * 0.08} className="text-center">
              <p className="text-3xl font-extrabold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── CATEGORIES ─────────────────────────────────────────────────────────── */}
      <section id="categories" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest text-indigo-600 mb-3 uppercase">Browse by Category</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">Find the Right Role</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Explore opportunities across every corner of the Aleo ecosystem</p>
          </FadeIn>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CATEGORIES.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <FadeIn key={cat.title} delay={i * 0.06}>
                  <Link href="/jobs">
                    <div className="group bg-white border border-gray-100 rounded-2xl p-6 hover:border-indigo-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: '#f0f4ff' }}>
                        <Icon size={20} style={{ color: '#6366f1' }} />
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm mb-1 group-hover:text-indigo-700 transition-colors">{cat.title}</h3>
                      <p className="text-xs text-gray-500">{cat.count}</p>
                    </div>
                  </Link>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest text-indigo-600 mb-3 uppercase">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">Simple. Secure. Private.</h2>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-8">
            {/* For Talent */}
            <FadeIn>
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm h-full">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                    <Users size={18} className="text-white" />
                  </div>
                  <h3 className="text-xl font-extrabold text-gray-900">For Talent</h3>
                </div>
                <div className="space-y-5">
                  {TALENT_STEPS.map((step, i) => (
                    <div key={step.n} className="flex gap-4">
                      <span className="text-xs font-bold text-indigo-500 w-6 shrink-0 mt-0.5">{step.n}</span>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm mb-0.5">{step.title}</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/seeker" className="mt-8 flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                  Get Started as Talent <ArrowRight size={15} />
                </Link>
              </div>
            </FadeIn>
            {/* For Employers */}
            <FadeIn delay={0.1}>
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm h-full">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' }}>
                    <Briefcase size={18} className="text-white" />
                  </div>
                  <h3 className="text-xl font-extrabold text-gray-900">For Employers</h3>
                </div>
                <div className="space-y-5">
                  {EMPLOYER_STEPS.map((step) => (
                    <div key={step.n} className="flex gap-4">
                      <span className="text-xs font-bold text-violet-500 w-6 shrink-0 mt-0.5">{step.n}</span>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm mb-0.5">{step.title}</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/giver" className="mt-8 flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-800 transition-colors">
                  Start Hiring <ArrowRight size={15} />
                </Link>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── FEATURED JOBS ──────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-bold tracking-widest text-indigo-600 mb-2 uppercase">Featured Jobs</p>
              <h2 className="text-3xl font-extrabold text-gray-900">Top Opportunities</h2>
            </div>
            <Link href="/jobs" className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors hidden sm:flex">
              View All <ArrowRight size={15} />
            </Link>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-5">
            {FEATURED_JOBS.map((job, i) => (
              <FadeIn key={job.title} delay={i * 0.08}>
                <div className="group bg-white border border-gray-100 rounded-2xl p-7 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/50 hover:-translate-y-0.5 transition-all duration-200">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#f0f4ff' }}>
                      <Briefcase size={20} style={{ color: '#6366f1' }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-0.5 group-hover:text-indigo-700 transition-colors">{job.title}</h3>
                      <p className="text-sm text-gray-500">{job.company}</p>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium shrink-0">{job.type}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {job.skills.map(s => (
                      <span key={s} className="text-xs px-2.5 py-1 rounded-full font-medium border" style={{ background: '#f0f4ff', color: '#4f46e5', borderColor: '#c7d2fe' }}>{s}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-sm">{job.budget}</span>
                    <Link href="/jobs" className="text-sm font-semibold text-white px-4 py-2 rounded-full transition-all hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
                      Apply Now
                    </Link>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED TALENT ────────────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-bold tracking-widest text-indigo-600 mb-2 uppercase">Featured Talent</p>
              <h2 className="text-3xl font-extrabold text-gray-900">Top ZK Developers</h2>
            </div>
            <Link href="/jobs" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
              Browse All <ArrowRight size={15} />
            </Link>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURED_TALENT.map((t, i) => (
              <FadeIn key={t.name} delay={i * 0.08}>
                <div className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-indigo-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: `linear-gradient(135deg, ${t.color.includes('indigo-400') ? '#818cf8,#8b5cf6' : t.color.includes('violet') ? '#a78bfa,#7c3aed' : t.color.includes('blue') ? '#60a5fa,#6366f1' : '#e879f9,#8b5cf6'})` }}>
                      {t.initials}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(i => <Star key={i} size={12} className="fill-amber-400 text-amber-400" />)}
                    </div>
                    <span className="text-xs font-bold text-gray-700">{t.rating}</span>
                    <span className="text-xs text-gray-400">· {t.jobs} jobs</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {t.skills.slice(0, 2).map(s => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#f0f4ff', color: '#4f46e5' }}>{s}</span>
                    ))}
                  </div>
                  <Link href="/get-started" className="w-full block text-center text-xs font-semibold text-indigo-700 py-2 rounded-full border border-indigo-200 hover:bg-indigo-50 transition-colors">
                    View Profile
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY ALEOJOB ────────────────────────────────────────────────────────── */}
      <section id="why" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest text-indigo-600 mb-3 uppercase">Why AleoJob</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">Built for the Privacy Era</h2>
            <p className="text-gray-500 max-w-xl mx-auto">The first professional marketplace that puts zero-knowledge technology at the core of every transaction.</p>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {WHY_FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <FadeIn key={f.title} delay={i * 0.07}>
                  <div className="bg-white border border-gray-100 rounded-2xl p-7 hover:border-indigo-200 hover:shadow-lg transition-all duration-200">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: '#f0f4ff' }}>
                      <Icon size={22} style={{ color: '#6366f1' }} />
                    </div>
                    <h3 className="font-extrabold text-gray-900 mb-2">{f.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <FadeIn>
            <div className="rounded-3xl p-14" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #7c3aed 100%)', boxShadow: '0 30px 80px rgba(99,102,241,0.3)' }}>
              <p className="text-xs font-bold tracking-widest text-indigo-200 mb-4 uppercase">Get Started Today</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Ready to Build the Future?</h2>
              <p className="text-indigo-200 mb-10 max-w-xl mx-auto">Join thousands of developers and companies already using AleoJob to work privately and get paid securely.</p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/seeker" className="bg-white text-indigo-700 font-bold px-7 py-3.5 rounded-full hover:-translate-y-0.5 hover:shadow-xl transition-all text-sm">
                  Find Work
                </Link>
                <Link href="/giver" className="border border-white/40 text-white font-bold px-7 py-3.5 rounded-full hover:bg-white/10 transition-all text-sm">
                  Hire Talent
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────────── */}
      <footer className="bg-gray-950 text-gray-400 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                  <span className="text-white text-xs font-bold">AJ</span>
                </div>
                <span className="text-white text-lg font-extrabold">AleoJob</span>
              </div>
              <p className="text-sm leading-relaxed text-gray-500 max-w-xs">The privacy-first professional marketplace built on Aleo blockchain. Zero-knowledge proofs protect your work.</p>
              <div className="flex gap-3 mt-5">
                {[Twitter, Github, Linkedin].map((Icon, i) => (
                  <a key={i} href="#" className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
                    <Icon size={15} className="text-gray-400" />
                  </a>
                ))}
              </div>
            </div>
            {[
              { title: 'Product', links: ['Browse Jobs', 'Find Talent', 'Leaderboard', 'Pricing'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
              { title: 'Resources', links: ['Documentation', 'API', 'Status', 'Support'] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="text-white font-bold text-sm mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(l => (
                    <li key={l}><a href="#" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between gap-4 text-sm text-gray-600">
            <span>© 2025 AleoJob. All rights reserved.</span>
            <div className="flex gap-5">
              <a href="#" className="hover:text-gray-400 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-gray-400 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
