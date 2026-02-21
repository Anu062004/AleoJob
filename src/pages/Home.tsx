import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Code2, Cpu, Globe, Layers, BookOpen, Palette, Server,
  ArrowRight, Star, CheckCircle, Lock, Shield, Zap, Award,
  Users, Briefcase, ChevronRight, Activity,
} from 'lucide-react';


// ─── Typing animation ──────────────────────────────────────────────────────────
function useTypingAnimation(phrases: string[], speed = 60, pause = 2200) {
  const [text, setText] = useState('');
  const [pIdx, setPIdx] = useState(0);
  const [cIdx, setCIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setCursor(v => !v), 530);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const cur = phrases[pIdx];
    let timeout: ReturnType<typeof setTimeout>;
    if (!deleting && cIdx < cur.length) {
      timeout = setTimeout(() => { setText(cur.slice(0, cIdx + 1)); setCIdx(c => c + 1); }, speed);
    } else if (!deleting && cIdx === cur.length) {
      timeout = setTimeout(() => setDeleting(true), pause);
    } else if (deleting && cIdx > 0) {
      timeout = setTimeout(() => { setText(cur.slice(0, cIdx - 1)); setCIdx(c => c - 1); }, speed / 2);
    } else if (deleting && cIdx === 0) {
      setDeleting(false);
      setPIdx(i => (i + 1) % phrases.length);
    }
    return () => clearTimeout(timeout);
  }, [cIdx, deleting, pIdx, phrases, speed, pause]);

  return { text, cursor };
}

// ─── FadeIn ────────────────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

// ─── Data ──────────────────────────────────────────────────────────────────────
const PHRASES = ['Hire Elite ZK Developers', 'Build the Future on Aleo', 'Where Privacy Meets Opportunity', 'The Zero-Knowledge Talent Marketplace'];

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

const WHY_FEATURES = [
  { icon: Shield, title: 'True Privacy', desc: 'Zero-knowledge proofs protect your identity at every step.' },
  { icon: Lock, title: 'Secure Escrow', desc: 'Smart contract escrow ensures fair payment for every job.' },
  { icon: Award, title: 'On-Chain Reputation', desc: 'Verifiable reputation scores built from real completed work.' },
  { icon: Zap, title: 'Smart Matching', desc: 'Find the right fit based on on-chain verified skills.' },
  { icon: Globe, title: 'Global Talent', desc: 'Access 8,400+ ZK developers and researchers worldwide.' },
  { icon: Activity, title: 'Verified Skills', desc: 'ZK proofs verify skills without exposing private info.' },
];



const HOW_TALENT = [
  { n: '01', title: 'Create Profile', desc: 'Showcase skills and ZK credentials privately.' },
  { n: '02', title: 'Browse & Apply', desc: 'Find curated opportunities matching your expertise.' },
  { n: '03', title: 'Get Hired', desc: 'Work with top companies in the Aleo ecosystem.' },
  { n: '04', title: 'Get Paid Securely', desc: 'Receive payments via on-chain escrow.' },
];

const HOW_EMPLOYER = [
  { n: '01', title: 'Post a Job', desc: 'Define requirements and budget in minutes.' },
  { n: '02', title: 'Review Talent', desc: 'Browse verified developers with on-chain reputation.' },
  { n: '03', title: 'Hire Confidently', desc: 'Lock escrow and start collaboration immediately.' },
  { n: '04', title: 'Pay on Completion', desc: 'Release escrow when satisfied. Zero disputes.' },
];

