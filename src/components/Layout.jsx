import React, { useContext, useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { mockApi } from '../services/mockApi';
import './Layout.css';

const Layout = () => {
    const { user, logout } = useContext(AuthContext); // user: logged-in user info, logout: clears auth state
    const navigate = useNavigate(); // navigate: used to redirect after logout

    const handleLogout = () => {
        logout(); // clear auth context + localStorage
        navigate('/login'); // send user back to login screen
    };



    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const canAccess = (page) => {
        if (user?.role === 'admin') return true;
        if (user?.role === 'employee' && user?.allowedPages?.includes(page)) return true;
        return false;
    };

    // Close sidebar on route change for mobile
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location]);

    return (
        <div className="layout-container">
            <div className="mobile-header">
                <button className="menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    ☰
                </button>
                <h2>Store Management System</h2>
            </div>

            {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

            {/* Sidebar Navigation + user info */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h2>Store Management System</h2>
                </div>
                <nav className="nav-menu">
                    {canAccess('dashboard') && <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Dashboard</NavLink>}
                    {canAccess('products') && <NavLink to="/products" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Inventory</NavLink>}
                    {canAccess('categories') && <NavLink to="/categories" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Categories</NavLink>}
                    {canAccess('invoices') && <NavLink to="/invoices" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Invoices</NavLink>}
                    {canAccess('expenses') && <NavLink to="/expenses" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Expenses</NavLink>}
                    {canAccess('transactions') && <NavLink to="/transactions" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Ledger</NavLink>}
                    <NavLink to="/profile" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Profile & Settings</NavLink>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-id-label">
                        User: <span>{user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()}</span>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>Log Out</button>
                </div>
            </aside>

            {/* Main Content Area (without top navbar now) */}
            <div className="content-wrapper">
                <main className="main-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
