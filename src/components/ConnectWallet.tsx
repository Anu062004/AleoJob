import { useState, useRef, useEffect } from 'react';
import { Wallet, ChevronDown, Copy, Check, LogOut } from 'lucide-react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';

function ConnectWallet() {
    const { address, connected, disconnect } = useWallet();
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const copyAddress = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!connected || !address) {
        return <WalletMultiButton className="wallet-adapter-button-trigger" />;
    }

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-brand-surface border border-brand-border text-brand-text hover:bg-brand-surface-elevated transition-colors"
            >
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="font-mono text-xs">{address.slice(0, 6)}...{address.slice(-4)}</span>
                <ChevronDown size={14} className={`text-brand-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-brand-border rounded-xl shadow-card-soft z-50">
                    <div className="p-3 border-b border-brand-border">
                        <div className="flex items-center gap-2 text-xs text-brand-text-muted mb-1">
                            <Wallet size={12} />
                            Connected
                        </div>
                    </div>

                    <div className="p-3">
                        <p className="text-xs text-brand-text-muted mb-1.5">Address</p>
                        <div className="p-2 bg-brand-surface rounded text-xs font-mono text-brand-text break-all">
                            {address}
                        </div>
                    </div>

                    <div className="px-3 pb-3 space-y-1.5">
                        <button
                            onClick={copyAddress}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-text hover:bg-brand-surface rounded-lg transition-colors"
                        >
                            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                        <button
                            onClick={disconnect}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <LogOut size={14} />
                            Disconnect
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ConnectWallet;