// ─── Home ──────────────────────────────────────────────────────────────────────
function Home() {
  const { text, cursor } = useTypingAnimation(PHRASES);

  return (
    <div className="bg-white font-sans">

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="min-h-[90vh] bg-white pt-6 pb-0 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(90vh-64px)]">

            {/* Left */}
            <div className="py-12 lg:py-16">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-7 border bg-indigo-50 border-indigo-200 text-indigo-700"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                Powered by Zero-Knowledge Technology
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
                className="text-[clamp(2.4rem,5vw,3.75rem)] leading-[1.08] font-black text-gray-900 mb-5"
              >
                Where Privacy<br />
                <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
                  Meets Opportunity
                </span>
              </motion.h1>

              {/* Typing */}
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
                className="text-indigo-600 font-mono text-sm min-h-5 mb-5"
              >
                {text}
                <span
                  className="inline-block w-0.5 h-4 ml-0.5 align-middle bg-indigo-500 transition-opacity duration-100"
                  style={{ opacity: cursor ? 1 : 0 }}
                />
              </motion.p>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="text-lg text-slate-500 leading-relaxed mb-10 max-w-sm"
              >
                AleoJob connects top-tier ZK developers and companies in a privacy-first ecosystem powered by Aleo blockchain.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="flex flex-wrap gap-4 mb-10"
              >
                <Link
                  to="/jobs"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-bold px-8 py-3.5 rounded-full text-sm shadow-lg shadow-indigo-200 hover:-translate-y-0.5 hover:shadow-indigo-300 transition-all duration-200 no-underline"
                >
                  Find Jobs <ArrowRight size={16} />
                </Link>
                <Link
                  to="/get-started"
                  className="inline-flex items-center gap-2 bg-white text-gray-700 font-semibold px-8 py-3.5 rounded-full text-sm border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 transition-all duration-200 no-underline"
                >
                  Hire Talent <ChevronRight size={16} />
                </Link>
              </motion.div>

              {/* Trust */}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
                className="flex items-center gap-3 text-sm text-gray-500"
              >
                <div className="flex">
                  {[
                    'from-indigo-400 to-violet-500',
                    'from-violet-400 to-purple-600',
                    'from-blue-400 to-indigo-500',
                  ].map((g, i) => (
                    <div
                      key={i}
                      className={`w-7 h-7 rounded-full border-2 border-white bg-gradient-to-br ${g} flex items-center justify-center text-white text-[10px] font-bold ${i ? '-ml-2' : ''}`}
                    >
                      {['A', 'B', 'C'][i]}
                    </div>
                  ))}
                </div>
                <span><strong className="text-gray-900">8,400+</strong> developers worldwide</span>
                <span className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} size={13} className="fill-amber-400 text-amber-400" />)}
                  <span className="ml-1">4.9/5</span>
                </span>
              </motion.div>
            </div>

            {/* Right — Hero Image */}
            <motion.div
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block relative h-[560px]"
            >
              <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-[0_30px_80px_rgba(99,102,241,0.15),0_0_0_1px_rgba(99,102,241,0.08)]">
                <img
                  src="/hero-image.png"
                  alt="Developer team collaborating on Aleo blockchain projects"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white/30 to-transparent" />
              </div>

              {/* Floating card 1 */}
              <motion.div
                animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -left-6 top-14 bg-white rounded-2xl p-4 shadow-xl border border-slate-100 min-w-[160px]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-[10px] bg-indigo-50 flex items-center justify-center">
                    <Briefcase size={14} className="text-indigo-500" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-600">New Job</span>
                </div>
                <p className="font-bold text-gray-900 text-sm mb-1">ZK Developer</p>
                <p className="text-xs text-gray-500">$8,000 – $12,000</p>
              </motion.div>

              {/* Floating card 2 */}
              <motion.div
                animate={{ y: [0, 8, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="absolute -right-4 bottom-20 bg-white rounded-2xl p-4 shadow-xl border border-slate-100 min-w-[155px]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-[10px] bg-green-50 flex items-center justify-center">
                    <CheckCircle size={14} className="text-green-500" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-600">ZK Verified</span>
                </div>
                <p className="text-xs text-gray-500 mb-2">Proof confirmed</p>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} size={11} className="fill-amber-400 text-amber-400" />)}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>


      {/* ── CATEGORIES ───────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <p className="text-[11px] font-bold tracking-[0.2em] text-indigo-500 uppercase mb-3">Browse by Category</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-3">Find the Right Role</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Explore opportunities across every corner of the Aleo ecosystem</p>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CATEGORIES.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <FadeIn key={cat.title} delay={i * 0.06}>
                  <Link to="/jobs" className="block no-underline group">
                    <div className="glass-card rounded-2xl p-6 cursor-pointer">
                      <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
                        <Icon size={20} className="text-indigo-500" />
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm mb-1">{cat.title}</h3>
                      <p className="text-xs text-gray-400">{cat.count}</p>
                    </div>
                  </Link>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <p className="text-[11px] font-bold tracking-[0.2em] text-indigo-500 uppercase mb-3">How It Works</p>
            <h2 className="text-4xl font-extrabold text-gray-900">Simple. Secure. Private.</h2>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-6">
            {/* For Talent */}
            <FadeIn>
              <div className="glass-card rounded-3xl p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                    <Users size={18} className="text-white" />
                  </div>
                  <h3 className="font-extrabold text-gray-900 text-lg">For Talent</h3>
                </div>
                {HOW_TALENT.map(s => (
                  <div key={s.n} className="flex gap-4 mb-5">
                    <span className="text-[11px] font-bold text-indigo-500 w-6 shrink-0 mt-0.5">{s.n}</span>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm mb-0.5">{s.title}</h4>
                      <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
                <Link to="/seeker" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 no-underline mt-2">
                  Get Started <ArrowRight size={14} />
                </Link>
              </div>
            </FadeIn>
            {/* For Employers */}
            <FadeIn delay={0.1}>
              <div className="glass-card rounded-3xl p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Briefcase size={18} className="text-white" />
                  </div>
                  <h3 className="font-extrabold text-gray-900 text-lg">For Employers</h3>
                </div>
                {HOW_EMPLOYER.map(s => (
                  <div key={s.n} className="flex gap-4 mb-5">
                    <span className="text-[11px] font-bold text-violet-500 w-6 shrink-0 mt-0.5">{s.n}</span>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm mb-0.5">{s.title}</h4>
                      <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
                <Link to="/giver" className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-700 no-underline mt-2">
                  Start Hiring <ArrowRight size={14} />
                </Link>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── WHY ALEOJOB ──────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <p className="text-[11px] font-bold tracking-[0.2em] text-indigo-500 uppercase mb-3">Why AleoJob</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-3">Built for the Privacy Era</h2>
            <p className="text-gray-500 max-w-xl mx-auto">The first marketplace that puts zero-knowledge technology at the core of every interaction.</p>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-5">
            {WHY_FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <FadeIn key={f.title} delay={i * 0.07}>
                  <div className="glass-card rounded-2xl p-7">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-5">
                      <Icon size={22} className="text-indigo-500" />
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


      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <FadeIn>
            <div className="rounded-[1.75rem] p-16 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 shadow-[0_30px_80px_rgba(99,102,241,0.3)]">
              <p className="text-[11px] font-bold tracking-[0.2em] text-white/70 uppercase mb-4">Get Started Today</p>
              <h2 className="text-4xl font-extrabold text-white mb-4">Ready to Build the Future?</h2>
              <p className="text-white/80 max-w-md mx-auto mb-10 leading-relaxed">
                Join thousands of developers and companies already using AleoJob to work privately and get paid securely.
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Link to="/seeker" className="bg-white text-indigo-700 font-bold py-3.5 px-8 rounded-full text-sm no-underline hover:shadow-lg hover:-translate-y-0.5 transition-all">Find Work</Link>
                <Link to="/giver" className="border border-white/40 text-white font-bold py-3.5 px-8 rounded-full text-sm no-underline hover:bg-white/10 transition-all">Hire Talent</Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 bg-white px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">AJ</span>
            </div>
            <span className="text-gray-900 font-extrabold text-lg">AleoJob</span>
          </div>
          <p className="text-sm text-gray-400 mb-8 max-w-sm leading-relaxed">
            The privacy-first professional marketplace built on Aleo blockchain.
          </p>
          <div className="border-t border-slate-100 pt-8 flex flex-wrap justify-between items-center gap-4 text-sm text-gray-400">
            <span>© 2025 AleoJob. All rights reserved.</span>
            <div className="flex gap-6">
              <a href="#" className="hover:text-indigo-500 transition-colors text-gray-400 no-underline">Privacy</a>
              <a href="#" className="hover:text-indigo-500 transition-colors text-gray-400 no-underline">Terms</a>
              <a href="https://aleo.org" target="_blank" rel="noreferrer" className="hover:text-indigo-500 transition-colors text-gray-400 no-underline">Aleo Network</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
