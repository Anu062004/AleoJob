import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Loader2 } from 'lucide-react';

function Dashboard() {
    const { connected } = useWallet();
    const navigate = useNavigate();

    useEffect(() => {
        if (!connected) {
            navigate('/login');
        } else {
            navigate('/get-started');
        }
    }, [connected, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="animate-spin text-aleo-purple" size={32} />
        </div>
    );
}

export default Dashboard;
