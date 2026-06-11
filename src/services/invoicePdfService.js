import { idbStore } from '../utils/db';
import { buildInvoicePdf } from '../utils/invoicePdf';
import { printPdfDocument } from '../utils/pdfPrint';
import { logAction } from './logService';

export const downloadInvoicePdf = async (inv, storeInfo = {}) => {
    const letterhead = await idbStore.get('sms_letterhead') || {};
    const doc = buildInvoicePdf(inv, { storeInfo, letterhead });
    await logAction('PRINT_INVOICE_PDF', `Opened print dialog for invoice ${inv.invoice_number}`);
    await printPdfDocument(doc);
};
