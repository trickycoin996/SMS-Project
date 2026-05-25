import React, { createContext, useState, useCallback } from 'react';

export const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto remove toast after 3.5 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3500);
    }, []);

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const getStatusIcon = (type) => {
        switch (type) {
            case 'success':
                return 'fas fa-check-circle';
            case 'error':
                return 'fas fa-exclamation-circle';
            case 'warning':
                return 'fas fa-exclamation-triangle';
            case 'info':
            default:
                return 'fas fa-info-circle';
        }
    };

    const getStatusColor = (type) => {
        switch (type) {
            case 'success':
                return '#10b981';
            case 'error':
                return '#ef4444';
            case 'warning':
                return '#f59e0b';
            case 'info':
            default:
                return '#3b82f6';
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            
            {/* Inject Keyframe Animations dynamically */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes toast-slide-in {
                    from { transform: translateX(120%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes toast-fade-out {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                .toast-notification {
                    animation: toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .toast-close-btn:hover {
                    opacity: 1 !important;
                }
            `}} />

            {/* Floating Toast Container */}
            <div
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    zIndex: 99999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    pointerEvents: 'none',
                    maxWidth: '350px',
                    width: '100%'
                }}
            >
                {toasts.map((toast) => {
                    const borderLeftColor = getStatusColor(toast.type);
                    const iconClass = getStatusIcon(toast.type);

                    return (
                        <div
                            key={toast.id}
                            className="toast-notification"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '14px 18px',
                                borderRadius: '12px',
                                background: 'var(--surface-color, #ffffff)',
                                borderLeft: `5px solid ${borderLeftColor}`,
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                border: '1px solid var(--border-color, #eaedf1)',
                                color: 'var(--text-main, #212529)',
                                fontFamily: "'Inter', sans-serif",
                                fontSize: '0.9rem',
                                pointerEvents: 'auto',
                                userSelect: 'none',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <i className={iconClass} style={{ color: borderLeftColor, fontSize: '1.1rem', flexShrink: 0 }} />
                            <div style={{ flexGrow: 1, lineHeight: '1.4', fontWeight: '500' }}>{toast.message}</div>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="toast-close-btn"
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '4px',
                                    color: 'var(--text-muted, #6c757d)',
                                    cursor: 'pointer',
                                    opacity: 0.6,
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: 'none',
                                    transition: 'opacity 0.2s'
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
};
