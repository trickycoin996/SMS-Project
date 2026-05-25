import { getStorage, setStorage } from '../utils/db';

export const initializeDB = async () => {
    const defaults = [
        ['sms_logs', []],
        ['sms_users', []],
        ['sms_products', []],
        ['sms_categories', []],
        ['sms_invoices', []],
        ['sms_expenses', []]
    ];
    for (const [key, val] of defaults) {
        if ((await getStorage(key)) === undefined) {
            await setStorage(key, val);
        }
    }
};

export const logAction = async (action, details) => {
    const logs = await getStorage('sms_logs', []);
    logs.push({ id: Date.now(), timestamp: new Date().toISOString(), action, details });
    await setStorage('sms_logs', logs);
};

export const getLogsText = async () => {
    const logs = await getStorage('sms_logs', []);
    if (logs.length === 0) return 'No actions logged yet.';
    return logs
        .map(l => `[${new Date(l.timestamp).toLocaleString()}] ${l.action}: ${l.details}`)
        .join('\n');
};
