/**
 * ADMIN LOGIC - FIREBASE EDITION
 * Restored & Consolidated
 */

// Global State
const paginationState = {
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0,
    filteredRecords: []
};
let currentlySelectedFund = null;
let currentDonationStatus = 'all';

// --- AUTH SYSTEM ---

document.addEventListener('DOMContentLoaded', async () => {
    initEditor();

    firebase.auth().onAuthStateChanged((user) => {
        if (user) onLoginSuccess(user.email);
        else document.querySelector('.login-container').style.display = 'flex';
    });

    document.addEventListener('submit', (e) => e.preventDefault());
});

/**
 * UI HELPERS
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    if (!sidebar) return;

    const isDesktop = window.innerWidth > 768;
    if (isDesktop) {
        const isCollapsed = sidebar.style.left === '-280px';
        sidebar.style.left = isCollapsed ? '0' : '-280px';
        if (mainContent) mainContent.style.marginLeft = isCollapsed ? 'var(--sidebar-width)' : '0';
    } else {
        sidebar.style.left = (sidebar.style.left === '0px') ? '-280px' : '0px';
    }
}

async function attemptLogin() {
    let email = document.getElementById('login-input').value;
    const pass = document.getElementById('login-pass').value;
    const msg = document.getElementById('login-msg');

    // AGGRESSIVE CLEANING: Whitelist mode - Only allow Letters, Numbers, @, dot, underscore, dash.
    // This removes zero-width spaces, tabs, regular spaces, etc.
    email = email.replace(/[^a-zA-Z0-9@._-]/g, '');
    document.getElementById('login-input').value = email; // Visual feedback

    if (!email || !pass) {
        msg.innerText = "Vui lòng nhập đầy đủ thông tin!";
        return;
    }

    msg.innerText = "Đang kết nối...";

    try {
        await firebase.auth().signInWithEmailAndPassword(email, pass);
        // onAuthStateChanged will handle the rest
    } catch (e) {
        console.error("Login Error:", e);
        msg.innerText = "Đăng nhập thất bại: " + e.message;
    }
}

function onLoginSuccess(email) {
    const overlay = document.getElementById('login-overlay');
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.display = 'none'; }, 500);

    document.getElementById('admin-welcome').innerText = `Chào, ${email}`;
    loadAllData();
    switchView('view-dashboard');
    showToast("Đăng nhập thành công!", "success");

    // Check Permissions based on email lookup
    checkUserRoleAndPermissions(email);
}

async function checkUserRoleAndPermissions(email) {
    // 1. Defaul as Member (Hidden everything)
    const sidebar = document.querySelector('.sidebar');
    const allMenuItems = document.querySelectorAll('.menu-item');

    // Fetch Role
    let role = 'admin'; // Default for fallback (or restrict?) -> Let's Default to 'editor' for safety if not found? 
    // Actually, asking for Admin rights is safer.

    try {
        const snap = await db.collection('users').where('email', '==', email).get();
        if (!snap.empty) {
            role = snap.docs[0].data().role || 'admin';
        }
    } catch (e) { console.error("Role check failed", e); }

    console.log("Current Role:", role);
    window.currentUserRole = role;

    // 2. Apply UI Rules
    // Map: 'view-id' -> allowed roles
    const rules = {
        'view-dashboard': ['admin', 'moderator', 'editor'],
        'view-articles': ['admin', 'editor'],
        'view-pages': ['admin', 'editor'],
        'view-feedback': ['admin', 'moderator'],
        'view-funds': ['admin', 'moderator'], // Mods can view funds? Let's say yes for transparency
        'view-donations': ['admin', 'moderator'],
        'view-settings': ['admin'],
        'view-users': ['admin']
    };

    // Menu Items: We need to know which item links to which view.
    // The clickable items have `onclick="switchView('view-X')"`
    allMenuItems.forEach(item => {
        const attr = item.getAttribute('onclick');
        if (attr && attr.includes('switchView')) {
            const viewName = attr.match(/'([^']+)'/)[1];
            if (rules[viewName] && !rules[viewName].includes(role)) {
                item.style.display = 'none';
            } else {
                item.style.display = 'flex';
            }
        }
    });

    // Determine Start View
    if (role === 'moderator') switchView('view-donations');
    else if (role === 'editor') switchView('view-articles');
    else switchView('view-dashboard'); // admin
}

function logout() {
    firebase.auth().signOut().then(() => {
        location.reload();
    });
}


// --- DATA LOADING ---

async function loadAllData() {
    try {
        await Promise.all([loadArticles(), loadPages(), loadDonations(), loadSettings(), loadUsers(), loadFeedback()]);
    } catch (e) {
        console.error("Load Data Error:", e);
    }
}

// HELPER: Extract Custom Date from Tags (Firebase Backup)
function extractCustomDate(item) {
    if (!item.tags) return null;
    const match = item.tags.match(/date:([^,]+)/);
    return match ? match[1].trim() : null;
}


// PREVENT ACCIDENTAL RELOAD/EXIT
window.addEventListener('beforeunload', function (e) {
    // Only ask if user has unsaved changes (optional, but for now we do it globally to stop the "Reset" bug)
    // If you want to be smarter: check if current view is editor
    const isEditorOpen = document.getElementById('view-editor').style.display === 'block';

    // If editor is open, or just generically to debug the "Reset" issue
    if (isEditorOpen) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires this
    }
});

// 1. ARTICLES
async function loadArticles() {
    try {
        // Fetch all articles
        // Firebase specific: ensure index exists for 'date' field if sorting
        const snapshot = await db.collection('articles').orderBy('date', 'desc').get();
        // Fallback if index missing or error, try unsorted

        const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const tbody = document.getElementById('article-list');
        window.allArticles = records; // Store for stats

        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Chưa có bài viết nào.</td></tr>';
            updateDashboardStats();
            return;
        }

        renderArticles(records);
        renderDashboardNews(records);
        updateDashboardStats();

    } catch (e) {
        console.error("Load Articles Error:", e);
        // If index error, try without sort
        if (e.code === 'failed-precondition') {
            console.warn("Index missing, loading unsorted...");
            const snapshot = await db.collection('articles').get();
            const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderArticles(records);
        } else {
            showToast("Lỗi tải bài viết: " + e.message, "error");
        }
    }
}


function updateDashboardStats() {
    // 1. Total Articles
    const articles = window.allArticles || [];
    document.getElementById('stat-articles').innerText = articles.length;

    // 2. Total Pages
    const pages = window.allPages || [];
    document.getElementById('stat-pages').innerText = pages.length;

    // 3. Total Views (Sum of views from all articles)
    const totalViews = articles.reduce((sum, item) => sum + (item.views || 0), 0);
    document.getElementById('stat-views').innerText = totalViews.toLocaleString('vi-VN');
}

function renderArticles(data) {
    const tbody = document.getElementById('article-list');
    tbody.innerHTML = data.map(item => `
        <tr>
            <td style="text-align:center;">
                <input type="checkbox" class="art-select" value="${item.id}" onchange="updateBulkActionState()">
            </td>
            <td><small>#${item.id.substr(0, 5)}</small></td>
            <td style="color:#666;">${item.date || 'Chưa có ngày'}</td>
            <td style="font-weight:bold; color:var(--primary-blue);">${item.title}</td>
            <td><span class="badge badge-warning">${item.category}</span></td>
            <td>
                ${item.status === 'Draft'
            ? '<span class="badge" style="background:#ddd">Bản Nháp</span>'
            : '<span class="badge badge-success">Công Khai</span>'}
            </td>
            <td>${item.views || 0}</td>
            <td style="display:flex; justify-content:center; gap:5px;">
                <button class="btn btn-secondary btn-sm" onclick="openEditor('${item.id}')" title="Sửa"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteItem('articles', '${item.id}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');

    // Reset Checkboxes
    document.getElementById('selectAllArticles').checked = false;
    updateBulkActionState();
}

// --- BULK ACTIONS ---

function toggleSelectAll(source) {
    const checkboxes = document.querySelectorAll('.art-select');
    checkboxes.forEach(cb => {
        cb.checked = source.checked;
    });
    updateBulkActionState();
}

function updateBulkActionState() {
    const selected = document.querySelectorAll('.art-select:checked');
    const count = selected.length;
    const toolbar = document.getElementById('bulk-actions-toolbar');

    document.getElementById('selected-count').innerText = count;

    if (count > 0) {
        toolbar.style.display = 'flex'; // Show toolbar
    } else {
        toolbar.style.display = 'none';
    }
}

async function bulkUpdateDate() {
    const selected = document.querySelectorAll('.art-select:checked');
    if (selected.length === 0) return;

    // Simple prompt for now. Ideally use a modal.
    const now = new Date().toISOString().slice(0, 16); // format for datetime-local-ish input
    const newDateStr = prompt("Nhập ngày đăng mới (YYYY-MM-DD HH:mm:ss):", now.replace('T', ' ') + ':00');

    if (!newDateStr) return; // Cancelled

    // Convert to ISO if possible
    try {
        const d = new Date(newDateStr);
        if (isNaN(d.getTime())) {
            throw new Error("Ngày không hợp lệ.");
        }
        // PocketBase often prefers "YYYY-MM-DD HH:mm:ss" over ISO with T and Z
        const iso = d.toISOString();
        const pbDate = iso.replace('T', ' ').split('.')[0]; // 2023-01-01 12:00:00

        // Format for Tag: date:YYYY-MM-DD HH:mm:ss
        const dateTag = `date:${pbDate}`;

        showToast(`Đang cập nhật ${selected.length} bài viết...`, "info");

        for (const cb of selected) {
            try {
                // Fetch current tags first to preserve them
                const record = await pb.collection('articles').getOne(cb.value);
                let currentTags = record.tags || "";

                // Remove old date tag if exists
                currentTags = currentTags.replace(/date:[^,]+(,\s*)?/g, "").trim();
                // Remove trailing comma
                if (currentTags.endsWith(',')) currentTags = currentTags.slice(0, -1);

                // Add new date tag
                const newTags = currentTags ? `${currentTags}, ${dateTag}` : dateTag;

                // Update 'tags' field
                await pb.collection('articles').update(cb.value, { tags: newTags });

            } catch (e) {
                console.warn(`Failed update ${cb.value}`, e);
            }
        }
        showToast("Đã cập nhật ngày thành công!", "success");
        // Reload to see changes
        setTimeout(loadArticles, 1000);
    } catch (e) {
        showToast(`Lỗi định dạng ngày: ${e.message}`, "error");
    }
}

async function bulkUpdateStatus() {
    const selected = document.querySelectorAll('.art-select:checked');
    if (selected.length === 0) return;

    const newStatus = prompt("Nhập trạng thái mới (Published / Draft):", "Published");
    if (!newStatus) return;

    showToast(`Đang cập nhật...`, "info");
    for (const cb of selected) {
        try {
            await db.collection('articles').doc(cb.value).update({ status: newStatus });
        } catch (e) { }
    }
    showToast("Đã xong!", "success");
    loadArticles();
}

async function bulkUpdateCategory() {
    const selected = document.querySelectorAll('.art-select:checked');
    if (selected.length === 0) return;

    const newCat = prompt("Nhập mã danh mục mới (news, activity...):", "news");
    if (!newCat) return;

    showToast(`Đang cập nhật...`, "info");
    for (const cb of selected) {
        try {
            await db.collection('articles').doc(cb.value).update({ category: newCat });
        } catch (e) { }
    }
    showToast("Đã xong!", "success");
    loadArticles();
}

async function deleteSelectedArticles() {
    const selected = document.querySelectorAll('.art-select:checked');
    if (selected.length === 0) return;

    if (!confirm(`Bạn có chắc muốn xóa ${selected.length} bài viết đã chọn?`)) return;

    showToast(`Đang xóa ${selected.length} bài viết...`, "info");
    for (const cb of selected) {
        try {
            await db.collection('articles').doc(cb.value).delete();
        } catch (e) {
            console.warn(e);
        }
    }
    showToast("Đã xóa xong!", "success");
    loadArticles();
}

// 2. PAGES
async function loadPages() {
    try {
        const snapshot = await db.collection('pages').orderBy('order').get();
        const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const tbody = document.getElementById('page-list');
        window.allPages = records;

        tbody.innerHTML = records.map(item => `
            <tr>
                <td><code style="background:#f3f4f6; padding:2px 4px; border-radius:4px;">/${item.slug}</code></td>
                <td><strong>${item.title}</strong></td>
                <td style="text-align:center;">${item.order}</td>
                <td style="text-align:center;">
                    ${item.menu
                ? '<span class="badge badge-success">Hiện</span>'
                : '<span class="badge" style="background:#ddd; color:#333;">Ẩn</span>'}
                </td>
                <td>-</td>
                <td style="display:flex; justify-content:center; gap:5px;">
                    <button class="btn btn-secondary btn-sm" onclick="openPageEditor('${item.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteItem('pages', '${item.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join('');

    } catch (e) {
        console.error("Load Pages Error:", e);
    }
    updateDashboardStats();
}

function updateDashboardStats() {
    const artCount = window.allArticles ? window.allArticles.length : 0;
    const pageCount = window.allPages ? window.allPages.length : 0;
    const viewCount = window.allArticles ? window.allArticles.reduce((a, b) => a + (b.views || 0), 0) : 0;

    if (document.getElementById('stat-articles')) document.getElementById('stat-articles').innerText = artCount;
    if (document.getElementById('stat-pages')) document.getElementById('stat-pages').innerText = pageCount;
    if (document.getElementById('stat-views')) document.getElementById('stat-views').innerText = viewCount;
}

// 4. DONATIONS MANAGEMENT (Drill-Down Logic)
// Removed redundant declarations (moved to top)

// Entry Point
function loadDonations() {
    loadDonationFundsMode();
}

// MODE 1: FUND LIST
async function loadDonationFundsMode() {
    // UI Switch
    document.getElementById('donations-fund-list').style.display = 'block';
    document.getElementById('donations-detail-list').style.display = 'none';

    const grid = document.getElementById('admin-fund-grid');
    grid.innerHTML = '<div class="text-center" style="grid-column: 1/-1;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải danh sách quỹ...</div>';

    try {
        // 1. Get All Funds
        const fundsSnap = await db.collection('funds').get();
        const funds = fundsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 2. Get Donation Stats (Ideally aggregate on server, but here we scan)
        // Optimization: We could just fetch all pending to count? Or lazy load counts.
        // For UX "Wow", let's try to fetch all verified vs pending counts if dataset small.
        // Assuming < 5000 docs, manageable.

        const allDonationsSnap = await db.collection('donations').get();
        const allDonations = allDonationsSnap.docs.map(d => d.data());

        grid.innerHTML = funds.map(fund => {
            // Calc Stats
            const fundDonations = allDonations.filter(d => d.fundId === fund.id);
            const totalAmt = fundDonations.reduce((acc, d) => acc + (d.verified ? parseFloat(d.amount || 0) : 0), 0);
            const pendingCount = fundDonations.filter(d => !d.verified).length;
            const verifiedCount = fundDonations.filter(d => d.verified).length;

            return `
            <div class="fund-select-card" onclick="selectDonationFund('${fund.id}')">
                <div class="f-card-title">${fund.title}</div>
                 <div style="font-size:13px; color:#555;">${fund.description ? fund.description.substring(0, 60) + '...' : ''}</div>
                
                <div class="f-card-stats">
                    <span style="color:#2563eb; font-weight:600;">${verifiedCount} ủng hộ</span>
                    ${pendingCount > 0
                    ? `<span class="badge badge-warning" style="font-size:11px;">${pendingCount} chờ duyệt</span>`
                    : '<span style="color:#059669;"><i class="fa-solid fa-check"></i> Đã duyệt hết</span>'}
                </div>
                <div style="margin-top:10px; font-weight:700; color:#be185d; font-size:15px;">
                    Tổng thu: ${totalAmt.toLocaleString('vi-VN')} đ
                </div>
            </div>
            `;
        }).join('');

        // Add "General/Unknown" fund if legacy data exists? (Optional)

    } catch (e) {
        console.error("Load Funds Error:", e);
        grid.innerHTML = `<div class="text-danger">Lỗi tải dữ liệu: ${e.message}</div>`;
    }
}

// MODE 2: DETAIL LIST
async function selectDonationFund(fundId) {
    currentlySelectedFund = fundId;

    // Switch UI
    document.getElementById('donations-fund-list').style.display = 'none';
    document.getElementById('donations-detail-list').style.display = 'block';

    // Update Header
    document.getElementById('detail-fund-name').innerText = "Đang tải...";
    document.getElementById('detail-fund-desc').innerText = "Vui lòng chờ...";

    // Fetch Fund Info
    try {
        const fDoc = await db.collection('funds').doc(fundId).get();
        if (fDoc.exists) {
            const fData = fDoc.data();
            document.getElementById('detail-fund-name').innerText = fData.title;
            document.getElementById('detail-fund-desc').innerText = "Quản lý và duyệt các khoản ủng hộ cho quỹ này";
        }
    } catch (e) { }

    // Load Donations
    fetchFundDonations();
}

function backToFundList() {
    currentlySelectedFund = null;
    loadDonationFundsMode();
}

/**
 * MASTER RENDERING: DONATION ROWS
 */
