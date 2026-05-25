import jsPDF from 'jspdf';
import { idbStore } from '../utils/db';
import { logAction } from './logService';

export const downloadLedgerPdf = async (filteredTx, monthFilter, totalIncome, totalExpense, net) => {
    const doc = new jsPDF();
    const settings = await idbStore.get('sms_letterhead') || {};
    const companyName = settings.companyName || 'My Awesome Store';

    doc.setFontSize(22);
    doc.setTextColor(settings.primaryColor || '#f13c3c');
    doc.text(companyName, 14, 22);

    doc.setFontSize(16);
    doc.setTextColor('#000');
    doc.text('Monthly Transaction Ledger', 14, 32);
    doc.setFontSize(10);
    doc.text(`Period: ${monthFilter}`, 14, 38);
    doc.text(`Total Income: $${totalIncome.toFixed(2)}`, 14, 48);
    doc.text(`Total Expense: $${totalExpense.toFixed(2)}`, 14, 54);
    doc.text(`Net Profit: $${net.toFixed(2)}`, 14, 60);

    const tableColumn = ['Date', 'Ref', 'Type', 'Description', 'Amount'];
    const tableRows = filteredTx.map(t => [
        t.date?.slice(0, 10),
        t.reference,
        t.type,
        t.description,
        `$${t.amount.toFixed(2)}`
    ]);

    doc.autoTable({
        startY: 68,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: settings.primaryColor || '#f13c3c' }
    });

    await logAction('DOWNLOAD_LEDGER', `Downloaded ledger for ${monthFilter}`);
    doc.save(`Ledger_${monthFilter.replace(' ', '_')}.pdf`);
};
