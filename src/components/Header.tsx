import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import ConnectWallet from './ConnectWallet';

function Header() {
    return (
        <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
            <div className="container mx-auto px-6 h-14 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
                        <Shield size={14} className="text-white" />
                    </div>
                    <span className="font-semibold text-white">AleoJob</span>
                </Link>

                <nav className="hidden md:flex items-center gap-8">
                    <Link to="/jobs" className="text-sm text-slate-400 hover:text-white transition-colors">
                        Jobs
                    </Link>
                    <Link to="/leaderboard" className="text-sm text-slate-400 hover:text-white transition-colors">
                        Leaderboard
                    </Link>
                </nav>

                <ConnectWallet />
            </div>
        </header>
    );
}

export default Header;
