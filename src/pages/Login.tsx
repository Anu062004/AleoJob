import { Shield } from 'lucide-react';
import { Card } from '../components/ui/Card';
import ConnectWallet from '../components/ConnectWallet';

function Login() {
    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <Card padding="lg" className="max-w-md w-full text-center">
                <div className="w-12 h-12 bg-aleo-purple rounded-xl flex items-center justify-center mx-auto mb-6">
                    <Shield size={24} className="text-white" />
                </div>
                <h1 className="text-2xl font-semibold text-text-primary mb-2">
                    Connect Wallet
                </h1>
                <p className="text-text-secondary mb-8">
                    Connect your Aleo wallet to continue
                </p>
                <div className="flex justify-center">
                    <ConnectWallet />
                </div>
            </Card>
        </div>
    );
}

export default Login;