function renderDonationRows() {
    const tbody = document.getElementById('donation-list');
    const records = paginationState.filteredRecords;

    if (!tbody) return;

    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding:40px; color:#888;">Không có dữ liệu đóng góp nào.</td></tr>';
        renderPaginationUI();
        return;
    }

    // SLICE FOR PAGINATION
    const start = (paginationState.currentPage - 1) * paginationState.itemsPerPage;
    const end = start + paginationState.itemsPerPage;
    const pageItems = records.slice(start, end);

    tbody.innerHTML = pageItems.map(item => {
        const id = item.id;
        const isVerified = item.verified === true;

        let statusBadge = `<span class="badge badge-warning"><i class="fa-solid fa-clock"></i> Chờ duyệt</span>`;
        if (item.status === 'rejected') {
            statusBadge = `<span class="badge" style="background:#fee2e2; color:#991b1b;"><i class="fa-solid fa-circle-xmark"></i> Từ chối</span>`;
        } else if (isVerified) {
            statusBadge = `<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Đã duyệt</span>`;
        } else if (item.status === 'hold') {
            statusBadge = `<span class="badge" style="background:#fff7ed; color:#c2410c;"><i class="fa-solid fa-pause"></i> Tạm giữ</span>`;
        }

        return `
        <tr id="row-${id}" style="${!isVerified ? 'background:#fffbeb;' : ''}">
            <td style="text-align:center;"><input type="checkbox" class="don-select" value="${id}" onchange="updateDonationBulkActionState()"></td>
            <td>
                <div style="font-weight:bold;">${formatDateDisplay(item.timestamp).split(' ')[0]}</div>
                <div style="font-size:11px; color:#666;">${formatTimeOnly(item.timestamp)}</div>
            </td>
            <td><code>${item.transactionCode || item.code || '---'}</code></td>
            <td>
                <div style="font-weight:600; color:#1e293b;">${item.name || 'Ẩn danh'}</div>
                <div style="font-size:11px; color:#64748b;">${item.phone || ''} ${item.method ? `(${item.method.toUpperCase()})` : ''}</div>
            </td>
            <td style="color:#dc2626; font-weight:bold; font-size:14px;">${parseInt(item.amount || 0).toLocaleString('vi-VN')} đ</td>
            <td>
                <div style="font-size:12px; color:var(--primary-blue); font-style:italic; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.adminNote || ''}">
                    ${item.adminNote || '<span style="color:#ccc;">(Trống)</span>'}
                </div>
            </td>
            <td>${statusBadge}</td>
            <td>
                <div style="display:flex; gap:6px;">
                    <button class="btn btn-secondary btn-sm" onclick="openEditDonationModal('${id}')" title="Sửa & Ghi chú" style="padding:4px 8px;"><i class="fa-solid fa-pen-to-square"></i></button>
                    ${!isVerified ? `
                        <button class="btn btn-success btn-sm" onclick="updateDonationStatus('${id}', 'approve')" title="Duyệt" style="padding:4px 8px;"><i class="fa-solid fa-check"></i></button>
                        <button class="btn btn-danger btn-sm" onclick="updateDonationStatus('${id}', 'reject_no_money')" title="Từ chối" style="padding:4px 8px;"><i class="fa-solid fa-xmark"></i></button>
                    ` : ''}
                    <button class="btn btn-danger btn-sm" onclick="deleteDonation('${id}')" title="Xóa" style="padding:4px 8px;"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>
        `;
    }).join('');

    renderPaginationUI();
    updateDonationBulkActionState();
}


