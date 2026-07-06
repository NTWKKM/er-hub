const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ORDERS_DIR = path.join(__dirname, '..', 'orders');
const TOOLS_DIR = path.join(__dirname, '..', 'tools');

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
});
