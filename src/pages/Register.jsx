import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ToastContext } from '../context/ToastContext';
import { mockApi } from '../services/mockApi';
import { savePasskeyFile } from '../utils/passkeyFile';
import './Auth.css';

const ALLOWED_CURRENCIES = ['LKR', 'USD', 'EUR', 'GBP'];

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
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
        const trimmedName = formData.name.trim();
        const trimmedPassword = formData.password.trim();

        if (!trimmedName || !trimmedPassword) {
            showToast('Name and password are required.', 'error');
            return;
        }
        if (trimmedName.length > 100 || trimmedPassword.length > 100) {
            showToast('Input values are too long (maximum 100 characters).', 'error');
            return;
        }
        if (!ALLOWED_CURRENCIES.includes(formData.currency_code)) {
            showToast('Please select a valid currency.', 'error');
            return;
        }

        setLoading(true);
        try {
            const response = await mockApi.register({
                name: trimmedName,
                password: trimmedPassword,
                currency_code: formData.currency_code
            });
            const data = await response.json();
            if (response.ok) {
                if (!data.passkey) {
                    showToast('Account created but passkey generation failed. Contact support.', 'error');
                    return;
                }
                const saved = await savePasskeyFile(data.passkey, { showToast });
                if (!saved) {
                    showToast('Account created but passkey file could not be saved. Try registering again.', 'error');
                    return;
                }
                setSuccess(true);
                showToast('Account created! Passkey downloaded — check your Downloads folder.', 'success');
                setTimeout(() => navigate('/login'), 2500);
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
                    <p>Your passkey file was downloaded to your Downloads folder and saved on this device.</p>
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
                    <div className="form-group">
                        <label>User Name</label>
                        <input 
                            type="text" 
                            name="name" 
                            value={formData.name} 
                            onChange={handleChange} 
                            required 
                            placeholder="Full Name"
                        />
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
                        <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                            <input 
                                type={showPassword ? "text" : "password"} 
                                name="password" 
                                value={formData.password} 
                                onChange={handleChange} 
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
