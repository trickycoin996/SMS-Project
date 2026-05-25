import { getStorage, setStorage, delay } from '../utils/db';
import { logAction } from './logService';

export const getProducts = async () => {
    await delay(300);
    const products = await getStorage('sms_products', []);
    const categories = await getStorage('sms_categories', []);

    const productsWithCat = products.map(p => {
        const cat = categories.find(c => c.id === Number(p.category_id));
        return { ...p, category_name: cat ? cat.name : 'Unknown' };
    });

    return { ok: true, json: async () => ({ products: productsWithCat }) };
};

export const addProduct = async (productData) => {
    await delay(300);
    const products = await getStorage('sms_products', []);
    const newProduct = {
        ...productData,
        id: Date.now(),
        quantity: Number(productData.quantity) || 0,
        price: Number(productData.price) || 0
    };
    products.push(newProduct);
    await setStorage('sms_products', products);
    await logAction('ADD_PRODUCT', `Added new product: ${newProduct.name}`);
    return { ok: true, json: async () => ({ message: 'Product added', id: newProduct.id }) };
};
