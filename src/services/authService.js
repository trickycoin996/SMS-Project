/**
 * Legacy auth service — superseded by mockApi.js.
 * Kept for reference; active app routes use mockApi directly.
 */
import { idbStore } from '../utils/db';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getStorage = async (key, defaultVal) => {
    const data = await idbStore.get(key);
    return data !== undefined ? data : defaultVal;
};

export const getAdminCount = async () => {
    await delay(300);
    const users = await getStorage('sms_users', []);
    return { ok: true, json: async () => ({ count: users.filter((u) => u.role === 'admin').length }) };
};

export const login = async (name, password) => {
    await delay(500);
    const users = await getStorage('sms_users', []);
    const user = users.find((u) => u.name?.trim().toLowerCase() === name.trim().toLowerCase());

    if (user && user.password === password) {
        return {
            ok: true,
            json: async () => ({
                user: {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    allowedPages: user.allowedPages || []
                },
                token: 'mock-jwt-token-123'
            })
        };
    }

    return { ok: false, json: async () => ({ error: 'Invalid name or password' }) };
};
