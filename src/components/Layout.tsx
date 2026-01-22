import { Outlet } from 'react-router-dom';
import Header from './Header';
import AnimatedBackground from './AnimatedBackground';

function Layout() {
    return (
        <div className="min-h-screen">
            <AnimatedBackground />
            <Header />
            <main className="relative">
                <Outlet />
            </main>
        </div>
    );
}

export default Layout;
