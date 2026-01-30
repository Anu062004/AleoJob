import { useEffect, useState } from 'react';
import { Clock, DollarSign, Star, Loader2, Search } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { transferCredits } from '../lib/credit-transfer';
import { supabase, createSupabaseClientWithToken } from '@/lib/supabaseClient';

interface Job {
    id: string;
    title: string;
    description: string;
    skills: string[];
    budget: string | null;
    createdAt: string;
    giverReputation: number;
}

function Jobs() {
    const { connected, address, executeTransaction } = useWallet();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingJobId, setProcessingJobId] = useState<string | null>(null);
    const [hasPaid, setHasPaid] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('jobs')
                .select(`
                    id, title, description, skills, budget, is_active, created_at,
                    giver:profiles (profile_score)
                `)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formattedJobs = data?.map((job: any) => ({
                id: job.id,
                title: job.title,
                description: job.description,
                skills: job.skills || [],
                budget: job.budget,
                createdAt: job.created_at,
                giverReputation: job.giver?.profile_score || 0,
            })) || [];

            setJobs(formattedJobs);
        } catch (error) {
            console.error('Error fetching jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!address) {
            setHasPaid(false);
            return;
        }
        const key = `payment_job_seeker_${address}`;
        setHasPaid(localStorage.getItem(key) === 'paid');
    }, [address]);

    const handlePayToBrowse = async () => {
        if (!connected || !address || !executeTransaction) return;

        const confirmed = window.confirm('Pay 1 Aleo credit to browse and apply to jobs?');
        if (!confirmed) return;

        setIsPaying(true);
        try {
            const res = await transferCredits(executeTransaction, address, false);
            if (!res.success) throw new Error(res.error || 'Payment failed');

            localStorage.setItem(`payment_job_seeker_${address}`, 'paid');
            setHasPaid(true);
            alert('Payment successful! You can now browse and apply to jobs.');
        } catch (e: any) {
            alert(`Payment failed: ${e.message}`);
        } finally {
            setIsPaying(false);
        }
    };

    const handleApply = async (jobId: string) => {
        if (!connected || !address || !hasPaid) return;

        setProcessingJobId(jobId);
        try {
            const client = createSupabaseClientWithToken(address);

            let userId: string;
            const { data: user, error: userError } = await client
                .from('profiles')
                .select('id')
                .eq('aleo_address', address)
                .single();

            if (userError && userError.code === 'PGRST116') {
                const { data: newUser, error: createError } = await client
                    .from('profiles')
                    .insert({ aleo_address: address })
                    .select('id')
                    .single();
                if (createError) throw createError;
                userId = newUser.id;
            } else if (userError) {
                throw userError;
            } else {
                userId = user.id;
            }

            const { error: appError } = await client
                .from('applications')
                .insert({
                    job_id: jobId,
                    seeker_id: userId,
                    zk_application_hash: `zk_app_${Date.now()}`,
                    status: 'pending'
                });

            if (appError?.code === '23505') {
                alert('You have already applied for this job.');
            } else if (appError) {
                throw appError;
            } else {
                alert('Application submitted!');
            }
        } catch (error: any) {
            alert(`Failed to apply: ${error.message}`);
        } finally {
            setProcessingJobId(null);
        }
    };

    const filteredJobs = jobs.filter(job =>
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (dateString: string) => {
        const days = Math.floor((Date.now() - new Date(dateString).getTime()) / 86400000);
        if (days === 0) return 'Today';
        if (days === 1) return '1d ago';
        if (days < 7) return `${days}d ago`;
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="min-h-screen py-8">
            <div className="container mx-auto px-6 max-w-4xl">
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-white mb-1">Jobs</h1>
                    <p className="text-slate-500">Find privacy-preserving opportunities</p>
                </div>

                {/* Payment gate */}
                {connected && !hasPaid && (
                    <div className="mb-6 p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div>
                            <p className="text-white font-medium">Access required</p>
                            <p className="text-slate-500 text-sm">Pay 1 credit to apply</p>
                        </div>
                        <Button variant="primary" onClick={handlePayToBrowse} disabled={isPaying}>
                            {isPaying ? <Loader2 className="animate-spin" size={16} /> : 'Pay 1 Credit'}
                        </Button>
                    </div>
                )}

                {/* Search */}
                <div className="mb-6">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-900 border border-slate-800 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50"
                        />
                    </div>
                </div>

                {/* Jobs list */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="animate-spin text-violet-500" size={20} />
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">No jobs found</div>
                ) : (
                    <div className="space-y-3">
                        {filteredJobs.map((job) => (
                            <div key={job.id} className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-white font-medium mb-1">{job.title}</h2>
                                        <p className="text-slate-500 text-sm mb-3 line-clamp-2">{job.description}</p>

                                        {job.skills.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                {job.skills.slice(0, 4).map((skill) => (
                                                    <span key={skill} className="px-2 py-0.5 text-xs rounded bg-slate-800 text-slate-400">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            {job.budget && (
                                                <span className="flex items-center gap-1">
                                                    <DollarSign size={12} />
                                                    {job.budget}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {formatDate(job.createdAt)}
                                            </span>
                                            {job.giverReputation > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <Star size={12} />
                                                    {job.giverReputation}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <Button
                                        variant="primary"
                                        size="sm"
                                        disabled={!connected || !hasPaid || processingJobId === job.id}
                                        onClick={() => handleApply(job.id)}
                                    >
                                        {processingJobId === job.id ? <Loader2 className="animate-spin" size={14} /> : 'Apply'}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Jobs;
