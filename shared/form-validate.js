/**
 * shared/form-validate.js
 * Non-blocking form validation — replaces alert() calls across all order pages.
 * Uses existing .field-error CSS class for input highlighting.
 * Adds inline error messages and clinical warning banners.
 */

const ED_VALIDATE = {
    _warningEl: null,

    /**
     * Mark a field as failed: add .field-error, show inline message, focus.
     * @returns false (for use in `if (!ED_VALIDATE.fail(...)) return;`)
     */
    fail(inputId, message) {
        const el = document.getElementById(inputId);
        if (!el) return false;
        el.classList.add('field-error');
        const container = el.closest('.inline-input-group') || el.parentElement;
        // Remove existing error message
        const next = container.nextElementSibling;
        if (next && next.classList.contains('inline-error-msg')) next.remove();
        // Insert new error message
        const msg = document.createElement('div');
        msg.className = 'inline-error-msg';
        msg.textContent = message;
        container.insertAdjacentElement('afterend', msg);
        el.focus();
        return false;
    },

    /**
     * Clear error state from a field.
     * @returns true
     */
    clear(inputId) {
        const el = document.getElementById(inputId);
        if (!el) return true;
        el.classList.remove('field-error');
        const container = el.closest('.inline-input-group') || el.parentElement;
        const next = container.nextElementSibling;
        if (next && next.classList.contains('inline-error-msg')) next.remove();
        return true;
    },

    /**
     * Validate numeric input is within range [min, max].
     * @returns true if valid, false if invalid (fail applied)
     */
    range(inputId, min, max, message) {
        const el = document.getElementById(inputId);
        if (!el) return false;
        const val = parseFloat(el.value);
        if (isNaN(val) || val < min || val > max) {
            return this.fail(inputId, message);
        }
        return this.clear(inputId);
    },

    /**
     * Validate numeric input is at least minVal.
     */
    min(inputId, minVal, message) {
        const el = document.getElementById(inputId);
        if (!el) return false;
        const val = parseFloat(el.value);
        if (isNaN(val) || val < minVal) {
            return this.fail(inputId, message);
        }
        return this.clear(inputId);
    },

    /**
     * Show a non-blocking clinical warning banner (replaces blocking alert() for safety alerts).
     * Banner appears below the form header. Auto-clears previous warning.
     */
    warn(message) {
        this.clearWarn();
        const banner = document.createElement('div');
        banner.className = 'clinical-warning';
        banner.textContent = message;
        const fc = document.querySelector('.form-container');
        if (fc) {
            const header = fc.querySelector('.header');
            if (header) header.insertAdjacentElement('afterend', banner);
            else fc.insertBefore(banner, fc.firstChild);
        }
        this._warningEl = banner;
        return false;
    },

    /**
     * Clear all clinical warning banners.
     */
    clearWarn() {
        document.querySelectorAll('.clinical-warning').forEach(el => el.remove());
        this._warningEl = null;
    },

    /**
     * Clear all field errors, inline messages, and warnings.
     * Called by clear button.
     */
    clearAll() {
        document.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));
        document.querySelectorAll('.inline-error-msg').forEach(el => el.remove());
        this.clearWarn();
    }
};

// Export for Node testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ED_VALIDATE };
}