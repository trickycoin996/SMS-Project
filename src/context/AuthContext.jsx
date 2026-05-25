import React, { createContext, useState, useEffect } from 'react';
import { idbStore } from '../utils/db';
import { initializeDB } from '../services/mockApi';

// Create a Context for the Auth State
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isPasskeyAuthenticated, setIsPasskeyAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [storeInfo, setStoreInfo] = useState({
        storeName: 'Store Management System',
        currency: 'USD'
    });

    // When the app initializes, check IndexedDB for an existing token and user data.
    // Also perform global mock database initialization once.
    useEffect(() => {
        const initAuth = async () => {
            // Ensure default categories/data exist on first open
            await initializeDB();

            const savedToken = await idbStore.get('aims_token');
            const savedUser = await idbStore.get('aims_user');
            const savedStore = await idbStore.get('sms_store_info');
            const savedIsPasskey = await idbStore.get('sms_is_passkey_auth') || false;

            if (savedToken && savedUser) {
                setToken(savedToken);
                setUser(typeof savedUser === 'string' ? JSON.parse(savedUser) : savedUser);
                setIsPasskeyAuthenticated(savedIsPasskey);
            }
            if (savedStore) {
                setStoreInfo(savedStore);
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (userData, jwtToken, isPasskey = false) => {
        setUser(userData);
        setToken(jwtToken);
        setIsPasskeyAuthenticated(isPasskey);
        await idbStore.set('aims_token', jwtToken);
        await idbStore.set('aims_user', userData);
        await idbStore.set('sms_is_passkey_auth', isPasskey);
    };

    const logout = async () => {
        setUser(null);
        setToken(null);
        setIsPasskeyAuthenticated(false);
        await idbStore.remove('aims_token');
        await idbStore.remove('aims_user');
        await idbStore.remove('sms_is_passkey_auth');
    };

    const updateStoreInfoState = async (newInfo) => {
        setStoreInfo(newInfo);
        await idbStore.set('sms_store_info', newInfo);
    };

    const formatCurrency = (amount) => {
        const symbols = {
            USD: '$',
            EUR: '€',
            GBP: '£',
            LKR: 'Rs'
        };
        const symbol = symbols[storeInfo?.currency] || '$';
        return `${symbol}${Number(amount || 0).toFixed(2)}`;
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            token, 
            isPasskeyAuthenticated,
            login, 
            logout, 
            isAuthenticated: !!token, 
            loading,
            storeInfo,
            updateStoreInfoState,
            formatCurrency
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
