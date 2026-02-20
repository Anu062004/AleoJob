import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { Check, ChevronDown, Copy, LogOut, Wallet } from 'lucide-react';

function shortAddress(address?: string | null): string {
  if (!address) return 'Unknown';
  return `${address.slice(0, 7)}...${address.slice(-5)}`;
}

export function WalletConnect() {
  const { connected, connecting, address, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', onOutsideClick);
      return () => document.removeEventListener('mousedown', onOutsideClick);
    }

    return undefined;
  }, [open]);

  const stateLabel = useMemo(() => {
    if (connecting) return 'Initializing';
    if (connected && address) return 'Wallet Active';
    return 'Protocol Locked';
  }, [address, connected, connecting]);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  if (!connected || !address) {
    return (
      <div className="flex flex-col items-end gap-1">
        <motion.button
          whileHover={{ scale: 1.02, boxShadow: '0 0 22px rgba(124, 92, 255, 0.28)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setVisible(true)}
          className="rounded-full border border-brand-primary/40 bg-gradient-to-r from-brand-primary/25 to-brand-secondary/20 px-4 py-2 text-sm font-semibold text-brand-text"
        >
          Initialize Wallet
        </motion.button>
        <div className="flex items-center gap-2 text-xs text-brand-text-muted">
          <span className="h-2 w-2 rounded-full bg-brand-primary/70 animate-pulse-soft" />
          {stateLabel}
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen((prev) => !prev)}
        className="glass-card flex items-center gap-3 rounded-full px-4 py-2 text-sm text-brand-text"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </span>
        <span className="font-mono">{shortAddress(address)}</span>
        <ChevronDown size={15} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </motion.button>

      <div className="mt-1 text-right text-xs text-brand-text-muted">{stateLabel}</div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="glass-card absolute right-0 z-50 mt-3 w-72 overflow-hidden rounded-2xl"
          >
            <div className="border-b border-brand-border px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-brand-text-muted">Connected Session</p>
              <p className="mt-2 break-all font-mono text-xs text-brand-text">{address}</p>
            </div>
            <div className="p-2">
              <button
                onClick={copyAddress}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-brand-text-muted transition-colors hover:bg-brand-surface-elevated hover:text-brand-text"
              >
                {copied ? <Check size={15} className="text-emerald-300" /> : <Copy size={15} />}
                {copied ? 'Address Copied' : 'Copy Address'}
              </button>
              <button
                onClick={() => {
                  setVisible(true);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-brand-text-muted transition-colors hover:bg-brand-surface-elevated hover:text-brand-text"
              >
                <Wallet size={15} />
                Switch Wallet
              </button>
              <button
                onClick={() => {
                  disconnect();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/10"
              >
                <LogOut size={15} />
                Disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
