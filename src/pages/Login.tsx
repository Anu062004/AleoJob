import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';

function Login() {
    return (
        <div className="container mx-auto px-4 py-16">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-md mx-auto"
            >
                <Card className="p-8">
                    <h1 className="text-2xl font-bold mb-4 text-white text-center">Login</h1>
                    <p className="text-slate-400 text-center mb-6">
                        Connect your Aleo wallet to continue
                    </p>
                    <p className="text-sm text-slate-500 text-center">
                        Use the "Connect Wallet" button in the header to authenticate.
                    </p>
                </Card>
            </motion.div>
        </div>
    );
}

export default Login;
