import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { mockApi } from '../services/mockApi';
import './Auth.css';

const Login = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    
    const { login } = useContext(AuthContext);
    const { showToast } = useContext(ToastContext);
    const [hasAdmin, setHasAdmin] = useState(true); // default to true to prevent flash
    const passkeyInputRef = useRef(null);

    useEffect(() => {
        const checkAdmin = async () => {
            const res = await mockApi.getAdminCount();
            if (res.ok) {
                const data = await res.json();
                setHasAdmin(data.count > 0);
            }
        };
        checkAdmin();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await mockApi.login(firstName, lastName, password);
            const data = await response.json();
            if (response.ok) {
                login(data.user, data.token);
                showToast(`Successfully logged in as ${data.user.firstName} ${data.user.lastName}`, 'success');
                navigate('/');
            } else {
                showToast(data.error || 'Failed to login', 'error');
            }
        } catch (err) {
            showToast('Network error. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePasskeyFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const passkeyData = JSON.parse(event.target.result);
                if (!passkeyData.firstName || !passkeyData.lastName || !passkeyData.token) {
                    showToast('Invalid passkey file format.', 'error');
                    return;
                }
                setLoading(true);
                const response = await mockApi.loginWithPasskey(passkeyData.firstName, passkeyData.lastName, passkeyData.token);
                const data = await response.json();
                if (response.ok) {
                    login(data.user, data.token);
                    showToast(`Welcome back, ${data.user.firstName}! (Passkey Sign-In)`, 'success');
                    navigate('/');
                } else {
                    showToast(data.error || 'Passkey authentication failed', 'error');
                }
            } catch (err) {
                showToast('Failed to parse passkey file.', 'error');
            } finally {
                setLoading(false);
                if (passkeyInputRef.current) passkeyInputRef.current.value = ''; // clear input
            }
        };
        reader.readAsText(file);
    };

    const triggerPasskeyUpload = () => {
        if (passkeyInputRef.current) {
            passkeyInputRef.current.click();
        }
    };

    return (
        <div className="auth-container">
            <div className="glass-panel auth-card">
                <h2>Welcome Back</h2>
                <p className="auth-subtitle">Sign in to SMS to manage your inventory</p>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label>First Name</label>
                            <input 
                                type="text" 
                                value={firstName} 
                                onChange={(e) => setFirstName(e.target.value)} 
                                required 
                                placeholder="First Name" 
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label>Last Name</label>
                            <input 
                                type="text" 
                                value={lastName} 
                                onChange={(e) => setLastName(e.target.value)} 
                                required 
                                placeholder="Last Name" 
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <div style={{ position: 'relative' }}>
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required 
                                placeholder="••••••••" 
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

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button type="submit" disabled={loading} className="auth-btn" style={{ flex: 2, margin: 0 }}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                        <button 
                            type="button" 
                            onClick={triggerPasskeyUpload} 
                            disabled={loading} 
                            className="auth-btn" 
                            style={{ 
                                flex: 1, 
                                margin: 0, 
                                backgroundColor: 'var(--secondary-color, #10b981)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <i className="fas fa-key"></i> Passkey
                        </button>
                    </div>

                    {/* Hidden file input for Passkey JSON upload */}
                    <input 
                        type="file" 
                        ref={passkeyInputRef} 
                        onChange={handlePasskeyFileChange} 
                        accept=".json" 
                        style={{ display: 'none' }} 
                    />
                </form>

                <p className="auth-footer" style={{ marginBottom: '0.5rem', marginTop: '1.5rem' }}>
                    <Link to="/forgot-password">Forgot Password?</Link>
                </p>
                {hasAdmin ? (
                    <p className="auth-footer" style={{ marginTop: 0 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Registration is handled by the Administrator.</span>
                    </p>
                ) : (
                    <p className="auth-footer" style={{ marginTop: 0 }}>
                        Don't have an account? <Link to="/register">Create one here</Link>
                    </p>
                )}
            </div>
        </div>
    );
};

export default Login;
