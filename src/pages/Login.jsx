import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { mockApi } from '../services/mockApi';
import { parsePasskeyFile, isValidPasskeyStructure, readFileAsText, readPasskeyBackup } from '../utils/passkeyFile';
import './Auth.css';

const Login = () => {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    
    const { login } = useContext(AuthContext);
    const { showToast } = useContext(ToastContext);
    const [hasAdmin, setHasAdmin] = useState(true);
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
                await login(data.user, data.token, false);
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

    const signInWithPasskey = async (passkeyData) => {
        if (!isValidPasskeyStructure(passkeyData)) {
            showToast('Invalid passkey file. It must include name, token, and proof or signature fields.', 'error');
            return;
        }
        const response = await mockApi.loginWithPasskey(passkeyData);
        const data = await response.json();
        if (response.ok) {
            await login(data.user, data.token, true);
            showToast(`Welcome back, ${data.user.name}! (Admin passkey sign-in)`, 'success');
            navigate('/');
        } else {
            showToast(data.error || 'Passkey authentication failed', 'error');
        }
    };

    const handlePasskeyFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        try {
            const fileText = await readFileAsText(file);
            const passkeyData = parsePasskeyFile(fileText);
            await signInWithPasskey(passkeyData);
        } catch (err) {
            console.error('Passkey sign-in error:', err);
            showToast(err.message || 'Passkey sign-in failed. Please try again.', 'error');
        } finally {
            setLoading(false);
            if (passkeyInputRef.current) passkeyInputRef.current.value = '';
        }
    };

    const handleUseSavedPasskey = async () => {
        setLoading(true);
        try {
            const backup = await readPasskeyBackup();
            if (!backup) {
                showToast('No passkey found on this device. Upload your passkey .json file from Downloads.', 'error');
                return;
            }
            await signInWithPasskey(backup);
        } catch (err) {
            showToast(err.message || 'Could not use saved passkey.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const triggerPasskeyUpload = () => {
        passkeyInputRef.current?.click();
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

                    <button type="submit" disabled={loading} className="auth-btn" style={{ marginTop: '1.5rem' }}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>

                    <input 
                        type="file" 
                        ref={passkeyInputRef} 
                        onChange={handlePasskeyFileChange} 
                        accept=".json,application/json" 
                        style={{ display: 'none' }} 
                    />
                </form>

                <p className="auth-footer" style={{ marginBottom: '0.35rem', marginTop: '1.5rem' }}>
                    <button 
                        type="button" 
                        onClick={triggerPasskeyUpload}
                        disabled={loading}
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
                        Sign in with admin passkey file
                    </button>
                </p>
                <p className="auth-footer" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
                    <button 
                        type="button" 
                        onClick={handleUseSavedPasskey}
                        disabled={loading}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            fontWeight: '500',
                            fontSize: '0.9rem',
                            padding: 0,
                            boxShadow: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        Use passkey saved on this device
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
