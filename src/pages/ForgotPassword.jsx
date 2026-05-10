import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mockApi } from '../services/mockApi';
import './Auth.css';

const ForgotPassword = () => {
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Reset
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setIsLoading(true); setMessage(''); setError('');
        try {
            const res = await mockApi.sendOtp(email);
            const data = await res.json();
            if (res.ok) {
                setMessage(data.message);
                setStep(2);
            } else {
                setError(data.error);
            }
        } catch(err) { setError('System error.'); }
        setIsLoading(false);
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setIsLoading(true); setMessage(''); setError('');
        try {
            const res = await mockApi.verifyOtp(email, otp);
            if (res.ok) {
                setMessage('OTP Verified. Please enter your new password.');
                setStep(3);
            } else {
                const data = await res.json();
                setError(data.error);
            }
        } catch(err) { setError('System error.'); }
        setIsLoading(false);
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setIsLoading(true); setMessage(''); setError('');
        try {
            const res = await mockApi.resetPassword(email, otp, password);
            if (res.ok) {
                setMessage('Password reset successfully!');
                setTimeout(() => navigate('/login'), 2000);
            } else {
                const data = await res.json();
                setError(data.error);
            }
        } catch(err) { setError('System error.'); }
        setIsLoading(false);
    };

    return (
        <div className="auth-container">
            <div className="auth-card glass-panel">
                <div className="auth-header">
                    <h2>Recover Password</h2>
                    <p style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>
                        {step === 1 ? 'Enter your email to receive an OTP via Resend' : step === 2 ? `Enter OTP sent to ${email}` : 'Create a new password'}
                    </p>
                </div>

                {error && <div className="error-message" style={{marginBottom: '1rem', color: 'red'}}>{error}</div>}
                {message && <div className="success-message" style={{marginBottom: '1rem', color: 'green', background: '#dcfce7', padding: '0.75rem', borderRadius: '0.5rem'}}>{message}</div>}

                {step === 1 && (
                    <form onSubmit={handleSendOtp} className="auth-form">
                        <div className="form-group">
                            <label>Email Address</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <button type="submit" className="auth-btn" disabled={isLoading}>
                            {isLoading ? 'Sending...' : 'Send OTP'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyOtp} className="auth-form">
                        <div className="form-group">
                            <label>One-Time Password (OTP)</label>
                            <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} required placeholder="e.g. 123456" />
                        </div>
                        <button type="submit" className="auth-btn" disabled={isLoading}>
                            {isLoading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleResetPassword} className="auth-form">
                        <div className="form-group">
                            <label>New Password</label>
                            <div style={{position: 'relative'}}>
                                <input type={showPassword ? "text":"password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '5px', boxShadow: 'none'}}>
                                    {showPassword ? '👁️' : '🙈'}
                                </button>
                            </div>
                        </div>
                        <button type="submit" className="auth-btn" disabled={isLoading}>
                            {isLoading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                <div className="auth-footer" style={{marginTop: '1.5rem'}}>
                    <p><Link to="/login">Back to Login</Link></p>
                </div>
            </div>
        </div>
    );
};
export default ForgotPassword;
