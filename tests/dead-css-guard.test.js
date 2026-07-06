const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ORDERS_DIR = path.join(__dirname, '..', 'orders');
const TOOLS_DIR = path.join(__dirname, '..', 'tools');
const SHARED_DIR = path.join(__dirname, '..', 'shared');
const REPO_ROOT = path.join(__dirname, '..');

/**
 * Collect all .html and .js file contents in the repo for cross-referencing
 * shared CSS files (which have no inline markup to check against).
 */
function collectRepoSources() {
    const sources = [];
    const dirsToScan = [ORDERS_DIR, TOOLS_DIR, SHARED_DIR, REPO_ROOT];
    const seen = new Set();
    for (const dir of dirsToScan) {
        if (!fs.existsSync(dir)) continue;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (!entry.isFile()) continue;
            if (!/\.(html|js)$/.test(entry.name)) continue;
            const full = path.join(dir, entry.name);
            if (seen.has(full)) continue;
            seen.add(full);
            sources.push(fs.readFileSync(full, 'utf8'));
        }
    }
    return sources;
}

/**
 * Extract all class selectors from a CSS file body (no <style> wrapper).
 * Ignores numbers, decimals, keyframe percentages, hex colors.
 * Strips @import url(...) lines first so URL domain segments (googleapis, com)
 * are not mistaken for class selectors.
 */
function extractCssClasses(cssContent) {
    const stripped = cssContent.replace(/@import\s+url\([^)]*\)/gi, '');
    const classSelectorRe = /\.([a-zA-Z0-9_-]+)(?=[^{},]*\{)/g;
    const selectors = new Set();
    let match;
    while ((match = classSelectorRe.exec(stripped)) !== null) {
        const className = match[1];
        if (!/^\d/.test(className)) {
            selectors.add(className);
        }
    }
    return Array.from(selectors);
}

function checkDeadCssClasses(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');

    // 1. Extract style block
    const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    if (!styleMatch) {
        return { selectors: [], dead: [] };
    }
    const styleContent = styleMatch[1];

    // 2. Find all class selectors (e.g. .class-name)
    // Avoid matching decimals like .9, keyframe percentages, or hex colors
    const classSelectorRe = /\.([a-zA-Z0-9_-]+)(?=[^{},]*\{)/g;
    const selectors = new Set();
    let match;
    while ((match = classSelectorRe.exec(styleContent)) !== null) {
        const className = match[1];
        // Ignore numbers/decimals
        if (!/^\d/.test(className)) {
            selectors.add(className);
        }
    }

    // 3. Extract the body (outside style tags) to search for usage
    // We search the entire file content, but class names can appear in HTML markup or JS code
    const dead = [];
    selectors.forEach(className => {
        // Construct regexes to check usage
        // Class attributes: class="className" or class='className' or class="other className"
        const classAttrRe = new RegExp(`class=["'][^"']*\\b${className}\\b[^"']*["']`, 'i');
        // JS classList: classList.add('className') or classList.remove("className") or className = 'className'
        const jsClassRe = new RegExp(`['"]${className}['"]`, 'i');
        
        const isUsedInHtml = classAttrRe.test(content);
        const isUsedInJs = jsClassRe.test(content);

        // Additional bypasses for standard base styles or shared structures
        const isSpecialBypass = [
            'theme-neutral', 'container', 'form-container', 'header', 'btn',
            'btn-print', 'btn-clear', 'results-container', 'print-btn', 'clear-btn',
            'inline-input-group', 'patient-field', 'flag-label', 'ac-disabled'
        ].includes(className);

        if (!isUsedInHtml && !isUsedInJs && !isSpecialBypass) {
            // Re-verify if referenced elsewhere in the content outside the <style> block
            const styleRemovedContent = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
            const countInBody = (styleRemovedContent.match(new RegExp(`\\b${className}\\b`, 'g')) || []).length;
            if (countInBody === 0) {
                dead.push(className);
            }
        }
    });

    return { selectors: Array.from(selectors), dead };
}

/**
 * Check a standalone .css file (shared/base.css, shared/print.css) for dead classes
 * by cross-referencing every class selector against ALL .html and .js files in the repo.
 */
function checkDeadCssInSharedFile(cssPath, repoSources) {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    const selectors = extractCssClasses(cssContent);
    const dead = [];

    const bypass = new Set([
        'theme-neutral', 'container', 'form-container', 'header', 'btn',
        'btn-print', 'btn-clear', 'results-container', 'print-btn', 'clear-btn',
        'inline-input-group', 'patient-field', 'flag-label', 'ac-disabled'
    ]);

    for (const className of selectors) {
        if (bypass.has(className)) continue;
        // Check if the class appears as a class attribute or a JS string literal
        // in ANY html/js file in the repo. JS className assignments often use
        // compound strings like 'nav-title nav-title-full', so we match the class
        // name after either a quote or a space within a quoted string.
        const classAttrRe = new RegExp(`class=["'][^"']*\\b${className}\\b[^"']*["']`, 'i');
        const jsClassRe = new RegExp(`["']\\s*[^"']*\\b${className}\\b[^"']*["']`, 'i');
        let used = false;
        for (const src of repoSources) {
            if (classAttrRe.test(src) || jsClassRe.test(src)) { used = true; break; }
        }
        if (!used) dead.push(className);
    }
    return { selectors, dead };
}

describe('Dead CSS Selector Guard', () => {
    const filesToCheck = [];
    
    if (fs.existsSync(ORDERS_DIR)) {
        fs.readdirSync(ORDERS_DIR).forEach(file => {
            if (file.endsWith('.html')) {
                filesToCheck.push({ name: `orders/${file}`, path: path.join(ORDERS_DIR, file) });
            }
        });
    }
    
    if (fs.existsSync(TOOLS_DIR)) {
        fs.readdirSync(TOOLS_DIR).forEach(file => {
            if (file.endsWith('.html')) {
                filesToCheck.push({ name: `tools/${file}`, path: path.join(TOOLS_DIR, file) });
            }
        });
    }

    // Include root-level index.html (has its own <style> block)
    const indexPath = path.join(__dirname, '..', 'index.html');
    if (fs.existsSync(indexPath)) {
        filesToCheck.push({ name: 'index.html', path: indexPath });
    }

    filesToCheck.forEach(({ name, path: filePath }) => {
        test(`All CSS classes in ${name} are referenced in markup or JS`, () => {
            const { dead, selectors } = checkDeadCssClasses(filePath);
            assert.equal(
                dead.length,
                0,
                `File ${name} defines CSS classes that are never used in markup or JS: ${JSON.stringify(dead)}. ` +
                `Total classes analyzed: ${selectors.length}`
            );
        });
    });

    // Shared standalone CSS files — cross-reference against the full repo
    const sharedCssFiles = ['base.css', 'print.css'];
    const repoSources = collectRepoSources();

    sharedCssFiles.forEach(cssFile => {
        const cssPath = path.join(SHARED_DIR, cssFile);
        if (!fs.existsSync(cssPath)) return;
        test(`All CSS classes in shared/${cssFile} are referenced somewhere in the repo`, () => {
            const { dead, selectors } = checkDeadCssInSharedFile(cssPath, repoSources);
            assert.equal(
                dead.length,
                0,
                `shared/${cssFile} defines CSS classes that are never used in any .html or .js file: ${JSON.stringify(dead)}. ` +
                `Total classes analyzed: ${selectors.length}`
            );
        });
    });
});
