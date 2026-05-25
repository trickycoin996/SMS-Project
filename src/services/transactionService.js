import { getStorage, setStorage, delay } from '../utils/db';
import { logAction } from './logService';

export const addTransaction = async (transactionData) => {
    await delay(300);
    const products = await getStorage('sms_products', []);
    const transactions = await getStorage('sms_transactions', []);

    const { product_id, type, quantity } = transactionData;
    const qty = Number(quantity);

    const productIndex = products.findIndex(p => p.id === Number(product_id));
    if (productIndex === -1) {
        return { ok: false, json: async () => ({ error: 'Product not found' }) };
    }

    const product = products[productIndex];

    if (type === 'OUT' && product.quantity < qty) {
        return { ok: false, json: async () => ({ error: 'Insufficient stock' }) };
    }

    if (type === 'IN') {
        products[productIndex].quantity += qty;
    } else if (type === 'OUT') {
        products[productIndex].quantity -= qty;
    }

    const newTransaction = {
        id: Date.now(),
        product_id: product.id,
        product_name: product.name,
        type,
        quantity: qty,
        date: new Date().toISOString()
    };

    transactions.push(newTransaction);
    await setStorage('sms_products', products);
    await setStorage('sms_transactions', transactions);
    await logAction('ADD_TRANSACTION', `Transaction ${type}: ${qty} units of ${product.name}`);
    return { ok: true, json: async () => ({ message: 'Transaction successful' }) };
};

export const getRecentTransactions = async () => {
    await delay(300);
    const transactions = await getStorage('sms_transactions', []);
    const recent = transactions.sort((a, b) => b.id - a.id).slice(0, 5);
    return { ok: true, json: async () => recent };
};