/**
 * FETCH & FILTER LOGIC
 */
async function fetchFundDonations() {
    if (!currentlySelectedFund) return;

    const tbody = document.getElementById('donation-list');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải dữ liệu...</td></tr>';

    try {
        let query = db.collection('donations')
            .where('fundId', '==', currentlySelectedFund)
            .orderBy('timestamp', 'desc');

        const snap = await query.get();
        let records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Client-side Filter
        if (currentDonationStatus !== 'all') {
            const isVerified = currentDonationStatus === 'verified';
            records = records.filter(r => r.verified === isVerified);
        }

        const payMethod = document.getElementById('filter-payment-method')?.value || 'all';
        if (payMethod !== 'all') records = records.filter(r => r.method === payMethod);

        const dateStart = document.getElementById('filter-date-start')?.value;
        const dateEnd = document.getElementById('filter-date-end')?.value;
        if (dateStart) records = records.filter(r => r.timestamp >= new Date(dateStart).getTime());
        if (dateEnd) records = records.filter(r => r.timestamp <= (new Date(dateEnd).getTime() + 86399999));

        window.currentFundDonations = records;
        applySearchAndRender(); // Final pass

    } catch (e) {
        console.error("Fetch Error:", e);
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Lỗi tải dữ liệu: ${e.message}</td></tr>`;
    }
}

function filterAdminDonations() {
    applySearchAndRender();
}

function applySearchAndRender() {
    const term = document.getElementById('admin-donation-search')?.value.toLowerCase().trim() || '';
    const all = window.currentFundDonations || [];

    if (!term) {
        paginationState.filteredRecords = all;
    } else {
        // Normalization
        const normalize = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/[^a-z0-9]/g, '') : '';
        const searchKey = normalize(term);

        paginationState.filteredRecords = all.filter(d => {
            return normalize(d.name).includes(searchKey) ||
                normalize(d.code).includes(searchKey) ||
                normalize(d.transactionCode).includes(searchKey) ||
                normalize(d.amount?.toString()).includes(searchKey);
        });
    }

    paginationState.currentPage = 1;
    paginationState.totalItems = paginationState.filteredRecords.length;
    renderDonationRows();
}

/**
 * PAGINATION UI & LOGIC
 */
function renderPaginationUI() {
    const container = document.getElementById('donation-pagination');
    if (!container) return;

    const totalPages = Math.ceil(paginationState.totalItems / paginationState.itemsPerPage);

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <div class="pagination-wrapper">
            <button class="btn btn-pagination" onclick="changePage(-1)" ${paginationState.currentPage === 1 ? 'disabled' : ''}>
                <i class="fa-solid fa-chevron-left"></i> Trước
            </button>
            <span class="page-info">Trang <b>${paginationState.currentPage}</b> / ${totalPages}</span>
            <button class="btn btn-pagination" onclick="changePage(1)" ${paginationState.currentPage === totalPages ? 'disabled' : ''}>
                Tiếp <i class="fa-solid fa-chevron-right"></i>
            </button>
        </div>
    `;
    container.innerHTML = html;
}

function changePage(step) {
    const totalPages = Math.ceil(paginationState.totalItems / paginationState.itemsPerPage);
    const newPage = paginationState.currentPage + step;

    if (newPage >= 1 && newPage <= totalPages) {
        paginationState.currentPage = newPage;
        renderDonationRows();
        // Scroll to top of table
        document.getElementById('donations-detail-list').scrollIntoView({ behavior: 'smooth' });
    }
}

// --- DONATION BULK ACTIONS ---

function toggleSelectAllDonations(source) {
    const checkboxes = document.querySelectorAll('.don-select');
    checkboxes.forEach(cb => {
        cb.checked = source.checked;
    });
    updateDonationBulkActionState();
}

function updateDonationBulkActionState() {
    const selected = document.querySelectorAll('.don-select:checked');
    const count = selected.length;
    const toolbar = document.getElementById('bulk-donation-actions-toolbar');
    const countDisplay = document.getElementById('selected-donation-count');

    if (countDisplay) countDisplay.innerText = count;

    if (toolbar) {
        toolbar.style.display = (count > 0) ? 'flex' : 'none';
    }
}

function clearDonationSelection() {
    const checkboxes = document.querySelectorAll('.don-select');
    checkboxes.forEach(cb => cb.checked = false);
    const selectAll = document.getElementById('selectAllDonations');
    if (selectAll) selectAll.checked = false;
    updateDonationBulkActionState();
}


// --- ADVANCED TOOLS ---

function openManualDonationModal() {
    document.getElementById('m-don-name').value = '';
    document.getElementById('m-don-amount').value = '';
    document.getElementById('m-don-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('m-don-msg').value = '';
    document.getElementById('m-don-note').value = 'Đã nhận trực tiếp.';
    openModal('manual-donation-modal');
}

// --- RECALCULATE FUND TOTALS ---
async function syncFundStats(fundId) {
    if (!fundId) return;
    try {
        const snap = await db.collection('donations')
            .where('fundId', '==', fundId)
            .where('verified', '==', true)
            .get();

        const donations = snap.docs.map(doc => doc.data());
        const totalAmount = donations.reduce((sum, d) => sum + (parseInt(d.amount) || 0), 0);
        const totalContributors = donations.length;

        await db.collection('funds').doc(fundId).update({
            currentAmount: totalAmount,
            contributorCount: totalContributors,
            updatedAt: new Date().toISOString()
        });

        console.log(`[Sync] Fund ${fundId} updated: ${totalAmount}đ, ${totalContributors} contributors.`);
        return { totalAmount, totalContributors };
    } catch (e) {
        console.error("Sync Stats Error:", e);
        return null;
    }
}

async function syncAllFundsStats() {
    if (!confirm("Bạn có muốn tính toán lại toàn bộ số liệu (Tổng tiền & Lượt đóng góp) của TẤT CẢ các quỹ dựa trên danh sách đóng góp thực tế không?")) return;

    showToast("Đang đồng bộ toàn bộ dữ liệu... vui lòng chờ", "info");
    try {
        const snapshot = await db.collection('funds').get();
        let count = 0;
        for (const doc of snapshot.docs) {
            await syncFundStats(doc.id);
            count++;
        }
        showToast(`Đã đồng bộ thành công ${count} quỹ!`, "success");
        loadFundsAdmin(); // Refresh UI
    } catch (e) {
        showToast("Lỗi đồng bộ: " + e.message, "error");
    }
}

async function saveManualDonation() {
    const name = document.getElementById('m-don-name').value;
    const amount = parseInt(document.getElementById('m-don-amount').value);
    const date = document.getElementById('m-don-date').value;
    const method = document.getElementById('m-don-method').value;
    const message = document.getElementById('m-don-msg').value;
    const note = document.getElementById('m-don-note').value;

    if (!name || isNaN(amount)) {
        showToast("Vui lòng nhập tên và số tiền!", "error");
        return;
    }

    try {
        const timestamp = date ? new Date(date).getTime() : Date.now();
        const code = "TDP21-CT" + Math.floor(Math.random() * 1000000); // Case-specific code

        await db.collection('donations').add({
            fundId: currentlySelectedFund,
            name: name,
            amount: amount,
            message: message,
            adminNote: note,
            method: method,
            timestamp: timestamp,
            transactionCode: code,
            verified: true, // Manual entries are usually verified
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast("Đã lưu khoản đóng góp thủ công!", "success");
        closeModal('manual-donation-modal');
        fetchFundDonations();
        syncFundStats(currentlySelectedFund); // Sync totals
    } catch (e) {
        console.error("Save Manual Error:", e);
        showToast("Lỗi: " + e.message, "error");
    }
}

/**
 * EDIT DONATION LOGIC (OPTIMIZED)
 */
function openEditDonationModal(id) {
    const record = window.currentFundDonations.find(r => r.id === id);
    if (!record) return;

    window.currentEditingDonationId = id;
    document.getElementById('edit-donation-modal').style.display = 'flex';

    document.getElementById('edit-don-name').value = record.name || '';
    document.getElementById('edit-don-amount').value = record.amount || 0;
    document.getElementById('edit-don-note').value = record.adminNote || '';
    document.getElementById('edit-don-code').value = record.transactionCode || record.code || '';
    document.getElementById('edit-don-message').value = record.message || '';
}

async function updateDonationDetail() {
    const id = window.currentEditingDonationId;
    if (!id) return;

    const name = document.getElementById('edit-don-name').value;
    const amount = parseInt(document.getElementById('edit-don-amount').value);
    const adminNote = document.getElementById('edit-don-note').value;

    try {
        await db.collection('donations').doc(id).update({
            name,
            amount,
            adminNote,
            updatedAt: new Date().toISOString()
        });
        closeModal('edit-donation-modal');
        showToast("Đã cập nhật thông tin đóng góp!", "success");
        fetchFundDonations();
        syncFundStats(currentlySelectedFund); // Sync totals
    } catch (e) {
        showToast("Lỗi: " + e.message, "error");
    }
}


function exportDonationsToCSV() {
    if (!window.currentFundDonations || window.currentFundDonations.length === 0) {
        showToast("Không có dữ liệu để xuất!", "warning");
        return;
    }

    const fundName = document.getElementById('detail-fund-name').innerText;
    let csv = "\uFEFF"; // UTF-8 BOM for Excel Vietnamese fix
    csv += "Thời gian,Mã GD,Họ Tên,Số tiền,Lời nhắn,Ghi chú Admin,Phương thức,Trạng thái\n";

    window.currentFundDonations.forEach(r => {
        const time = formatDateDisplay(r.timestamp);
        const code = r.transactionCode || r.code || '';
        const name = (r.name || 'Ẩn danh').replace(/,/g, ' ');
        const amt = r.amount || 0;
        const msg = (r.message || '').replace(/,/g, ' ').replace(/\n/g, ' ');
        const note = (r.adminNote || '').replace(/,/g, ' ').replace(/\n/g, ' ');
        const method = (r.method || '').toUpperCase();
        const status = r.verified ? "Đã duyệt" : "Chờ duyệt";

        csv += `${time},${code},${name},${amt},${msg},${note},${method},${status}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_cao_dong_gop_${fundName.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Đã bắt đầu tải file CSV!", "success");
}

async function deleteDonation(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa bản ghi này?")) return;
    try {
        await db.collection('donations').doc(id).delete();
        showToast("Đã xóa bản ghi!", "success");
        fetchFundDonations();
    } catch (e) {
        showToast("Lỗi: " + e.message, "error");
    }
}

function formatTimeOnly(isoStr) {
    try {
        return new Date(isoStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
}


// 3. SETTINGS
async function loadSettings() {
    // Implement if needed for Firebase
}


// 5. FEEDBACK (Hộp Thư Góp Ý)
async function loadFeedback() {
    try {
        const tbody = document.getElementById('feedback-list');
        tbody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải...</td></tr>';

        const snapshot = await db.collection('feedback').orderBy('date', 'desc').get();
        const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Chưa có góp ý nào.</td></tr>';
            return;
        }

        tbody.innerHTML = records.map(item => `
            <tr id="fb-${item.id}" style="${item.status === 'New' ? 'background:#f0f9ff; font-weight:500;' : ''}">
                <td>${formatDateDisplay(item.date)}</td>
                <td>
                    <div><strong>${item.name}</strong></div>
                    <small style="color:#666;">${item.contact}</small>
                </td>
                <td>${item.subject}</td>
                <td><small>${item.message}</small></td>
                <td>
                    ${item.status === 'New'
                ? '<span class="badge badge-warning">Mới</span>'
                : '<span class="badge badge-success">Đã xem</span>'}
                </td>
                <td>
                    ${item.status === 'New' ? `
                        <button class="btn btn-primary btn-sm" onclick="markFeedbackProcessed('${item.id}')" title="Đánh dấu đã xử lý"><i class="fa-solid fa-check"></i></button>
                    ` : ''}
                    <button class="btn btn-danger btn-sm" onclick="deleteFeedback('${item.id}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join('');

    } catch (e) {
        console.error("Load Feedback Error:", e);
        if (e.code === 'failed-precondition') {
            // Index retry or fallback
            const manualSnap = await db.collection('feedback').get();
            // Just render for now without sort if index fails to avoid blocking
            const tbody = document.getElementById('feedback-list');
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Lỗi Index Firebase. Vui lòng tạo Index cho feedback/date.</td></tr>';
        }
    }
}

async function deleteFeedback(id) {
    if (!confirm("Bạn có chắc muốn xóa góp ý này?")) return;
    try {
        await db.collection('feedback').doc(id).delete();
        showToast("Đã xóa thành công!", "success");
        const row = document.getElementById(`fb-${id}`);
        if (row) row.remove();
    } catch (e) {
        showToast("Lỗi: " + e.message, "error");
    }
}

async function markFeedbackProcessed(id) {
    try {
        await db.collection('feedback').doc(id).update({ status: 'Processed' });
        showToast("Đã đánh dấu xử lý!", "success");
        loadFeedback(); // Reload section
    } catch (e) {
        showToast("Lỗi: " + e.message, "error");
    }
}

// HELPER: Date Format
function formatDateDisplay(isoStr) {
    if (!isoStr) return '';
    try {
        const d = new Date(isoStr);
        return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return isoStr; }
}


// --- CRUD OPERATIONS ---

// EDITOR
let currentEditingId = null;

async function openEditor(id = null) {
    switchView('view-editor');
    currentEditingId = id;

    // Reset Form
    document.getElementById('art-title').value = '';
    document.getElementById('art-slug').value = '';
    document.getElementById('art-summary').value = '';
    tinymce.get('art-editor').setContent('');
    document.getElementById('art-category').value = 'TRANG_CHU';
    document.getElementById('art-status').value = 'Published';
    document.getElementById('art-image').value = '';
    document.getElementById('art-img-preview').src = '';
    document.getElementById('art-author').value = '';
    document.getElementById('gdoc-url').value = '';

    if (id) {
        // Load Data
        try {
            const doc = await db.collection('articles').doc(id).get();
            if (!doc.exists) throw new Error("Not found");

            const item = doc.data();
            document.getElementById('art-title').value = item.title;
            document.getElementById('art-slug').value = id;
            document.getElementById('art-summary').value = item.summary;
            tinymce.get('art-editor').setContent(item.content || '');
            document.getElementById('art-category').value = item.category;
            document.getElementById('art-status').value = item.status;
            document.getElementById('art-author').value = item.author || '';
            document.getElementById('gdoc-url').value = item.doc_link || '';

            // Image Logic
            document.getElementById('art-image').value = item.image || item.thumbnail_url || '';
            document.getElementById('art-img-preview').src = item.image || item.thumbnail_url || '';

            // Date Logic
            if (item.date) {
                // Convert ISO to YYYY-MM-DD for input[type=date]
                try {
                    document.getElementById('art-date').value = new Date(item.date).toISOString().split('T')[0];
                } catch (e) { console.warn("Date parse error", e); }
            } else if (item.created) {
                // Fallback to created date
                try {
                    let d = item.created;
                    // Handle Firestore Timestamp if needed, though usually data() gives basic obj in this mock or real lib
                    // If it's a string
                    if (typeof d === 'string') {
                        document.getElementById('art-date').value = new Date(d).toISOString().split('T')[0];
                    }
                } catch (e) { }
            }

            document.getElementById('editor-heading').innerText = "Chỉnh Sửa Bài Viết";

        } catch (e) {
            showToast("Không tải được bài viết!", "error");
        }
    } else {
        document.getElementById('editor-heading').innerText = "Soạn Thảo Bài Viết Mới";
    }
}

// Global variable to hold specific selected file (Not used in Firebase Basic implementation)
let selectedImageFile = null;

async function saveArticle() {
    console.log("Save Article Button Clicked");
    try {
        const titleEl = document.getElementById('art-title');
        const categoryEl = document.getElementById('art-category');
        const statusEl = document.getElementById('art-status');
        const summaryEl = document.getElementById('art-summary');
        const imageEl = document.getElementById('art-image');
        const docEl = document.getElementById('gdoc-url');
        const authorEl = document.getElementById('art-author');
        const dateEl = document.getElementById('art-date'); // New Date Field

        if (!titleEl || !categoryEl || !statusEl) {
            alert("Lỗi hệ thống: Không tìm thấy các trường nhập liệu chính!");
            return;
        }

        const title = titleEl.value;
        // Safe TinyMCE retrieval
        let content = '';
        if (typeof tinymce !== 'undefined' && tinymce.get('art-editor')) {
            content = tinymce.get('art-editor').getContent();
        } else {
            // Fallback or error
            console.warn("TinyMCE not ready");
            // Try to get value from textarea directly if possible, though unlikely to work if MCE is active
        }

        const category = categoryEl.value;
        const status = statusEl.value;
        const summary = summaryEl.value;
        const imageUrl = imageEl.value;
        const author = authorEl ? authorEl.value : '';
        const docLink = docEl ? docEl.value.trim() : '';

        if (!title) return showToast("Vui lòng nhập tiêu đề!", "warning");

        // CHECK SIZE BEFORE SENDING
        if (imageUrl && imageUrl.length > 900000) {
            console.warn("Image size warning:", imageUrl.length);
            if (!confirm("Ảnh bài viết có dung lượng khá lớn, có thể gây lỗi khi lưu. Bạn có muốn tiếp tục thử không?")) {
                return;
            }
        }

        const data = {
            title,
            content,
            category,
            status,
            summary,
            doc_link: docLink,
            image: imageUrl, // Use URL directly
            author: author
        };

        // Handle Date Field
        if (dateEl && dateEl.value) {
            // User selected a date
            // Append current time to make it a full ISO string (end of day or current time? Let's use current time for precision or 00:00)
            // Better: Keep time if it was already set?
            // Simple approach: Use selected date at current time or 00:00.
            // Let's use Current Time's HH:mm:ss for the selected date to keep sort order relative to meaningful updates
            const timePart = new Date().toISOString().split('T')[1];
            data.date = dateEl.value + 'T' + timePart;
        } else {
            // No date selected?
            if (!currentEditingId) {
                // New article, default to now
                data.date = new Date().toISOString();
            }
            // If editing and cleared? Maybe keep existing.
            // But if specific delete is needed, that's complex. Assume empty = don't update/keep old or default to now.
        }

        // Don't overwrite created date if editing?
        // Actually Firebase needs manual date field management compared to PB's auto created/updated.
        // For now, we update 'date' on every save or keep it?
        // Let's keep original date if editing.

        if (currentEditingId) {
            data.updated = new Date().toISOString();

            // Should NOT fail here normally if data size is OK
            await db.collection('articles').doc(currentEditingId).update(data);
            showToast("Cập nhật thành công!", "success");
        } else {
            // New Article
            // data.date already set above if missing
            if (!data.date) data.date = new Date().toISOString();

            data.created = new Date().toISOString(); // Permanent creation time
            await db.collection('articles').add(data);
            showToast("Đăng bài thành công!", "success");
        }

        // Reload and Close
        setTimeout(() => {
            loadAllData();
            closeEditor();
        }, 1000);

    } catch (e) {
        console.error("Critical Save Error:", e);
        // Fallback alert if toast fails or error is severe
        alert("Lỗi nghiêm trọng khi lưu bài: " + e.message);
        showToast("Lỗi lưu bài: " + e.message, "error");
    }
}

async function deleteItem(coll, id) {
    if (!confirm("Bạn có chắc muốn xóa mục này?")) return;
    try {
        await db.collection(coll).doc(id).delete();
        showToast("Đã xóa thành công!", "success");
        loadAllData();
    } catch (e) {
        showToast("Lỗi xóa: " + e.message, "error");
    }
}

// ... (Page Editor functions remain the same) ...
// PAGE EDITOR
let currentPageId = null;

async function openPageEditor(id = null) {
    switchView('view-page-editor');
    currentPageId = id;

    // Reset
    document.getElementById('page-title').value = '';
    document.getElementById('page-slug').value = '';
    tinymce.get('page-editor').setContent('');
    document.getElementById('page-order').value = 99;

    if (id) {
        try {
            const item = await pb.collection('pages').getOne(id);
            document.getElementById('page-title').value = item.title;
            document.getElementById('page-slug').value = item.slug;
            tinymce.get('page-editor').setContent(item.content || '');
            document.getElementById('page-order').value = item.order;
        } catch (e) { console.error(e); }
    }
}

async function savePage() {
    const title = document.getElementById('page-title').value;
    const slug = document.getElementById('page-slug').value;
    const content = tinymce.get('page-editor').getContent();
    const order = parseInt(document.getElementById('page-order').value) || 99;

    if (!title || !slug) return showToast("Nhập đủ Tiêu đề và Slug!", "warning");

    const data = { title, slug, content, order, menu: true };

    try {
        if (currentPageId) {
            await db.collection('pages').doc(currentPageId).update(data);
        } else {
            await db.collection('pages').add(data);
        }
        showToast("Lưu trang thành công!", "success");
        loadAllData();
        closePageEditor();
    } catch (e) {
        showToast("Lỗi: " + e.message, "error");
    }
}

// BULK ACTIONS
async function bulkUpdateDate() {
    const selected = document.querySelectorAll('.art-select:checked');
    if (selected.length === 0) return;

    const nowLocal = new Date();
    nowLocal.setMinutes(nowLocal.getMinutes() - nowLocal.getTimezoneOffset());
    const defaultVal = nowLocal.toISOString().slice(0, 16).replace('T', ' ');

    const newDateStr = prompt("Nhập ngày đăng mới (YYYY-MM-DD HH:mm):", defaultVal);

    if (!newDateStr) return;

    showToast(`Đang cập nhật ${selected.length} bài viết...`, "info");

    // Convert to ISO
    let finalDate = newDateStr;
    try {
        const d = new Date(newDateStr);
        if (!isNaN(d.getTime())) finalDate = d.toISOString();
    } catch (e) { }

    for (const cb of selected) {
        try {
            await db.collection('articles').doc(cb.value).update({ date: finalDate });
        } catch (e) {
            console.warn(`Failed update ${cb.value}`, e);
        }
    }
    showToast("Đã cập nhật ngày thành công!", "success");
    setTimeout(loadArticles, 1000);
}


// --- UI UTILS ---

// --- UI UTILS ---

function switchView(viewId) {
    document.querySelectorAll('.tab-view').forEach(el => {
        el.style.display = 'none';
        el.classList.remove('active');
    });
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));

    const target = document.getElementById(viewId);
    if (target) {
        target.style.display = 'block';
        target.classList.add('active');

        // URL HANDLING
        const url = new URL(window.location);
        url.searchParams.set('view', viewId);
        window.history.pushState({}, '', url);

        // Highlight Menu Item (Simple match)
        const menuItem = document.querySelector(`.menu-item[onclick*="${viewId}"]`);
        if (menuItem) menuItem.classList.add('active');

        // SPECIFIC VIEW LOGIC
        if (viewId === 'view-donations') {
            // User requested default to "All" when accessing
            if (typeof setDonationFilter === 'function') {
                // Determine if we need to full reload or just UI trigger
                // Ideally, setDonationFilter('all') calls loadDonations() which resets everything.
                // To prevent double-load if it's already initial load, we can check.
                // But simplest is just to force it as requested.
                // Use a small timeout to ensure DOM is ready if needed, specifically for the filter button UI
                setTimeout(() => setDonationFilter('all'), 50);
            }
        }
    }
}

// Check URL on Load
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view && document.getElementById(view)) {
        // We wait slightly for auth logic if needed, but UI can switch immediately
        setTimeout(() => switchView(view), 200);
    }
});

