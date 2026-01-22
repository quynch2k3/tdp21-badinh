const fs = require('fs');

try {
    // 1. Read the corrupted style.css
    const content = fs.readFileSync('style.css', 'utf8');
    const lines = content.split(/\r?\n/);

    // 2. Keep only valid lines (0 to 1151, which encompasses the 1152 lines)
    // Line 1152 in editor is index 1151.
    // The last valid line observed was "    background-color: #6c757d;" which is line 1152.
    // So we slice 0 to 1152 loops.

    const validLines = lines.slice(0, 1152);

    // 3. Add closing brace for the last block
    validLines.push('}');

    // 4. Read the new premium CSS
    const premiumCss = fs.readFileSync('donation_premium.css', 'utf8');

    // 5. Combine and Write
    const finalContent = validLines.join('\n') + '\n\n' + premiumCss;
    fs.writeFileSync('style.css', finalContent, 'utf8');

    console.log("Successfully fixed style.css");
} catch (e) {
    console.error("Error fixing CSS:", e);
}
