import { getStorage, setStorage, delay } from '../utils/db';
import { logAction } from './logService';

export const getExpenses = async () => {
    await delay(300);
    const expenses = await getStorage('sms_expenses', []);
    return { ok: true, json: async () => ({ expenses }) };
};

export const addExpense = async (expenseData) => {
    await delay(300);
    const expenses = await getStorage('sms_expenses', []);
    const newExpense = {
        ...expenseData,
        id: Date.now(),
        amount: Number(expenseData.amount)
    };
    expenses.push(newExpense);
    await setStorage('sms_expenses', expenses);
    await logAction('ADD_EXPENSE', `Added expense: $${newExpense.amount} for ${newExpense.description}`);
    return { ok: true, json: async () => ({ message: 'Expense added' }) };
};
