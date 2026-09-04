/**
 * shared/print-bootstrap.js
 * Shared print-blank-direct detection, results display, and clear-button wiring.
 * Eliminates the identical DOMContentLoaded-end pattern duplicated across 7 order pages.
 */

const ED_PRINT_BOOTSTRAP = {
    /**
     * Checks for ?print-blank-direct=true URL param and triggers blank print.
     * Must be called at the END of DOMContentLoaded (after all listeners registered).
     * @param {function} printBlankFn - callback to trigger blank print
     * @returns {boolean} true if print-blank-direct was triggered (caller should return)
     */
    handlePrintBlankDirect(printBlankFn) {
        if (new URLSearchParams(window.location.search).get('print-blank-direct') === 'true') {
            // printBlankFn triggers the blank-template apply + window.print() via the
            // page's own button handler — no second window.print() here to avoid a
            // double print dialog on the cold-load kiosk path (nstemi/rtpa).
            printBlankFn();
            return true;
        }
        return false;
    },

    /**
     * Checks for ?print-blank-direct=true URL param and redirects to PDF.
     * Used by order pages whose blank template is a PDF in docs/.
     * @param {string} pdfPath - relative path to PDF (e.g. '../docs/STEMI-PE/STEMI new 26-4doc.pdf')
     * @returns {boolean} true if print-blank-direct was triggered (caller should return)
     */
    handlePrintBlankDirectPdf(pdfPath) {
        if (new URLSearchParams(window.location.search).get('print-blank-direct') === 'true') {
            window.location.href = encodeURI(pdfPath);
            return true;
        }
        return false;
    },

    /**
     * Open a blank-order PDF in a new browser tab.
     * Browser native PDF viewer handles display; user presses print manually.
     * @param {string} pdfPath - relative path to PDF (e.g. '../docs/STEMI-PE/STEMI new 26-4doc.pdf')
     */
    openBlankPdf(pdfPath) {
        window.open(encodeURI(pdfPath), '_blank');
    },

    /**
     * Show results container, float bar, and scroll to bottom.
     * Called after both generate and blank-print.
     */
    showResults() {
        const rc = document.getElementById('results-container');
        if (rc) rc.classList.remove('hidden');
        ED_COMPONENTS.showFloatBar();
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    },

    /**
     * Hide results, hide float bar, focus HN input.
     * Called by clear button on all order pages.
     * @param {string} formId - form element ID to reset
     * @param {function} [extraClearFn] - optional extra cleanup (e.g. reset card selections)
     */
    clearResults(formId, extraClearFn) {
        const form = document.getElementById(formId);
        if (form) form.reset();
        const rc = document.getElementById('results-container');
        if (rc) rc.classList.add('hidden');
        ED_COMPONENTS.hideFloatBar();
        if (typeof extraClearFn === 'function') extraClearFn();
        const hn = document.getElementById('hn');
        if (hn) hn.focus();
    },

    /**
     * Generate date/time string for print output.
     * @param {boolean} useCurrentTime - whether to use current time or dotted lines
     * @param {Date} [dateObj] - date object (defaults to now)
     * @returns {string} HTML string with date<br>time
     */
    getDateTimeHTML(useCurrentTime, dateObj) {
        const now = dateObj || new Date();
        const dateStr = useCurrentTime ? ED_COMPONENTS.fmtDate(now) : '_____/_____/_________';
        const timeStr = useCurrentTime ? ED_COMPONENTS.fmtTime(now) : '____:____ น.';
        return `${dateStr}<br>${timeStr}`;
    },

    /**
     * Get blank date/time HTML string.
     * @returns {string} blank date/time HTML
     */
    getBlankDateTimeHTML() {
        return 'วันที่ .................... เวลา ....................';
    },

    /**
     * Boilerplate reduction for order page print generation.
     * Injects headers, stickers, hn, weight, date/time, and generation stamp.
     * @param {string} hn - Patient HN
     * @param {number|string} weight - Patient weight
     * @param {boolean} useCurrentTime - Whether to use current time or dotted lines
     * @returns {Date} The generation timestamp
     */
    generateCommonPrintFields(hn, weight, useCurrentTime) {
        const now = new Date();
        const dtHtml = this.getDateTimeHTML(useCurrentTime, now);
        
        ED_COMPONENTS.injectPrintHeader('print-header-container');
        ED_COMPONENTS.injectStickerBox('print-sticker-container', hn);
        
        const phn = document.getElementById('p-hn');
        if (phn) phn.textContent = hn;
        
        const pweight = document.getElementById('p-weight');
        if (pweight) pweight.textContent = typeof weight === 'number' ? weight.toFixed(1) : weight;
        
        const dt1 = document.getElementById('p-dt-1');
        if (dt1) dt1.innerHTML = dtHtml;
        
        const dt2 = document.getElementById('p-dt-2');
        if (dt2) dt2.innerHTML = dtHtml;
        
        ED_COMPONENTS.updateGeneratedTime('p-generated', now);
        
        return now;
    }
};

// Export for Node testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ED_PRINT_BOOTSTRAP };
}