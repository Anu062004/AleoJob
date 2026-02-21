import { Link, useLocation } from 'react-router-dom';
import ConnectWallet from './ConnectWallet';
import { useState, useEffect } from 'react';

function Header() {
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();
    const isHome = location.pathname === '/';

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header
            className="sticky top-0 z-50 transition-all duration-300"
            style={{
                background: scrolled ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.99)',
                backdropFilter: 'blur(16px)',
                borderBottom: scrolled ? '1px solid #f1f5f9' : '1px solid transparent',
                boxShadow: scrolled ? '0 1px 20px rgba(0,0,0,0.06)' : 'none',
            }}
        >
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                        <span className="text-white text-xs font-bold">AJ</span>
                    </div>
                    <span className="text-lg font-extrabold text-gray-900">AleoJob</span>
                </Link>

                {/* Nav */}
                <nav className="hidden md:flex items-center gap-7">
                    {[
                        { label: 'Find Jobs', to: '/jobs' },
                        { label: 'Opportunities', to: '/jobs' },
                        { label: 'Leaderboard', to: '/leaderboard' },
                        { label: 'Seeker', to: '/seeker' },
                        { label: 'Giver', to: '/giver' },
                    ].map(link => (
                        <Link
                            key={link.label}
                            to={link.to}
                            className="text-sm font-medium transition-colors"
                            style={{ color: location.pathname === link.to ? '#6366f1' : '#4b5563' }}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <ConnectWallet />
                </div>
            </div>
        </header>
    );
}

export default Header;
