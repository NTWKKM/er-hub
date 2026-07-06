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
    parseTitle: function(title) {
        let titleFull = title;
        let titleShort = title;
        
        if (title && title.includes('—')) {
            const parts = title.split('—');
            const namePart = parts[0].trim();
            const detailPart = parts[1].trim();
            
            let coreName = namePart
                .replace('Standing Order', '')
                .replace('Generator', '')
                .replace('Protocol', '')
                .replace('FAST TRACK', '')
                .replace('Fibrinolysis', '')
                .replace('Post-Intubation', '')
                .replace(/\bOrder\b/g, '')
                .replace(/\s+/g, ' ')
                .trim();
                
            if (coreName === 'IV Infusion Drip Calculator') {
                coreName = 'Drip Calc';
            } else if (coreName === 'rt-PA Dose Calculator') {
                coreName = 'rt-PA Calc';
            }
            
            let versionStr = '';
            const verMatch = detailPart.match(/Version\s*(\d+\.\d+(\.\d+)?)/i);
            if (verMatch) {
                versionStr = `V${verMatch[1]}`;
            }
            
            titleShort = `${coreName} ${versionStr}`.trim();
        }
        return { titleFull, titleShort };
    },

    injectNavBar: function(homeHref, logoSrc, pageTitle, shortTitle) {
        const href = homeHref || '../index.html';
        // pageTitle can be: undefined (auto-detect from document.title), empty string (suppress), or explicit string
        let title;
        if (pageTitle === undefined) {
            title = (document.title || '').split('—')[0].trim();
        } else {
            title = pageTitle;
        }
        if (title) {
            title = title.replace(/&nbsp;/g, '\u00A0');
        }
        
        const titleFull = title;
        const titleShort = shortTitle || this.parseTitle(title).titleShort;
        
        const nav = document.createElement('nav');
        nav.className = 'top-nav';
        nav.setAttribute('role', 'navigation');

        if (logoSrc) {
            const img = document.createElement('img');
            img.src = logoSrc;
            img.className = 'nav-logo';
            img.alt = 'Maharat Nakhon Ratchasima Hospital';
            nav.appendChild(img);
        }

        const homeLink = document.createElement('a');
        homeLink.href = href;
        homeLink.className = 'nav-home';
        homeLink.setAttribute('aria-label', 'Home');
        homeLink.textContent = 'Home';
        nav.appendChild(homeLink);

        if (title) {
            if (titleFull !== titleShort) {
                const fullSpan = document.createElement('span');
                fullSpan.className = 'nav-title nav-title-full';
                fullSpan.setAttribute('aria-label', titleFull);
                fullSpan.textContent = titleFull;

                const shortSpan = document.createElement('span');
                shortSpan.className = 'nav-title nav-title-short';
                shortSpan.setAttribute('aria-label', titleShort);
                shortSpan.textContent = titleShort;

                nav.appendChild(fullSpan);
                nav.appendChild(shortSpan);
            } else {
                const titleSpan = document.createElement('span');
                titleSpan.className = 'nav-title';
                titleSpan.setAttribute('aria-label', title);
                titleSpan.textContent = title;
                nav.appendChild(titleSpan);
            }
        }

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
