import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Briefcase, Star, Loader2, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CVUpload } from '@/components/CVUpload';
import { ProfileEditor } from '@/components/ProfileEditor';
import { createSupabaseClientWithToken } from '@/lib/supabaseClient';

function Seeker() {
    const { connected, address } = useWallet();
    const [loading, setLoading] = useState(true);
    const [reputation, setReputation] = useState(0);
    const [profile, setProfile] = useState<any>(null);
    const [applications, setApplications] = useState<any[]>([]);
    const [completedJobsCount, setCompletedJobsCount] = useState(0);

    useEffect(() => {
        if (connected && address) {
            fetchData();
        }
    }, [connected, address]);

    const fetchData = async () => {
        if (!address) return;
        try {
            setLoading(true);
            const client = createSupabaseClientWithToken(address);

            const { data: userData, error: userError } = await client
                .from('profiles')
                .select('*')
                .eq('aleo_address', address)
                .single();

            if (userError && userError.code !== 'PGRST116') {
                console.error('Error fetching profile:', userError);
            } else if (userData) {
                setProfile(userData);
                setReputation(userData.profile_score || 0);

                const { data: appsData, error: appsError } = await client
                    .from('applications')
                    .select(`
                        id,
                        status,
                        created_at,
                        job:jobs (
                            title
                        )
                    `)
                    .order('created_at', { ascending: false });

                if (appsError) {
                    console.error('Error fetching applications:', appsError);
                } else {
                    setApplications(appsData || []);
                    setCompletedJobsCount(appsData?.filter((a: any) => a.status === 'accepted').length || 0);
                }
            }
        } catch (error) {
            console.error('Error in Seeker Dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'accepted':
                return <Badge variant="success">Accepted</Badge>;
            case 'rejected':
                return <Badge variant="warning">Rejected</Badge>;
            default:
                return <Badge variant="default">Pending</Badge>;
        }
    };

    if (!connected) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <Card padding="lg" className="max-w-md w-full text-center">
                    <h1 className="text-xl font-semibold text-text-primary mb-2">Seeker Dashboard</h1>
                    <p className="text-text-secondary">Connect your wallet to access the dashboard.</p>
                </Card>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-aleo-purple" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-text-primary mb-1">Seeker Dashboard</h1>
                    <p className="text-text-secondary text-sm">Manage your profile and applications</p>
                </div>

                {/* Stats */}
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                    <Card padding="md">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-surface-elevated rounded-lg flex items-center justify-center">
                                <Briefcase className="text-aleo-purple" size={18} />
                            </div>
                            <div>
                                <p className="text-text-muted text-sm">Applications</p>
                                <p className="text-xl font-semibold text-text-primary">{applications.length}</p>
                            </div>
                        </div>
                    </Card>

                    <Card padding="md">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-surface-elevated rounded-lg flex items-center justify-center">
                                <CheckCircle className="text-status-success" size={18} />
                            </div>
                            <div>
                                <p className="text-text-muted text-sm">Completed</p>
                                <p className="text-xl font-semibold text-text-primary">{completedJobsCount}</p>
                            </div>
                        </div>
                    </Card>

                    <Card padding="md">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-surface-elevated rounded-lg flex items-center justify-center">
                                <Star className="text-status-warning" size={18} />
                            </div>
                            <div>
                                <p className="text-text-muted text-sm">Reputation</p>
                                <p className="text-xl font-semibold text-text-primary">{reputation}/100</p>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Applications */}
                    <div className="lg:col-span-2 space-y-4">
                        <Card padding="md">
                            <h2 className="text-lg font-medium text-text-primary mb-4">Your Applications</h2>
                            {applications.length > 0 ? (
                                <div className="space-y-3">
                                    {applications.map((app) => (
                                        <div
                                            key={app.id}
                                            className="p-4 bg-surface-elevated rounded-xl border border-border-subtle flex items-center justify-between"
                                        >
                                            <div>
                                                <h3 className="text-text-primary font-medium mb-1">
                                                    {app.job?.title || 'Unknown Job'}
                                                </h3>
                                                <p className="text-text-muted text-sm">
                                                    Applied {new Date(app.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            {getStatusBadge(app.status)}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-text-muted mb-4">No applications yet</p>
                                    <Link to="/jobs">
                                        <Button variant="primary" size="sm">
                                            Browse Jobs
                                            <ArrowRight className="ml-2" size={14} />
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </Card>

                        {/* Quick Action */}
                        <Card padding="md">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-text-primary font-medium mb-1">Find Work</h2>
                                    <p className="text-text-muted text-sm">Browse available opportunities</p>
                                </div>
                                <Link to="/jobs">
                                    <Button variant="secondary" size="sm">
                                        Browse Jobs
                                    </Button>
                                </Link>
                            </div>
                        </Card>
                    </div>

                    {/* Profile & CV */}
                    <div className="space-y-4">
                        {address && (
                            <>
                                <ProfileEditor aleoAddress={address} onUpdate={fetchData} />
                                <CVUpload
                                    aleoAddress={address}
                                    existingCV={profile?.cv?.[0] ? {
                                        filePath: profile.cv[0].file_path,
                                        uploadedAt: profile.cv[0].uploaded_at
                                    } : null}
                                    onUploadSuccess={fetchData}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Seeker;