function closeEditor() { switchView('view-articles'); }
function closePageEditor() { switchView('view-pages'); }

function showToast(msg, type = 'info') {
    const icons = { error: 'fa-times', warning: 'fa-exclamation', info: 'fa-info' };
    const div = document.createElement('div');
    div.className = `toast ${type}`;

    let iconHtml = '';

    // CUSTOM ANIMATED CHECKMARK FOR SUCCESS
    if (type === 'success') {
        iconHtml = `
            <div class="checkmark-container">
                <svg class="checkmark-svg" viewBox="0 0 52 52">
                    <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                    <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                </svg>
            </div>
        `;
    } else {
        // Standard Icons
        iconHtml = `<div class="toast-icon"><i class="fa-solid ${icons[type]}"></i></div>`;
    }

    div.innerHTML = `${iconHtml}<div class="toast-content"><p>${msg}</p></div>`;
    document.getElementById('toast-container').appendChild(div);

    // Trigger animations
    setTimeout(() => div.classList.add('show'), 10);
    setTimeout(() => {
        div.classList.add('hide'); // Add hide class for exit animation
        setTimeout(() => div.remove(), 500); // Wait for CSS animation
    }, 3000);
}


// Helper for Date Display
function formatDateDisplay(isoStr) {
    if (!isoStr) return '';
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr; // If invalid date, return original string
        return d.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) { return isoStr; }
}

