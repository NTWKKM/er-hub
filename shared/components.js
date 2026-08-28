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
                    <strong>ติดสติกเกอร์ผู้ป่วย</strong>
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
        if (typeof document !== 'undefined' && document.querySelector('.top-nav')) {
            return;
        }
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

        // Right-aligned dynamic version badge automatically fetched from service-worker.js
        const verBadge = document.createElement('div');
        verBadge.className = 'nav-right';
        verBadge.id = 'nav-ver-display';
        verBadge.style.cssText = 'margin-left: auto; font-size: 11px; opacity: 0.85; font-family: var(--font-mono, monospace); padding-right: 4px; display: flex; align-items: center; color: #F0EDE5;';
        nav.appendChild(verBadge);

        const verText = document.createElement('span');
        verText.id = 'nav-ver-text';
        try {
            const cachedVer = localStorage.getItem('er-hub-cached-version');
            if (cachedVer) verText.textContent = cachedVer;
        } catch (_) {}
        verBadge.appendChild(verText);

        const statusDot = document.createElement('span');
        statusDot.id = 'online-status';
        statusDot.style.cssText = 'width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-left: 8px; flex-shrink: 0;';
        const isOnline = (typeof window !== 'undefined' && window.navigator && typeof window.navigator.onLine === 'boolean') ? window.navigator.onLine : (typeof navigator !== 'undefined' ? Boolean(navigator.onLine) : true);
        statusDot.style.backgroundColor = isOnline ? '#27ae60' : '#c0392b';
        statusDot.setAttribute('aria-label', isOnline ? 'Online' : 'Offline');
        statusDot.setAttribute('role', 'status');
        verBadge.appendChild(statusDot);
        
        window.addEventListener('online', () => {
            statusDot.style.backgroundColor = '#27ae60';
            statusDot.setAttribute('aria-label', 'Online');
        });
        window.addEventListener('offline', () => {
            statusDot.style.backgroundColor = '#c0392b';
            statusDot.setAttribute('aria-label', 'Offline');
        });

        // Determine relative path to service-worker.js based on homeHref
        let swPath = href ? href.replace(/(^|\/)(index\.html)?(\?.*)?(#.*)?$/, '$1service-worker.js') : 'service-worker.js';
        if (!swPath.endsWith('service-worker.js')) swPath = 'service-worker.js';

        if (typeof fetch === 'function') {
            fetch(swPath)
                .then(res => res.text())
                .then(code => {
                    const match = code.match(/CACHE_VERSION\s*=\s*['"]er-hub-(v\d+)['"]/i);
                    const dateMatch = code.match(/CACHE_DATE\s*=\s*['"]([^'"]+)['"]/i);
                    if (match && match[1]) {
                        const displayText = dateMatch && dateMatch[1] ? `${match[1]} · ${dateMatch[1]}` : match[1];
                        verText.textContent = displayText;
                        try { localStorage.setItem('er-hub-cached-version', displayText); } catch (_) {}
                    }
                })
                .catch(() => {
                    try {
                        const cachedVer = localStorage.getItem('er-hub-cached-version');
                        if (cachedVer && !verText.textContent) verText.textContent = cachedVer;
                    } catch (_) {}
                });
        }

        if (typeof document !== 'undefined' && !document.getElementById('ed-skip-link-style')) {
            const style = document.createElement('style');
            style.id = 'ed-skip-link-style';
            style.textContent = `
                .skip-link {
                    position: absolute;
                    top: -60px;
                    left: 0;
                    background: #1e3c72;
                    color: #F0EDE5;
                    padding: 8px 16px;
                    z-index: 9999;
                    font-family: var(--font-ui, 'Inter Tight', -apple-system, BlinkMacSystemFont, sans-serif);
                    font-size: 14px;
                    text-decoration: none;
                    transition: top 200ms ease;
                }
                .skip-link:focus {
                    top: 0;
                }
                @media print {
                    .skip-link {
                        display: none !important;
                    }
                }
            `;
            if (document.head) {
                document.head.appendChild(style);
            } else if (document.body) {
                document.body.appendChild(style);
            }
        }

        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-link';
        skipLink.textContent = 'Skip to content';
        document.body.insertBefore(skipLink, document.body.firstChild);
        document.body.insertBefore(nav, skipLink.nextSibling);
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
    },
    /**
     * Request persistent storage to prevent OS eviction of cached clinical data.
     * Call after first user interaction (e.g., clinical disclaimer accept).
     * iOS/Android may silently evict "best-effort" storage after 7-14 days.
     */
    ensurePersistentStorage: async function() {
        if (navigator.storage && navigator.storage.persist) {
            const isPersisted = await navigator.storage.persisted();
            if (!isPersisted) {
                await navigator.storage.persist();
            }
        }
    },

    /**
     * Ephemeral tab-session patient context bridge (Zero-PHI persistence).
     * Passes non-identifying parameters (age, weight, cr) seamlessly across tools in same session.
     */
    syncPatientContext: function(params) {
        try {
            if (!params || typeof params !== 'object') return;
            let current = {};
            const raw = sessionStorage.getItem('er-patient-ctx');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    current = parsed;
                }
            }
            if (params.age !== undefined) current.age = params.age;
            if (params.weight !== undefined) current.weight = params.weight;
            if (params.cr !== undefined) current.cr = params.cr;
            sessionStorage.setItem('er-patient-ctx', JSON.stringify(current));
        } catch (_) {}
    },

    getPatientContext: function() {
        try {
            const raw = sessionStorage.getItem('er-patient-ctx');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    return parsed;
                }
            }
            return {};
        } catch (_) {
            return {};
        }
    },

    /**
     * Modal focus & accessibility trap using HTML5 'inert' attribute (Baseline 2024-2026).
     */
    setModalInert: function(isOpen, modalEl) {
        if (!modalEl) return;
        const containers = document.querySelectorAll('body > *:not(dialog):not([popover])');
        containers.forEach(el => {
            if (el !== modalEl && !el.contains(modalEl)) {
                if (isOpen) {
                    el.setAttribute('inert', '');
                } else {
                    el.removeAttribute('inert');
                }
            }
        });
    }
};

// Expose to window for browser script environments
if (typeof window !== 'undefined') {
    window.ED_COMPONENTS = ED_COMPONENTS;
}

// Export for Node testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ED_COMPONENTS
    };
}
