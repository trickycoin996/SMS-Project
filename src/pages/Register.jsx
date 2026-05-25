import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ToastContext } from '../context/ToastContext';
import { mockApi } from '../services/mockApi';
import './Auth.css';

const Register = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        password: '',
        currency_code: 'LKR'
    });
    const [showPassword, setShowPassword] = useState(false);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [adminCheckDone, setAdminCheckDone] = useState(false);
    const [registrationAllowed, setRegistrationAllowed] = useState(true);

    const { showToast } = useContext(ToastContext);

    useEffect(() => {
        const checkAdmin = async () => {
            const res = await mockApi.getAdminCount();
            if (res.ok) {
                const data = await res.json();
                setRegistrationAllowed(data.count === 0);
            }
            setAdminCheckDone(true);
        };
        checkAdmin();
    }, []);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await mockApi.register(formData);
            const data = await response.json();
            if (response.ok) {
                setSuccess(true);
                showToast('Admin account successfully created!', 'success');
                setTimeout(() => navigate('/login'), 2000);
            } else {
                showToast(data.error || 'Registration failed', 'error');
            }
        } catch (err) {
            showToast('Network error. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!adminCheckDone) {
        return (
            <div className="auth-container">
                <div className="glass-panel">Checking registration limits...</div>
            </div>
        );
    }

    if (!registrationAllowed) {
        return (
            <div className="auth-container">
                <div className="glass-panel auth-card">
                    <h2 style={{ color: 'var(--danger-color)' }}>Registration Closed</h2>
                    <p>An administrative account already exists. Only an admin can generate new employee credentials.</p>
                    <p className="auth-footer" style={{ marginTop: '1.5rem' }}>
                        <Link to="/login">Return to Sign In</Link>
                    </p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="auth-container">
                <div className="glass-panel auth-card success-card">
                    <h2>Account Created!</h2>
                    <p>You can now sign in with your credentials.</p>
                    <p>Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="glass-panel auth-card">
                <h2>Create an Account</h2>
                <p className="auth-subtitle">Join SMS to start managing your store efficiently.</p>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label>First Name</label>
                            <input 
                                type="text" 
                                name="firstName" 
                                value={formData.firstName} 
                                onChange={handleChange} 
                                required 
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label>Last Name</label>
                            <input 
                                type="text" 
                                name="lastName" 
                                value={formData.lastName} 
                                onChange={handleChange} 
                                required 
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Preferred Currency</label>
                        <select name="currency_code" value={formData.currency_code} onChange={handleChange} required>
                            <option value="LKR">LKR - Sri Lankan Rupee</option>
                            <option value="USD">USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="GBP">GBP - British Pound</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <div style={{ position: 'relative' }}>
                            <input 
                                type={showPassword ? "text" : "password"} 
                                name="password" 
                                value={formData.password} 
                                onChange={handleChange} 
                                required 
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute', 
                                    right: '10px', 
                                    top: '50%', 
                                    transform: 'translateY(-50%)', 
                                    background: 'none', 
                                    border: 'none', 
                                    cursor: 'pointer', 
                                    color: 'var(--text-muted)', 
                                    padding: '5px', 
                                    boxShadow: 'none'
                                }}
                            >
                                <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                            </button>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="auth-btn">
                        {loading ? 'Creating...' : 'Register'}
                    </button>
                </form>
                <p className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></p>
            </div>
        </div>
    );
};

export default Register;
