import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Users, FileText, DollarSign, X, Loader2, Plus, ChevronDown, ChevronUp, Lock, Unlock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { transferCredits } from '../lib/credit-transfer';
import { createSupabaseClientWithToken } from '@/lib/supabaseClient';
import { EscrowStatusBadge } from '@/components/escrow/EscrowStatusBadge';
import { EscrowActionPanel } from '@/components/escrow/EscrowActionPanel';

interface Application {
    id: string;
    seeker_id: string;
    status: string;
    created_at: string;
    seeker?: {
        aleo_address: string;
        name: string | null;
        skills: string[];
        profile_score: number;
    };
}

interface Escrow {
    id: string;
    status: 'locked' | 'released' | 'refunded';
    amount: number;
    create_tx?: string;
    release_tx?: string;
    refund_tx?: string;
}

interface Job {
    id: string;
    title: string;
    description: string;
    skills: string[];
    budget: string;
    is_active: boolean;
    created_at: string;
    payment_status?: 'pending' | 'locked' | 'completed' | 'refunded';
    applications?: Application[];
    escrows?: Escrow[];
}

function Giver() {
    const { connected, address, executeTransaction } = useWallet();
    const [showForm, setShowForm] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [fetchingJobs, setFetchingJobs] = useState(true);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        skills: '',
        budgetMin: '',
        budgetMax: '',
    });

    const [countdown, setCountdown] = useState(0);
    const [delayStatus, setDelayStatus] = useState<string | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

    const toggleJobExpanded = (jobId: string) => {
        setExpandedJobs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(jobId)) {
                newSet.delete(jobId);
            } else {
                newSet.add(jobId);
            }
            return newSet;
        });
    };

    const updateApplicationStatus = async (applicationId: string, newStatus: 'accepted' | 'rejected') => {
        if (!address) return;

        // For rejected, use old method
        if (newStatus === 'rejected') {
            try {
                const client = createSupabaseClientWithToken(address);
                const { error } = await client
                    .from('applications')
                    .update({ status: newStatus })
                    .eq('id', applicationId);

                if (error) throw error;

                setJobs(prevJobs => prevJobs.map(job => ({
                    ...job,
                    applications: job.applications?.map(app =>
                        app.id === applicationId ? { ...app, status: newStatus } : app
                    )
                })));

                alert(`Application ${newStatus}`);
            } catch (error: any) {
                console.error('Failed to update application:', error);
                alert(`Failed to update: ${error.message}`);
            }
            return;
        }

        // For accepted, use new API route that creates escrow
        try {
            // Prompt for private key (temporary - in production, use wallet signing)
            const privateKey = prompt(
                'Enter your Aleo private key to create escrow:\n\n' +
                '⚠️ This is temporary. In production, this will use wallet signing.'
            );

            if (!privateKey) {
                alert('Private key required to create escrow');
                return;
            }

            // Find the job and application to get amount
            const jobWithApp = jobs.find(job => 
                job.applications?.some(app => app.id === applicationId)
            );
            const application = jobWithApp?.applications?.find(app => app.id === applicationId);

            if (!jobWithApp || !application) {
                alert('Job or application not found');
                return;
            }

            // Parse amount from budget (e.g., "100-200 credits" -> 150)
            let amount: number | undefined;
            if (jobWithApp.budget) {
                const numbers = jobWithApp.budget.match(/\d+/g);
                if (numbers && numbers.length > 0) {
                    // Use average if range, or first number if single
                    if (numbers.length >= 2) {
                        amount = (parseInt(numbers[0]) + parseInt(numbers[1])) / 2;
                    } else {
                        amount = parseInt(numbers[0]);
                    }
                }
            }

            if (!amount) {
                const amountInput = prompt('Enter payment amount (credits):');
                if (!amountInput) {
                    alert('Amount required to create escrow');
                    return;
                }
                amount = parseFloat(amountInput);
            }

            // Call the new API route
            console.log('[Frontend] Accepting application and creating escrow:', {
                applicationId,
                amount,
                aleoAddress: address?.substring(0, 20) + '...',
            });

            let response: Response;
            try {
                response = await fetch('/api/jobs/accept', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        applicationId,
                        employerPrivateKey: privateKey,
                        aleoAddress: address,
                        amount,
                    }),
                });
            } catch (fetchError: any) {
                // Network error (server not running, CORS, etc.)
                const networkError = fetchError?.message || fetchError?.toString() || 'Network error: Could not connect to server';
                console.error('[Frontend] Network error:', networkError);
                throw new Error(`Network error: ${networkError}. Make sure the backend server is running on port 3001.`);
            }

            // Read response body only once
            let data: any;
            const contentType = response.headers.get('content-type');
            
            try {
                if (contentType && contentType.includes('application/json')) {
                    // Response is JSON
                    data = await response.json();
                } else {
                    // Response is not JSON, read as text
                    const text = await response.text();
                    console.error('[Frontend] Non-JSON response:', text);
                    throw new Error(`Server error: ${response.status} ${response.statusText}. ${text || ''}`);
                }
            } catch (parseError: any) {
                // JSON parsing error
                console.error('[Frontend] Failed to parse response:', parseError);
                throw new Error(`Failed to parse server response: ${parseError?.message || 'Invalid JSON'}`);
            }

            // Check if response is OK
            if (!response.ok) {
                // Backend returns 'message' field, not 'error'
                let errorMessage = data?.message || data?.error;
                
                // If no message in data, try to extract from data itself
                if (!errorMessage && data) {
                    if (typeof data === 'string') {
                        errorMessage = data;
                    } else if (typeof data === 'object') {
                        errorMessage = JSON.stringify(data);
                    }
                }
                
                // Fallback to status text
                if (!errorMessage) {
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }
                
                console.error('[Frontend] API error response:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorMessage,
                    data,
                });
                throw new Error(errorMessage);
            }

            // Check success flag
            if (!data || !data.success) {
                // Backend returns 'message' field, not 'error'
                let errorMessage = data?.message || data?.error;
                
                // If no message, try to extract from data
                if (!errorMessage && data) {
                    if (typeof data === 'string') {
                        errorMessage = data;
                    } else if (typeof data === 'object') {
                        errorMessage = JSON.stringify(data);
                    }
                }
                
                // Fallback
                if (!errorMessage) {
                    errorMessage = 'Failed to accept application';
                }
                
                console.error('[Frontend] API returned success=false:', data);
                throw new Error(errorMessage);
            }

            console.log('[Frontend] Application accepted successfully:', {
                applicationId: data.application?.id,
                escrowId: data.escrow?.id,
                transactionId: data.escrow?.transactionId,
            });

            // Refresh jobs to get updated escrow info
            await fetchJobs();

            alert(
                `✅ Application accepted!\n\n` +
                `Escrow created: ${data.escrow?.id || 'N/A'}\n` +
                `Transaction: ${data.escrow?.transactionId || 'N/A'}`
            );
        } catch (error: any) {
            // Extract error message from various error formats
            let errorMessage = 'Unknown error occurred';
            
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else if (error && typeof error === 'object') {
                // Try various properties that might contain the error message
                errorMessage = error.message || error.error || error.msg || error.toString();
            }
            
            // If still no message, try to stringify the error
            if (!errorMessage || errorMessage === '[object Object]' || errorMessage === 'Object') {
                try {
                    errorMessage = JSON.stringify(error);
                } catch {
                    errorMessage = String(error);
                }
            }
            
            console.error('[Frontend] Failed to accept application:', {
                error: errorMessage,
                originalError: error,
                stack: error?.stack,
                name: error?.name,
            });
            
            alert(`❌ Failed to accept application: ${errorMessage}`);
        }
    };

    useEffect(() => {
        if (connected && address) {
            fetchJobs();
        }
    }, [connected, address]);

    useEffect(() => {
        if (countdown > 0) {
            timerRef.current = setTimeout(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        } else if (countdown === 0 && delayStatus === 'Generating ZK Proof') {
            setDelayStatus('Finalizing...');
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [countdown, delayStatus]);

    const fetchJobs = async () => {
        if (!address) return;
        try {
            setFetchingJobs(true);
            const client = createSupabaseClientWithToken(address);

            const { data: user, error: userError } = await client
                .from('profiles')
                .select('id')
                .eq('aleo_address', address)
                .single();

            if (userError && userError.code === 'PGRST116') {
                setJobs([]);
            } else if (userError) {
                throw userError;
            } else {
                const { data: jobsData, error: jobsError } = await client
                    .from('jobs')
                    .select(`
                        *,
                        applications (
                            id,
                            seeker_id,
                            status,
                            created_at,
                            seeker:profiles!applications_seeker_id_fkey (
                                aleo_address,
                                name,
                                skills,
                                profile_score
                            )
                        ),
                        escrows (
                            id,
                            status,
                            amount,
                            create_tx,
                            release_tx,
                            refund_tx
                        )
                    `)
                    .eq('giver_id', user.id)
                    .order('created_at', { ascending: false });

                if (jobsError) throw jobsError;
                setJobs(jobsData || []);
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
        } finally {
            setFetchingJobs(false);
        }
    };

    if (!connected) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <Card padding="lg" className="max-w-md w-full text-center">
                    <h1 className="text-xl font-semibold text-text-primary mb-2">Giver Dashboard</h1>
                    <p className="text-text-secondary">Connect your wallet to access the dashboard.</p>
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

        if (!formData.title.trim() || !formData.description.trim()) {
            alert('Please fill in required fields');
            return;
        }

        const budgetMin = parseInt(formData.budgetMin);
        const budgetMax = parseInt(formData.budgetMax);

        if (isNaN(budgetMin) || isNaN(budgetMax)) {
            alert('Please fill in budgets with valid numbers');
            return;
        }

        const confirmed = window.confirm(
            `Posting this job will deduct 3 Aleo credits.\n\n` +
            `Title: ${formData.title}\n` +
            `Budget: ${budgetMin} - ${budgetMax} credits\n\n` +
            `ZK proof generation takes approximately 2 minutes.\nContinue?`
        );

        if (!confirmed) return;

        setIsProcessing(true);

        try {
            setDelayStatus('Deducting Credits...');
            const creditResult = await transferCredits(executeTransaction, address, true);

            if (!creditResult.success) {
                throw new Error(creditResult.error || 'Failed to deduct credits');
            }

            setDelayStatus('Generating ZK Proof');
            setCountdown(50);

            await new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    setCountdown((currentCountdown) => {
                        if (currentCountdown <= 0) {
                            clearInterval(checkInterval);
                            resolve(true);
                        }
                        return currentCountdown;
                    });
                }, 1000);
            });

            setDelayStatus('Saving...');

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

            const budget = `${budgetMin}-${budgetMax} credits`;
            const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(s => s.length > 0);
            const zkHash = creditResult.transactionId || `zk_${Date.now()}`;

            const { data: newJob, error: jobError } = await client
                .from('jobs')
                .insert({
                    giver_id: userId,
                    title: formData.title.trim(),
                    description: formData.description.trim(),
                    skills: skillsArray,
                    budget: budget,
                    is_active: true,
                    zk_membership_hash: zkHash,
                })
                .select()
                .single();

            if (jobError) throw jobError;

            alert('Job posted successfully!');

            setJobs([newJob, ...jobs]);
            setFormData({
                title: '',
                description: '',
                skills: '',
                budgetMin: '',
                budgetMax: '',
            });
            setShowForm(false);
        } catch (error: any) {
            console.error('Failed to post job:', error);
            alert(`Failed to post job: ${error.message || 'Unknown error'}`);
        } finally {
            setIsProcessing(false);
            setDelayStatus(null);
            setCountdown(0);
        }
    };

    const activeJobsCount = jobs.filter(j => j.is_active).length;
    const totalApplications = jobs.reduce((sum, job) => sum + (job.applications?.length || 0), 0);

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-semibold text-text-primary mb-1">Giver Dashboard</h1>
                        <p className="text-text-muted text-sm font-mono">{address?.slice(0, 12)}...</p>
                    </div>
                    <Button
                        variant={showForm ? 'secondary' : 'primary'}
                        onClick={() => setShowForm(!showForm)}
                        disabled={isProcessing}
                    >
                        {showForm ? (
                            <>
                                <X className="mr-2" size={16} />
                                Cancel
                            </>
                        ) : (
                            <>
                                <Plus className="mr-2" size={16} />
                                Post Job
                            </>
                        )}
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                    <Card padding="md">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-surface-elevated rounded-lg flex items-center justify-center">
                                <FileText className="text-aleo-purple" size={18} />
                            </div>
                            <div>
                                <p className="text-text-muted text-sm">Active Jobs</p>
                                <p className="text-xl font-semibold text-text-primary">{activeJobsCount}</p>
                            </div>
                        </div>
                    </Card>

                    <Card padding="md">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-surface-elevated rounded-lg flex items-center justify-center">
                                <Users className="text-status-success" size={18} />
                            </div>
                            <div>
                                <p className="text-text-muted text-sm">Applications</p>
                                <p className="text-xl font-semibold text-text-primary">{totalApplications}</p>
                            </div>
                        </div>
                    </Card>

                    <Card padding="md">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-surface-elevated rounded-lg flex items-center justify-center">
                                <DollarSign className="text-status-warning" size={18} />
                            </div>
                            <div>
                                <p className="text-text-muted text-sm">Total Posted</p>
                                <p className="text-xl font-semibold text-text-primary">{jobs.length}</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Post Job Form */}
                {showForm && (
                    <Card padding="lg" className="mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-medium text-text-primary">Post a New Job</h2>
                            {isProcessing && (
                                <Badge variant="purple">
                                    {countdown > 0 ? `${countdown}s` : delayStatus}
                                </Badge>
                            )}
                        </div>

                        {isProcessing && countdown > 0 && (
                            <div className="mb-6 bg-surface-elevated rounded-lg p-4">
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-text-secondary">Generating ZK Proof</span>
                                    <span className="text-aleo-purple font-mono">{countdown}s</span>
                                </div>
                                <div className="h-1 bg-surface-hover rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-aleo-purple transition-all duration-1000"
                                        style={{ width: `${((50 - countdown) / 50) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <form onSubmit={handlePostJob} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">Job Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border transition-colors focus:outline-none"
                                    placeholder="e.g. Frontend Developer"
                                    disabled={isProcessing}
                                    style={{ 
                                        backgroundColor: '#1A1A24',
                                        color: '#F8FAFC',
                                        borderColor: 'rgba(255, 255, 255, 0.08)'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.3)'}
                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">Description</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border transition-colors focus:outline-none resize-none"
                                    placeholder="Describe the job requirements..."
                                    disabled={isProcessing}
                                    style={{ 
                                        backgroundColor: '#1A1A24',
                                        color: '#F8FAFC',
                                        borderColor: 'rgba(255, 255, 255, 0.08)'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.3)'}
                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">Skills (comma-separated)</label>
                                <input
                                    type="text"
                                    value={formData.skills}
                                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border transition-colors focus:outline-none"
                                    placeholder="React, TypeScript, Leo"
                                    disabled={isProcessing}
                                    style={{ 
                                        backgroundColor: '#1A1A24',
                                        color: '#F8FAFC',
                                        borderColor: 'rgba(255, 255, 255, 0.08)'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.3)'}
                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-2">Min Budget</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={formData.budgetMin}
                                        onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border transition-colors focus:outline-none"
                                        disabled={isProcessing}
                                        style={{ 
                                            backgroundColor: '#1A1A24',
                                            color: '#F8FAFC',
                                            borderColor: 'rgba(255, 255, 255, 0.08)'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.3)'}
                                        onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-2">Max Budget</label>
                                    <input
                                        type="number"
                                        required
                                        min={formData.budgetMin || 1}
                                        value={formData.budgetMax}
                                        onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border transition-colors focus:outline-none"
                                        disabled={isProcessing}
                                        style={{ 
                                            backgroundColor: '#1A1A24',
                                            color: '#F8FAFC',
                                            borderColor: 'rgba(255, 255, 255, 0.08)'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.3)'}
                                        onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={isProcessing}
                                    className="flex-1"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="mr-2 animate-spin" size={16} />
                                            {countdown > 0 ? `ZK Proof (${countdown}s)` : delayStatus || 'Processing...'}
                                        </>
                                    ) : (
                                        'Post Job (3 credits)'
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setShowForm(false)}
                                    disabled={isProcessing}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </Card>
                )}

                {/* Jobs List */}
                {fetchingJobs ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="animate-spin text-aleo-purple" size={24} />
                        <span className="ml-3 text-text-secondary">Loading jobs...</span>
                    </div>
                ) : jobs.length === 0 && !showForm ? (
                    <Card padding="lg" className="text-center">
                        <p className="text-text-muted">No jobs posted yet. Click "Post Job" to get started.</p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {jobs.map(job => (
                            <Card key={job.id} padding="none">
                                <div className="p-5">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-medium text-text-primary mb-1">{job.title}</h3>
                                            <p className="text-text-secondary text-sm mb-3 line-clamp-2">{job.description}</p>

                                            {job.skills.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mb-3">
                                                    {job.skills.slice(0, 4).map(skill => (
                                                        <Badge key={skill} variant="muted" size="sm">{skill}</Badge>
                                                    ))}
                                                    {job.skills.length > 4 && (
                                                        <Badge variant="muted" size="sm">+{job.skills.length - 4}</Badge>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-4 text-sm text-text-muted">
                                                <span>{job.budget}</span>
                                                <span>{new Date(job.created_at).toLocaleDateString()}</span>
                                                <span>{job.applications?.length || 0} applicants</span>
                                            </div>

                                            {/* Escrow Status */}
                                            {job.escrows && job.escrows.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-border-subtle">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-text-muted">Escrow:</span>
                                                        <EscrowStatusBadge status={job.escrows[0].status} />
                                                        <span className="text-xs text-text-muted">
                                                            {job.escrows[0].amount} credits
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {job.payment_status && (
                                                <div className="mt-2">
                                                    <Badge variant={
                                                        job.payment_status === 'locked' ? 'warning' :
                                                        job.payment_status === 'completed' ? 'success' :
                                                        job.payment_status === 'refunded' ? 'destructive' : 'default'
                                                    }>
                                                        Payment: {job.payment_status}
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            <Badge variant={job.is_active ? 'success' : 'default'}>
                                                {job.is_active ? 'Active' : 'Closed'}
                                            </Badge>
                                            {(job.applications?.length || 0) > 0 && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleJobExpanded(job.id)}
                                                >
                                                    {expandedJobs.has(job.id) ? (
                                                        <>Hide <ChevronUp className="ml-1" size={14} /></>
                                                    ) : (
                                                        <>View <ChevronDown className="ml-1" size={14} /></>
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Applications */}
                                {expandedJobs.has(job.id) && job.applications && job.applications.length > 0 && (
                                    <div className="border-t border-border-subtle p-5 bg-surface-elevated/50">
                                        <h4 className="text-sm font-medium text-text-primary mb-3">
                                            Applications ({job.applications.length})
                                        </h4>
                                        <div className="space-y-3">
                                            {job.applications.map((app: Application) => (
                                                <div key={app.id} className="p-4 bg-surface-card rounded-xl border border-border-subtle">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-text-primary font-medium">
                                                                {app.seeker?.name || 'Anonymous'}
                                                            </p>
                                                            <p className="text-text-muted text-xs font-mono mb-2">
                                                                {app.seeker?.aleo_address?.slice(0, 12)}...
                                                            </p>
                                                            {app.seeker?.skills && app.seeker.skills.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mb-2">
                                                                    {app.seeker.skills.slice(0, 4).map((skill: string) => (
                                                                        <Badge key={skill} variant="muted" size="sm">{skill}</Badge>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <p className="text-text-muted text-xs">
                                                                Applied {new Date(app.created_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2">
                                                            <Badge variant={
                                                                app.status === 'accepted' ? 'success' :
                                                                    app.status === 'rejected' ? 'warning' : 'default'
                                                            }>
                                                                {app.status}
                                                            </Badge>
                                                            {app.seeker?.profile_score !== undefined && (
                                                                <span className="text-xs text-text-muted">
                                                                    Score: {app.seeker.profile_score}
                                                                </span>
                                                            )}
                                                            {app.status === 'pending' && (
                                                                <div className="flex gap-2 mt-1">
                                                                    <Button
                                                                        variant="primary"
                                                                        size="sm"
                                                                        onClick={() => updateApplicationStatus(app.id, 'accepted')}
                                                                    >
                                                                        Accept
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => updateApplicationStatus(app.id, 'rejected')}
                                                                    >
                                                                        Reject
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Escrow Action Panel for Accepted Jobs */}
                                {job.escrows && job.escrows.length > 0 && job.escrows[0].status === 'locked' && (
                                    <div className="border-t border-border-subtle p-5 bg-surface-elevated/50">
                                        <h4 className="text-sm font-medium text-text-primary mb-3">
                                            Payment Escrow
                                        </h4>
                                        <EscrowActionPanel
                                            escrowId={job.escrows[0].id}
                                            status={job.escrows[0].status}
                                            employerPrivateKey={''} // Will prompt when needed
                                            aleoAddress={address || ''}
                                            onStatusChange={async (newStatus) => {
                                                // Refresh jobs to get updated escrow status
                                                await fetchJobs();
                                            }}
                                        />
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Giver;