// TINYMCE
// TINYMCE
function initEditor() {
    if (typeof tinymce === 'undefined') return;
    tinymce.init({
        selector: '#art-editor, #page-editor, #fund-editor', // Added fund-editor
        height: 500,
        menubar: true, // Show menubar to access Source Code easier if needed
        plugins: 'link image lists table code media preview fullscreen',
        toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | bullist numlist | link image media | code fullscreen',

        // --- CRITICAL FIXES FOR HTML & IMAGES ---

        // 1. ALLOW ALL HTML (Stop stripping tags)
        valid_elements: '*[*]',
        extended_valid_elements: '*[*]',
        verify_html: false,
        convert_urls: false, // Keep absolute/original URLs

        // 2. IMAGE UPLOAD CONFIGURATION
        image_title: true,
        automatic_uploads: true, // REQUIRED for images_upload_handler to trigger automatically
        paste_data_images: true, // Allow pasting images from clipboard

        // 3. PASTE & FORMATTING RETENTION (Google Docs / Word Support)
        paste_as_text: false, // Force Rich Text
        paste_merge_formats: true,
        paste_webkit_styles: 'all', // Retain all styles
        // paste_retain_style_properties: 'all', // REMOVED: Deprecated in TinyMCE 6.0

        // Custom Handler: Convert everything to Base64 to bypass server requirement
        images_upload_handler: (blobInfo, progress) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result;
                // Check if result is valid
                if (result) {
                    resolve(result);
                } else {
                    reject('Conversion failed');
                }
            };
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(blobInfo.blob());
        }),

        // 4. FILE PICKER (For the "Browse" button in Image dialog)
        file_picker_types: 'image media',
        file_picker_callback: function (cb, value, meta) {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');

            // Adjust accepted file types
            if (meta.filetype === 'image') {
                input.setAttribute('accept', 'image/*');
            } else if (meta.filetype === 'media') {
                input.setAttribute('accept', 'video/*,audio/*');
            }

            input.onchange = function () {
                const file = this.files[0];
                const reader = new FileReader();
                reader.onload = function () {
                    // Fill the dialog with the file content
                    cb(reader.result, { title: file.name });
                };
                reader.readAsDataURL(file);
            };

            input.click();
        }
    });
}


