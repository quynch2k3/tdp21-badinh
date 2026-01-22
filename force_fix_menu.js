const fs = require('fs');
const path = 'c:\\Users\\HP\\Downloads\\tdp21\\admin.js';

try {
    let content = fs.readFileSync(path, 'utf8');

    // The new function code
    const newFunction = `// 2. GLOBAL FLOATING MENU (PORTAL PATTERN)
function toggleActionMenu(btn, id, verified, status) {
    console.log('toggleActionMenu CLICKED', id, verified, status);
    
    // Close existing
    const existing = document.getElementById('global-admin-menu');
    if (existing) existing.remove();

    // Create Menu Element
    const menu = document.createElement('div');
    menu.id = 'global-admin-menu';
    menu.style.position = 'fixed';
    menu.style.background = '#ffffff';
    menu.style.border = '1px solid #e2e8f0';
    menu.style.borderRadius = '8px';
    menu.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)';
    menu.style.zIndex = '999999';
    menu.style.minWidth = '200px';
    menu.style.overflow = 'hidden';
    menu.style.opacity = '1';
    menu.style.transform = 'translateY(0) scale(1)';
    menu.style.padding = '5px';

    // Define Content
    let content = '';
    if (verified) {
        content = \`
            <a href="javascript:void(0)" onclick="updateDonationStatus('\${id}', 'hold'); closeGlobalMenu()" style="display:flex; align-items:center; gap:10px; padding:10px 12px; color:#d97706; text-decoration:none; font-size:13px; border-radius:6px; transition:background 0.1s;"><i class="fa-solid fa-rotate-left" style="width:16px;"></i> Hoàn tác (Treo lại)</a>
            <a href="javascript:void(0)" onclick="deleteDonation('\${id}'); closeGlobalMenu()" style="display:flex; align-items:center; gap:10px; padding:10px 12px; color:#ef4444; text-decoration:none; font-size:13px; border-radius:6px; transition:background 0.1s;"><i class="fa-solid fa-trash" style="width:16px;"></i> Xóa dữ liệu</a>
        \`;
    } else {
        content = \`
            <a href="javascript:void(0)" onclick="updateDonationStatus('\${id}', 'approve'); closeGlobalMenu()" style="display:flex; align-items:center; gap:10px; padding:10px 12px; color:#16a34a; text-decoration:none; font-size:13px; border-radius:6px; transition:background 0.1s;"><i class="fa-solid fa-check" style="width:16px;"></i> Duyệt ngay</a>
            <a href="javascript:void(0)" onclick="updateDonationStatus('\${id}', 'reject_spam'); closeGlobalMenu()" style="display:flex; align-items:center; gap:10px; padding:10px 12px; color:#64748b; text-decoration:none; font-size:13px; border-radius:6px; transition:background 0.1s;"><i class="fa-solid fa-ban" style="width:16px;"></i> Đánh dấu Spam</a>
            <a href="javascript:void(0)" onclick="updateDonationStatus('\${id}', 'hold'); closeGlobalMenu()" style="display:flex; align-items:center; gap:10px; padding:10px 12px; color:#d97706; text-decoration:none; font-size:13px; border-radius:6px; transition:background 0.1s;"><i class="fa-solid fa-clock" style="width:16px;"></i> Treo / Tạm giữ</a>
            <div style="height:1px; background:#f1f5f9; margin:4px 0;"></div>
            <a href="javascript:void(0)" onclick="deleteDonation('\${id}'); closeGlobalMenu()" style="display:flex; align-items:center; gap:10px; padding:10px 12px; color:#ef4444; text-decoration:none; font-size:13px; border-radius:6px; transition:background 0.1s;"><i class="fa-solid fa-trash" style="width:16px;"></i> Xóa vĩnh viễn</a>
        \`;
    }

    menu.innerHTML = content;
    document.body.appendChild(menu);

    // Hover Effect via JS
    const links = menu.querySelectorAll('a');
    links.forEach(a => {
        a.onmouseenter = () => a.style.background = '#f8fafc';
        a.onmouseleave = () => a.style.background = 'transparent';
    });

    // Positioning logic
    if (btn && btn.getBoundingClientRect) {
        const rect = btn.getBoundingClientRect();
        const menuWidth = 200;
        
        let left = rect.right - menuWidth;
        let top = rect.bottom + 5;

        if (left < 10) left = 10;
        if (top + 200 > window.innerHeight) {
            top = rect.top - 200; 
        }

        menu.style.left = left + 'px';
        menu.style.top = top + 'px';
        console.log('Menu appended at', left, top);
    } else {
        console.error('Button element missing in toggleActionMenu');
    }

    // Click Outside
    setTimeout(() => {
        document.addEventListener('click', closeGlobalMenu);
        document.addEventListener('scroll', closeGlobalMenu, true); 
    }, 100);
}`;

    // Robust Replacement logic
    const startMarker = '// 2. GLOBAL FLOATING MENU (PORTAL PATTERN)';
    const endMarker = 'function closeGlobalMenu() {';

    const startIndex = content.lastIndexOf(startMarker);
    const endIndex = content.indexOf(endMarker, startIndex);

    if (startIndex !== -1 && endIndex !== -1) {
        console.log('Found block at:', startIndex, endIndex);
        const before = content.substring(0, startIndex);
        const after = content.substring(endIndex);
        const newContent = before + newFunction + '\n\n' + after;
        fs.writeFileSync(path, newContent, 'utf8');
        console.log('Successfully updated toggleActionMenu');
    } else {
        console.log('Could not find marker blocks. Start:', startIndex, 'End:', endIndex);
    }
} catch (e) {
    console.error('Error:', e);
}
