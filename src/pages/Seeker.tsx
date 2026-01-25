import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Briefcase, Search, Star } from 'lucide-react';
import { Button } from '../components/ui/Button';

function Seeker() {
    const { connected, address } = useWallet();

    if (!connected) {
        return (
            <div className="container mx-auto px-4 py-16">
                <Card className="p-12 max-w-xl mx-auto text-center">
                    <h1 className="text-3xl font-bold mb-4 text-white">Job Seeker Dashboard</h1>
                    <p className="text-slate-400">Please connect your wallet to access the seeker dashboard.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="text-4xl font-bold mb-2 text-white">Job Seeker Dashboard</h1>
                <p className="text-slate-400 mb-8">Welcome, {address?.slice(0, 10)}...</p>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-aleo-purple/20 rounded-xl">
                                <Briefcase className="text-aleo-purple-light" size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Active Applications</p>
                                <p className="text-2xl font-bold text-white">0</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-aleo-emerald/20 rounded-xl">
                                <Star className="text-aleo-emerald" size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Reputation Score</p>
                                <p className="text-2xl font-bold text-white">--</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-aleo-cyan/20 rounded-xl">
                                <Search className="text-aleo-cyan" size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Jobs Completed</p>
                                <p className="text-2xl font-bold text-white">0</p>
                            </div>
                        </div>
                    </Card>
                </div>

                <Card className="p-8">
                    <h2 className="text-xl font-bold mb-4 text-white">Get Started</h2>
                    <p className="text-slate-400 mb-6">
                        Browse available jobs and start building your anonymous reputation on AleoJob.
                    </p>
                    <Link to="/jobs">
                        <Button variant="primary">
                            Browse Jobs
                        </Button>
                    </Link>
                </Card>
            </motion.div>
        </div>
    );
}

export default Seeker;
