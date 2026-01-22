import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Jobs from './pages/Jobs';
import Leaderboard from './pages/Leaderboard';
import GetStarted from './pages/GetStarted';
import RoleSelect from './pages/RoleSelect';
import Seeker from './pages/Seeker';
import Giver from './pages/Giver';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="jobs" element={<Jobs />} />
                <Route path="leaderboard" element={<Leaderboard />} />
                <Route path="get-started" element={<GetStarted />} />
                <Route path="role-select" element={<RoleSelect />} />
                <Route path="seeker" element={<Seeker />} />
                <Route path="giver" element={<Giver />} />
                <Route path="login/*" element={<Login />} />
                <Route path="dashboard/*" element={<Dashboard />} />
            </Route>
        </Routes>
    );
}

export default App;
