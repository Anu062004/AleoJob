import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, ChevronDown, Copy, Check, LogOut } from 'lucide-react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';

function ConnectWallet() {
    const { address, connected, disconnect, wallet } = useWallet();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isDropdownOpen]);

    const handleCopyAddress = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const truncateAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    // Disconnected state - show connect button
    if (!connected || !address) {
        return (
            <>
                <WalletMultiButton className="wallet-adapter-button-trigger" />
            </>
        );
    }

    // Connected state - show address with dropdown
    return (
        <div className="relative" ref={dropdownRef}>
            <motion.button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="relative group px-5 py-2.5 rounded-xl font-semibold text-sm overflow-hidden focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                {/* Glassmorphism Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 backdrop-blur-md border border-purple-400/30 rounded-xl" />

                {/* Content */}
                <div className="relative flex items-center gap-3 text-white">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-400/50 animate-pulse" />
                        <span className="font-mono text-sm">{truncateAddress(address || '')}</span>
                    </div>
                    <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                    />
                </div>
            </motion.button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isDropdownOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute right-0 mt-3 w-72 z-50"
                    >
                        <div className="relative rounded-xl overflow-hidden backdrop-blur-xl border border-purple-500/20 shadow-2xl shadow-purple-900/30">
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 to-slate-800/95" />

                            <div className="relative">
                                {/* Header */}
                                <div className="px-4 pt-4 pb-3 border-b border-slate-700/50">
                                    <div className="flex items-center gap-2 text-sm text-slate-400 font-medium mb-2">
                                        <Wallet size={14} />
                                        <span>{wallet ? 'Wallet' : 'Wallet'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-400/50" />
                                        <span className="text-xs text-green-400 font-medium">Connected</span>
                                    </div>
                                </div>

                                {/* Address Section */}
                                <div className="p-4 space-y-3">
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">
                                            Address
                                        </p>
                                        <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/50 backdrop-blur-sm">
                                            <p className="text-xs font-mono text-slate-200 break-all leading-relaxed">
                                                {address}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-2 pt-2">
                                        <motion.button
                                            onClick={handleCopyAddress}
                                            whileHover={{ scale: 1.02, x: 2 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-700/60 rounded-lg transition-all duration-200 border border-transparent hover:border-purple-500/30 group"
                                        >
                                            <div className="p-1.5 bg-purple-500/10 rounded-md group-hover:bg-purple-500/20 transition-colors">
                                                {isCopied ? (
                                                    <Check size={14} className="text-green-400" />
                                                ) : (
                                                    <Copy size={14} className="text-purple-400" />
                                                )}
                                            </div>
                                            <span className="font-medium">
                                                {isCopied ? 'Address Copied!' : 'Copy Address'}
                                            </span>
                                        </motion.button>

                                        <motion.button
                                            onClick={disconnect}
                                            whileHover={{ scale: 1.02, x: 2 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/15 rounded-lg transition-all duration-200 border border-transparent hover:border-red-500/30 group"
                                        >
                                            <div className="p-1.5 bg-red-500/10 rounded-md group-hover:bg-red-500/20 transition-colors">
                                                <LogOut size={14} className="text-red-400" />
                                            </div>
                                            <span className="font-medium">Disconnect Wallet</span>
                                        </motion.button>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="px-4 py-3 bg-gradient-to-t from-slate-900/50 to-transparent border-t border-slate-700/30">
                                    <p className="text-xs text-slate-500 text-center">
                                        🔐 Your connection is secure
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default ConnectWallet;
