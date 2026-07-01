/**
 * shared/blank-print-engine.js
 * Declarative blank-print reset engine.
 * Fixes the ADR-10 bug class at the root: each order page declares what to reset
 * once, instead of hand-writing a 20-50 line reset block that drifts.
 *
 * Usage:
 *   ED_BLANK_PRINT.register([
 *     { id: 'p-hn', value: '....................' },           // textContent reset
 *     { id: 'p-fen-bolus', html: '☐ Fentanyl ...' },            // innerHTML reset
 *     { selector: '.chk-clopidogrel', checked: false },          // checkbox reset
 *     { id: 'p-dt-1', html: ED_PRINT_BOOTSTRAP.getBlankDateTimeHTML() },
 *   ]);
 *   // Later, in blank-print handler:
 *   ED_BLANK_PRINT.apply();
 */

const ED_BLANK_PRINT = {
    _manifest: [],

    /**
     * Register a manifest of reset rules.
     * @param {Array} manifest - array of reset rules
     * Each rule: { id: 'elemId', value: '...' } → textContent
     *           { id: 'elemId', html: '...' }  → innerHTML
     *           { selector: '.class', checked: false } → checkbox.checked
     *           { id: 'elemId', className: 'fib-order-box' } → override class
     *           { id: 'elemId', style: { display: 'none' } } → style props
     */
    register(manifest) {
        this._manifest = manifest;
    },

    /**
     * Apply all registered reset rules.
     */
    apply() {
        this._manifest.forEach(item => {
            let els = [];
            if (item.id) {
                const el = document.getElementById(item.id);
                if (el) els = [el];
            } else if (item.selector) {
                els = document.querySelectorAll(item.selector);
            }

            els.forEach(el => {
                if ('checked' in item) el.checked = item.checked;
                else if ('html' in item) el.innerHTML = item.html;
                else if ('value' in item) el.textContent = item.value;
                else if ('className' in item) el.className = item.className;
                else if ('style' in item) Object.assign(el.style, item.style);
            });
        });
    }
};

// Export for Node testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ED_BLANK_PRINT };
}