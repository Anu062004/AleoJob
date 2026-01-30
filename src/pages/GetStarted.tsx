import { Link } from 'react-router-dom';
import { User, Briefcase, ArrowRight } from 'lucide-react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Button } from '../components/ui/Button';
import ConnectWallet from '../components/ConnectWallet';

function GetStarted() {
    const { connected } = useWallet();

    return (
        <div className="min-h-screen py-12">
            <div className="container mx-auto px-6 max-w-2xl">
                <div className="text-center mb-10">
                    <h1 className="text-2xl font-semibold text-white mb-2">Get Started</h1>
                    <p className="text-slate-500">Choose your role</p>
                </div>

                {!connected && (
                    <div className="mb-8 p-5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                        <p className="text-slate-400 mb-4">Connect wallet to continue</p>
                        <div className="flex justify-center">
                            <ConnectWallet />
                        </div>
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                    <div className={`p-6 rounded-xl bg-slate-900/50 border border-slate-800 ${!connected ? 'opacity-50 pointer-events-none' : 'hover:border-slate-700 transition-colors'}`}>
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
                                <User className="text-violet-400" size={20} />
                            </div>
                            <h2 className="text-white font-medium mb-2">Job Seeker</h2>
                            <p className="text-slate-500 text-sm mb-4">Find work, build reputation</p>
                            <ul className="text-left text-sm text-slate-500 space-y-2 mb-6">
                                <li>- Browse and apply</li>
                                <li>- Build anonymous reputation</li>
                                <li>- 1 credit access</li>
                            </ul>
                            <Link to="/seeker">
                                <Button variant="primary" className="w-full">
                                    Continue
                                    <ArrowRight className="ml-2" size={14} />
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className={`p-6 rounded-xl bg-slate-900/50 border border-slate-800 ${!connected ? 'opacity-50 pointer-events-none' : 'hover:border-slate-700 transition-colors'}`}>
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
                                <Briefcase className="text-violet-400" size={20} />
                            </div>
                            <h2 className="text-white font-medium mb-2">Job Giver</h2>
                            <p className="text-slate-500 text-sm mb-4">Post jobs, find talent</p>
                            <ul className="text-left text-sm text-slate-500 space-y-2 mb-6">
                                <li>- Post unlimited jobs</li>
                                <li>- Review applications</li>
                                <li>- 3 credits access</li>
                            </ul>
                            <Link to="/giver">
                                <Button variant="primary" className="w-full">
                                    Continue
                                    <ArrowRight className="ml-2" size={14} />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GetStarted;
