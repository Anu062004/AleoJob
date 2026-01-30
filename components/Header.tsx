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
    <header className="border-b border-border-subtle bg-glass-elevated sticky top-0 z-50 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2 bg-gradient-to-br from-accent-primary to-accent-primary-hover rounded-xl group-hover:scale-105 transition-transform duration-200 shadow-lg shadow-accent-primary/20">
              <Shield size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-gradient tracking-tight">AleoJob</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors relative ${
                  pathname === link.href
                    ? 'text-accent-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {link.label}
                {pathname === link.href && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-accent-primary rounded-full" />
                )}
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







