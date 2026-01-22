const fs = require('fs');
const path = 'c:\\Users\\HP\\Downloads\\tdp21\\admin.js';

try {
    let content = fs.readFileSync(path, 'utf8');

    // Fix CSS
    content = content.replace(/border - radius/g, 'border-radius');
    content = content.replace(/box - shadow/g, 'box-shadow');
    content = content.replace(/z - index/g, 'z-index');
    content = content.replace(/min - width/g, 'min-width');
    content = content.replace(/cubic - bezier/g, 'cubic-bezier');
    content = content.replace(/border - radius/g, 'border-radius'); // repeat in case

    // Fix HTML Tags
    content = content.replace(/< a/g, '<a');
    content = content.replace(/<\/ a/g, '</a>');
    content = content.replace(/href =/g, 'href=');
    content = content.replace(/onclick =/g, 'onclick=');
    content = content.replace(/style =/g, 'style=');

    // Fix specific loose ones if any
    content = content.replace(/< \/ a >/g, '</a>');

    fs.writeFileSync(path, content, 'utf8');
    console.log('Fixed admin.js syntax');
} catch (e) {
    console.error('Error:', e);
}
