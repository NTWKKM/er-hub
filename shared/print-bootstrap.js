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
            printBlankFn();
            window.print();
            return true;
        }
        return false;
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
        const dateStr = useCurrentTime ? ED_COMPONENTS.fmtDate(now) : '....................';
        const timeStr = useCurrentTime ? ED_COMPONENTS.fmtTime(now) : '....................';
        return `${dateStr}<br>${timeStr}`;
    },

    /**
     * Get blank date/time HTML string.
     * @returns {string} blank date/time HTML
     */
    getBlankDateTimeHTML() {
        return 'วันที่ .................... เวลา ....................';
    }
};

// Export for Node testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ED_PRINT_BOOTSTRAP };
}