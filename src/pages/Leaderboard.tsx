import { motion } from 'framer-motion';
import { Trophy, Star, TrendingUp } from 'lucide-react';
import { Card } from '../components/ui/Card';

const leaderboardData = [
    { rank: 1, address: 'aleo1...abc', reputation: 98, jobsCompleted: 45, earnings: '2,500 ALEO' },
    { rank: 2, address: 'aleo1...def', reputation: 95, jobsCompleted: 38, earnings: '2,100 ALEO' },
    { rank: 3, address: 'aleo1...ghi', reputation: 92, jobsCompleted: 32, earnings: '1,800 ALEO' },
    { rank: 4, address: 'aleo1...jkl', reputation: 89, jobsCompleted: 28, earnings: '1,500 ALEO' },
    { rank: 5, address: 'aleo1...mno', reputation: 87, jobsCompleted: 25, earnings: '1,200 ALEO' },
];

function Leaderboard() {
    return (
        <div className="container mx-auto px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="text-center mb-12">
                    <Trophy className="mx-auto mb-4 text-yellow-400" size={48} />
                    <h1 className="text-4xl font-bold mb-2 text-white">Leaderboard</h1>
                    <p className="text-slate-400">Top performers on AleoJob - all anonymous!</p>
                </div>

                <Card className="overflow-hidden max-w-4xl mx-auto">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700/50">
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-400">Rank</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-400">Address</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-400">Reputation</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-400">Jobs</th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-400">Earnings</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboardData.map((user, index) => (
                                    <motion.tr
                                        key={user.address}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3, delay: index * 0.1 }}
                                        className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {user.rank === 1 && <span className="text-2xl">🥇</span>}
                                                {user.rank === 2 && <span className="text-2xl">🥈</span>}
                                                {user.rank === 3 && <span className="text-2xl">🥉</span>}
                                                {user.rank > 3 && <span className="text-lg text-slate-400">#{user.rank}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-white">{user.address}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Star size={16} className="text-yellow-400" />
                                                <span className="text-white font-semibold">{user.reputation}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-white">{user.jobsCompleted}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-aleo-emerald font-semibold">{user.earnings}</span>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <div className="mt-8 text-center">
                    <p className="text-sm text-slate-400 flex items-center justify-center gap-2">
                        <TrendingUp size={16} />
                        Rankings update every 24 hours based on ZK-verified performance
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

export default Leaderboard;
