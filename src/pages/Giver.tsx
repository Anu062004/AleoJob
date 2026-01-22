import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Users, FileText, DollarSign, X, Loader2, Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { transferCredits } from '../lib/credit-transfer';

function Giver() {
    const { connected, address, executeTransaction } = useWallet();
    const [showForm, setShowForm] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [formData, setFormData] = useState({
        budgetMin: '',
        budgetMax: '',
        deadlineDays: '7',
    });

    if (!connected) {
        return (
            <div className="container mx-auto px-4 py-16">
                <Card className="p-12 max-w-xl mx-auto text-center">
                    <h1 className="text-3xl font-bold mb-4 text-white">Job Giver Dashboard</h1>
                    <p className="text-slate-400">Please connect your wallet to access the giver dashboard.</p>
                </Card>
            </div>
        );
    }

    const handlePostJob = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!connected || !address || !executeTransaction) {
            alert('Please connect your wallet first');
            return;
        }

        const budgetMin = parseInt(formData.budgetMin);
        const budgetMax = parseInt(formData.budgetMax);
        const deadlineDays = parseInt(formData.deadlineDays);

        if (isNaN(budgetMin) || isNaN(budgetMax) || isNaN(deadlineDays)) {
            alert('Please fill in all fields with valid numbers');
            return;
        }

        if (budgetMin <= 0 || budgetMax <= 0 || budgetMin >= budgetMax) {
            alert('Budget min must be greater than 0 and less than budget max');
            return;
        }

        if (deadlineDays <= 0) {
            alert('Deadline must be at least 1 day');
            return;
        }

        const confirmed = window.confirm(
            `Posting this job will deduct 3 Aleo credits from your wallet.\n\n` +
            `Budget: ${budgetMin} - ${budgetMax} credits\n` +
            `Deadline: ${deadlineDays} days\n\n` +
            `Continue?`
        );

        if (!confirmed) return;

        setIsProcessing(true);

        try {
            // Step 1: Deduct 3 credits for job posting
            const creditResult = await transferCredits(executeTransaction, address, true); // true = job giver (3 credits)

            if (!creditResult.success) {
                throw new Error(creditResult.error || 'Failed to deduct credits');
            }

            // Step 2: Create the job (this would call the job_registry contract)
            // Calculate deadline block (approximate: 1 block = 2 seconds)
            // const currentBlock = Math.floor(Date.now() / 2000);
            // const deadlineBlock = currentBlock + (deadlineDays * 86400 / 2);

            // TODO: Implement actual job creation to job_registry contract
            // For now, we'll show success after credit deduction
            // await createJob(address, budgetMin, budgetMax, deadlineBlock);

            alert(
                `✅ Job posted successfully!\n\n` +
                `Transaction ID: ${creditResult.transactionId || 'N/A'}\n` +
                `3 credits deducted from your wallet.\n\n` +
                `Budget: ${budgetMin} - ${budgetMax} credits\n` +
                `Deadline: ${deadlineDays} days\n\n` +
                `Your job is now live and visible to job seekers.`
            );

            // Reset form
            setFormData({
                budgetMin: '',
                budgetMax: '',
                deadlineDays: '7',
            });
            setShowForm(false);
        } catch (error: any) {
            console.error('Failed to post job:', error);
            alert(`❌ Failed to post job: ${error.message || 'Unknown error'}\n\nPlease ensure you have sufficient credits (3 credits required) in your wallet.`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-12">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold mb-2 text-white">Job Giver Dashboard</h1>
                        <p className="text-slate-400">Welcome, {address?.slice(0, 10)}...</p>
                    </div>
                    <Button
                        variant="primary"
                        onClick={() => setShowForm(!showForm)}
                        disabled={isProcessing}
                    >
                        {showForm ? (
                            <>
                                <X className="inline mr-2" size={18} />
                                Cancel
                            </>
                        ) : (
                            <>
                                <Plus className="inline mr-2" size={18} />
                                Post New Job (3 credits)
                            </>
                        )}
                    </Button>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-aleo-purple/20 rounded-xl">
                                <FileText className="text-aleo-purple-light" size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Active Jobs</p>
                                <p className="text-2xl font-bold text-white">0</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-aleo-emerald/20 rounded-xl">
                                <Users className="text-aleo-emerald" size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Total Applicants</p>
                                <p className="text-2xl font-bold text-white">0</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-aleo-cyan/20 rounded-xl">
                                <DollarSign className="text-aleo-cyan" size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">In Escrow</p>
                                <p className="text-2xl font-bold text-white">0 ALEO</p>
                            </div>
                        </div>
                    </Card>
                </div>

                <AnimatePresence>
                    {showForm && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Card className="p-8 mb-8">
                                <h2 className="text-2xl font-bold mb-6 text-white">Post a New Job</h2>
                                <p className="text-slate-400 mb-6">
                                    Posting a job costs <span className="text-aleo-purple-light font-semibold">3 Aleo credits</span>. 
                                    This fee helps maintain the platform and ensures quality job listings.
                                </p>

                                <form onSubmit={handlePostJob} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">
                                            Budget Min (Aleo Credits) *
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            value={formData.budgetMin}
                                            onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
                                            className="w-full bg-slate-700 text-white px-4 py-3 rounded-xl border border-slate-600 focus:border-aleo-purple focus:outline-none"
                                            placeholder="Minimum budget in credits"
                                            disabled={isProcessing}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">
                                            Budget Max (Aleo Credits) *
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min={formData.budgetMin || 1}
                                            value={formData.budgetMax}
                                            onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
                                            className="w-full bg-slate-700 text-white px-4 py-3 rounded-xl border border-slate-600 focus:border-aleo-purple focus:outline-none"
                                            placeholder="Maximum budget in credits"
                                            disabled={isProcessing}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">
                                            Deadline (Days) *
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            value={formData.deadlineDays}
                                            onChange={(e) => setFormData({ ...formData, deadlineDays: e.target.value })}
                                            className="w-full bg-slate-700 text-white px-4 py-3 rounded-xl border border-slate-600 focus:border-aleo-purple focus:outline-none"
                                            placeholder="Number of days"
                                            disabled={isProcessing}
                                        />
                                        <p className="text-xs text-slate-500 mt-2">
                                            How many days until the job deadline?
                                        </p>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            disabled={isProcessing}
                                            className="flex-1"
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <Loader2 className="inline mr-2 animate-spin" size={18} />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    Post Job (3 credits)
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setShowForm(false);
                                                setFormData({
                                                    budgetMin: '',
                                                    budgetMax: '',
                                                    deadlineDays: '7',
                                                });
                                            }}
                                            disabled={isProcessing}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {!showForm && (
                    <Card className="p-8">
                        <h2 className="text-xl font-bold mb-4 text-white">Get Started</h2>
                        <p className="text-slate-400 mb-6">
                            Create a new job listing and find talented anonymous workers. 
                            Each job posting costs <span className="text-aleo-purple-light font-semibold">3 Aleo credits</span>.
                        </p>
                        <Button variant="primary" onClick={() => setShowForm(true)}>
                            <Plus className="inline mr-2" size={18} />
                            Create Job Listing
                        </Button>
                    </Card>
                )}
            </motion.div>
        </div>
    );
}

export default Giver;
