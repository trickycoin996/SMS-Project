import React, { createContext, useState, useEffect } from 'react';
import { idbStore } from '../utils/db';
import { initializeDB } from '../services/mockApi';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            await initializeDB();

            const savedToken = await idbStore.get('aims_token');
            const savedUser = await idbStore.get('aims_user');

            if (savedToken && savedUser) {
                setToken(savedToken);
                setUser(typeof savedUser === 'string' ? JSON.parse(savedUser) : savedUser);
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (userData, jwtToken) => {
        setUser(userData);
        setToken(jwtToken);
        await idbStore.set('aims_token', jwtToken);
        await idbStore.set('aims_user', userData);
    };

    const logout = async () => {
        setUser(null);
        setToken(null);
        await idbStore.remove('aims_token');
        await idbStore.remove('aims_user');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
