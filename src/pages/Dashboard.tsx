import { Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

function DashboardHome() {
    const { address } = useWallet();

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6 text-white">Dashboard Overview</h2>
            <Card className="p-6">
                <p className="text-slate-400">
                    Welcome to your dashboard, {address?.slice(0, 10)}...
                </p>
            </Card>
        </div>
    );
}

function Dashboard() {
    const { connected } = useWallet();

    if (!connected) {
        return <Navigate to="/get-started" replace />;
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="text-4xl font-bold mb-8 text-white">Dashboard</h1>

                <Routes>
                    <Route index element={<DashboardHome />} />
                </Routes>
            </motion.div>
        </div>
    );
}

export default Dashboard;
