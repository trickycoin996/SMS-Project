/**
 * Opens the native print dialog for a completed jsPDF document.
 * Call after the PDF content (including autoTable) is fully built.
 */
export const printPdfDocument = (doc) => {
    return new Promise((resolve, reject) => {
        if (!doc || typeof doc.output !== 'function') {
            reject(new Error('Invalid PDF document.'));
            return;
        }

        let pdfUrl = null;
        let revokeOnCleanup = false;

        try {
            if (typeof doc.output === 'function') {
                try {
                    pdfUrl = doc.output('bloburl');
                } catch {
                    const blob = doc.output('blob');
                    pdfUrl = URL.createObjectURL(blob);
                    revokeOnCleanup = true;
                }
            }
        } catch (err) {
            reject(new Error('Failed to generate PDF for printing.'));
            return;
        }

        if (!pdfUrl) {
            reject(new Error('Failed to generate PDF URL.'));
            return;
        }

        const cleanup = (iframe) => {
            if (revokeOnCleanup && pdfUrl) URL.revokeObjectURL(pdfUrl);
            if (iframe?.parentNode) iframe.parentNode.removeChild(iframe);
        };

        const runPrint = (targetWindow) => {
            if (!targetWindow) return false;
            try {
                targetWindow.focus();
                targetWindow.print();
                return true;
            } catch (err) {
                console.warn('print() failed:', err);
                return false;
            }
        };

        let settled = false;
        const finish = (err, iframe) => {
            if (settled) return;
            settled = true;
            setTimeout(() => cleanup(iframe), 2000);
            if (err) reject(err);
            else resolve();
        };

        const printWindow = window.open(pdfUrl, '_blank');
        if (printWindow) {
            printWindow.addEventListener('load', () => setTimeout(() => runPrint(printWindow), 400));
            setTimeout(() => runPrint(printWindow), 1000);
            setTimeout(() => finish(null), 500);
            return;
        }

        const iframe = document.createElement('iframe');
        iframe.title = 'Print preview';
        iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:99999;opacity:0;pointer-events:none;';
        document.body.appendChild(iframe);

        const tryIframe = () => {
            if (runPrint(iframe.contentWindow)) finish(null, iframe);
        };

        iframe.onload = () => setTimeout(tryIframe, 500);
        iframe.src = pdfUrl;

        setTimeout(tryIframe, 1500);
        setTimeout(() => {
            if (!settled) {
                finish(new Error('Pop-up blocked. Allow pop-ups for this site, then click Print again.'), iframe);
            }
        }, 5000);
    });
};
