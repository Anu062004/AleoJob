import { Outlet } from 'react-router-dom';
import { NavBar } from './web3/NavBar';
import { Footer } from './web3/Footer';

function Layout() {
    return (
        <div className="min-h-screen bg-brand-bg text-brand-text">
            <NavBar />
            <main className="min-h-[calc(100vh-128px)]">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}

export default Layout;
