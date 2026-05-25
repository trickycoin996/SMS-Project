import { getStorage, setStorage, delay } from '../utils/db';
import { logAction } from './logService';

export const getAdminCount = async () => {
    await delay(300);
    const users = await getStorage('sms_users', []);
    return { ok: true, json: async () => ({ count: users.filter(u => u.role === 'admin').length }) };
};

export const login = async (email, password) => {
    await delay(500);
    const users = await getStorage('sms_users', []);
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        await logAction('LOGIN', `User ${email} logged in`);
        return {
            ok: true,
            json: async () => ({
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    allowedPages: user.allowedPages || []
                },
                token: 'mock-jwt-token-123'
            })
        };
    }

    await logAction('LOGIN_FAILED', `Failed login attempt for email ${email}`);
    return { ok: false, json: async () => ({ error: 'Invalid credentials' }) };
};

export const register = async (userData) => {
    await delay(500);
    const users = await getStorage('sms_users', []);

    if (users.filter(u => u.role === 'admin').length > 0) {
        return { ok: false, json: async () => ({ error: 'Registration closed. Further accounts must be created by an Admin.' }) };
    }

    if (users.find(u => u.email === userData.email)) {
        return { ok: false, json: async () => ({ error: 'Email already exists' }) };
    }

    const newUser = { id: Date.now(), ...userData, role: 'admin' };
    users.push(newUser);
    await setStorage('sms_users', users);
    await logAction('REGISTER', `Initial Admin registered: ${userData.email}`);
    return { ok: true, json: async () => ({ message: 'Admin created' }) };
};

export const addEmployee = async (employeeData) => {
    await delay(500);
    const users = await getStorage('sms_users', []);

    if (users.find(u => u.email === employeeData.email)) {
        return { ok: false, json: async () => ({ error: 'Email already exists' }) };
    }

    const newEmployee = { id: Date.now(), ...employeeData, role: 'employee' };
    users.push(newEmployee);
    await setStorage('sms_users', users);
    await logAction('ADD_EMPLOYEE', `New employee created: ${employeeData.email}`);
    return { ok: true, json: async () => ({ message: 'Employee created' }) };
};

export const sendOtp = async (email) => {
    await delay(500);
    const users = await getStorage('sms_users', []);

    if (!users.find(u => u.email === email)) {
        return { ok: false, json: async () => ({ error: 'Email not found.' }) };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otps = await getStorage('sms_otps', {});
    otps[email] = otp;
    await setStorage('sms_otps', otps);
    console.log(`[RESEND MOCK] Sent OTP ${otp} to ${email}`);
    await logAction('OTP_SENT', `OTP sent to ${email} via Resend mock`);
    return { ok: true, json: async () => ({ message: `Recovery OTP sent to ${email} successfully.` }) };
};

export const verifyOtp = async (email, inputOtp) => {
    await delay(300);
    const otps = await getStorage('sms_otps', {});
    if (otps[email] && otps[email] === inputOtp) {
        return { ok: true, json: async () => ({ message: 'OTP Verified' }) };
    }
    return { ok: false, json: async () => ({ error: 'Invalid or expired OTP.' }) };
};

export const resetPassword = async (email, otp, newPassword) => {
    await delay(500);
    const otps = await getStorage('sms_otps', {});

    if (otps[email] !== otp) {
        return { ok: false, json: async () => ({ error: 'Invalid request.' }) };
    }

    const users = await getStorage('sms_users', []);
    const idx = users.findIndex(u => u.email === email);

    if (idx > -1) {
        users[idx].password = newPassword;
        await setStorage('sms_users', users);
        delete otps[email];
        await setStorage('sms_otps', otps);
        await logAction('PASSWORD_RESET', `Password reset for ${email}`);
        return { ok: true, json: async () => ({ message: 'Password updated' }) };
    }

    return { ok: false, json: async () => ({ error: 'User not found.' }) };
};
