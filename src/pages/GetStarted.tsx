import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, User, ArrowRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

function GetStarted() {
    const { connected } = useWallet();

    return (
        <div className="container mx-auto px-4 py-16">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-2xl mx-auto text-center"
            >
                <h1 className="text-4xl font-bold mb-4 text-white">Get Started</h1>
                <p className="text-slate-400 mb-12">
                    Choose your role and start your privacy-preserving journey on AleoJob
                </p>

                {!connected && (
                    <Card className="p-6 mb-8 bg-aleo-purple/10 border-aleo-purple/30">
                        <p className="text-slate-300">
                            Please connect your wallet first to continue.
                        </p>
                    </Card>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                    >
                        <Card hover glow className="p-8 h-full">
                            <div className="w-16 h-16 bg-aleo-purple/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <User className="text-aleo-purple-light" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold mb-3 text-white">Job Seeker</h2>
                            <p className="text-slate-400 mb-6">
                                Find work, build your anonymous reputation, and get paid in ALEO.
                            </p>
                            <ul className="text-left text-sm text-slate-400 space-y-2 mb-6">
                                <li>✓ Browse available jobs</li>
                                <li>✓ Build ZK-verified reputation</li>
                                <li>✓ 1 credit to apply</li>
                            </ul>
                            <Link to="/seeker">
                                <Button variant="primary" className="w-full" disabled={!connected}>
                                    Join as Seeker
                                    <ArrowRight className="inline ml-2" size={18} />
                                </Button>
                            </Link>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 }}
                    >
                        <Card hover glow className="p-8 h-full">
                            <div className="w-16 h-16 bg-aleo-purple/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Briefcase className="text-aleo-purple-light" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold mb-3 text-white">Job Giver</h2>
                            <p className="text-slate-400 mb-6">
                                Post jobs, find talented workers, and pay securely via escrow.
                            </p>
                            <ul className="text-left text-sm text-slate-400 space-y-2 mb-6">
                                <li>✓ Post private job listings</li>
                                <li>✓ Secure escrow payments</li>
                                <li>✓ 3 credits to post</li>
                            </ul>
                            <Link to="/giver">
                                <Button variant="primary" className="w-full" disabled={!connected}>
                                    Join as Giver
                                    <ArrowRight className="inline ml-2" size={18} />
                                </Button>
                            </Link>
                        </Card>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}

export default GetStarted;
