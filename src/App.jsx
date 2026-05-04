import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Profile from './pages/Profile';

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ padding: '10px', background: '#eee', marginBottom: '20px' }}>
        <Link to="/" style={{ marginRight: '10px' }}>Dashboard</Link>
        <Link to="/inventory" style={{ marginRight: '10px' }}>Inventory</Link>
        <Link to="/sales" style={{ marginRight: '10px' }}>Sales</Link>
        <Link to="/profile" style={{ marginRight: '10px' }}>Profile</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}




