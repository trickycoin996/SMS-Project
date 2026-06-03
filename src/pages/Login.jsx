import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { mockApi } from '../services/mockApi';
import './Auth.css';

const Login = () => {
    const [name, setName] = useState('');
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
        const trimmedName = name.trim();
        const trimmedPassword = password.trim();
        
        if (!trimmedName || !trimmedPassword) {
            showToast('Name and password are required.', 'error');
            return;
        }
        if (trimmedName.length > 100 || trimmedPassword.length > 100) {
            showToast('Input values are too long (maximum 100 characters).', 'error');
            return;
        }

        setLoading(true);
        try {
            const response = await mockApi.login(trimmedName, trimmedPassword);
            const data = await response.json();
            if (response.ok) {
                login(data.user, data.token, false);
                showToast(`Successfully logged in as ${data.user.name}`, 'success');
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
                if (!passkeyData.name || !passkeyData.token || !passkeyData.devicePublicKey || !passkeyData.signature) {
                    showToast('Invalid passkey file format.', 'error');
                    return;
                }
                setLoading(true);
                const response = await mockApi.loginWithPasskey(passkeyData);
                const data = await response.json();
                if (response.ok) {
                    login(data.user, data.token, true);
                    showToast(`Welcome back, ${data.user.name}! (Passkey Sign-In)`, 'success');
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
                    <div className="form-group">
                        <label>User Name</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            required 
                            placeholder="User Name" 
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required 
                                placeholder="••••••••" 
                                style={{ marginBottom: 0 }}
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
                    <button 
                        type="button" 
                        onClick={triggerPasskeyUpload}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary-color)',
                            fontWeight: '600',
                            padding: 0,
                            boxShadow: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        Sign in with Passkey file
                    </button>
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
