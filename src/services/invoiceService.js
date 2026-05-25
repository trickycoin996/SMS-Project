import { getStorage, setStorage, delay } from '../utils/db';
import { logAction } from './logService';

export const getInvoices = async () => {
    await delay(300);
    const invoices = await getStorage('sms_invoices', []);
    return { ok: true, json: async () => ({ invoices }) };
};

export const createInvoice = async (invoiceData) => {
    await delay(300);
    const invoices = await getStorage('sms_invoices', []);
    const products = await getStorage('sms_products', []);

    for (const item of invoiceData.items) {
        const prodIdx = products.findIndex(p => p.id === Number(item.product_id));
        if (prodIdx > -1) {
            products[prodIdx].quantity -= Number(item.quantity);
        }
    }
    await setStorage('sms_products', products);

    const newInvoice = {
        ...invoiceData,
        id: Date.now(),
        invoice_number: `INV-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString(),
        total: invoiceData.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0)
    };
    invoices.push(newInvoice);
    await setStorage('sms_invoices', invoices);
    await logAction('CREATE_INVOICE', `Created invoice ${newInvoice.invoice_number}`);
    return { ok: true, json: async () => ({ message: 'Invoice created', invoiceId: newInvoice.id }) };
};

export const updateInvoiceStatus = async (id, status) => {
    await delay(300);
    const invoices = await getStorage('sms_invoices', []);
    const idx = invoices.findIndex(i => i.id === Number(id));

    if (idx > -1) {
        invoices[idx].status = status;
        await setStorage('sms_invoices', invoices);
        await logAction('UPDATE_INVOICE_STATUS', `Updated invoice ${invoices[idx].invoice_number} status to ${status}`);
        return { ok: true, json: async () => ({ message: 'Status updated' }) };
    }

    return { ok: false, json: async () => ({ error: 'Invoice not found' }) };
};
