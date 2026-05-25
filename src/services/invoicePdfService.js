import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { idbStore } from '../utils/db';
import { logAction } from './logService';

export const downloadInvoicePdf = async (inv) => {
    const doc = new jsPDF();
    const settings = await idbStore.get('sms_letterhead') || {};
    const companyName = settings.companyName || 'Store Management System';
    const phone = settings.phone || '';
    const email = settings.email || '';
    const addr1 = settings.addressLine1 || '';
    const addr2 = settings.addressLine2 || '';

    doc.setFontSize(22);
    doc.setTextColor(settings.primaryColor || '#f13c3c');
    doc.text(companyName, 14, 22);

    doc.setFontSize(10);
    doc.setTextColor('#333333');
    if (addr1) doc.text(addr1, 14, 30);
    if (addr2) doc.text(addr2, 14, 35);
    if (phone) doc.text(`Phone: ${phone}`, 14, 40);
    if (email) doc.text(`Email: ${email}`, 14, 45);

    doc.setFontSize(16);
    doc.setTextColor('#000000');
    doc.text('INVOICE', 140, 22);
    doc.setFontSize(10);
    doc.text(`Invoice Number: ${inv.invoice_number}`, 140, 30);
    doc.text(`Date: ${inv.issue_date?.slice(0, 10)}`, 140, 35);
    doc.text(`Due Date: ${inv.due_date?.slice(0, 10)}`, 140, 40);
    doc.text(`Status: ${inv.status}`, 140, 45);

    doc.setFontSize(12);
    doc.text('Bill To:', 14, 60);
    doc.setFontSize(10);
    doc.text(inv.customer_name || 'Valued Customer', 14, 66);
    if (inv.customer_email) doc.text(inv.customer_email, 14, 71);

    const tableColumn = ['Description', 'Qty', 'Unit Price', 'Line Total'];
    const tableRows = inv.items.map(item => [
        item.description || 'Item',
        item.quantity,
        `$${Number(item.unit_price).toFixed(2)}`,
        `$${(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}`
    ]);

    doc.autoTable({
        startY: 85,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: settings.primaryColor || '#f13c3c' }
    });

    const finalY = doc.lastAutoTable.finalY || 85;
    doc.setFontSize(12);
    doc.text(`Total Amount: $${Number(inv.total || 0).toFixed(2)}`, 140, finalY + 10);

    if (inv.notes) {
        doc.setFontSize(10);
        doc.text(`Notes: ${inv.notes}`, 14, finalY + 10);
    }

    await logAction('DOWNLOAD_INVOICE_PDF', `Downloaded PDF for invoice ${inv.invoice_number}`);
    doc.save(`${inv.invoice_number}.pdf`);
};
