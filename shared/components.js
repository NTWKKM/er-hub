/**
 * shared/components.js
 * Centralized UI component generators and utilities for ED Standing Orders.
 */

const ED_COMPONENTS = {
    /**
     * Formats a date object to TH locale date string.
     */
    fmtDate: function(date) {
        if (!date) return '...';
        return date.toLocaleDateString('th-TH', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    /**
     * Formats a date object to TH locale time string.
     */
    fmtTime: function(date) {
        if (!date) return '...';
        return date.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit'
        }) + ' น.';
    },

    /**
     * Inject print header at specified container.
     */
    injectPrintHeader: function(elementId, dept = '....................', ward = '....................') {
        const el = document.getElementById(elementId);
        if (!el) return;
        
        el.innerHTML = `
            <div class="print-header">
                <h4>DOCTOR ORDER &amp; PROGRESS NOTE</h4>
                <strong>Maharat Nakhon Ratchasima Hospital</strong><br>
                <small>Department: <span id="p-dept-text">${dept}</span> | Ward: <span id="p-ward-text">${ward}</span></small>
            </div>
        `;
    },

    /**
     * Inject Patient Sticker Box at specified container.
     */
    injectStickerBox: function(elementId, hn = '--') {
        const el = document.getElementById(elementId);
        if (!el) return;

        el.innerHTML = `
            <div class="sticker-box-container">
                <div class="sticker-area">
                    <strong>ติดสติ๊กเกอร์ผู้ป่วย</strong>
                    <small>(Patient Sticker)</small>
                    <span id="sticker-hn-text" style="font-weight: bold; font-size: 11px; margin-top: 4px;"></span>
                </div>
            </div>
        `;
        // HN set via textContent — prevents XSS from user-entered patient identifiers
        const hnEl = document.getElementById('sticker-hn-text');
        if (hnEl) hnEl.textContent = 'HN: ' + hn;
    },

    /**
     * Update the generated timestamp text on the printed order.
     */
    updateGeneratedTime: function(elementId, dateObj = new Date()) {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.textContent = `${this.fmtDate(dateObj)} ${this.fmtTime(dateObj)}`;
    },

    /**
     * Update the printed department and ward text.
     */
    updateDeptWard: function(dept, ward) {
        const deptText = document.getElementById('p-dept-text');
        const wardText = document.getElementById('p-ward-text');
        if (deptText) deptText.textContent = dept || '...';
        if (wardText) wardText.textContent = ward || '...';
    },

    /**
     * Set up common event listeners (like print button).
     */
    setupCommonActions: function() {
        const printBtn = document.getElementById('print-btn');
        if (printBtn) {
            printBtn.addEventListener('click', () => window.print());
        }
    },

    /**
     * Inject a sticky top navigation bar with home link and auto-detected title.
     */
    injectNavBar: function(homeHref) {
        const href = homeHref || '../index.html';
        const title = (document.title || '').split('—')[0].trim();
        const nav = document.createElement('nav');
        nav.className = 'top-nav';
        nav.setAttribute('role', 'navigation');
        nav.innerHTML = `
            <a href="${href}" class="nav-home" aria-label="Home">Home</a>
            ${title ? `<span class="nav-title">${title}</span>` : ''}
        `;
        document.body.insertBefore(nav, document.body.firstChild);
    },

    /**
     * Show floating print action bar.
     */
    showFloatBar: function() {
        let bar = document.getElementById('float-print-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'float-print-bar';
            bar.className = 'float-print-bar';
            bar.innerHTML = 'Order พร้อมแล้ว &nbsp; <button class="btn-print-now" onclick="window.print()">พิมพ์ทันที</button> <button class="btn-view-order" onclick="document.getElementById(\'results-container\').scrollIntoView({behavior:\'smooth\'})">ดู Order</button>';
            document.body.appendChild(bar);
        }
        bar.style.display = 'flex';
    },

    /**
     * Hide floating print action bar.
     */
    hideFloatBar: function() {
        const bar = document.getElementById('float-print-bar');
        if (bar) bar.style.display = 'none';
    }
};

// Export for Node testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ED_COMPONENTS
    };
}
