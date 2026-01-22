'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield } from 'lucide-react';
import { ConnectWalletButton } from './ConnectWalletButton';

export function Header() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/jobs', label: 'Browse Jobs' },
    { href: '/leaderboard', label: 'Leaderboard' },
  ];

  return (
    <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/30 sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 bg-gradient-to-br from-aleo-purple to-aleo-purple-light rounded-lg group-hover:scale-110 transition-transform">
              <Shield size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">AleoJob</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${pathname === link.href
                    ? 'text-aleo-purple-light'
                    : 'text-slate-400 hover:text-white'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <ConnectWalletButton />
          </div>
        </div>
      </div>
    </header>
  );
}







