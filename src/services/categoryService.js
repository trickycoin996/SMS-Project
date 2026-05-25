import { getStorage, setStorage, delay } from '../utils/db';
import { logAction } from './logService';

export const getCategories = async () => {
    await delay(300);
    const categories = await getStorage('sms_categories', []);
    return { ok: true, json: async () => ({ categories }) };
};

export const addCategory = async (categoryData) => {
    await delay(300);
    const categories = await getStorage('sms_categories', []);
    const newCategory = { ...categoryData, id: Date.now() };
    categories.push(newCategory);
    await setStorage('sms_categories', categories);
    await logAction('ADD_CATEGORY', `Added new category: ${newCategory.name}`);
    return { ok: true, json: async () => ({ message: 'Category added' }) };
};
