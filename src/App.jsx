import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Invoices from './pages/Invoices';
import Expenses from './pages/Expenses';
import Profile from './pages/Profile';
import Transactions from './pages/Transactions';

const ProtectedRoute = ({ children, page }) => {
    const { isAuthenticated, loading, user } = useContext(AuthContext);

    if (loading) return <div>Loading session...</div>;

    if (!isAuthenticated) return <Navigate to="/login" replace />;

    if (page && user?.role === 'employee') {
        if (!user.allowedPages || !user.allowedPages.includes(page)) {
            return <Navigate to="/profile" replace />;
        }
    }

    return children;
};

const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading } = useContext(AuthContext);
    if (loading) return <div>Loading session...</div>;
    if (isAuthenticated) return <Navigate to="/" replace />;
    return children;
};

const AppRoutes = () => {
    return (
        <Router>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
                <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

                {/* Protected Routes (Wrapped in Layout) */}
                <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    {/* Index route defaults to Dashboard */}
                    <Route index element={<ProtectedRoute page="dashboard"><Dashboard /></ProtectedRoute>} />
                    <Route path="products" element={<ProtectedRoute page="products"><Products /></ProtectedRoute>} />
                    <Route path="categories" element={<ProtectedRoute page="categories"><Categories /></ProtectedRoute>} />
                    <Route path="invoices" element={<ProtectedRoute page="invoices"><Invoices /></ProtectedRoute>} />
                    <Route path="expenses" element={<ProtectedRoute page="expenses"><Expenses /></ProtectedRoute>} />
                    <Route path="transactions" element={<ProtectedRoute page="transactions"><Transactions /></ProtectedRoute>} />
                    <Route path="profile" element={<Profile />} />
                </Route>

                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    );
};

export default App;