/* --- NEW FUNCTIONALITY (ADDED BY REQUEST) --- */

// 1. Slug Generator
function generateSlug() {
    const title = document.getElementById('art-title').value;
    const slug = title.toString().toLowerCase()
        .normalize('NFD') // Split accents
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[đĐ]/g, 'd')
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start
        .replace(/-+$/, ''); // Trim - from end
    document.getElementById('art-slug').value = slug;
}

// 2. Image Upload Logic
function compressImage(file, maxWidth = 1000, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const elem = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round(height * (maxWidth / width));
                    width = maxWidth;
                }

                elem.width = width;
                elem.height = height;
                const ctx = elem.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to Base64 with reduced quality
                const data = elem.toDataURL('image/jpeg', quality);
                resolve(data);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
}

function triggerImageUpload() {
    // Create a hidden input to select file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedImageFile = file;

            // Visual feedback - Loading
            document.getElementById('upload-placeholder').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><br>Đang xử lý ảnh...';

            try {
                // Compress Image
                const resizedDataUrl = await compressImage(file);

                // Display
                const img = document.getElementById('art-img-preview');
                img.src = resizedDataUrl;
                img.style.display = 'block';

                // Set hidden input value for saving (Compressed Base64)
                document.getElementById('art-image').value = resizedDataUrl;
                document.getElementById('upload-placeholder').style.display = 'none';

            } catch (err) {
                console.error("Image processing error:", err);
                alert("Lỗi xử lý ảnh: " + err.message);
                // Reset UI
                document.getElementById('upload-placeholder').innerHTML = '<i class="fa-solid fa-cloud-upload-alt"></i><div>Chọn ảnh từ máy</div>';
            }
        }
    };
    input.click();
}

/**
 * Helper: Validate and Load Image
 * Returns the usable URL (optimized or original) or throws error
 */
function validateGooglePhoto(url) {
    return new Promise((resolve, reject) => {
        let finalUrl = url;

        // Try Optimize
        if (url.includes('googleusercontent.com') && url.includes('=')) {
            const baseUrl = url.split('=')[0];
            finalUrl = baseUrl + '=w1920-h1080-no';
        } else if (url.includes('googleusercontent.com')) {
            finalUrl = url + '=w1920-h1080-no';
        }

        // Test Load
        const img = new Image();
        img.onload = () => resolve(finalUrl);
        img.onerror = () => {
            // If optimized failed, try original
            const img2 = new Image();
            img2.onload = () => resolve(url);
            img2.onerror = () => reject("Không thể tải ảnh. Link có thể bị lỗi, hết hạn hoặc là ảnh riêng tư.");
            img2.src = url;
        };
        img.src = finalUrl;
    });
}

/**
 * Handle Google Photos Direct Link
 * Optimizes the URL for better performance and quality
 */
async function pasteGooglePhoto() {
    const url = prompt("💡 HƯỚNG DẪN: \n1. Mở ảnh trên Google Photos.\n2. Chuột phải vào ảnh -> Chọn 'Copy Image Address' (Sao chép địa chỉ hình ảnh).\n3. Dán vào đây:");

    if (!url) return;

    // Check for common mistake: Sharing Link
    if (url.includes('photos.app.goo.gl')) {
        alert("❌ Lỗi: Bạn đang dùng Link Chia Sẻ.\n\nVui lòng KHÔNG copy link từ thanh địa chỉ.\nHãy chuột phải vào HIỂN THỊ CỦA ẢNH và chọn 'Copy Image Address' (Sao chép địa chỉ hình ảnh).");
        return;
    }

    try {
        showToast("Đang kiểm tra link ảnh...", "info");
        const validUrl = await validateGooglePhoto(url);

        const input = document.getElementById('art-image');
        input.value = validUrl;
        previewImageFromUrl(validUrl);

        if (validUrl !== url) {
            showToast("Đã tối ưu hóa link ảnh Google!", "success");
        } else {
            showToast("Link ảnh hợp lệ!", "success");
        }
    } catch (e) {
        alert("❌ Lỗi: " + e + "\n\nĐảm bảo bạn đã chọn 'Copy Image Address' và ảnh có quyền truy cập.");
    }
}

/**
 * Insert Google Photo directly into Editor Body
 */
async function insertGooglePhotoToBody() {
    const url = prompt("💡 HƯỚNG DẪN CHÈN VÀO BÀI VIẾT: \n1. Chuột phải vào ảnh trên Google Photos -> Chọn 'Copy Image Address'.\n2. Dán vào đây:");

    if (!url) return;

    if (url.includes('photos.app.goo.gl')) {
        alert("❌ Lỗi: Vui lòng dùng 'Copy Image Address' (Sao chép địa chỉ hình ảnh), KHÔNG dùng link chia sẻ.");
        return;
    }

    try {
        showToast("Đang xử lý ảnh...", "info");
        const validUrl = await validateGooglePhoto(url);

        if (typeof tinymce !== 'undefined' && tinymce.activeEditor) {
            tinymce.activeEditor.insertContent(`<img src="${validUrl}" alt="Ảnh minh họa" style="max-width:100%; height:auto; display:block; margin: 10px auto;" />`);
            showToast("Đã chèn ảnh thành công!", "success");
        }
    } catch (e) {
        alert("❌ Lỗi: " + e + "\n\nHãy thử lại với ảnh khác hoặc kiểm tra quyền truy cập.");
    }
}

function removeImage(e) {
    e.stopPropagation(); // Prevent clicking box
    selectedImageFile = null;
    document.getElementById('art-image').value = '';
    document.getElementById('art-img-preview').src = '';
    document.getElementById('art-img-preview').style.display = 'none';
    document.getElementById('upload-placeholder').style.display = 'flex';
}

function previewImageFromUrl(url) {
    if (!url) return;
    selectedImageFile = null; // Clear file if URL is manually typed
    const img = document.getElementById('art-img-preview');
    img.src = url;
    img.style.display = 'block';
    document.getElementById('upload-placeholder').style.display = 'none';
}

// 3. Misc
function autoTranslate() {
    showToast("Tính năng Dịch Tự Động đang được phát triển...", "info");
}

function previewArticle() {
    showToast("Chế độ xem trước chưa khả dụng.", "warning");
}

function toggleLanguage() {
    const curr = document.getElementById('lang-switch-btn').innerText;
    if (curr === 'EN') {
        document.getElementById('lang-switch-btn').innerText = 'VN';
        showToast("Switched to English Interface", "success");
    } else {
        document.getElementById('lang-switch-btn').innerText = 'EN';
        showToast("Đã chuyển sang Tiếng Việt", "success");
    }
}
function switchEditorLang(lang, el) {
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    el.classList.add('active');

    if (lang === 'vn') {
        document.getElementById('editor-vn').style.display = 'block';
        document.getElementById('editor-en').style.display = 'none';
    } else {
        document.getElementById('editor-vn').style.display = 'none';
        document.getElementById('editor-en').style.display = 'block';
    }
}

// 4. DASHBOARD NEWS
function renderDashboardNews(data) {
    const tbody = document.getElementById('dashboard-recent-news');
    if (!tbody) return;

    // Get top 5 recent
    const recent = data.slice(0, 5);

    if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">Chưa có tin mới.</td></tr>';
        return;
    }

    tbody.innerHTML = recent.map(item => `
        <tr>
            <td style="font-weight:500; color:#333;">${item.title}</td>
            <td style="color:#666; font-size:13px;">${formatDateDisplay(item.created)}</td>
            <td><span class="badge badge-warning">${item.category}</span></td>
        </tr>
    `).join('');
}

