'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectWalletButton } from './ConnectWalletButton';

export function Header() {
  const pathname = usePathname();

  // Don't show the new navbar on landing page, it's already in page.tsx
  if (pathname === '/') {
    return null;
  }

  const navLinks = [
    { href: '/jobs', label: 'Browse Jobs' },
    { href: '/leaderboard', label: 'Leaderboard' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200" style={{ height: '72px' }}>
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-gray-900">
          AleoJob
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
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
    </header>
  );
}
