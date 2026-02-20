import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Menu, Shield, X } from 'lucide-react';
import { isOpsAdminAddress } from '@/lib/adminAccess';
import { WalletConnect } from './WalletConnect';
import { fetchMarketplaceProfile, type MarketplaceRole } from '@/lib/profileRole';

const baseLinks = [
  { to: '/jobs', label: 'Opportunities' },
  { to: '/leaderboard', label: 'Reputation' },
];

const roleLinks = {
  seeker: { to: '/seeker', label: 'Seeker' },
  giver: { to: '/giver', label: 'Giver' },
};

const unassignedLinks = [
  { to: '/seeker', label: 'Seeker' },
  { to: '/giver', label: 'Giver' },
];

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `text-sm transition-colors ${isActive ? 'text-brand-text' : 'text-brand-text-muted hover:text-brand-text'}`
      }
    >
      {label}
    </NavLink>
  );
}

export function NavBar() {
  const { address } = useWallet();
  const [open, setOpen] = useState(false);
  const [assignedRole, setAssignedRole] = useState<MarketplaceRole | null>(null);

  useEffect(() => {
    if (!address) {
      setAssignedRole(null);
      return;
    }

    void (async () => {
      try {
        const profile = await fetchMarketplaceProfile(address);
        setAssignedRole(profile?.role || null);
      } catch {
        setAssignedRole(null);
      }
    })();
  }, [address]);

  const links = useMemo(
    () => {
      const roleScopedLinks = assignedRole ? [roleLinks[assignedRole]] : unassignedLinks;
      const merged = [...baseLinks, ...roleScopedLinks];
      return isOpsAdminAddress(address) ? [...merged, { to: '/ops', label: 'Ops' }] : merged;
    },
    [address, assignedRole]
  );

  return (
    <header className="sticky top-0 z-50 border-b border-brand-border bg-brand-bg/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary text-brand-bg">
            <Shield size={15} />
          </span>
          <span className="text-lg font-semibold text-brand-text">AleoJob</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((item) => (
            <NavItem key={item.to} to={item.to} label={item.label} />
          ))}
        </nav>

        <div className="hidden md:block">
          <WalletConnect />
        </div>

        <button
          className="rounded-xl border border-brand-border p-2 text-brand-text md:hidden"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-brand-border md:hidden"
          >
            <div className="space-y-4 px-4 py-4">
              {links.map((item) => (
                <NavItem key={item.to} to={item.to} label={item.label} />
              ))}
              <WalletConnect />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
