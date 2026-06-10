import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';

const CURRENCY_SYMBOLS = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    LKR: 'Rs'
};

const hexToRgb = (hex, fallback = [241, 60, 60]) => {
    if (!hex || typeof hex !== 'string') return fallback;
    const clean = hex.replace('#', '').trim();
    if (clean.length === 3) {
        return [
            parseInt(clean[0] + clean[0], 16),
            parseInt(clean[1] + clean[1], 16),
            parseInt(clean[2] + clean[2], 16)
        ];
    }
    if (clean.length === 6) {
        return [
            parseInt(clean.slice(0, 2), 16),
            parseInt(clean.slice(2, 4), 16),
            parseInt(clean.slice(4, 6), 16)
        ];
    }
    return fallback;
};

export const buildInvoicePdf = (inv, { storeInfo = {}, letterhead = {} } = {}) => {
    const doc = new jsPDF();
    const companyName = letterhead.companyName || storeInfo.storeName || 'Store Management System';
    const phone = letterhead.phone || storeInfo.storePhone || '';
    const email = letterhead.email || storeInfo.storeEmail || '';
    const addr1 = letterhead.addressLine1 || storeInfo.storeAddress || '';
    const addr2 = letterhead.addressLine2 || '';
    const primaryRgb = hexToRgb(letterhead.primaryColor || '#f13c3c');
    const currencySymbol = CURRENCY_SYMBOLS[storeInfo?.currency] || '$';

    doc.setFontSize(22);
    doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
    doc.text(companyName, 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(51, 51, 51);
    if (addr1) doc.text(addr1, 14, 30);
    if (addr2) doc.text(addr2, 14, 35);
    if (phone) doc.text(`Phone: ${phone}`, 14, 40);
    if (email) doc.text(`Email: ${email}`, 14, 45);

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('INVOICE', 140, 22);
    doc.setFontSize(10);
    doc.text(`Invoice Number: ${inv.invoice_number || '-'}`, 140, 30);
    doc.text(`Date: ${inv.issue_date?.slice(0, 10) || '-'}`, 140, 35);
    doc.text(`Due Date: ${inv.due_date?.slice(0, 10) || '-'}`, 140, 40);
    doc.text(`Currency: ${storeInfo?.currency || 'USD'} (${currencySymbol})`, 140, 45);
    doc.text(`Status: ${inv.status || 'Draft'}`, 140, 50);

    doc.setFontSize(12);
    doc.text('Bill To:', 14, 60);
    doc.setFontSize(10);
    doc.text(inv.customer_name || 'Valued Customer', 14, 66);
    if (inv.customer_email) doc.text(inv.customer_email, 14, 71);

    const lineItems = Array.isArray(inv.items) ? inv.items : [];
    const tableRows = lineItems.length === 0
        ? [['No line items', '-', '-', '-']]
        : lineItems.map((item) => {
            const description = item.description || item.product_name || 'Item';
            const qty = item.quantity ?? 0;
            const price = Number(item.unit_price || 0).toFixed(2);
            const lineTotal = (Number(item.quantity || 0) * Number(item.unit_price || 0)).toFixed(2);
            return [description, String(qty), `${currencySymbol}${price}`, `${currencySymbol}${lineTotal}`];
        });

    autoTable(doc, {
        startY: 85,
        head: [['Description', 'Qty', 'Unit Price', 'Line Total']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: primaryRgb },
        styles: { fontSize: 10 }
    });

    const finalY = doc.lastAutoTable?.finalY ?? 85;
    const invoiceTotal = lineItems.length > 0
        ? lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0)
        : Number(inv.total) || 0;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Amount: ${currencySymbol}${invoiceTotal.toFixed(2)}`, 140, finalY + 10);

    if (inv.notes) {
        doc.setFontSize(10);
        doc.text(`Notes: ${inv.notes}`, 14, finalY + 10);
    }

    return doc;
};