// 5. SIDEBAR TOGGLE


/* --- GOOGLE DOCS IMPORT FEATURE --- */
async function importGoogleDoc() {
    const urlInput = document.getElementById('gdoc-url');
    let url = urlInput.value.trim();

    if (!url) {
        return showToast("Vui lòng dán Link Google Docs!", "warning");
    }

    // Validation & Auto-Conversion
    if (url.includes('/edit') || url.includes('/view')) {
        // We no longer block, we convert!
        url = url.replace(/\/edit.*$/, '/export?format=html')
            .replace(/\/view.*$/, '/export?format=html');

        // Optional: Notify user what happened (console only or subtle toast)
        console.log("Auto-converted to Export URL:", url);
    }

    showToast("Đang kết nối và tải dữ liệu...", "info");

    try {
        // Cache busting to ensure fresh content
        const timestamp = new Date().getTime();
        const finalUrl = `${url}${url.includes('?') ? '&' : '?'}t=${timestamp}`;

        // STRATEGY: Try multiple proxies in case one fails (ERR_HTTP2_PROTOCOL_ERROR)
        let htmlContent = null;

        const proxies = [
            `https://api.allorigins.win/get?url=${encodeURIComponent(finalUrl)}`,
            `https://corsproxy.io/?${encodeURIComponent(finalUrl)}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(finalUrl)}`
        ];

        for (const proxy of proxies) {
            try {
                console.log(`Trying Proxy: ${proxy}`);
                const response = await fetch(proxy);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                // Handle different proxy response formats
                if (proxy.includes('allorigins')) {
                    const json = await response.json();
                    htmlContent = json.contents;
                } else {
                    // corsproxy and codetabs return raw text
                    htmlContent = await response.text();
                }

                if (htmlContent) break; // Success!
            } catch (err) {
                console.warn(`Proxy failed: ${proxy}`, err);
                continue; // Try next
            }
        }

        if (!htmlContent) {
            throw new Error("Không thể kết nối đến Google Docs qua mọi kênh (Network Error).");
        }

        // PARSE HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        // Locate content wrapper (Google Docs usually uses ID 'contents')
        let contentNode = doc.querySelector('#contents');
        if (!contentNode) contentNode = doc.body; // Fallback

        // SMART CLEANING STRATEGY:
        // We want to KEEP bold, italic, tables, images.
        // We want to REMOVE Font-Family (Arial), Page Size, Backgrounds (White).

        // 1. Process STYLE Tags (Don't remove them, clean them!)
        doc.querySelectorAll('style').forEach(style => {
            let css = style.innerHTML;

            // Remove Font definitions (Let site CSS take over)
            css = css.replace(/font-family\s*:[^;}]+[;}]/gi, '');

            // Remove Vertical Spacing from Styles
            css = css.replace(/margin-top\s*:[^;}]+[;}]/gi, '');
            css = css.replace(/margin-bottom\s*:[^;}]+[;}]/gi, '');
            css = css.replace(/padding-top\s*:[^;}]+[;}]/gi, '');
            css = css.replace(/padding-bottom\s*:[^;}]+[;}]/gi, '');

            // Remove Page/Body specific constraints
            css = css.replace(/background-color\s*:[^;}]+[;}]/gi, '');
            css = css.replace(/max-width\s*:[^;}]+[;}]/gi, '');
            // css = css.replace(/padding\s*:[^;}]+[;}]/gi, ''); // KEEP PADDING for lists!

            // Optional: Remove fixed font sizes if we want responsive text
            // css = css.replace(/font-size\s*:[^;}]+[;}]/gi, '');
            // Better to keep font-size for headers, but maybe strip basic paragraph size?
            // For now, let's keep font-size as structure might rely on it,
            // but we can remove it if user complains text is too small/big.

            style.innerHTML = css;
        });

        // 2. Clean Inline Styles on Elements
        contentNode.querySelectorAll('*').forEach(el => {
            const tag = el.tagName.toLowerCase();
            let style = el.getAttribute('style') || '';

            // Remove blocking styles
            style = style.replace(/font-family\s*:[^;]+;/gi, '')
                .replace(/line-height\s*:[^;]+;/gi, '') // Allow site line-height
                .replace(/background-color\s*:[^;]+;/gi, '') // No highlighting
                .replace(/margin-top\s*:[^;]+;/gi, '')
                .replace(/margin-bottom\s*:[^;]+;/gi, '')
                .replace(/padding-top\s*:[^;]+;/gi, '')
                .replace(/padding-bottom\s*:[^;]+;/gi, '');

            // Fix Tables: Ensure they fit full width
            if (tag === 'table') {
                el.classList.add('table', 'table-bordered'); // Add Admin CSS classes
                el.style.width = '100%';
                style += 'width: 100% !important; border-collapse: collapse;';
            }

            // Fix Images: Ensure max-width
            if (tag === 'img') {
                style += 'max-width: 100%; height: auto;';
                // Lazy load
                el.setAttribute('loading', 'lazy');
            }

            // Clean Redirect Links (Google wraps links)
            if (tag === 'a') {
                const href = el.getAttribute('href');
                if (href && href.includes('google.com/url')) {
                    try {
                        const urlObj = new URL(href);
                        const realUrl = urlObj.searchParams.get('q');
                        if (realUrl) el.setAttribute('href', realUrl);
                    } catch (e) { }
                }
            }

            el.setAttribute('style', style);
        });

        const finalHtml = contentNode.innerHTML;
        const stylesHtml = doc.querySelector('head').innerHTML; // Get format styles

        // Insert into TinyMCE
        // We prepend the cleaned styles so classes work
        tinymce.get('art-editor').setContent(stylesHtml + finalHtml);

        showToast(`Đã nhập thành công! (${finalHtml.length} ký tự)`, "success");

    } catch (e) {
        console.error(e);
        showToast("Lỗi nhập liệu: " + e.message, "error");
    }
}

// --- FUNDS MANAGEMENT (DISTRIBUTED SYSTEM) ---

let currentEditingFundId = null;

