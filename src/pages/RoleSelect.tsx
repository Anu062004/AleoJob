import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';

function RoleSelect() {
    return (
        <div className="container mx-auto px-4 py-16">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
            >
                <Card className="p-12 max-w-xl mx-auto">
                    <h1 className="text-3xl font-bold mb-4 text-white">Select Your Role</h1>
                    <p className="text-slate-400">This page is under development.</p>
                </Card>
            </motion.div>
        </div>
    );
}

export default RoleSelect;
