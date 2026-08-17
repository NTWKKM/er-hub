const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ORDERS_DIR = path.join(__dirname, '..', 'orders');
const TOOLS_DIR = path.join(__dirname, '..', 'tools');

function checkFileIdIntegrity(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');

    // 1. Find all declared IDs in the DOM
    const declaredIds = new Set();
    const idDeclRe = /\bid=["']([^"']+)["']/g;
    let declMatch;
    while ((declMatch = idDeclRe.exec(content)) !== null) {
        declaredIds.add(declMatch[1]);
    }

    // 2. Find all referenced IDs in JS
    const referencedIds = new Set();

    const refsPatterns = [
        /\$\(\s*['"]([^'"]+)['"]\s*\)/g,
        /document\.getElementById\(\s*['"]([^'"]+)['"]\s*\)/g,
        /\bid:\s*['"]([^'"]+)['"]/g,
        /ED_VALIDATE\.(?:fail|range|min)\(\s*['"]([^'"]+)['"]/g,
        /ED_COMPONENTS\.(?!injectNavBar)[a-zA-Z_]+\(\s*['"]([^'"]+)['"]/g
    ];

    refsPatterns.forEach(pattern => {
        let match;
        pattern.lastIndex = 0;
        while ((match = pattern.exec(content)) !== null) {
            referencedIds.add(match[1]);
        }
    });

    // 3. Assert each referenced ID exists in declared IDs
    const missing = [];
    referencedIds.forEach(id => {
        if (!declaredIds.has(id)) {
            missing.push(id);
        }
    });

    return { referencedIds, declaredIds, missing };
}

describe('DOM ID Integrity Guard', () => {
    const filesToCheck = [];
    
    if (fs.existsSync(ORDERS_DIR)) {
        fs.readdirSync(ORDERS_DIR).forEach(file => {
            if (file.endsWith('.html')) {
                filesToCheck.push({ name: `orders/${file}`, path: path.join(ORDERS_DIR, file) });
            }
        });
    }
    
    if (fs.existsSync(TOOLS_DIR)) {
        fs.readdirSync(TOOLS_DIR, { withFileTypes: true }).forEach(entry => {
            if (entry.isFile() && entry.name.endsWith('.html')) {
                filesToCheck.push({ name: `tools/${entry.name}`, path: path.join(TOOLS_DIR, entry.name) });
            } else if (entry.isDirectory()) {
                // Recurse into subdirectories (e.g. tools/er-note/)
                const subDir = path.join(TOOLS_DIR, entry.name);
                fs.readdirSync(subDir).forEach(file => {
                    if (file.endsWith('.html')) {
                        filesToCheck.push({ name: `tools/${entry.name}/${file}`, path: path.join(subDir, file) });
                    }
                });
            }
        });
    }

    filesToCheck.forEach(({ name, path: filePath }) => {
        test(`All referenced JS elements in ${name} exist in DOM`, () => {
            const { missing, referencedIds } = checkFileIdIntegrity(filePath);
            assert.equal(
                missing.length,
                0,
                `File ${name} references elements that do not exist in the DOM: ${JSON.stringify(missing)}. ` +
                `Total referenced: ${referencedIds.size}`
            );
        });
    });
});
