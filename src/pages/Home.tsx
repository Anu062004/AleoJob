import { Link } from 'react-router-dom';
import { Shield, Lock, TrendingUp, Wallet, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';

function Home() {
    return (
        <div className="min-h-screen">
            {/* Hero */}
            <section className="py-24 md:py-32">
                <div className="container mx-auto px-6 max-w-4xl">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium mb-8">
                            <Shield size={14} />
                            Built on Aleo
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white leading-tight tracking-tight mb-6">
                            Private work.
                            <br />
                            <span className="text-slate-400">Verified reputation.</span>
                        </h1>

                        <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto leading-relaxed">
                            A job marketplace where you work and earn without exposing your identity.
                            Zero-knowledge proofs handle verification.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link to="/get-started">
                                <Button variant="primary" size="lg">
                                    Get Started
                                    <ArrowRight className="ml-2" size={16} />
                                </Button>
                            </Link>
                            <Link to="/jobs">
                                <Button variant="secondary" size="lg">
                                    Browse Jobs
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="py-20 border-t border-slate-800">
                <div className="container mx-auto px-6 max-w-5xl">
                    <div className="text-center mb-16">
                        <h2 className="text-2xl font-semibold text-white mb-3">How it works</h2>
                        <p className="text-slate-500">Four steps to private employment</p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-px bg-slate-800 rounded-2xl overflow-hidden">
                        {[
                            { num: '01', title: 'Connect', desc: 'Link your Aleo wallet' },
                            { num: '02', title: 'Prove', desc: 'Generate ZK credentials' },
                            { num: '03', title: 'Work', desc: 'Match and complete jobs' },
                            { num: '04', title: 'Earn', desc: 'Get paid via escrow' },
                        ].map((step) => (
                            <div key={step.num} className="bg-slate-900 p-6 md:p-8">
                                <div className="text-violet-500 font-mono text-xs mb-4">{step.num}</div>
                                <h3 className="text-white font-medium mb-1">{step.title}</h3>
                                <p className="text-slate-500 text-sm">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 border-t border-slate-800">
                <div className="container mx-auto px-6 max-w-5xl">
                    <div className="grid md:grid-cols-2 gap-6">
                        {[
                            {
                                icon: Shield,
                                title: 'Zero-Knowledge Identity',
                                desc: 'Prove qualifications without revealing personal data.'
                            },
                            {
                                icon: TrendingUp,
                                title: 'Verifiable Reputation',
                                desc: 'Build trust through on-chain job completions.'
                            },
                            {
                                icon: Lock,
                                title: 'Escrow Payments',
                                desc: 'Funds held securely until verified completion.'
                            },
                            {
                                icon: Wallet,
                                title: 'Simple Pricing',
                                desc: 'Seekers: 1 credit. Givers: 3 credits.'
                            },
                        ].map((feature) => {
                            const Icon = feature.icon;
                            return (
                                <div key={feature.title} className="flex gap-4 p-6 rounded-xl bg-slate-900/50 border border-slate-800">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                                        <Icon size={18} className="text-violet-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium mb-1">{feature.title}</h3>
                                        <p className="text-slate-500 text-sm">{feature.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 border-t border-slate-800">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-2xl font-semibold text-white mb-3">Ready to start?</h2>
                    <p className="text-slate-500 mb-8">Connect your wallet and begin.</p>
                    <Link to="/get-started">
                        <Button variant="primary" size="lg">
                            Get Started
                            <ArrowRight className="ml-2" size={16} />
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-800 py-8">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-violet-600 rounded flex items-center justify-center">
                                <Shield size={12} className="text-white" />
                            </div>
                            <span className="font-medium text-white text-sm">AleoJob</span>
                        </div>
                        <div className="flex gap-6 text-sm text-slate-500">
                            <Link to="/jobs" className="hover:text-white transition-colors">Jobs</Link>
                            <Link to="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link>
                            <a href="https://aleo.org" target="_blank" rel="noopener" className="hover:text-white transition-colors">Aleo</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Home;
