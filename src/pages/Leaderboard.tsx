import { useEffect, useState } from 'react';
import { Trophy, Star, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface LeaderboardUser {
    rank: number;
    address: string;
    reputation: number;
    experience: number;
}

function Leaderboard() {
    const [data, setData] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('aleo_address, profile_score, experience_years')
                .order('profile_score', { ascending: false })
                .limit(10);

            if (error) throw error;

            setData(data?.map((item: any, i: number) => ({
                rank: i + 1,
                address: item.aleo_address,
                reputation: item.profile_score || 0,
                experience: item.experience_years || 0,
            })) || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-violet-500" size={24} />
            </div>
        );
    }

    return (
        <div className="min-h-screen py-8">
            <div className="container mx-auto px-6 max-w-3xl">
                <div className="text-center mb-10">
                    <div className="w-10 h-10 rounded-lg bg-violet-600/20 flex items-center justify-center mx-auto mb-4">
                        <Trophy className="text-violet-400" size={18} />
                    </div>
                    <h1 className="text-2xl font-semibold text-white mb-1">Leaderboard</h1>
                    <p className="text-slate-500">Top performers - privacy preserved</p>
                </div>

                <div className="rounded-xl bg-slate-900/50 border border-slate-800 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-800">
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rank</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Address</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Score</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Exp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {data.length > 0 ? data.map((user) => (
                                <tr key={user.address} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className={user.rank <= 3 ? 'text-violet-400 font-medium' : 'text-slate-400'}>
                                            {user.rank}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-sm text-slate-300">
                                        {user.address.slice(0, 10)}...{user.address.slice(-4)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center gap-1 text-white">
                                            <Star size={12} className="text-amber-400" />
                                            {user.reputation}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-500 text-sm">
                                        {user.experience}y
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        No profiles yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Leaderboard;