async function loadFundsAdmin() {
    try {
        const snapshot = await db.collection('funds').get();
        const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const tbody = document.getElementById('fund-list');
        if (!tbody) return;

        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Chưa có khoản thu nào.</td></tr>';
            return;
        }

        tbody.innerHTML = records.map(item => `
            <tr>
                <td><strong>${item.title}</strong><br><small style="color:#666;">${item.id}</small></td>
                <td>
                    <span class="badge badge-info">${getCatName(item.category)}</span>
                    <br>
                    ${(item.type === 'BUDGET' || item.fundType === 'budget')
                ? '<span class="badge badge-success" style="margin-top:4px;">💰 Ngân sách</span>'
                : '<span class="badge badge-secondary" style="margin-top:4px;">❤️ Ủng hộ</span>'}
                </td>
                <td><span style="font-family:monospace; font-weight:bold; background:#f3f4f6; padding:2px 6px; border-radius:4px;">${item.code || '---'}</span></td>
                <td>${item.isActive ? '<span style="color:green;">● Hoạt động</span>' : '<span style="color:#aaa;">○ Đã đóng</span>'}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="syncFundStats('${item.id}').then(() => { showToast('Đã cập nhật số liệu!', 'success'); loadFundsAdmin(); })" title="Đồng bộ số liệu thực tế"><i class="fa-solid fa-arrows-rotate"></i></button>
                    <button class="btn btn-sm btn-secondary" onclick="editFund('${item.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteItem('funds', '${item.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join('');

    } catch (e) {
        console.error("Load Funds Error:", e);
        showToast("Lỗi tải danh sách quỹ: " + e.message, "error");
    }
}

function getCatName(code) {
    const map = {
        'ALL': 'Trang Chủ (Chung)',
        'MT': 'Mặt Trận TQ',
        'KH': 'Khuyến Học',
        'TN': 'Thanh Niên',
        'PHU_NU': 'Phụ Nữ',
        'CCB': 'Cựu Chiến Binh',
        'NCT': 'Người Cao Tuổi',
        'CB': 'Chi Bộ'
    };
    return map[code] || code;
}

function openFundModal() {
    document.getElementById('fund-modal').style.display = 'flex';
    document.getElementById('fund-id').value = '';
    document.getElementById('fund-title').value = '';
    document.getElementById('fund-category').value = 'ALL';
    document.getElementById('fund-type').value = 'DONATION'; // Default
    document.getElementById('fund-code').value = '';
    document.getElementById('fund-target').value = ''; // New
    document.getElementById('fund-image').value = ''; // New
    document.getElementById('fund-img-preview').src = ''; // New
    document.getElementById('fund-img-preview').style.display = 'none'; // New
    document.getElementById('fund-template').value = '';
    document.getElementById('fund-active').checked = true;
    currentEditingFundId = null;
}

async function editFund(id) {
    try {
        const doc = await db.collection('funds').doc(id).get();
        if (!doc.exists) return;
        const data = doc.data();

        document.getElementById('fund-modal').style.display = 'flex';
        currentEditingFundId = id;
        document.getElementById('fund-id').value = id;
        document.getElementById('fund-title').value = data.title;
        document.getElementById('fund-category').value = data.category;
        document.getElementById('fund-type').value = data.type || 'DONATION';
        document.getElementById('fund-summary').value = data.summary || '';

        if (tinymce.get('fund-editor')) {
            tinymce.get('fund-editor').setContent(data.content || '');
        }

        document.getElementById('fund-code').value = data.code || '';
        document.getElementById('fund-target').value = data.targetAmount || ''; // New
        document.getElementById('fund-image').value = data.image || ''; // New
        if (data.image) {
            document.getElementById('fund-img-preview').src = data.image;
            document.getElementById('fund-img-preview').style.display = 'block';
        } else {
            document.getElementById('fund-img-preview').style.display = 'none';
        }

        document.getElementById('fund-template').value = data.contentTemplate || '';
        document.getElementById('fund-active').checked = data.isActive;

    } catch (e) {
        showToast("Lỗi: " + e.message, "error");
    }
}

async function saveFund() {
    const title = document.getElementById('fund-title').value;
    const category = document.getElementById('fund-category').value;
    const type = document.getElementById('fund-type').value;
    const summary = document.getElementById('fund-summary').value;
    const targetAmount = document.getElementById('fund-target').value; // New
    const image = document.getElementById('fund-image').value; // New

    // Get TinyMCE Content safely
    let content = '';
    if (tinymce.get('fund-editor')) {
        content = tinymce.get('fund-editor').getContent();
    }

    const code = document.getElementById('fund-code').value.trim().toUpperCase().replace(/\s+/g, '');
    const contentTemplate = document.getElementById('fund-template').value;
    const isActive = document.getElementById('fund-active').checked;

    // VALIDATION
    if (!title) {
        alert("Vui lòng nhập Tên quỹ!");
        return;
    }

    if (code && !/^[A-Z0-9]+$/.test(code)) {
        alert("Mã Tên Quỹ chỉ được chứa chữ cái không dấu và số (VD: QUY2025)!");
        return;
    }

    const targetVal = targetAmount ? Number(targetAmount) : 0;
    if (targetVal < 0) {
        alert("Mục tiêu số tiền không được âm!");
        return;
    }

    const data = {
        title,
        summary,
        content,
        category,
        type,
        fundType: type.toLowerCase(), // Save both case versions for compatibility
        code,
        targetAmount: targetVal,
        image,
        contentTemplate,
        isActive,
        updatedAt: new Date().toISOString()
    };

    try {
        if (currentEditingFundId) {
            await db.collection('funds').doc(currentEditingFundId).update(data);
        } else {
            // Check for duplicate code if code exists
            if (code) {
                const dupCheck = await db.collection('funds').where('code', '==', code).get();
                if (!dupCheck.empty) {
                    alert("Mã quỹ này đã tồn tại! Vui lòng chọn mã khác.");
                    return;
                }
            }

            data.createdAt = new Date().toISOString();
            await db.collection('funds').add(data);
        }

        document.getElementById('fund-modal').style.display = 'none';
        showToast("Đã lưu khoản thu thành công!", "success");
        loadFundsAdmin();

    } catch (e) {
        showToast("Lỗi lưu: " + e.message, "error");
    }
}

// Hook into loadAllData
const originalLoadAllData = loadAllData;
loadAllData = async function () {
    await originalLoadAllData();
    await loadFundsAdmin();
};

/* =========================================
   SECURE & USER MANAGEMENT
   ========================================= */

// 1. FORGOT PASSWORD
function toggleResetUI() {
    const bodies = document.querySelectorAll('.login-body');
    const resetUI = document.getElementById('reset-ui');
    if (!bodies[0] || !resetUI) return;

    if (resetUI.style.display === 'none') {
        bodies[0].style.display = 'none';
        resetUI.style.display = 'block';
    } else {
        bodies[0].style.display = 'block';
        resetUI.style.display = 'none';
    }
}

async function sendResetEmail() {
    const email = document.getElementById('reset-email')?.value;
    const msg = document.getElementById('reset-msg');
    if (!email || !msg) return;

    msg.innerText = "Đang gửi yêu cầu...";
    try {
        await firebase.auth().sendPasswordResetEmail(email);
        msg.style.color = 'lightgreen';
        msg.innerText = "Đã gửi link khôi phục! Kiểm tra Email.";
    } catch (e) {
        msg.style.color = '#fca5a5';
        msg.innerText = "Lỗi: " + e.message;
    }
}

// 2. USER MANAGEMENT
async function loadUsers() {
    const list = document.getElementById('user-list');
    if (!list) return;

    list.innerHTML = '<tr><td colspan="5" style="text-align:center;">Đang tải...</td></tr>';
    try {
        const snapshot = await db.collection('users').get();
        if (snapshot.empty) {
            list.innerHTML = '<tr><td colspan="5" style="text-align:center;">Chưa có thành viên nào.</td></tr>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const u = doc.data();
            const id = doc.id;
            const avatarUrl = u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random&color=fff`;

            html += `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${avatarUrl}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;">
                        <div>
                            <div style="font-weight:bold;">${u.name}</div>
                            ${u.phone ? `<div style="font-size:11px; color:#666;"><i class="fa-solid fa-phone"></i> ${u.phone}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td>${u.email}</td>
                <td><span class="badge badge-info">${formatRole(u.role)}</span></td>
                <td>
                    ${u.active
                    ? '<span class="status-pill status-active"><i class="fa-solid fa-check"></i> Hoạt động</span>'
                    : '<span class="status-pill status-inactive"><i class="fa-solid fa-ban"></i> Đã khóa</span>'}
                </td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="editUser('${id}', '${u.name}', '${u.email}', '${u.role}', ${u.active}, '${u.phone || ''}', '${u.avatar || ''}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser('${id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
            `;
        });
        list.innerHTML = html;
    } catch (e) {
        list.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center;">Lỗi tải: ' + e.message + '</td></tr>';
    }
}

// 3. PROFILE & UI
function toggleProfileMenu() {
    const menu = document.getElementById('profile-menu');
    if (menu) menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
}

window.addEventListener('click', (e) => {
    const avatar = document.getElementById('header-avatar');
    const menu = document.getElementById('profile-menu');
    if (avatar && menu && !avatar.contains(e.target) && !menu.contains(e.target)) {
        menu.style.display = 'none';
    }
});

function formatRole(role) {
    const map = { admin: 'Quản Trị Viên', moderator: 'Cán Bộ Xác Minh', editor: 'Ban Biên Tập' };
    return map[role] || 'Thành viên';
}

/**
 * CONSOLIDATED STATUS UPDATE
 */
window.updateDonationStatus = async function (id, action) {
    let status = 'approved';
    let verified = true;
    let defaultNote = '';

    if (action === 'reject_no_money') {
        if (!confirm('Xác nhận TỪ CHỐI vì chưa nhận được tiền?')) return;
        status = 'rejected';
        verified = false;
        defaultNote = 'Chưa nhận được tiền';
    } else if (action === 'reject_spam') {
        if (!confirm('Đánh dấu là SPAM?')) return;
        status = 'rejected';
        verified = false;
        defaultNote = 'Spam / Không hợp lệ';
    } else if (action === 'approve') {
        if (!confirm('Xác nhận đã nhận tiền và DUYỆT khoản này?')) return;
    } else if (action === 'hold') {
        status = 'hold';
        verified = false;
    }

    const userNote = prompt("Nhập ghi chú công khai:", defaultNote);
    if (userNote === null) return;

    try {
        await db.collection('donations').doc(id).update({
            status: status,
            verified: verified,
            adminNote: userNote,
            updatedAt: new Date().toISOString()
        });
        showToast("Đã cập nhật trạng thái!", "success");
        fetchFundDonations();
        syncFundStats(currentlySelectedFund); // Sync totals
    } catch (e) {
        showToast("Lỗi: " + e.message, "error");
    }
};

/**
 * BULK ACTIONS
 */
async function bulkVerifyDonations() {
    const selected = Array.from(document.querySelectorAll('.don-select:checked')).map(cb => cb.value);
    if (selected.length === 0) return;
    if (!confirm(`Duyệt ${selected.length} mục đã chọn?`)) return;

    showToast(`Đang duyệt...`, "info");
    try {
        const batch = db.batch();
        selected.forEach(id => {
            batch.update(db.collection('donations').doc(id), { verified: true, status: 'approved' });
        });
        await batch.commit();
        showToast("Đã duyệt xong!", "success");
        fetchFundDonations();
    } catch (e) {
        showToast("Lỗi: " + e.message, "error");
    }
}

async function bulkDeleteDonations() {
    const selected = Array.from(document.querySelectorAll('.don-select:checked')).map(cb => cb.value);
    if (selected.length === 0) return;
    if (!confirm(`XÓA VĨNH VIỄN ${selected.length} mục?`)) return;

    showToast(`Đang xóa...`, "info");
    try {
        const batch = db.batch();
        selected.forEach(id => {
            batch.delete(db.collection('donations').doc(id));
        });
        await batch.commit();
        showToast("Đã xóa xong!", "success");
        fetchFundDonations();
    } catch (e) {
        showToast("Lỗi: " + e.message, "error");
    }
}
