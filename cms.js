﻿/**
 * CMS CLIENT SCRIPT - FIREBASE VERSION
 * Migrated from PocketBase
 * LAST UPDATED: FORCE_CACHE_CLEAR_WIDGET_V2
 */

// ----- CONFIG -----
// Firestore instance (db) is globally available from firebase-config.js

// ----- CACHE UTILS -----
const CACHE_PREFIX = 'tdp21_fb_v1_';
function getCache(key) {
    try {
        const data = localStorage.getItem(CACHE_PREFIX + key);
        return data ? JSON.parse(data) : null;
    } catch (e) { return null; }
}
function setCache(key, data) {
    try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
    } catch (e) { console.warn("Cache full"); }
}

// ----- HELPERS -----

const TIMEOUT_MS = 15000;
function withTimeout(promise, ms = TIMEOUT_MS) {
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Mạng chậm/Không phản hồi")), ms)
    );
    return Promise.race([promise, timeout]);
}
function formatDateDisplay(dateVal) {
    if (!dateVal) return '';
    try {
        // Handle Firestore Timestamp
        if (dateVal && typeof dateVal.toDate === 'function') {
            return dateVal.toDate().toLocaleDateString('vi-VN');
        }
        // Handle String
        const date = new Date(dateVal);
        if (isNaN(date.getTime())) return dateVal;
        return date.toLocaleDateString('vi-VN');
    } catch (e) { return dateVal; }
}

function extractCustomDate(item) {
    // Priority: date field -> tags regex -> created
    if (item.date) return item.date;
    if (item.tags) {
        const match = item.tags.match(/date:([^,]+)/);
        if (match) return match[1].trim();
    }
    return null;
}

function getCategoryPage(catCode) {
    const map = {
        'MT': 'mat-tran-to-quoc.html',
        'PHU_NU': 'hoi-phu-nu.html',
        'CCB': 'hoi-cuu-chien-binh.html',
        'TN': 'doan-thanh-nien.html',
        'NCT': 'hoi-nguoi-cao-tuoi.html',
        'CB': 'chi-bo.html',
        'KH': 'ban-khuyen-hoc.html'
    };
    return map[catCode] || 'bai-viet.html';
}

const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80' viewBox='0 0 120 80'%3E%3Crect width='120' height='80' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='12' fill='%239ca3af' dy='.3em' text-anchor='middle'%3EOP21%3C/text%3E%3C/svg%3E";

// ----- RENDERING -----
function renderNewsItemHTML(item) {
    const pageUrl = getCategoryPage(item.category);
    let thumbSrc = item.image || PLACEHOLDER_IMG;
    const isFeatured = item.featured === true; // Check if enabled in Firebase data

    // Adjust Date
    const displayDate = formatDateDisplay(extractCustomDate(item) || item.created);

    if (isFeatured) {
        return `
        <div class="news-list-item news-featured">
            <a href="${pageUrl}?id=${item.id}" class="news-thumb-link-featured">
                <div class="featured-badge"><i class="fa-solid fa-star"></i> NỔI BẬT</div>
                <img src="${thumbSrc}" class="news-thumb-featured" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'">
            </a>
            <div class="news-info-featured">
                <h3 class="news-title-featured"><a href="${pageUrl}?id=${item.id}">${item.title}</a></h3>
                <div class="news-meta">
                    <span class="news-date"><i class="fa-regular fa-clock"></i> ${displayDate}</span>
                    <span class="news-views"><i class="fa-regular fa-eye"></i> ${item.views || 0} lượt xem</span>
                </div>
                <div class="news-summary-featured">${item.summary || ''}</div>
                <a href="${pageUrl}?id=${item.id}" class="btn-read-more">Xem chi tiết <i class="fa-solid fa-arrow-right"></i></a>
            </div>
        </div>`;
    }

    return `
    <div class="news-list-item">
        <a href="${pageUrl}?id=${item.id}" class="news-thumb-link">
            <img src="${thumbSrc}" class="news-thumb" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'">
        </a>
        <div class="news-info">
            <h3 class="news-title"><a href="${pageUrl}?id=${item.id}">${item.title}</a></h3>
            <div class="news-meta">
                <span class="news-date"><i class="fa-regular fa-clock"></i> ${displayDate}</span>
                <span class="news-views"><i class="fa-regular fa-eye"></i> ${item.views || 0} lượt xem</span>
            </div>
            <div class="news-summary">${item.summary || ''}</div>
        </div>
    </div>`;
}

function renderMarqueeHTML(item) {
    return `
    <p style="margin-bottom: 10px; border-bottom: 1px dashed #eee; padding-bottom: 5px;">
        <strong style="color: var(--primary-red);">[TB]</strong> ${item.title}: ${item.summary}
    </p>`;
}

// ----- CORE FUNCTIONS -----

// 1. PAGE CONTENT
async function loadPageContent() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    if (!slug) return;

    const contentEl = document.getElementById('qt-page-content');
    const titleEl = document.getElementById('qt-page-title');

    if (contentEl) contentEl.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>';

    try {
        const snapshot = await withTimeout(db.collection('pages').where('slug', '==', slug).limit(1).get());
        if (snapshot.empty) {
            if (contentEl) contentEl.innerHTML = '<p class="text-center">Trang không tồn tại.</p>';
            return;
        }

        const item = snapshot.docs[0].data();
        if (titleEl) titleEl.innerText = item.title;
        if (contentEl) contentEl.innerHTML = item.content || '<p>Đang cập nhật...</p>';
        document.title = item.title + " - Tổ Dân Phố 21";

    } catch (e) {
        console.error("Page Load Error:", e);
        if (contentEl) contentEl.innerHTML = '<p class="text-center">Lỗi kết nối hoặc Mạng chậm (Timeout).</p>';
    }
}

// 2. DYNAMIC MENU
async function loadDynamicMenu() {
    const nav = document.querySelector('.main-nav ul, #main-nav ul');
    if (!nav) return;

    // We assume the static menu is already there in HTML or we append to it. 
    // Usually it calls 'renderMenuHTML' first or assumes logic.
    // Let's stick to appending dynamic pages.

    // Let's stick to appending dynamic pages.
    try {
        const snapshot = await withTimeout(db.collection('pages').where('menu', '==', true).orderBy('order', 'asc').get());

        snapshot.forEach(doc => {
            const p = doc.data();
            // Check for duplicate before adding
            if (!nav.innerHTML.includes(`slug=${p.slug}`)) {
                const li = document.createElement('li');
                li.innerHTML = `<a href="page.html?slug=${p.slug}" class="nav-item">${p.title}</a>`;
                nav.appendChild(li);
            }
        });

        // Ensure login at the end
        if (!nav.querySelector('.login-item')) {
            const loginLi = document.createElement('li');
            loginLi.className = 'login-item';
            loginLi.style.marginLeft = 'auto';
            loginLi.innerHTML = `<a href="admin.html"><i class="fa-solid fa-user-gear"></i> Đăng Nhập</a>`;
            nav.appendChild(loginLi);
        }

    } catch (e) {
        console.warn("Menu Dynamic Load Error:", e);
    }
}

// 3. LOAD NEWS LIST
// 3. LOAD NEWS LIST
async function loadNews(category, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        let query = db.collection('articles').where('status', '==', 'Published');

        if (category === 'TRANG_CHU') {
            // For homepage, maybe limit to 10 latest
            query = query.limit(10);
        } else if (category && category !== 'ALL') {
            query = query.where('category', '==', category);
        }

        // Timeout loading prevents infinite spinner
        // Race between fetch and timeout
        const snapshot = await withTimeout(query.get());

        let records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Manual Sort (Newest First)
        records.sort((a, b) => {
            const dA = a.date ? new Date(a.date) : (a.created ? (a.created.toDate ? a.created.toDate() : new Date(a.created)) : new Date(0));
            const dB = b.date ? new Date(b.date) : (b.created ? (b.created.toDate ? b.created.toDate() : new Date(b.created)) : new Date(0));
            return dB - dA;
        });

        if (records.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 20px;">Chưa có tin bài nào được đăng.</div>';
            return;
        }

        container.innerHTML = records.map(renderNewsItemHTML).join('');

    } catch (e) {
        console.error("Load News Error:", e);
        container.innerHTML = `<div style="color: #d32f2f; text-align: center; padding: 20px;">
            <i class="fa-solid fa-triangle-exclamation"></i> Không thể tải tin tức.<br>
            <small style="color:#666;">${e.message || "Lỗi kết nối máy chủ"}</small>
        </div>`;
    }
}

// 4. LOAD MARQUEE
async function loadMarquee(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        const snapshot = await withTimeout(db.collection('articles')
            .where('status', '==', 'Published')
            .where('category', '==', 'THONG_BAO')
            .limit(5)
            .get());

        if (snapshot.empty) {
            container.innerHTML = '<div style="padding:10px;">Chào mừng quý khách đến với website Tổ Dân Phố 21!</div>';
            return;
        }

        const html = snapshot.docs.map(doc => {
            const d = doc.data();
            return `<p style="margin-bottom: 10px; border-bottom: 1px dashed #eee; padding-bottom: 5px;">
                <strong style="color: var(--primary-red);">[TB]</strong> ${d.title}: ${d.summary}
            </p>`;
        }).join('');

        container.innerHTML = html;

    } catch (e) {
        console.warn("Marquee Load Error:", e);
        container.innerHTML = '<div style="padding:10px;">Chào mừng quý khách đến với website!</div>';
    }
}

// 5. LOAD ARTICLE DETAIL
async function loadArticleDetail(targetContainerId = 'article-container') {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const container = document.getElementById(targetContainerId);

    if (!container) return;
    if (!id) {
        container.innerHTML = '<p style="color:red">Thiếu ID bài viết.</p>';
        return;
    }

    try {
        const docRef = db.collection('articles').doc(id);
        const docSnap = await withTimeout(docRef.get());

        if (!docSnap.exists) {
            container.innerHTML = '<p style="text-align:center;">Bài viết không tồn tại.</p>';
            return;
        }

        const data = docSnap.data();

        // Update Views
        docRef.update({ views: (data.views || 0) + 1 }).catch(() => { });

        document.title = data.title + " - Tổ Dân Phố 21";

        // Render Metadata
        const dateStr = formatDateDisplay(extractCustomDate(data) || data.created);

        // Render
        let html = `
            <h1 style="color: #111827; font-family: Arial, Helvetica, sans-serif; font-size: 28px; font-weight: bold; line-height: 1.3; margin-bottom: 20px;">${data.title}</h1>
            <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #eee; font-size: 14px; color: #555;">
                <div style="display:flex; align-items:center;"><span style="margin-right:5px;">📅</span> <span>${dateStr}</span></div>
                <div style="display:flex; align-items:center;"><span style="margin-right:5px;">👁️</span> <span>${(data.views || 0) + 1} lượt xem</span></div>
                ${data.author ? `<div style="display:flex; align-items:center;"><span style="margin-right:5px;">👤</span> <span>${data.author}</span></div>` : ''}
            </div>

            <!-- Share Buttons -->
            <div class="share-toolbar" style="margin-bottom: 25px; display: flex; gap: 10px;">
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}" target="_blank" class="btn-share btn-facebook">
                    <i class="fab fa-facebook-f"></i> Chia sẻ
                </a>
                <a href="https://zalo.me/share/?url=${encodeURIComponent(window.location.href)}" target="_blank" class="btn-share btn-zalo">
                    <strong style="font-family: sans-serif; font-weight: 900;">Z</strong> Zalo
                </a>
                <button onclick="navigator.clipboard.writeText(window.location.href); alert('Đã sao chép liên kết!');" class="btn-share btn-copy">
                    <i class="fa-solid fa-link"></i> Sao chép
                </button>
            </div>
        `;

        // Video
        if (data.videoUrl && data.videoUrl.includes('youtube.com')) {
            const videoId = data.videoUrl.split('v=')[1]?.split('&')[0];
            if (videoId) html += `<div style="margin: 25px 0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"><iframe width="100%" height="450" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe></div>`;
        }

        if (data.summary) {
            html += `<div style="font-weight:bold; margin-bottom:20px; color:#444;">${data.summary}</div>`;
        }

        // Flag to check if we showed anything
        let hasContent = false;

        if (data.content) {
            html += `<div class="article-content" style="font-size: 17px; line-height: 1.8; color: #374151; margin-bottom: 30px;">${data.content}</div>`;
            hasContent = true;
        }

        // Always check for doc_link, even if content exists (Dual Display)
        if (data.doc_link) {
            // DETECT GOOGLE DOCS/DRIVE for Embedding
            if (data.doc_link.includes('docs.google.com') || data.doc_link.includes('drive.google.com')) {
                let embedUrl = data.doc_link;
                // Convert /edit or /view to /preview for cleaner embedding
                if (embedUrl.match(/\/edit|\/view/)) {
                    embedUrl = embedUrl.replace(/\/edit.*$/, '/preview').replace(/\/view.*$/, '/preview');
                }
                html += `<div class="article-content" style="width: 100%; min-height: 800px;">
                            <iframe src="${embedUrl}" width="100%" height="800px" style="border: none; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 8px;" allow="autoplay"></iframe>
                         </div>`;
            } else {
                // Keep original link for non-Google links
                html += `<div class="alert alert-info" style="text-align:center;">
                    Nội dung bài viết được lưu trữ bên ngoài.<br>
                    <a href="${data.doc_link}" target="_blank" class="btn btn-primary" style="margin-top:10px;">Xem văn bản gốc</a>
                 </div>`;
            }
            hasContent = true;
        }

        if (!hasContent) {
            html += `<div style="font-style:italic; color:#888;">Nội dung đang cập nhật...</div>`;
        }

        // Tags
        if (data.tags) {
            html += `<div style="margin-top:30px; padding-top:10px; border-top:1px solid #eee;"><b>Từ khóa:</b> ${data.tags}</div>`;
        }

        container.innerHTML = html;

    } catch (e) {
        console.error("Detail Load Error:", e);
        container.innerHTML = '<p class="text-center">Lỗi tải dữ liệu bài viết.</p>';
    }
}

// --- GLOBAL MENU RENDERER (Centralized Menu) ---
function renderGlobalMenu() {
    const navUl = document.querySelector('.main-nav ul');
    if (!navUl) return;

    // Get current page for Active state
    const path = window.location.pathname;
    const page = path.split("/").pop().split("?")[0] || "index.html";

    // Helper to check active
    const isActive = (p) => page === p ? 'active' : '';
    // Group active check
    const groupPages = ['cac-doan-the.html', 'chi-bo.html', 'mat-tran-to-quoc.html', 'hoi-phu-nu.html', 'hoi-cuu-chien-binh.html', 'doan-thanh-nien.html', 'hoi-nguoi-cao-tuoi.html', 'ban-khuyen-hoc.html'];
    const isGroupActive = groupPages.includes(page) ? 'active' : '';

    navUl.innerHTML = `
        <li><a href="index.html" class="nav-item ${isActive('index.html')}"><i class="fa-solid fa-home"></i> <span data-i18n="nav_home">Trang Chủ</span></a></li>
        <li><a href="dong-gop.html" class="nav-item ${isActive('dong-gop.html')}" style="background-color: var(--primary-red);"><i class="fa-solid fa-hand-holding-heart"></i> <span>ĐÓNG GÓP & VẬN ĐỘNG</span></a></li>
        <li class="dropdown">
            <a href="cac-doan-the.html" class="nav-item ${isGroupActive}"><i class="fa-solid fa-users"></i> <span data-i18n="nav_groups">CÁC ĐOÀN THỂ</span> <i class="fa-solid fa-caret-down" style="margin-left:5px;"></i></a>
            <div class="dropdown-content">
                <div class="dropdown-sub">
                    <a href="chi-bo.html?category=CB" data-i18n="group_chibo">Chi Bộ</a>
                    <div class="dropdown-sub-content">
                        <a href="chi-bo.html?category=CB">Giới Thiệu Chung</a>
                        <a href="tin-tuc.html?category=CB">Tin Tức Chi Bộ</a>
                        <a href="chi-bo.html?category=CB&section=notify">Văn Bản - Chỉ Đạo</a>
                    </div>
                </div>
                <div class="dropdown-sub">
                    <a href="mat-tran-to-quoc.html?category=MT" data-i18n="group_mttq">Mặt Trận Tổ Quốc</a>
                    <div class="dropdown-sub-content">
                        <a href="mat-tran-to-quoc.html?category=MT">Giới Thiệu Chung</a>
                        <a href="tin-tuc.html?category=MT">Tin Tức - Sự Kiện</a>
                    </div>
                </div>
                <div class="dropdown-sub">
                    <a href="hoi-phu-nu.html?category=PHU_NU" data-i18n="group_phunu">Hội Phụ Nữ</a>
                    <div class="dropdown-sub-content">
                        <a href="hoi-phu-nu.html?category=PHU_NU">Giới Thiệu Chung</a>
                        <a href="tin-tuc.html?category=PHU_NU">Tin Tức Hội Phụ Nữ</a>
                        <a href="hoi-phu-nu.html?category=PHU_NU&section=movements">Phong Trào Thi Đua</a>
                    </div>
                </div>
                <div class="dropdown-sub">
                    <a href="hoi-cuu-chien-binh.html?category=CCB" data-i18n="group_ccb">Hội Cựu Chiến Binh</a>
                    <div class="dropdown-sub-content">
                        <a href="hoi-cuu-chien-binh.html?category=CCB">Giới Thiệu Chung</a>
                        <a href="tin-tuc.html?category=CCB">Tin Tức CCB</a>
                    </div>
                </div>
                <div class="dropdown-sub">
                    <a href="doan-thanh-nien.html?category=TN" data-i18n="group_thanhnien">Đoàn Thanh Niên</a>
                    <div class="dropdown-sub-content">
                        <a href="doan-thanh-nien.html?category=TN">Giới Thiệu Chung</a>
                        <a href="tin-tuc.html?category=TN">Tin Tức - Hoạt Động</a>
                        <a href="doan-thanh-nien.html?category=TN&section=youth">Góc Thanh Niên</a>
                    </div>
                </div>
                <div class="dropdown-sub">
                    <a href="hoi-nguoi-cao-tuoi.html?category=NCT" data-i18n="group_nct">Hội Người Cao Tuổi</a>
                    <div class="dropdown-sub-content">
                        <a href="hoi-nguoi-cao-tuoi.html?category=NCT">Giới Thiệu Chung</a>
                        <a href="tin-tuc.html?category=NCT">Tin Tức NCT</a>
                    </div>
                </div>
                <div class="dropdown-sub">
                    <a href="ban-khuyen-hoc.html?category=KH" data-i18n="group_khuyenhoc">Ban Khuyến Học</a>
                    <div class="dropdown-sub-content">
                        <a href="ban-khuyen-hoc.html?category=KH">Giới Thiệu Chung</a>
                        <a href="tin-tuc.html?category=KH">Tin Tức Khuyến Học</a>
                    </div>
                </div>
            </div>
        </li>
        <li><a href="lien-he.html" class="nav-item ${isActive('lien-he.html')}"><i class="fa-solid fa-address-book"></i> <span data-i18n="nav_contact">Liên Hệ</span></a></li>
        <li class="login-item" style="margin-left: auto;"><a href="admin.html"><i class="fa-solid fa-user-gear"></i> <span data-i18n="nav_login">Đăng Nhập</span></a></li>
    `;

    // Trigger translation update if available
    if (typeof applyLanguage === 'function' && localStorage.getItem('site_lang')) {
        applyLanguage(localStorage.getItem('site_lang'));
    }
}

// --- CONTEXT-AWARE ARTICLE LOADING ---
async function checkAndLoadContextArticle() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const docUrl = params.get('docUrl');

    if (id || docUrl) {
        // Look for the main container (left-col) OR fallback to main-content
        let targetContainer = document.querySelector('.left-col');
        if (!targetContainer) {
            targetContainer = document.querySelector('.main-content');
        }

        if (targetContainer) {
            // Hide all children of targetContainer
            Array.from(targetContainer.children).forEach(child => child.style.display = 'none');

            // Create or Reuse Article Container
            let articleContainer = document.getElementById('context-article-container');
            if (!articleContainer) {
                articleContainer = document.createElement('div');
                articleContainer.id = 'context-article-container';
                articleContainer.className = 'section-box';
                articleContainer.style.marginTop = '0'; // Top priority
                articleContainer.innerHTML = `
                    <div class="box-header"><span class="box-title">NỘI DUNG BÀI VIẾT</span></div>
                    <div class="box-body" id="article-detail-body">
                        <div style="text-align: center; padding: 30px;">Đang tải nội dung...</div>
                    </div>
                `;
                targetContainer.prepend(articleContainer); // Add to top
            }

            // Call the refactored function targetting the body of our new box
            await loadArticleDetail('article-detail-body');

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
}

// --- INIT ---
// --- UTILITIES ---
function startClock() {
    function update() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false });
        const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

        const timeEl = document.getElementById('current-time');
        const dateEl = document.getElementById('current-date');

        if (timeEl) timeEl.innerText = timeStr;
        if (dateEl) dateEl.innerText = dateStr;
    }
    setInterval(update, 1000);
    update();
}

async function fetchWeather() {
    const tempEl = document.getElementById('weather-temp');
    if (!tempEl) return;

    try {
        // Fetch weather for Hanoi (Lat: 21.0285, Long: 105.8542)
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current_weather=true');
        const data = await response.json();

        if (data && data.current_weather) {
            const temp = Math.round(data.current_weather.temperature);
            tempEl.innerText = `${temp}°C`;
        } else {
            // Fallback if data format is unexpected
            tempEl.innerText = "25°C";
        }
    } catch (e) {
        console.warn("Weather API Error:", e);
        // Fallback on error
        tempEl.innerText = "25°C";
    }
}

function initBackToTop() {
    const btn = document.getElementById('btn-back-to-top');
    if (!btn) return;

    window.onscroll = function () {
        if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
            btn.style.display = "block";
        } else {
            btn.style.display = "none";
        }
    };

    btn.onclick = function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
}


// HELPER: Detect Donor Identity
function detectDonorIdentity(name) {
    if (!name) return { type: 'individual', label: 'Nhà hảo tâm', icon: 'fa-user' };
    const lower = name.toLowerCase();

    // Enterprise / Organization
    if (lower.match(/(công ty|doanh nghiệp|tập đoàn|hợp tác xã|ngân hàng|chi nhánh|văn phòng|tnhh|ctcp|dntn|htx|bank|quỹ|hội|nhóm|clb|câu lạc bộ|phòng khám|nhà thuốc|siêu thị|cửa hàng)/)) {
        return { type: 'org', label: 'Doanh nghiệp / Tổ chức', icon: 'fa-building' };
    }

    // Family
    if (lower.match(/(gia đình|hộ|nhà|vợ chồng|anh chị|ông bà|bác|cô|chú)/)) {
        return { type: 'family', label: 'Gia đình', icon: 'fa-users' };
    }

    // Default: Individual
    return { type: 'individual', label: 'Nhà hảo tâm', icon: 'fa-user' };
}

// --- FUNDS & PAYMENT WIDGET ---

// --- FUNDS & PAYMENT MODULE (Redesigned) ---

// 1. INIT PAGE
async function initFundsPage(containerId) {
    // Check for MoMo Return first
    if (typeof checkPaymentReturn === 'function') {
        if (checkPaymentReturn()) return; // Stop if handling return
    }

    const container = document.getElementById(containerId);
    if (!container) return;

    // Check URL for ?id=...
    const params = new URLSearchParams(window.location.search);
    const fundId = params.get('id');
    const mainContent = document.querySelector('.main-content');

    if (fundId) {
        // Detail View - ENABLE FULL WIDTH
        if (mainContent) mainContent.classList.add('full-width-mode');
        await renderFundDetail(container, fundId);
    } else {
        // List View - DISABLE FULL WIDTH
        if (mainContent) mainContent.classList.remove('full-width-mode');
        await renderFundList(container);
    }
}

// 2. LIST VIEW
async function renderFundList(container) {
    try {
        container.innerHTML = `
            <div style="text-align:center; padding:40px;">
                <i class="fa-solid fa-spinner fa-spin" style="font-size:30px; color:var(--primary-red); margin-bottom:15px;"></i>
                <p style="color:#666; font-style:italic;">Hệ thống đang kết nối dữ liệu. Xin vui lòng chờ trong giây lát...</p>
            </div>`;

        const snapshot = await withTimeout(db.collection('funds')
            .where('isActive', '==', true)
            // .orderBy('created', 'desc') // Requires index, use client sort if needed
            .get());

        if (snapshot.empty) {
            container.innerHTML = `
                <div style="text-align:center; padding:50px 30px; background:linear-gradient(to bottom, #ffffff, #fcfcfc); border-radius:16px; border:1px solid #eee; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
                <div style="width: 80px; height: 80px; background: #fff5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <!-- SVG Icon replacement for reliability -->
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="40" height="40" fill="#ef4444">
                        <!-- Font Awesome Free 6.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) -->
                        <path d="M47.6 300.4L228.3 469.1c7.5 7 17.4 10.9 27.7 10.9s20.2-3.9 27.7-10.9L464.4 300.4c30.4-28.3 47.6-68 47.6-109.5v-5.8c0-69.9-50.5-129.5-119.4-141C347 36.5 300.6 51.4 268 84L256 96 244 84c-32.6-32.6-79-47.5-124.6-39.9C50.5 55.6 0 115.2 0 185.1v5.8c0 41.5 17.2 81.2 47.6 109.5z" />
                    </svg>
                </div>
                <h3 style="color:#333; margin-bottom:10px; font-weight:700;">CHƯA CÓ HOẠT ĐỘNG VẬN ĐỘNG MỚI</h3>
                <p style="color:#6b7280; font-size:16px; line-height:1.6; max-width:500px; margin:0 auto;">
                    Hiện tại, các chương trình vận động đã hoàn thành mục tiêu hoặc đang trong giai đoạn tổng kết. Tổ dân phố 21 xin trân trọng cảm ơn tinh thần tương thân tương ái của quý nhân dân.
                </p>
                <div style="margin-top:25px; font-size:14px; color:#9ca3af;">
                    Mọi thông tin chi tiết xin vui lòng liên hệ Ban Công Tác Mặt Trận.
                </div>
            </div>`;
            return;
        }

        let funds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Render List
        let html = `
            <div class="fund-list-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 25px;">
        `;

        html += funds.map(fund => `
            <div class="fund-item" style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transition: transform 0.2s; display: flex; flex-direction: column;">
                <div style="height: 160px; background: ${fund.image ? `url('${fund.image}') center/cover no-repeat` : 'linear-gradient(135deg, #ef4444, #b91c1c)'}; display: flex; align-items: center; justify-content: center; color: white;">
                    ${!fund.image ? '<i class="fa-solid fa-hand-holding-heart" style="font-size: 50px; opacity: 0.9;"></i>' : ''}
                </div>
                <div style="padding: 20px; flex: 1; display: flex; flex-direction: column;">
                    <h3 style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold; color: #111827; line-height: 1.4;">${fund.title}</h3>
                    <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px; line-height: 1.5; flex: 1;">
                        ${fund.summary || 'Chung tay đóng góp xây dựng Tổ dân phố vững mạnh.'}
                    </p>
                    <a href="?id=${fund.id}" class="btn-detail" style="
                        display: block; width: 100%; text-align: center;
                        background: #fff; color: #d32f2f; border: 1px solid #d32f2f;
                        padding: 10px; border-radius: 6px; font-weight: 600;
                        text-decoration: none; transition: all 0.2s;">
                        Xem Chi Tiết & Ủng Hộ <i class="fa-solid fa-arrow-right"></i>
                    </a>
                </div>
            </div >
                `).join('');

        html += `</div > `;
        container.innerHTML = html;

    } catch (e) {
        console.error("Fund List Error:", e);
        container.innerHTML = '<p class="text-center text-danger">Lỗi tải dữ liệu. Vui lòng thử lại sau.</p>';
    }
}

// --- REFACTORED DONATION LOGIC ---

// 3. DETAIL VIEW (Premium UI + Real-time Data)
// Global listener variable to prevent duplicates
let donationUnsubscribe = null;
let fundUnsubscribe = null;
let localDonationsCache = [];

// 3. DETAIL VIEW (Premium UI + Real-time Data)
async function renderFundDetail_OLD(container, fundId) {
    try {
        // Cleanup previous listener if exists
        if (donationUnsubscribe) {
            donationUnsubscribe();
            donationUnsubscribe = null;
        }

        container.innerHTML = '<div style="text-align:center; padding:50px;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 30px; color: var(--primary-red);"></i><br><br>Đang tải dữ liệu vận động...</div>';

        // 1. Fetch Fund Info (Single Fetch)
        const docRef = db.collection('funds').doc(fundId);
        const docSnap = await withTimeout(docRef.get());

        if (!docSnap.exists) {
            container.innerHTML = '<div class="alert alert-warning">Cuộc vận động không tồn tại.</div>';
            return;
        }

        const fund = docSnap.data();
        window.currentFundData = { id: fundId, ...fund };

        // Hide General Intro Text
        const introText = document.getElementById('donation-intro-text');
        if (introText) introText.style.display = 'none';

        // 2. Render Static Layout FIRST
        container.innerHTML = `
            <div style="margin-bottom: 30px;">
                <a href="dong-gop.html" style="color: var(--p-gray); text-decoration: none; font-weight: 600; font-size: 14px;">
                    <i class="fa-solid fa-arrow-left"></i> QUAY LẠI DANH SÁCH
                </a>
            </div>

            <div class="donation-hero-v2">
                <span style="background: rgba(255,255,255,0.2); padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: 800; text-transform: uppercase;">
                    <i class="fa-solid fa-circle-check"></i> Đang Tiếp Nhận Đóng Góp
                </span>
                <h1>${fund.title}</h1>
                <p>${fund.summary || ''}</p>
            </div>

            <div class="premium-detail-grid">
                <!-- Main Content (Left) -->
                <div class="detail-main-content glass-effect">
                    <div style="display: flex; gap: 20px; color: var(--p-gray); font-size: 14px; margin-bottom: 30px; border-bottom: 1px solid #f1f5f9; padding-bottom: 15px;">
                        <span><i class="fa-regular fa-calendar"></i> Ngày đăng: ${formatDateDisplay(fund.createdAt || fund.created)}</span>
                    </div>
                    
                    <div class="article-content" style="font-size: 17px; line-height: 1.8; color: var(--p-slate);">
                        ${fund.content || '<p><em>Nội dung đang được cập nhật...</em></p>'}
                    </div>

                    <div class="donation-steps" style="margin-top:20px; border-top:1px solid #eee; padding-top:20px;">
                        <h4 style="margin: 0 0 15px 0; font-weight: bold; color: var(--gov-red); font-size: 18px; text-transform: uppercase;">
                            <i class="fa-solid fa-circle-info fa-bounce" style="--fa-animation-duration: 3s;"></i> HƯỚNG DẪN ỦNG HỘ NHANH
                        </h4>
                        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:15px;">
                             <div style="background:#fefefe; border:1px solid #ddd; padding:10px; text-align:center;">
                                <div style="font-size:30px; color:var(--gov-blue); margin-bottom:5px;"><i class="fa-solid fa-keyboard fa-shake" style="--fa-animation-duration: 5s;"></i></div>
                                <div style="font-weight:bold; font-size:14px;">1. Nhập thông tin</div>
                            </div>
                            <div style="background:#fefefe; border:1px solid #ddd; padding:10px; text-align:center;">
                                <div style="font-size:30px; color:var(--gov-red); margin-bottom:5px;"><i class="fa-solid fa-qrcode fa-beat" style="--fa-animation-duration: 2s;"></i></div>
                                <div style="font-weight:bold; font-size:14px;">2. Quét mã QR</div>
                            </div>
                            <div style="background:#fefefe; border:1px solid #ddd; padding:10px; text-align:center;">
                                <div style="font-size:30px; color:green; margin-bottom:5px;"><i class="fa-solid fa-circle-check fa-flip" style="--fa-animation-duration: 6s; --fa-flip-x: 1;"></i></div>
                                <div style="font-weight:bold; font-size:14px;">3. Hoàn tất</div>
                            </div>
                        </div>
                    </div>

                    <!-- LIVE CONTRIBUTORS -->
                    <div id="live-contributor-section" style="margin-top: 50px; padding-top: 30px; border-top: 1px solid #f1f5f9;">
                        <!-- Loading State -->
                        <div style="text-align:center; color:#999;"><i class="fa-solid fa-circle-notch fa-spin"></i> Đang tải danh sách ủng hộ...</div>
                    </div>
                </div>

                <!-- Sidebar (Right) -->
                <div class="detail-sidebar">
                    <div class="donation-card-sticky glass-effect" id="donation-action-card">
                        <div id="donation-form-container">
                            <h3 style="margin-bottom: 5px; font-weight: 900; color: var(--p-slate);">ỦNG HỘ NGAY</h3>
                            <p style="color: var(--p-gray); font-size: 14px; margin-bottom: 25px;">Chung tay xây dựng cộng đồng</p>
                            
                            <!-- LIVE PROGRESS BAR -->
                            <div class="progress-container" id="live-progress-bar">
                                 <!-- Loading State -->
                                 <div style="height:10px; background:#eee; border-radius:5px; overflow:hidden;">
                                    <div style="height:100%; width:30%; background:#ddd; animation:loadingShimmer 1s infinite linear;"></div>
                                 </div>
                            </div>

                            <div class="p-input-group">
                                <label><i class="fa-solid fa-user-pen fa-fade"></i> HỌ TÊN / GIA ĐÌNH / TỔ CHỨC</label>
                                <input type="text" id="d-name-page" class="p-input-control" placeholder="Ví dụ: Gia đình ông A..." onkeyup="checkDonateInputPage()">
                            </div>
                            
                            <div class="p-input-group">
                                <label><i class="fa-solid fa-money-bill-wave fa-bounce" style="--fa-animation-duration: 4s;"></i> SỐ TIỀN (VNĐ)</label>
                                <input type="number" id="d-amount-page" class="p-input-control" placeholder="Nhập số tiền..." onkeyup="checkDonateInputPage()">
                            </div>

                            <div class="quick-amounts-grid">
                                <button onclick="setAmountPage(100000)" class="btn-amount-chip">100k</button>
                                <button onclick="setAmountPage(200000)" class="btn-amount-chip">200k</button>
                                <button onclick="setAmountPage(500000)" class="btn-amount-chip">500k</button>
                            </div>

                            <button onclick="registerAndGenMoMo()" id="btn-gen-qr-page" class="btn-p-submit pulse-red" disabled>
                                THANH TOÁN NGAY <i class="fa-solid fa-paper-plane"></i>
                            </button>
                            
                            <p style="font-size:11px; color:#666; margin-top:15px; text-align:center; line-height:1.4;">
                                * Thông tin của bạn sẽ được hiển thị ở trạng thái <b>"Chờ xác minh"</b> cho đến khi Admin duyệt.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 3. LISTEN FOR REAL-TIME UPDATES
        donationUnsubscribe = db.collection('donations')
            .where('fundId', '==', fundId)
            // .orderBy('timestamp', 'desc') // Ensure index exists otherwise client sort
            .onSnapshot(snapshot => {
                let donations = snapshot.docs.map(d => d.data());

                // Client-side sort
                donations.sort((a, b) => {
                    const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                    const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                    return tB - tA; // Newer first
                });

                // Calculate Stats
                const totalRaised = donations.filter(d => d.verified).reduce((sum, d) => sum + (parseInt(d.amount) || 0), 0);
                const target = parseInt(fund.targetAmount) || 10000000;
                const percent = Math.min(Math.round((totalRaised / target) * 100), 100);

                // Update Progress Bar
                const progressEl = document.getElementById('live-progress-bar');
                if (progressEl) {
                    progressEl.innerHTML = `
                        <div class="progress-label">
                            <span>Đã vận động</span>
                            <span style="color: var(--p-red);">${percent}%</span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${percent}%;"></div>
                        </div>
                        <div style="display:flex; justify-content: space-between; font-size: 12px; margin-top: 6px; color: #64748b;">
                            <span>Mục tiêu: ${target.toLocaleString('vi-VN')}đ</span>
                            <span>Đạt: ${totalRaised.toLocaleString('vi-VN')}đ</span>
                        </div>
                    `;
                }

                // Update Contributor List
                const listEl = document.getElementById('live-contributor-section');
                if (listEl) {
                    listEl.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 25px;">
                            <h4 style="margin:0; font-weight: 800; color: var(--p-slate); font-size: 20px; text-transform: uppercase;">DANH SÁCH ỦNG HỘ</h4>
                            <span style="font-size: 13px; color: var(--p-gray);"><i class="fa-solid fa-users"></i> ${donations.length} lượt đóng góp</span>
                        </div>
                        
                        <div class="contributor-list-card">
                            ${donations.length > 0 ? donations.map(d => `
                                <div class="contributor-item">
                                    <div style="text-align: left;">
                                        <div class="contributor-name">
                                            ${(() => {
                            const ident = detectDonorIdentity(d.name);
                            return `<i class="fa-solid ${ident.icon}" style="margin-right:4px; font-size:12px; color:#64748b;" title="${ident.label}"></i>`;
                        })()}
                                            ${d.name || 'Ẩn danh'} 
                                            ${d.verified ?
                            '<i class="fa-solid fa-circle-check verified-badge" style="color:green; animation: icon-pulse 2s infinite;"></i>' :
                            '<i class="fa-solid fa-circle-notch fa-spin pending-badge" style="color:orange;"></i>'}
                                        </div>
                                        <div class="contributor-time"><i class="fa-regular fa-clock fa-spin-pulse" style="--fa-animation-duration: 3s;"></i> ${formatTimeAgo(d.timestamp)}</div>
                                        ${!d.verified ? '<div style="font-size:11px; color:#f59e0b; margin-top:2px;">* Đang chờ BQT xác nhận</div>' : ''}
                                    </div>
                                    <div class="contributor-amount">${parseInt(d.amount).toLocaleString('vi-VN')} đ</div>
                                </div>
                            `).join('') : '<div style="padding:20px; text-align:center; color:#999; font-style:italic;">Chưa có lượt đóng góp nào. Hãy là người đầu tiên!</div>'}
                        </div>
                    `;
                }

            }, error => {
                console.warn("Real-time listener error:", error);
            });

    } catch (e) {
        console.error("Fund Detail Error:", e);
        container.innerHTML = '<p class="text-center">Lỗi hệ thống. Vui lòng thử lại.</p>';
    }
}

// 4. ACTION: REGISTER & GEN QR
// --- CONFIGURATION ---
// MoMo Configuration is now in payment-gateway.js



// 4. ACTION: REGISTER & PAY WITH MOMO
async function registerAndGenMoMo() {
    if (!window.currentFundData) return;
    const fund = window.currentFundData;
    let name = document.getElementById('d-name-page').value.trim();
    const amountStr = document.getElementById('d-amount-page').value;
    const isAnonymous = document.getElementById('d-anonymous-page')?.checked || false;

    // Validation
    if ((!name && !isAnonymous) || !amountStr) {
        alert("Vui lòng nhập đầy đủ thông tin!");
        return;
    }

    if (isAnonymous) name = "Mạnh thường quân (Ẩn danh)";

    // Sanitize: remove dots/commas
    const amount = parseInt(amountStr.replace(/\./g, '').replace(/,/g, ''));

    // Generate code: TDP21-UHXXXXXX
    const rand = Math.floor(100000 + Math.random() * 900000); // 6 random digits

    // Format: TDP21-UHXXXXXX
    const orderId = `TDP21-UH${rand}`;

    // 1. DEFER SAVE (Store payload)
    window.pendingDonationPayload = {
        fundId: fund.id,
        fundTitle: fund.title, // Persist title for receipt
        name: name,
        amount: amount,
        timestamp: new Date().toISOString(),
        verified: false, // Pending Admin Approval
        method: 'MoMo',
        isAnonymous: isAnonymous,
        code: orderId
    };

    // SAVE SESSION (Critical for Redirect Recovery)
    localStorage.setItem('pending_momo_donation', JSON.stringify({
        payload: window.pendingDonationPayload,
        timestamp: Date.now()
    }));

    // UI Feedback: CONFIRMATION STEP
    const container = document.getElementById('donation-form-container');
    container.innerHTML = `<div style="text-align:center; padding:30px 20px;">
        <div style="margin-bottom:20px;">
            <div style="width: 80px; height: 80px; background: #a50064; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto; box-shadow: 0 10px 20px rgba(165, 0, 100, 0.3); animation: bounceIn 0.5s;">
                 <i class="fa-solid fa-wallet" style="font-size: 40px; color: white;"></i>
            </div>
        </div>
        
        <h3 style="color:#a50064; font-weight:900; margin-bottom:10px;">XÁC NHẬN THANH TOÁN</h3>
        <p style="font-size:13px; color:#555; margin-bottom:20px; line-height:1.5;">
            Hệ thống sẽ chuyển bạn đến ví MoMo để hoàn tất.
        </p>

        <div style="background:#fdf2f8; padding:20px; border-radius:12px; border:2px dashed #a50064; margin-bottom:25px;">
            <div style="font-size:12px; color:#a50064; margin-bottom:5px; text-transform:uppercase; font-weight:bold;">MÃ GIAO DỊCH</div>
            <div style="font-size:18px; font-weight:900; color:#831843; letter-spacing:0.5px; word-break:break-all;">${orderId}</div>
            <div style="margin-top:10px; font-size:16px; font-weight:600; color:#333;">
                Số tiền: <span style="color:#a50064;">${amount.toLocaleString('vi-VN')} đ</span>
            </div>
        </div>

        <div style="display:grid; gap:10px;">
            <button onclick="executeMoMoPayment()" class="premium-submit-btn" style="background:#a50064; box-shadow:0 4px 15px rgba(165, 0, 100, 0.4); border-radius: 8px; width: 100%;">
                <i class="fa-solid fa-wallet"></i> THANH TOÁN VÍ MOMO
            </button>
            <button onclick="resetDonationForm()" class="premium-chip" style="width:100%; color:#555; border-radius: 8px;">
                Quay lại / Hủy
            </button>
        </div>
    </div>
    <style>@keyframes bounceIn {0%{transform:scale(0.3);opacity:0}50%{transform:scale(1.05)}70%{transform:scale(0.9)}100%{transform:scale(1)}}</style>`;
}

// 4b. ACTION: EXECUTE MOMO PAYMENT (Via Separate Module)

// 4b. ACTION: DIRECT MOMO REDIRECT (Client-Side)
// 4b. ACTION: EXECUTE MOMO PAYMENT (Via Separate Module)
async function executeMoMoPayment() {
    if (!window.pendingDonationPayload) {
        alert("Lỗi dữ liệu phiên. Vui lòng tải lại trang.");
        return;
    }

    const payload = window.pendingDonationPayload;
    const btn = document.querySelector('.premium-submit-btn');


    // UI Loading on Button
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner" style="animation: spin 1s linear infinite;"></i> ĐANG KẾT NỐI MOMO...';
        btn.disabled = true;

        // Add CSS animation if not already present
        if (!document.getElementById('momo-spinner-animation')) {
            const style = document.createElement('style');
            style.id = 'momo-spinner-animation';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    try {
        // Delegate to External Module
        if (typeof PaymentGateway !== 'undefined') {
            await PaymentGateway.payWithMoMo(payload);
        } else {
            throw new Error("Module PaymentGateway chưa được tải!");
        }

    } catch (e) {
        // Error already handled in module, but we reset UI here too
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> THỬ LẠI';
            btn.disabled = false;
        }
    }
}


// 5. ACTION: CHECK PAYMENT RETURN (Handle Redirect from MoMo / NganLuong)
function checkPaymentReturn() {
    const urlParams = new URLSearchParams(window.location.search);

    // CHECK FOR LOOKUP URL FIRST (ref + status params)
    const refCode = urlParams.get('ref');
    const statusParam = urlParams.get('status');

    if (refCode && statusParam) {
        console.log("[Payment] Lookup URL detected:", { refCode, statusParam });

        // Look up donation in Firebase by code
        db.collection('donations')
            .where('code', '==', refCode)
            .limit(1)
            .get()
            .then(snapshot => {
                if (!snapshot.empty) {
                    const doc = snapshot.docs[0];
                    const donation = doc.data();
                    console.log("[Payment] Found donation:", donation);

                    // Render appropriate page based on status
                    if (statusParam === 'success') {
                        renderFullPageSuccess(donation);
                    } else if (statusParam === 'error' || statusParam === 'cancelled') {
                        renderFullPageError({
                            isCancelled: statusParam === 'cancelled',
                            errorCode: 'LOOKUP',
                            errorMessage: 'Tra cứu giao dịch',
                            payload: donation
                        });
                    }
                } else {
                    console.warn("[Payment] Donation not found for code:", refCode);
                    // Show not found message
                    const container = document.getElementById('all-funds-container') || document.body;
                    container.innerHTML = `
                        <div style="max-width: 600px; margin: 50px auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center;">
                            <i class="fa-solid fa-search" style="font-size: 50px; color: #94a3b8; margin-bottom: 20px;"></i>
                            <h2 style="color: #334155; margin-bottom: 15px;">Không tìm thấy giao dịch</h2>
                            <p style="color: #64748b; margin-bottom: 25px;">Mã tham chiếu <strong>${refCode}</strong> không tồn tại trong hệ thống.</p>
                            <button onclick="window.location.href='dong-gop.html'" style="padding: 12px 25px; background: #be0000; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                                <i class="fa-solid fa-arrow-left"></i> VỀ TRANG CHỦ
                            </button>
                        </div>
                    `;
                }
            })
            .catch(err => {
                console.error("[Payment] Lookup error:", err);
            });

        return true; // Stop loading fund detail
    }

    // MoMo Parameters - check all possible return params
    const resultCode = urlParams.get('resultCode');
    const momoOrderId = urlParams.get('orderId');
    const momoAmount = urlParams.get('amount');
    const momoTransId = urlParams.get('transId');
    const momoMessage = urlParams.get('message');
    const momoOrderInfo = urlParams.get('orderInfo'); // MoMo also returns this
    const momoPartnerCode = urlParams.get('partnerCode');

    // Legacy NganLuong
    const errorCode = urlParams.get('error_code');

    // Detect if this is a MoMo return - MORE FLEXIBLE detection
    // MoMo returns: amount + orderInfo (always), optionally: resultCode, transId, orderId
    const hasMoMoParams = momoAmount && momoOrderInfo;
    const hasResultCode = resultCode !== null;
    const hasTransactionInfo = momoTransId || momoOrderId;

    const isMoMoReturn = hasResultCode || hasMoMoParams || (hasTransactionInfo && momoAmount);
    const isLegacyReturn = (errorCode !== null);

    console.log("[Payment] Checking return params:", {
        resultCode, momoOrderId, momoAmount, momoTransId, momoOrderInfo,
        isMoMoReturn, hasMoMoParams, hasResultCode
    });

    // Check if we have a payment return signal
    if (isMoMoReturn || isLegacyReturn) {

        // Determine Success
        // MoMo: resultCode = 0 OR if no resultCode but has amount+orderInfo (successful redirect from MoMo)
        // NganLuong: error_code = 00
        let isSuccess = false;

        if (resultCode !== null) {
            // Explicit resultCode present
            isSuccess = (resultCode == 0 || resultCode === '0');
        } else if (hasMoMoParams) {
            // No resultCode but has MoMo signature params = ASSUME successful redirect
            // (Failed payments usually have resultCode != 0)
            isSuccess = true;
        } else if (errorCode !== null) {
            isSuccess = (errorCode === '00');
        }

        const message = momoMessage || urlParams.get('message') || "Giao dịch không thành công.";

        console.log("[Payment] isSuccess:", isSuccess, "message:", message);

        // Clear params to clean URL but PRESERVE id
        const newUrl = new URL(window.location.href);
        const paramsToRemove = [
            'error_code', 'token', 'order_code', 'payment_id', 'payment_type',
            'discount_amount', 'fee_shipping', 'integration_version', 'created_time',
            'buyer_email', 'buyer_fullname', 'buyer_mobile',
            'resultCode', 'message', 'orderId', 'requestId', 'partnerCode',
            'orderType', 'transId', 'payType', 'signature', 'amount', 'orderInfo',
            'responseTime', 'extraData'
        ];
        paramsToRemove.forEach(k => newUrl.searchParams.delete(k));
        window.history.replaceState({}, document.title, newUrl.toString());

        if (isSuccess) {
            // SUCCESS handling
            const stored = localStorage.getItem('pending_momo_donation');
            let payload = null;

            // AUTO-VERIFY LOGIC:
            // - resultCode === 0: MoMo explicitly confirms success
            // - has transId: MoMo assigned a transaction ID = payment processed
            const isAutoVerified = (resultCode == 0 || resultCode === '0') || (momoTransId && momoTransId.length > 0);

            console.log("[Payment] Auto-verify decision:", {
                resultCode, momoTransId, isAutoVerified
            });

            if (stored) {
                try {
                    const data = JSON.parse(stored);
                    payload = data.payload;

                    // Add MoMo transaction info
                    payload.verified = isAutoVerified; // AUTO-VERIFY if MoMo confirms
                    payload.momoTransId = momoTransId || '';
                    payload.momoOrderId = momoOrderId || payload.code;
                    payload.paymentMethod = 'MoMo';
                    payload.verifiedAt = isAutoVerified ? new Date().toISOString() : null;
                    payload.verifiedBy = isAutoVerified ? 'SYSTEM_MOMO' : null;

                } catch (e) {
                    console.error("Parse stored data error", e);
                    payload = null;
                }
            }

            // If no stored session or parse failed, create payload from URL params
            if (!payload) {
                console.warn("[Payment] No stored session found, creating from URL params");

                // Extract name from orderInfo if possible
                let extractedName = 'Mạnh thường quân';
                if (momoOrderInfo) {
                    // orderInfo format: "Ung ho quy TDP21: Ten Nguoi"
                    const match = momoOrderInfo.match(/TDP21[:\s]+(.+)/i);
                    if (match && match[1]) {
                        extractedName = match[1].trim();
                    }
                }

                payload = {
                    code: momoOrderId || 'TDP-' + Date.now(),
                    amount: parseInt(momoAmount) || 0,
                    name: extractedName,
                    fundId: urlParams.get('id') || '',
                    momoTransId: momoTransId || '',
                    momoOrderId: momoOrderId || '',
                    timestamp: new Date().toISOString(),
                    verified: isAutoVerified, // AUTO-VERIFY
                    verifiedAt: isAutoVerified ? new Date().toISOString() : null,
                    verifiedBy: isAutoVerified ? 'SYSTEM_MOMO' : null,
                    paymentMethod: 'MoMo',
                    isAnonymous: false
                };
            }

            console.log("[Payment] Saving donation (verified=" + payload.verified + "):", payload);

            // RENDER SUCCESS PAGE IMMEDIATELY (before Firebase save to avoid race condition)
            renderFullPageSuccess(payload);

            // Save to Firebase - TRY SDK first, FALLBACK to REST API
            const saveDonation = async (data) => {
                const projectId = 'tdp21-cms';
                const collectionName = 'donations';

                // Convert payload to Firestore REST format
                const toFirestoreValue = (val) => {
                    if (typeof val === 'string') return { stringValue: val };
                    if (typeof val === 'number') return { integerValue: String(val) };
                    if (typeof val === 'boolean') return { booleanValue: val };
                    if (val === null) return { nullValue: null };
                    return { stringValue: String(val) };
                };

                const firestoreDoc = { fields: {} };
                for (const [key, value] of Object.entries(data)) {
                    firestoreDoc.fields[key] = toFirestoreValue(value);
                }

                // TRY REST API DIRECTLY (bypasses SDK issues)
                const restUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}`;

                console.log("[Payment] Trying REST API...");

                const response = await fetch(restUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(firestoreDoc)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error?.message || `HTTP ${response.status}`);
                }

                const result = await response.json();
                const docId = result.name.split('/').pop();
                return docId;
            };

            try {
                console.log("[Payment] Saving via REST API...");

                // Save using REST API with timeout
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('REST API timeout sau 20 giây')), 20000)
                );

                Promise.race([saveDonation(payload), timeoutPromise])
                    .then((docId) => {
                        console.log("[Payment] ✅ Donation saved via REST! DocID:", docId);
                        localStorage.removeItem('pending_momo_donation');
                    })
                    .catch(e => {
                        console.error("[Payment] ❌ REST API Save error:", e);
                        // Save to localStorage as backup
                        const backupKey = 'pending_donation_' + payload.code;
                        localStorage.setItem(backupKey, JSON.stringify(payload));
                        console.log("[Payment] Saved to localStorage backup:", backupKey);
                        alert("Thanh toán thành công! Tuy nhiên hệ thống gặp lỗi khi lưu:\n\n" + (e.message || e) + "\n\nDữ liệu đã được lưu tạm. Vui lòng liên hệ Admin với mã: " + payload.code);
                    });

            } catch (err) {
                console.error("[Payment] Exception during save:", err);
            }

            return true; // STOP LOADING
        } else {
            // FAILED or CANCELLED
            const errorDisplay = resultCode || errorCode || 'UNKNOWN';
            const isCancelled = (errorDisplay === '1006' || message.toLowerCase().includes('cancel') || message.toLowerCase().includes('hủy'));

            // Get stored data for display
            const stored = localStorage.getItem('pending_momo_donation');
            let errorPayload = {
                code: momoOrderId || 'N/A',
                amount: momoAmount || 0,
                name: 'Không xác định',
                fundId: urlParams.get('id') || ''
            };

            if (stored) {
                try {
                    const data = JSON.parse(stored);
                    errorPayload = data.payload || errorPayload;
                } catch (e) { }
            }

            // Render error page
            renderFullPageError({
                isCancelled: isCancelled,
                errorCode: errorDisplay,
                errorMessage: message,
                payload: errorPayload
            });

            // Clean up localStorage
            localStorage.removeItem('pending_momo_donation');

            return true; // STOP LOADING (show error page instead of fund detail)
        }
    }
    return false;
}

// HELPER: Print Document
function printDocument() {
    window.print();
}

// HELPER: Copy Share URL
function copyShareUrl() {
    const input = document.getElementById('share-url-input');
    if (input) {
        input.select();
        input.setSelectionRange(0, 99999); // For mobile
        navigator.clipboard.writeText(input.value).then(() => {
            // Show feedback
            const btn = document.querySelector('.btn-copy-url');
            if (btn) {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-check"></i>';
                btn.style.background = '#16a34a';
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.style.background = '';
                }, 2000);
            }
        }).catch(() => {
            // Fallback
            document.execCommand('copy');
            alert('Đã sao chép đường dẫn!');
        });
    }
}

// RENDER ERROR/CANCELLED PAGE (A4 Document Style)
function renderFullPageError(errorData) {
    const container = document.getElementById('all-funds-container') || document.body;

    // Hide Intro Text if exists
    const introText = document.getElementById('donation-intro-text');
    if (introText) introText.style.display = 'none';

    // Format date in Vietnamese
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const time = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = `Hà Nội, ngày ${day} tháng ${month} năm ${year}`;

    const { isCancelled, errorCode, errorMessage, payload } = errorData;
    const fundTitle = window.currentFundData?.title || 'Quỹ Đóng Góp Cộng Đồng';

    // Dynamic content based on error type
    const titleText = isCancelled ? 'GIAO DỊCH ĐÃ HỦY' : 'GIAO DỊCH THẤT BẠI';
    const titleIcon = isCancelled ? 'fa-circle-xmark' : 'fa-triangle-exclamation';
    const statusText = isCancelled ? 'Người dùng đã hủy giao dịch' : 'Giao dịch không thành công';
    const reasonText = isCancelled
        ? 'Ban Lãnh đạo Tổ dân phố số 21 trân trọng thông báo tới Quý vị về việc Hệ thống Cổng thanh toán điện tử đã ghi nhận tín hiệu <b>HỦY GIAO DỊCH</b> từ phía thiết bị của Quý vị. Để đảm bảo quyền lợi và sự minh bạch tài chính, chúng tôi xin xác nhận chi tiết trạng thái của giao dịch này như sau:'
        : 'Ban Lãnh đạo Tổ dân phố số 21 trân trọng thông báo: Giao dịch đóng góp của Quý vị <b>CHƯA THỂ HOÀN TẤT</b> do phát sinh sự cố kỹ thuật từ phía hệ thống thanh toán trung gian. Chúng tôi xin thông báo chi tiết trạng thái giao dịch để Quý vị nắm rõ:';

    // Generate shareable URL
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${payload.fundId}&ref=${payload.code}&status=error`;

    container.innerHTML = `
        <div class="a4-document error-document" id="printable-document">
            <!-- QUỐC HIỆU - TIÊU NGỮ -->
            <div class="a4-header">
                <div class="a4-header-left">
                    <div class="org-name">TỔ DÂN PHỐ SỐ 21</div>
                    <div class="org-sub">Phường Ba Đình, Thành phố Hà Nội</div>
                    <div class="doc-number">Số: ${payload.code || 'N/A'}</div>
                </div>
                <div class="a4-header-right">
                    <div class="quoc-hieu">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div class="tieu-ngu">Độc lập - Tự do - Hạnh phúc</div>
                    <div class="tieu-ngu-line"></div>
                    <div class="doc-date">${dateStr}</div>
                </div>
            </div>

            <!-- TIÊU ĐỀ VĂN BẢN -->
            <div class="a4-title">
                <div class="title-main error-title">
                    <i class="fa-solid ${titleIcon}"></i> ${titleText}
                </div>
                <div class="title-sub">(${statusText})</div>
            </div>

            <!-- NỘI DUNG CHÍNH -->
            <div class="a4-body">
                <div class="receipt-intro">
                    ${reasonText}
                </div>

                <!-- THÔNG TIN GIAO DỊCH -->
                <div class="receipt-section">
                    <div class="section-title">I. THÔNG TIN GIAO DỊCH</div>
                    <table class="receipt-table">
                        <tr>
                            <td class="label-cell">Mã tham chiếu:</td>
                            <td class="value-cell">${payload.code || 'Không có'}</td>
                        </tr>
                        <tr>
                            <td class="label-cell">Chương trình:</td>
                            <td class="value-cell">${fundTitle}</td>
                        </tr>
                        <tr>
                            <td class="label-cell">Số tiền dự kiến:</td>
                            <td class="value-cell">${parseInt(payload.amount || 0).toLocaleString('vi-VN')} đồng</td>
                        </tr>
                        <tr>
                            <td class="label-cell">Thời gian:</td>
                            <td class="value-cell">${time} - ${day}/${month}/${year}</td>
                        </tr>
                    </table>
                </div>

                <!-- CHI TIẾT LỖI -->
                <div class="receipt-section">
                    <div class="section-title">II. CHI TIẾT ${isCancelled ? 'HỦY GIAO DỊCH' : 'LỖI'}</div>
                    <table class="receipt-table">
                        <tr>
                            <td class="label-cell">Mã trạng thái:</td>
                            <td class="value-cell error-code">${errorCode}</td>
                        </tr>
                        <tr>
                            <td class="label-cell">Thông báo:</td>
                            <td class="value-cell">${errorMessage || (isCancelled ? 'Giao dịch bị hủy bởi người dùng' : 'Lỗi không xác định')}</td>
                        </tr>
                    </table>
                </div>

                <!-- TRẠNG THÁI -->
                <div class="receipt-section">
                    <div class="section-title">III. TRẠNG THÁI XỬ LÝ HỒ SƠ</div>
                    <div class="formal-text">
                        <p style="margin-bottom: 12px; text-align: justify; text-indent: 0;"><b>1. Về mặt tài chính và kế toán:</b></p>
                        <p style="margin-bottom: 8px; text-align: justify; text-indent: 20px; line-height: 1.8;">Căn cứ vào kết quả xử lý từ hệ thống thanh toán điện tử, Ban Lãnh đạo Tổ dân phố xin khẳng định rằng giao dịch mang mã tham chiếu nêu trên đã bị <b>${isCancelled ? 'HỦY BỎ' : 'TỪ CHỐI'}</b> theo đúng quy trình nghiệp vụ. Chúng tôi cam kết và xin xác nhận với Quý vị rằng: <b>Không có bất kỳ khoản tiền nào đã bị trừ, phát sinh hoặc đóng băng</b> từ tài khoản ngân hàng, thẻ tín dụng, hoặc ví điện tử của Quý vị trong suốt quá trình xử lý giao dịch này. Mọi giao dịch tài chính đều tuân thủ nghiêm ngặt các quy định về minh bạch và bảo mật thông tin người dùng.</p>
                        
                        <p style="margin-bottom: 12px; text-align: justify; text-indent: 0; margin-top: 15px;"><b>2. Về ghi nhận đóng góp và công khai minh bạch:</b></p>
                        <p style="margin-bottom: 8px; text-align: justify; text-indent: 20px; line-height: 1.8;">Do giao dịch thanh toán chưa hoàn tất theo đúng quy trình chuẩn, thông tin về khoản đóng góp của Quý vị <b>tạm thời chưa được ghi nhận chính thức</b> vào các hệ thống quản lý và công khai của Tổ dân phố, bao gồm: Sổ vàng điện tử, Danh sách công khai trên Cổng thông tin điện tử, và Bảng tin cộng đồng tại Nhà sinh hoạt Tổ dân phố. Tuy nhiên, để đảm bảo tính minh bạch và khả năng tra cứu, toàn bộ hồ sơ và lịch sử thao tác của giao dịch này đã được hệ thống tự động lưu trữ ở trạng thái <b>"Đã hủy"</b> hoặc <b>"Không thành công"</b>, phục vụ cho công tác đối soát, kiểm tra nội bộ khi có yêu cầu từ các cơ quan chức năng hoặc theo yêu cầu của chính Quý vị.</p>
                        
                        ${!isCancelled ? '<p style="margin-bottom: 12px; text-align: justify; text-indent: 0; margin-top: 15px;"><b>3. Về hỗ trợ kỹ thuật và giải quyết sự cố:</b></p><p style="text-align: justify; text-indent: 20px; line-height: 1.8;">Trong trường hợp Quý vị nghi ngờ có sự bất thường trong quá trình xử lý giao dịch, hoặc lỗi này xảy ra lặp đi lặp lại nhiều lần gây ảnh hưởng đến trải nghiệm đóng góp của Quý vị, chúng tôi kính mong Quý vị vui lòng liên hệ trực tiếp với Ban Quản trị Tổ dân phố hoặc bộ phận Chăm sóc khách hàng của đơn vị cung cấp dịch vụ thanh toán để được hỗ trợ kỹ thuật chuyên sâu, kiểm tra lịch sử giao dịch chi tiết và giải quyết kịp thời. Chúng tôi cam kết sẽ theo dõi sát sao và hỗ trợ Quý vị đến khi vấn đề được giải quyết hoàn toàn.</p>' : ''}
                    </div>
                </div>

                <!-- HƯỚNG DẪN -->
                <div class="receipt-section">
                    <div class="section-title">IV. HƯỚNG DẪN THỰC HIỆN LẠI GIAO DỊCH</div>
                    <div class="formal-text">
                         <p style="margin-bottom: 12px; text-indent: 0; line-height: 1.8;">Nhằm tạo điều kiện thuận lợi nhất cho Quý vị trong việc tiếp tục thực hiện đóng góp và hoàn tất giao dịch thành công, Ban Lãnh đạo Tổ dân phố kính đề nghị Quý vị vui lòng kiểm tra kỹ lưỡng các yếu tố kỹ thuật và môi trường thanh toán, sau đó thực hiện lại theo hướng dẫn chi tiết dưới đây:</p>
                         
                         <p style="margin-bottom: 10px; text-align: justify; text-indent: 0; margin-top: 15px;"><b>Bước 1: Kiểm tra kết nối mạng Internet</b></p>
                         <p style="margin-bottom: 8px; text-align: justify; text-indent: 20px; line-height: 1.8;">Kính đề nghị Quý vị kiểm tra và đảm bảo đường truyền <b>kết nối mạng Internet (Wifi hoặc 4G/5G)</b> trên thiết bị di động đang ở trạng thái ổn định, không bị gián đoạn trong suốt quá trình thực hiện thanh toán. Đường truyền mạng yếu hoặc không ổn định có thể gây ra tình trạng mất kết nối giữa chừng, dẫn đến việc giao dịch không được hệ thống xác nhận đầy đủ. Nếu Quý vị đang sử dụng mạng Wifi công cộng hoặc mạng di động có tín hiệu yếu, xin vui lòng chuyển sang môi trường mạng ổn định hơn trước khi thực hiện lại.</p>
                         
                         <p style="margin-bottom: 10px; text-align: justify; text-indent: 0; margin-top: 15px;"><b>Bước 2: Cập nhật phiên bản ứng dụng thanh toán</b></p>
                         <p style="margin-bottom: 8px; text-align: justify; text-indent: 20px; line-height: 1.8;">Quý vị vui lòng kiểm tra và cập nhật ứng dụng <b>Ngân hàng (Mobile Banking), Ví điện tử (MoMo, ZaloPay, VNPay,...)</b> lên phiên bản mới nhất được cung cấp chính thức trên App Store (iOS) hoặc Google Play Store (Android). Việc sử dụng phiên bản cũ có thể dẫn đến các lỗi tương thích với hệ thống thanh toán, đồng thời gây ra các lỗ hổng bảo mật không mong muốn. Sau khi cập nhật xong, Quý vị nên khởi động lại ứng dụng và kiểm tra thông tin tài khoản để đảm bảo mọi chức năng hoạt động bình thường trước khi tiến hành giao dịch.</p>
                         
                         <p style="margin-bottom: 10px; text-align: justify; text-indent: 0; margin-top: 15px;"><b>Bước 3: Chờ đợi và thực hiện lại khi hệ thống ổn định</b></p>
                         <p style="margin-bottom: 8px; text-align: justify; text-indent: 20px; line-height: 1.8;">Trong trường hợp lỗi xảy ra do hệ thống thanh toán điện tử đang bận hoặc đang trong thời gian bảo trì kỹ thuật, giao dịch có thể bị gián đoạn tạm thời. Quý vị vui lòng <b>kiên nhẫn chờ đợi trong khoảng 5-10 phút</b>, sau đó quay lại trang đóng góp và thực hiện lại thao tác quét mã QR hoặc chuyển khoản. Thời gian cao điểm (như cuối tháng, đầu tháng, hoặc các ngày lễ) có thể khiến hệ thống xử lý chậm hơn bình thường, do đó Quý vị nên thử lại vào khung giờ ít tải hơn nếu gặp phải tình trạng này.</p>
                         
                         <p style="margin-bottom: 10px; text-align: justify; text-indent: 0; margin-top: 15px;"><b>Bước 4: Liên hệ hỗ trợ kỹ thuật chuyên sâu</b></p>
                         <p style="margin-bottom: 8px; text-align: justify; text-indent: 20px; line-height: 1.8;">Nếu sau khi thực hiện đầy đủ các bước hướng dẫn trên mà giao dịch vẫn không thành công, Quý vị có thể liên hệ <b>Tổng đài hỗ trợ khách hàng của đơn vị cung cấp dịch vụ thanh toán</b> (Ngân hàng hoặc Nhà cung cấp ví điện tử) để được hướng dẫn chi tiết hơn. Đồng thời, Quý vị cũng có thể thông báo cho <b>Tổ trưởng Tổ dân phố hoặc Ban Quản trị</b> qua số điện thoại, email hoặc Zalo chính thức để được hỗ trợ kịp thời và ghi nhận thông tin đóng góp bằng phương thức thủ công nếu cần thiết. Chúng tôi luôn sẵn sàng đồng hành và hỗ trợ Quý vị trong suốt quá trình tham gia đóng góp xây dựng cộng đồng.</p>
                         
                         <p style="margin-top: 15px; text-align: justify; text-indent: 0; font-style: italic; color: #555; line-height: 1.8;"><b>Lưu ý quan trọng:</b> Nếu Quý vị chọn phương thức chuyển khoản thủ công qua ngân hàng, xin vui lòng ghi chính xác nội dung chuyển khoản theo mã giao dịch để chúng tôi có thể đối chiếu và ghi nhận chính xác khoản đóng góp của Quý vị vào hệ thống.</p>
                    </div>
                </div>
            </div>

            <!-- QR CODE -->
            <div class="a4-signature">
                <div class="sig-left">
                    <div class="qr-box">
                        <div class="qr-label">Quét mã để tra cứu:</div>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&margin=0&data=${encodeURIComponent(shareUrl)}" alt="QR Code" class="qr-img">
                    </div>
                </div>
                <div class="sig-right"></div>
            </div>

            <!-- NÚT HÀNH ĐỘNG -->
            <div class="a4-actions no-print">
                <button onclick="printDocument()" class="btn-action btn-print">
                    <i class="fa-solid fa-print"></i> IN / LƯU PDF
                </button>
                <button onclick="window.location.href='dong-gop.html?id=${payload.fundId}'" class="btn-action btn-primary">
                    <i class="fa-solid fa-rotate-right"></i> THỬ LẠI
                </button>
                <button onclick="window.location.href='dong-gop.html'" class="btn-action btn-secondary">
                    VỀ TRANG CHỦ
                </button>
            </div>
        </div>

        <style>
            /* BASE A4 DOCUMENT STYLES */
            .a4-document {
                max-width: 800px;
                margin: 30px auto;
                background: white;
                padding: 40px 50px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                font-family: 'Times New Roman', Georgia, serif;
                font-size: 15px;
                line-height: 1.6;
                border: 1px solid #ddd;
            }
            .a4-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 25px;
                padding-bottom: 15px;
                border-bottom: 1px solid #ccc;
            }
            .a4-header-left {
                text-align: center;
                flex: 1;
            }
            .a4-header-right {
                text-align: center;
                flex: 1.2;
            }
            .org-name {
                font-weight: bold;
                font-size: 14px;
                text-transform: uppercase;
            }
            .org-sub {
                font-size: 13px;
                color: #555;
            }
            .doc-number {
                margin-top: 8px;
                font-size: 13px;
            }
            .quoc-hieu {
                font-weight: bold;
                font-size: 14px;
                text-transform: uppercase;
            }
            .tieu-ngu {
                font-size: 14px;
                font-weight: bold;
                font-style: italic;
                margin-top: 3px;
            }
            .tieu-ngu-line {
                width: 180px;
                height: 2px;
                background: #333;
                margin: 5px auto;
            }
            .doc-date {
                font-size: 13px;
                font-style: italic;
                margin-top: 8px;
            }
            .a4-title {
                text-align: center;
                margin: 25px 0 30px;
            }
            .title-main {
                font-size: 20px;
                font-weight: bold;
                text-transform: uppercase;
                color: #333;
            }
            .title-sub {
                font-size: 14px;
                font-style: italic;
                color: #666;
                margin-top: 5px;
            }
            .a4-body {
                margin-bottom: 30px;
            }
            .receipt-intro {
                text-align: justify;
                margin-bottom: 20px;
                text-indent: 40px;
            }
            .receipt-section {
                margin-bottom: 20px;
            }
            .section-title {
                font-weight: bold;
                margin-bottom: 10px;
                color: #333;
            }
            .receipt-table {
                width: 100%;
                border-collapse: collapse;
            }
            .receipt-table tr {
                border-bottom: 1px dotted #ccc;
            }
            .receipt-table td {
                padding: 8px 5px;
                vertical-align: top;
            }
            .label-cell {
                width: 180px;
                color: #555;
            }
            .value-cell {
                font-weight: 500;
                color: #222;
            }
            .status-box {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                padding: 12px 20px;
                border-radius: 6px;
                font-weight: 600;
            }
            .a4-actions {
                display: flex;
                gap: 15px;
                justify-content: center;
                padding-top: 20px;
                border-top: 1px solid #eee;
            }
            .btn-action {
                padding: 12px 25px;
                border: none;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                font-size: 14px;
                font-family: 'Segoe UI', sans-serif;
                transition: all 0.2s;
            }
            .btn-action.btn-primary {
                background: #be0000;
                color: white;
            }
            .btn-action.btn-primary:hover {
                background: #a00;
            }
            .btn-action.btn-secondary {
                background: #f1f5f9;
                color: #475569;
                border: 1px solid #e2e8f0;
            }
            .btn-action.btn-secondary:hover {
                background: #e2e8f0;
            }
            
            /* ERROR SPECIFIC STYLES */
            .error-document {
                border-left: 4px solid #dc2626;
            }
            .title-main.error-title {
                color: #dc2626;
            }
            .title-main.error-title i {
                margin-right: 8px;
            }
            .error-code {
                color: #dc2626;
                font-weight: bold;
                font-family: monospace;
                font-size: 14px;
            }
            .status-box.cancelled {
                background: #fef3c7;
                color: #92400e;
                border: 1px solid #fcd34d;
            }
            .status-box.failed {
                background: #fef2f2;
                color: #dc2626;
                border: 1px solid #fecaca;
            }
            .help-box {
                margin-top: 25px;
                padding: 20px;
                background: #eff6ff;
                border-left: 4px solid #3b82f6;
                border-radius: 0 8px 8px 0;
                display: flex;
                gap: 15px;
                align-items: flex-start;
            }
            .help-box i {
                color: #3b82f6;
                font-size: 24px;
                flex-shrink: 0;
            }
            .help-box ul li {
                margin-bottom: 5px;
            }
            
            /* SIGNATURE & QR CODE */
            .a4-signature {
                display: flex;
                justify-content: space-between;
                margin-top: 40px;
                margin-bottom: 30px;
            }
            .sig-left { flex: 1; }
            .sig-right { flex: 1; }
            
            .qr-box {
                text-align: center;
                margin-top: 10px;
                padding-left: 20px;
            }
            .qr-label {
                font-size: 11px;
                font-style: italic;
                margin-bottom: 5px;
                color: #555;
            }
            .qr-img {
                width: 90px;
                height: 90px;
                display: block;
                margin: 0 auto;
            }
            
            /* PRINT BUTTON */
            .btn-action.btn-print {
                background: #059669;
                color: white;
            }
            .btn-action.btn-print:hover {
                background: #047857;
            }
            
            @media (max-width: 768px) {
                .a4-document {
                    margin: 10px;
                    padding: 20px;
                }
                .a4-header {
                    flex-direction: column;
                    gap: 15px;
                }
                .a4-actions {
                    flex-direction: column;
                }
                .btn-action {
                    width: 100%;
                }
            }
            
            /* PRINT STYLES */
            @media print {
                @page { margin: 0; size: A4; }
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                
                html, body {
                    width: 210mm;
                    height: auto;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                    visibility: hidden;
                }
                
                #printable-document {
                    visibility: visible;
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 210mm !important;
                    min-height: 297mm !important;
                    margin: 0 !important;
                    padding: 0 15mm !important; /* Side padding only */
                    box-shadow: none !important;
                    border: none !important;
                    background: white !important;
                    font-size: 11pt !important;
                    line-height: 1.3 !important;
                    z-index: 2147483647; /* Max Z-Index */
                    transform: none !important;
                }

                #printable-document * {
                    visibility: visible;
                }
                
                .no-print { display: none !important; }
                
                .a4-document {
                    box-shadow: none !important;
                    border: none !important;
                    max-width: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                }
                
                .a4-header { margin-bottom: 10px !important; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
                .a4-title { margin: 10px 0 !important; }
                .receipt-section { margin-bottom: 10px !important; }
                .receipt-section p { margin-bottom: 5px; } /* Tighten paragraphs */
                .thank-you-box { margin-top: 15px; padding: 10px; }
                .a4-signature { margin-top: 15px !important; }
                
                .receipt-table td { padding: 4px 2px !important; }
            }
        </style>
    `;
}

function renderFullPageSuccess(payload) {
    const container = document.getElementById('all-funds-container') || document.body;

    // Hide Intro Text if exists
    const introText = document.getElementById('donation-intro-text');
    if (introText) introText.style.display = 'none';

    // Format date in Vietnamese
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const time = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = `Hà Nội, ngày ${day} tháng ${month} năm ${year}`;

    // Get fund title if available
    const fundTitle = payload.fundTitle || window.currentFundData?.title || 'Quỹ Đóng Góp Cộng Đồng';

    // Generate shareable URL
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${payload.fundId}&ref=${payload.code}&status=success`;

    container.innerHTML = `
        <div class="a4-document" id="printable-document">
            <!-- QUỐC HIỆU - TIÊU NGỮ -->
            <div class="a4-header">
                <div class="a4-header-left">
                    <div class="org-name">TỔ DÂN PHỐ SỐ 21</div>
                    <div class="org-sub">Phường Ba Đình, Thành phố Hà Nội</div>
                    <div class="doc-number">Số: ${payload.code}</div>
                </div>
                <div class="a4-header-right">
                    <div class="quoc-hieu">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div class="tieu-ngu">Độc lập - Tự do - Hạnh phúc</div>
                    <div class="tieu-ngu-line"></div>
                    <div class="doc-date">${dateStr}</div>
                </div>
            </div>

            <!-- TIÊU ĐỀ VĂN BẢN -->
            <div class="a4-title">
                <div class="title-main success-title">
                    <i class="fa-solid fa-circle-check"></i> BIÊN NHẬN ĐÓNG GÓP
                </div>
                <div class="title-sub">(Giao dịch thành công)</div>
            </div>

            <!-- NỘI DUNG CHÍNH -->
            <div class="a4-body">
                ${(() => {
            const ident = detectDonorIdentity(payload.name);
            let intro = '';

            if (ident.type === 'org') {
                intro = 'Ban Lãnh đạo Tổ dân phố số 21 trân trọng xác nhận đã nhận được khoản đóng góp, tài trợ thiết thực từ Quý Đơn vị thông qua hệ thống thanh toán trực tuyến. Chúng tôi ghi nhận và đánh giá cao tinh thần trách nhiệm xã hội, nghĩa cử cao đẹp của Quý Đơn vị đối với cộng đồng và các hoạt động chung của Tổ dân phố. Thông tin giao dịch chi tiết như sau:';
            } else if (ident.type === 'family') {
                intro = 'Ban Lãnh đạo Tổ dân phố số 21 trân trọng xác nhận đã nhận được khoản đóng góp thiết thực từ Quý Hộ gia đình thông qua hệ thống thanh toán trực tuyến. Chúng tôi ghi nhận và đánh giá cao truyền thống tốt đẹp, tinh thần đoàn kết của Quý Hộ gia đình đối với các hoạt động chung của Tổ dân phố. Thông tin giao dịch chi tiết như sau:';
            } else {
                intro = 'Ban Lãnh đạo Tổ dân phố số 21 trân trọng xác nhận đã nhận được khoản đóng góp thiết thực từ Quý vị thông qua hệ thống thanh toán trực tuyến. Chúng tôi ghi nhận và đánh giá cao tấm lòng nhiệt huyết của Quý vị đối với các hoạt động chung của Tổ dân phố. Thông tin giao dịch chi tiết như sau:';
            }

            return `<div class="receipt-intro">${intro}</div>`;
        })()}

                <!-- THÔNG TIN GIAO DỊCH -->
                <div class="receipt-section">
                    <div class="section-title">I. THÔNG TIN GIAO DỊCH</div>
                    <table class="receipt-table">
                        <tr>
                            <td class="label-cell">Mã giao dịch:</td>
                            <td class="value-cell highlight-code">${payload.code}</td>
                        </tr>
                        <tr>
                            <td class="label-cell">Chương trình:</td>
                            <td class="value-cell">${fundTitle}</td>
                        </tr>
                        <tr>
                            <td class="label-cell">Phương thức:</td>
                            <td class="value-cell">Thanh toán điện tử MoMo</td>
                        </tr>
                        <tr>
                            <td class="label-cell">Thời gian:</td>
                            <td class="value-cell">${time} - ${day}/${month}/${year}</td>
                        </tr>
                    </table>
                </div>

                <!-- THÔNG TIN NGƯỜI ĐÓNG GÓP -->
                <div class="receipt-section">
                    <div class="section-title">II. THÔNG TIN NGƯỜI ĐÓNG GÓP</div>
                    <table class="receipt-table">
                        ${(() => {
            const ident = detectDonorIdentity(payload.name);
            let label = 'Họ và tên:';
            let showSuffix = true;

            if (ident.type === 'org') {
                label = 'Doanh nghiệp / Tổ chức:';
                showSuffix = false;
            } else if (ident.type === 'family') {
                label = 'Đại diện gia đình:';
            }

            return `
                            <tr>
                                <td class="label-cell">${label}</td>
                                <td class="value-cell">
                                    <span style="display:inline-flex; align-items:center; gap:5px;">
                                        <i class="fa-solid ${ident.icon}" style="color:#64748b;"></i> 
                                        ${payload.name} 
                                        ${showSuffix ? `<span style="font-size:12px; color:#94a3b8; font-weight:normal;">(${ident.label})</span>` : ''}
                                    </span>
                                </td>
                            </tr>`;
        })()}
                        <tr>
                            <td class="label-cell">Số tiền đóng góp:</td>
                            <td class="value-cell amount-highlight">${parseInt(payload.amount).toLocaleString('vi-VN')} đồng</td>
                        </tr>
                        <tr>
                            <td class="label-cell">Bằng chữ:</td>
                            <td class="value-cell italic-text">(${numberToVietnameseWords(parseInt(payload.amount))} đồng)</td>
                        </tr>
                    </table>
                </div>

                <!-- TRẠNG THÁI -->
                <div class="receipt-section">
                    <div class="section-title">III. TRẠNG THÁI XỬ LÝ VÀ CAM KẾT</div>
                    ${payload.verified ? (() => {
            const ident = detectDonorIdentity(payload.name);
            let content = '';

            if (ident.type === 'org') {
                // DOANH NGHIỆP - TỔ CHỨC
                content = `
                        <div class="formal-text">
                            <p style="margin-bottom: 12px; text-align: justify; text-indent: 0;"><b>1. Về xác thực và hạch toán tài chính:</b></p>
                            <p style="margin-bottom: 8px; text-align: justify; text-indent: 20px; line-height: 1.8;">Căn cứ vào kết quả xác thực từ hệ thống thanh toán điện tử MoMo, chúng tôi xác nhận rằng khoản tài trợ, đóng góp của Quý Đơn vị mang mã tham chiếu nêu trên đã được xử lý hoàn tất và <b>xác thực hợp lệ</b> theo đúng quy trình nghiệp vụ chặt chẽ. Toàn bộ số tiền đã được <b>hạch toán đầy đủ, chính xác và kịp thời</b> vào tài khoản Quỹ chính thức của Tổ dân phố số 21, tuân thủ nghiêm ngặt các quy định hiện hành của Nhà nước về quản lý tài chính, minh bạch thu - chi trong hoạt động của tổ chức cơ sở. Quý Đơn vị có thể sử dụng Biên nhận này làm chứng từ hợp pháp để ghi nhận vào sổ sách kế toán và hồ sơ trách nhiệm xã hội của doanh nghiệp (nếu có nhu cầu).</p>
                            
                            <p style="margin-bottom: 12px; text-align: justify; text-indent: 0; margin-top: 15px;"><b>2. Về ghi nhận, công khai và tôn vinh:</b></p>
                            <p style="margin-bottom: 8px; text-align: justify; text-indent: 20px; line-height: 1.8;">Thông tin về khoản đóng góp quý báu của Quý Đơn vị đã được hệ thống tự động <b>cập nhật ngay lập tức</b> vào <b>Sổ vàng điện tử</b> và <b>niêm yết công khai minh bạch</b> trên Cổng thông tin điện tử chính thức của Tổ dân phố. Tên doanh nghiệp và số tiền đóng góp sẽ được <b>tôn vinh đặc biệt</b> trong danh sách các đơn vị tài trợ, thể hiện vai trò tiên phong của Quý Đơn vị trong công tác an sinh xã hội và xây dựng cộng đồng. Chúng tôi cam kết <b>đảm bảo tính chính xác, kịp thời và minh bạch tuyệt đối</b>, thực hiện nghiêm túc quy chế dân chủ ở cơ sở theo tinh thần Chỉ thị của Đảng và quy định của Pháp luật.</p>
                            
                            <p style="margin-bottom: 12px; text-align: justify; text-indent: 0; margin-top: 15px;"><b>3. Về quản lý, sử dụng và báo cáo công khai:</b></p>
                            <p style="text-align: justify; text-indent: 20px; line-height: 1.8;">Ban Lãnh đạo Tổ dân phố trân trọng cam kết sẽ <b>quản lý và sử dụng nguồn tài trợ này đúng mục đích, tiết kiệm, hiệu quả</b>, phù hợp với các chương trình, dự án đã được thông qua tại Hội nghị dân cư hoặc Hội nghị Ban Công tác Mặt trận. Kết quả sử dụng nguồn kinh phí sẽ được <b>báo cáo công khai, minh bạch đầy đủ</b> tới Quý Đơn vị và toàn thể nhân dân trong Tổ dân phố thông qua các hội nghị sơ kết, tổng kết định kỳ (quý, 6 tháng, năm), đồng thời được <b>niêm yết công khai tại Nhà sinh hoạt cộng đồng</b> và trên các kênh thông tin điện tử. Mọi yêu cầu về báo cáo chi tiết hoặc giải trình việc sử dụng nguồn kinh phí sẽ được Ban Lãnh đạo Tổ dân phố tiếp nhận và phản hồi kịp thời, rõ ràng.</p>
                        </div>`;
            } else if (ident.type === 'family') {
                // HỘ GIA ĐÌNH
                content = `
                        <div class="formal-text">
                            <p style="margin-bottom: 12px; text-align: justify; text-indent: 0;"><b>1. Về xác thực và hạch toán tài chính:</b></p>
                            <p style="margin-bottom: 8px; text-align: justify; text-indent: 20px; line-height: 1.8;">Căn cứ vào kết quả xác thực từ hệ thống thanh toán điện tử MoMo, chúng tôi xác nhận rằng khoản đóng góp của Quý Hộ gia đình mang mã tham chiếu nêu trên đã được xử lý hoàn tất và <b>xác thực hợp lệ</b> theo đúng quy trình nghiệp vụ chặt chẽ. Toàn bộ số tiền đóng góp đã được <b>hạch toán đầy đủ, chính xác và kịp thời</b> vào tài khoản Quỹ chính thức của Tổ dân phố số 21, tuân thủ nghiêm ngặt các quy định hiện hành của Nhà nước về quản lý tài chính, minh bạch thu - chi trong hoạt động của tổ chức cơ sở.</p>
                            
                            <p style="margin-bottom: 12px; text-align: justify; text-indent: 0; margin-top: 15px;"><b>2. Về ghi nhận, công khai và tôn vinh gia đình:</b></p>
                            <p style="margin-bottom: 8px; text-align: justify; text-indent: 20px; line-height: 1.8;">Thông tin về khoản đóng góp của Quý Hộ gia đình đã được hệ thống tự động <b>cập nhật ngay lập tức</b> vào <b>Sổ vàng điện tử</b> và <b>niêm yết công khai minh bạch</b> trên Cổng thông tin điện tử chính thức của Tổ dân phố. Tên gia đình sẽ được ghi nhận đặc biệt trong danh sách <b>"Gia đình tiêu biểu, gương mẫu"</b>, thể hiện rõ nét truyền thống tốt đẹp, tinh thần đoàn kết tương thân tương ái của các thế hệ trong gia đình. Chúng tôi cam kết <b>đảm bảo tính chính xác, kịp thời và minh bạch tuyệt đối</b> trong công tác ghi nhận, thực hiện nghiêm túc quy chế dân chủ ở cơ sở theo đúng tinh thần Chỉ thị của Đảng và quy định của Pháp luật.</p>
                            
                            <p style="margin-bottom: 12px; text-align: justify; text-indent: 0; margin-top: 15px;"><b>3. Về quản lý, sử dụng và báo cáo công khai:</b></p>
                            <p style="text-align: justify; text-indent: 20px; line-height: 1.8;">Ban Lãnh đạo Tổ dân phố trân trọng cam kết sẽ <b>quản lý và sử dụng nguồn đóng góp này đúng mục đích, tiết kiệm, hiệu quả</b>, phù hợp với các chương trình, dự án đã được thông qua tại Hội nghị dân cư hoặc Hội nghị Ban Công tác Mặt trận. Kết quả thực hiện sẽ được <b>báo cáo công khai, minh bạch đầy đủ</b> tới toàn thể nhân dân trong Tổ dân phố (bao gồm Quý Hộ gia đình) thông qua các hội nghị sơ kết, tổng kết định kỳ (quý, 6 tháng, năm), đồng thời được <b>niêm yết công khai tại Nhà sinh hoạt cộng đồng</b> và trên các kênh thông tin điện tử để các hộ dân thuận tiện theo dõi, giám sát. Mọi nghi vấn hoặc yêu cầu giải trình sẽ được Ban Lãnh đạo Tổ dân phố tiếp nhận, giải đáp kịp thời và rõ ràng.</p>
                        </div>`;
            } else {
                // CÁ NHÂN
                content = `
                        <div class="formal-text">
                            <p style="margin-bottom: 12px; text-align: justify; text-indent: 0;"><b>1. Về xác thực và hạch toán tài chính:</b></p>
                            <p style="margin-bottom: 8px; text-align: justify; text-indent: 20px; line-height: 1.8;">Căn cứ vào kết quả xác thực từ hệ thống thanh toán điện tử MoMo, chúng tôi xác nhận rằng giao dịch chuyển khoản mang mã tham chiếu nêu trên của Quý vị đã được xử lý hoàn tất và <b>xác thực hợp lệ</b> theo đúng quy trình nghiệp vụ chặt chẽ. Toàn bộ số tiền đóng góp đã được <b>hạch toán đầy đủ, chính xác và kịp thời</b> vào tài khoản Quỹ chính thức của Tổ dân phố số 21, tuân thủ nghiêm ngặt các quy định hiện hành của Nhà nước về quản lý tài chính, minh bạch thu - chi trong hoạt động của tổ chức cơ sở.</p>
                            
                            <p style="margin-bottom: 12px; text-align: justify; text-indent: 0; margin-top: 15px;"><b>2. Về ghi nhận, công khai và minh bạch thông tin:</b></p>
                            <p style="margin-bottom: 8px; text-align: justify; text-indent: 20px; line-height: 1.8;">Thông tin về khoản đóng góp quý báu của Quý vị đã được hệ thống tự động <b>cập nhật ngay lập tức</b> vào <b>Sổ vàng điện tử</b> và <b>niêm yết công khai minh bạch</b> trên Cổng thông tin điện tử chính thức của Tổ dân phố, phù hợp với nguyên tắc dân chủ công khai trong hoạt động ở cơ sở. Bất kỳ người dân nào cũng có thể tra cứu, xem xét và giám sát thông tin đóng góp một cách dễ dàng, rõ ràng. Chúng tôi cam kết <b>đảm bảo tính chính xác, kịp thời và minh bạch tuyệt đối</b> trong công tác ghi nhận, thực hiện nghiêm túc quy chế dân chủ ở cơ sở theo đúng tinh thần Chỉ thị của Đảng và quy định của Pháp luật.</p>
                            
                            <p style="margin-bottom: 12px; text-align: justify; text-indent: 0; margin-top: 15px;"><b>3. Về quản lý, sử dụng và báo cáo công khai:</b></p>
                            <p style="text-align: justify; text-indent: 20px; line-height: 1.8;">Ban Lãnh đạo Tổ dân phố trân trọng cam kết sẽ <b>quản lý và sử dụng nguồn đóng góp này đúng mục đích, tiết kiệm, hiệu quả</b>, phù hợp với các chương trình, dự án đã được thông qua tại Hội nghị dân cư hoặc Hội nghị Ban Công tác Mặt trận. Kết quả thực hiện sẽ được <b>báo cáo công khai, minh bạch đầy đủ</b> tới toàn thể nhân dân trong Tổ dân phố thông qua các hội nghị sơ kết, tổng kết định kỳ (quý, 6 tháng, năm), đồng thời được <b>niêm yết công khai tại Nhà sinh hoạt cộng đồng</b> và trên các kênh thông tin điện tử của Tổ dân phố để nhân dân thuận tiện theo dõi, giám sát. Mọi nghi vấn hoặc yêu cầu giải trình về việc sử dụng nguồn kinh phí đóng góp sẽ được Ban Lãnh đạo Tổ dân phố tiếp nhận, giải đáp kịp thời và rõ ràng.</p>
                        </div>`;
            }

            return content;
        })() : `
                        <div class="status-box pending">
                            <i class="fa-solid fa-clock"></i>
                            <span>Đang chờ Ban Quản trị xác nhận</span>
                        </div>
                        <div class="status-note">
                            * Thông tin đóng góp sẽ được hiển thị công khai sau khi được xác minh.
                        </div>
                    `}
                </div>

                <!-- LỜI CẢM ƠN -->
                ${(() => {
            const ident = detectDonorIdentity(payload.name);
            let thankYou = '';

            if (ident.type === 'org') {
                thankYou = 'Thay mặt Ban Lãnh đạo và toàn thể nhân dân Tổ dân phố số 21, chúng tôi xin gửi tới Quý Đơn vị <b>lời cảm ơn trân trọng và sâu sắc nhất</b>. Khoản tài trợ, đóng góp quý báu này không chỉ là nguồn lực thiết thực, ý nghĩa giúp Tổ dân phố triển khai thành công các hoạt động chung phục vụ cộng đồng, mà còn thể hiện rõ nét <b>tinh thần trách nhiệm xã hội cao cả, nghĩa cử cao đẹp</b> của Quý Đơn vị đối với sự phát triển bền vững của cộng đồng địa phương. Chúng tôi hy vọng rằng mối quan hệ hợp tác, đồng hành giữa Quý Đơn vị và Tổ dân phố sẽ được tiếp tục phát triển, mở rộng và ngày càng bền chặt hơn. Kính chúc Quý Đơn vị luôn <b>phát triển vững mạnh, thịnh vượng và đạt được nhiều thành công cao hơn nữa trong sự nghiệp kinh doanh, đóng góp tích cực cho sự phát triển chung của đất nước</b>!';
            } else if (ident.type === 'family') {
                thankYou = 'Thay mặt Ban Lãnh đạo và toàn thể nhân dân Tổ dân phố số 21, chúng tôi xin gửi tới Quý Hộ gia đình <b>lời cảm ơn trân trọng và sâu sắc nhất</b>. Khoản đóng góp quý báu này không chỉ là nguồn lực thiết thực, ý nghĩa giúp Tổ dân phố triển khai thành công các hoạt động chung phục vụ cộng đồng, mà còn thể hiện rõ nét <b>truyền thống tốt đẹp, tinh thần đoàn kết, tương thân tương ái của các thế hệ trong gia đình</b> - một giá trị văn hóa quý báu cần được gìn giữ và phát huy. Chúng tôi hy vọng rằng tấm gương của Quý Hộ gia đình sẽ lan tỏa mạnh mẽ, truyền cảm hứng cho các hộ dân khác cùng chung tay xây dựng Tổ dân phố văn hóa, văn minh, đoàn kết và phát triển bền vững. Kính chúc Quý Hộ gia đình luôn <b>sum vầy, hạnh phúc, con cháu hiếu thảo, học hành tấn tới, sự nghiệp hanh thông và cuộc sống ngày càng ấm no, sung túc</b>!';
            } else {
                thankYou = 'Thay mặt Ban Lãnh đạo và toàn thể nhân dân Tổ dân phố số 21, chúng tôi xin gửi tới Quý vị <b>lời cảm ơn trân trọng và sâu sắc nhất</b>. Sự đóng góp quý báu này không chỉ là nguồn lực thiết thực, ý nghĩa giúp Tổ dân phố triển khai thành công các hoạt động chung phục vụ cộng đồng, mà còn thể hiện rõ nét <b>tinh thần trách nhiệm, đoàn kết, tương thân tương ái cao đẹp</b> của người dân Tổ dân phố số 21 - một truyền thống tốt đẹp cần được phát huy và nhân rộng. Chúng tôi hy vọng rằng tấm gương của Quý vị sẽ lan tỏa mạnh mẽ, truyền cảm hứng cho mọi người cùng chung tay xây dựng Tổ dân phố văn hóa, văn minh, đoàn kết và phát triển bền vững. Kính chúc Quý vị và gia đình luôn <b>dồi dào sức khỏe, thành đạt, hạnh phúc và bình an</b>!';
            }

            return `
                <div class="thank-you-box">
                    <i class="fa-solid fa-heart"></i>
                    <p style="text-align: justify; line-height: 1.8;">${thankYou}</p>
                </div>`;
        })()}
            </div>

            <!-- CHỮ KÝ & QR CODE -->
            <div class="a4-signature">
                <div class="sig-left">
                    <div class="qr-box">
                        <div class="qr-label">Quét mã để tra cứu:</div>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&margin=0&data=${encodeURIComponent(shareUrl)}" alt="QR Code" class="qr-img">
                    </div>
                </div>
                <div class="sig-right">
                    <div class="sig-title">TM. BAN LÃNH ĐẠO</div>
                    <div class="sig-org">TỔ DÂN PHỐ SỐ 21</div>
                    <div class="sig-note">(Xác nhận tự động)</div>
                    <div class="sig-name">TỔ TRƯỞNG</div>
                </div>
            </div>

            <!-- NÚT HÀNH ĐỘNG -->
            <div class="a4-actions no-print">
                <button onclick="printDocument()" class="btn-action btn-print">
                    <i class="fa-solid fa-print"></i> IN / LƯU PDF
                </button>
                <button onclick="window.location.href='dong-gop.html?id=${payload.fundId}'" class="btn-action btn-primary">
                    <i class="fa-solid fa-arrow-left"></i> QUAY LẠI CHƯƠNG TRÌNH
                </button>
                <button onclick="window.location.href='dong-gop.html'" class="btn-action btn-secondary">
                    VỀ TRANG CHỦ
                </button>
            </div>
        </div>

        <style>
            .a4-document {
                max-width: 800px;
                margin: 30px auto;
                background: white;
                padding: 40px 50px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                font-family: 'Times New Roman', Georgia, serif;
                font-size: 15px;
                line-height: 1.6;
                border: 1px solid #ddd;
            }
            .a4-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 25px;
                padding-bottom: 15px;
                border-bottom: 1px solid #ccc;
            }
            .a4-header-left {
                text-align: center;
                flex: 1;
            }
            .a4-header-right {
                text-align: center;
                flex: 1.2;
            }
            .org-name {
                font-weight: bold;
                font-size: 14px;
                text-transform: uppercase;
            }
            .org-sub {
                font-size: 13px;
                color: #555;
            }
            .doc-number {
                margin-top: 8px;
                font-size: 13px;
            }
            .quoc-hieu {
                font-weight: bold;
                font-size: 14px;
                text-transform: uppercase;
            }
            .tieu-ngu {
                font-size: 14px;
                font-weight: bold;
                font-style: italic;
                margin-top: 3px;
            }
            .tieu-ngu-line {
                width: 180px;
                height: 2px;
                background: #333;
                margin: 5px auto;
            }
            .doc-date {
                font-size: 13px;
                font-style: italic;
                margin-top: 8px;
            }
            .a4-title {
                text-align: center;
                margin: 25px 0 30px;
            }
            .title-main {
                font-size: 20px;
                font-weight: bold;
                text-transform: uppercase;
                color: #333;
            }
            .title-main.success-title {
                color: #16a34a;
            }
            .title-main.success-title i {
                margin-right: 8px;
            }
            .title-sub {
                font-size: 14px;
                font-style: italic;
                color: #666;
                margin-top: 5px;
            }
            .a4-body {
                margin-bottom: 30px;
            }
            .receipt-intro {
                text-align: justify;
                margin-bottom: 20px;
                text-indent: 40px;
            }
            .receipt-section {
                margin-bottom: 20px;
            }
            .section-title {
                font-weight: bold;
                margin-bottom: 10px;
                color: #333;
            }
            .receipt-table {
                width: 100%;
                border-collapse: collapse;
            }
            .receipt-table tr {
                border-bottom: 1px dotted #ccc;
            }
            .receipt-table td {
                padding: 8px 5px;
                vertical-align: top;
            }
            .label-cell {
                width: 180px;
                color: #555;
            }
            .value-cell {
                font-weight: 500;
                color: #222;
            }
            .highlight-code {
                font-weight: bold;
                color: #be0000;
                font-size: 16px;
                letter-spacing: 1px;
            }
            .amount-highlight {
                font-weight: bold;
                color: #16a34a;
                font-size: 18px;
            }
            .italic-text {
                font-style: italic;
                font-weight: normal;
                color: #555;
            }
            .status-box {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                padding: 12px 20px;
                border-radius: 6px;
                font-weight: 600;
            }
            .status-box.pending {
                background: #fff7ed;
                color: #c2410c;
                border: 1px solid #fed7aa;
            }
            .status-box.success {
                background: #f0fdf4;
                color: #16a34a;
                border: 1px solid #86efac;
            }
            .status-box.verified {
                background: #f0fdf4;
                color: #16a34a;
                border: 1px solid #86efac;
            }
            .status-box.verified i {
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            .status-note {
                font-size: 13px;
                font-style: italic;
                color: #666;
                margin-top: 10px;
            }
            .status-note.success-note {
                color: #16a34a;
                font-style: normal;
                font-weight: 500;
            }
            .formal-text {
                font-family: 'Times New Roman', Georgia, serif;
                font-size: 15px;
                color: #333;
                text-align: justify;
                padding-left: 20px;
                margin-top: 5px;
            }
            .thank-you-box {
                margin-top: 25px;
                padding: 20px;
                background: linear-gradient(135deg, #fef2f2, #fff);
                border-left: 4px solid #be0000;
                border-radius: 0 8px 8px 0;
            }
            .thank-you-box i {
                color: #be0000;
                font-size: 24px;
                margin-bottom: 10px;
                display: block;
            }
            .thank-you-box p {
                margin: 0;
                text-align: justify;
                color: #333;
            }
            .a4-signature {
                display: flex;
                justify-content: space-between;
                margin-top: 40px;
                margin-bottom: 30px;
            }
            .sig-left { flex: 1; }
            .sig-right {
                flex: 1;
                text-align: center;
            }
            .sig-title, .sig-org {
                font-weight: bold;
                text-transform: uppercase;
                font-size: 14px;
            }
            .sig-note {
                font-style: italic;
                color: #888;
                font-size: 12px;
                margin: 30px 0 10px;
            }
            .sig-name {
                font-weight: bold;
                font-size: 15px;
            }
            /* QR CODE STYLES */
            .qr-box {
                text-align: center;
                margin-top: 10px;
                padding-left: 20px;
            }
            .qr-label {
                font-size: 11px;
                font-style: italic;
                margin-bottom: 5px;
                color: #555;
            }
            .qr-img {
                width: 90px;
                height: 90px;
                display: block;
                margin: 0 auto;
            }
            .a4-actions {
                display: flex;
                gap: 15px;
                justify-content: center;
                padding-top: 20px;
                border-top: 1px solid #eee;
            }
            .btn-action {
                padding: 12px 25px;
                border: none;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                font-size: 14px;
                font-family: 'Segoe UI', sans-serif;
                transition: all 0.2s;
            }
            .btn-action.btn-primary {
                background: #be0000;
                color: white;
            }
            .btn-action.btn-primary:hover {
                background: #a00;
            }
            .btn-action.btn-secondary {
                background: #f1f5f9;
                color: #475569;
                border: 1px solid #e2e8f0;
            }
            .btn-action.btn-secondary:hover {
                background: #e2e8f0;
            }
            @media (max-width: 768px) {
                .a4-document {
                    margin: 10px;
                    padding: 20px;
                }
                .a4-header {
                    flex-direction: column;
                    gap: 15px;
                }
                .a4-actions {
                    flex-direction: column;
                }
                .btn-action {
                    width: 100%;
                }
            }
            
            /* SHARE URL BOX */
            .share-url-box {
                margin-top: 25px;
                padding: 15px;
                background: #f8fafc;
                border: 1px dashed #cbd5e1;
                border-radius: 8px;
            }
            .share-url-label {
                font-size: 13px;
                color: #64748b;
                margin-bottom: 8px;
            }
            .share-url-label i {
                margin-right: 5px;
            }
            .share-url-content {
                display: flex;
                gap: 8px;
            }
            .share-url-input {
                flex: 1;
                padding: 10px 12px;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                font-size: 13px;
                background: white;
                color: #334155;
                font-family: monospace;
            }
            .btn-copy-url {
                padding: 10px 15px;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .btn-copy-url:hover {
                background: #2563eb;
            }
            
            /* PRINT BUTTON */
            .btn-action.btn-print {
                background: #059669;
                color: white;
            }
            .btn-action.btn-print:hover {
                background: #047857;
            }
            
            /* PRINT STYLES */
            @media print {
                @page { margin: 0; size: A4; }
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                
                html, body {
                    width: 210mm;
                    height: auto;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                    visibility: hidden;
                }
                
                #printable-document {
                    visibility: visible;
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 210mm !important;
                    min-height: 297mm !important;
                    margin: 0 !important;
                    padding: 0 15mm !important; /* Side padding only */
                    box-shadow: none !important;
                    border: none !important;
                    background: white !important;
                    font-size: 11pt !important;
                    line-height: 1.3 !important;
                    z-index: 2147483647;
                    transform: none !important;
                }

                #printable-document * {
                    visibility: visible;
                }
                
                .no-print { display: none !important; }
                
                .a4-document {
                    box-shadow: none !important;
                    border: none !important;
                    max-width: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                }
                
                .a4-header { margin-bottom: 10px !important; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
                .a4-title { margin: 10px 0 !important; }
                .receipt-section { margin-bottom: 10px !important; }
                .receipt-section p { margin-bottom: 5px; }
                .thank-you-box { margin-top: 15px; padding: 10px; }
                .a4-signature { margin-top: 15px !important; }
                
                .receipt-table td { padding: 4px 2px !important; }
            }
        </style>
    `;
}

// Helper function to convert number to Vietnamese words
function numberToVietnameseWords(num) {
    if (num === 0) return 'Không';

    const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const teens = ['mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm', 'mười sáu', 'mười bảy', 'mười tám', 'mười chín'];

    function readThreeDigits(n) {
        let result = '';
        const hundreds = Math.floor(n / 100);
        const remainder = n % 100;
        const tens = Math.floor(remainder / 10);
        const units = remainder % 10;

        if (hundreds > 0) {
            result += ones[hundreds] + ' trăm ';
        }
        if (tens === 0 && units > 0 && hundreds > 0) {
            result += 'lẻ ' + ones[units];
        } else if (tens === 1) {
            result += teens[units];
        } else if (tens > 1) {
            result += ones[tens] + ' mươi ';
            if (units === 1 && tens > 1) {
                result += 'mốt';
            } else if (units === 5 && tens > 0) {
                result += 'lăm';
            } else {
                result += ones[units];
            }
        } else if (tens === 0 && units > 0 && hundreds === 0) {
            result += ones[units];
        }
        return result.trim();
    }

    const billion = Math.floor(num / 1000000000);
    const million = Math.floor((num % 1000000000) / 1000000);
    const thousand = Math.floor((num % 1000000) / 1000);
    const remainder = num % 1000;

    let result = '';
    if (billion > 0) result += readThreeDigits(billion) + ' tỷ ';
    if (million > 0) result += readThreeDigits(million) + ' triệu ';
    if (thousand > 0) result += readThreeDigits(thousand) + ' nghìn ';
    if (remainder > 0) result += readThreeDigits(remainder);

    result = result.trim();
    return result.charAt(0).toUpperCase() + result.slice(1);
}

// 6. INIT
// Add to loadDonationPage or global init
// Assuming loadDonationPage is called first

function simulateMoMoSuccess() {
    // Ensure we have data
    if (!window.pendingDonationPayload) {
        alert("Chưa có dữ liệu đóng góp để giả lập! Vui lòng điền form và tạo mã trước.");
        return;
    }

    // Save force session
    localStorage.setItem('pending_momo_donation', JSON.stringify({
        payload: window.pendingDonationPayload,
        timestamp: Date.now()
    }));

    alert("Đang giả lập thanh toán thành công...");

    // Redirect with Success Params
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('resultCode', '0');
    currentUrl.searchParams.set('message', 'Simulated Success');
    currentUrl.searchParams.set('transId', 'SIM-' + Date.now());
    currentUrl.searchParams.set('orderId', window.pendingDonationPayload.code);

    window.location.href = currentUrl.toString();
}

async function finalizeDonation() {
    if (!window.pendingDonationPayload) {
        alert("Không tìm thấy thông tin đóng góp. Vui lòng thử lại.");
        location.reload();
        return;
    }

    const payload = window.pendingDonationPayload;
    // Update timestamp to actual confirm time
    payload.timestamp = new Date().toISOString();

    try {
        await db.collection('donations').add(payload);

        // Show Success UI
        const container = document.getElementById('donation-form-container');
        container.innerHTML = `
            <div class="qr-sidebar-container" style="text-align:center; padding-top:40px;">
                <div style="margin-bottom:20px;">
                   <i class="fa-solid fa-circle-check" style="color: #16a34a; font-size: 60px; animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);"></i>
                </div>
                
                <h3 style="color:#166534; font-weight:900; margin-bottom:10px;">GHI NHẬN THÀNH CÔNG!</h3>
                <p style="font-size:13px; color:#4b5563; line-height:1.5;">
                    Cảm ơn <b>${payload.name}</b> đã đóng góp.<br>
                    <div style="margin: 15px 0; padding:10px; background:#fff7ed; border:1px dashed #f97316; border-radius:8px;">
                        Mã giao dịch của bạn:<br>
                        <b style="color:#ea580c; font-size:24px; letter-spacing:1px;">${payload.code}</b>
                    </div>
                    Thông tin của bạn đã được cập nhật vào danh sách.
                </p>

                <div style="margin-top: 30px;">
                     <button onclick="location.reload()" class="btn-back-sidebar" style="background:#f3f4f6; color:#333; border:1px solid #ddd; padding:10px 25px; border-radius:6px; cursor:pointer; font-weight:bold;">
                        <i class="fa-solid fa-rotate-right"></i> ĐÓNG GÓP TIẾP
                    </button>
                </div>
            </div>
        `;

        // Cleanup
        window.pendingDonationPayload = null;

    } catch (e) {
        console.error("Save Donation Error:", e);
        alert("Lỗi kết nối! Không thể lưu thông tin. Vui lòng chụp màn hình và gửi cho Admin.");
    }
}

// ROBUST PRINT FUNCTION (IFRAME METHOD)
function printDocument() {
    const content = document.getElementById('printable-document');
    if (!content) {
        alert("Không tìm thấy nội dung để in!");
        return;
    }

    // Create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    // Get HTML content
    const doc = iframe.contentWindow.document;

    // Write content
    doc.open();
    doc.write('<!DOCTYPE html>');
    doc.write('<html><head><title>Biên nhận đóng góp</title>');

    // Copy FontAwesome for icons
    doc.write('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">');

    // Internal styles
    doc.write('<style>');
    doc.write(`
        @page { size: A4; margin: 0; }
        body { 
            margin: 0; 
            padding: 0; 
            font-family: 'Times New Roman', serif; 
            background: white;
            -webkit-print-color-adjust: exact;
        }
        .a4-document {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm 10mm 0mm 10mm; /* Top 20mm, Sides 10mm, Bottom 0mm */
            box-sizing: border-box;
            background: white;
            position: relative;
        }
        /* Reuse existing classes but stripped down */
        .a4-header { display: flex; justify-content: space-between; border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
        .a4-header-left, .a4-header-right { text-align: center; flex: 1; }
        .org-name { font-weight: bold; text-transform: uppercase; font-size: 11pt; }
        .org-sub { font-size: 10pt; color: #555; }
        .doc-number { font-size: 10pt; margin-top: 5px; }
        .quoc-hieu { font-weight: bold; text-transform: uppercase; font-size: 11pt; }
        .tieu-ngu { font-size: 11pt; font-weight: bold; font-style: italic; }
        .tieu-ngu-line { width: 100px; height: 1px; background: #333; margin: 5px auto; }
        .doc-date { font-size: 10pt; font-style: italic; margin-top: 5px; }
        
        .a4-title { text-align: center; margin: 20px 0; }
        .title-main { font-size: 16pt; font-weight: bold; text-transform: uppercase; }
        .title-sub { font-size: 12pt; font-style: italic; margin-top: 5px; }
        .success-title { color: #16a34a; }
        .error-title { color: #dc2626; }
        
        .receipt-intro { text-align: justify; text-indent: 30px; margin-bottom: 15px; font-size: 12pt; line-height: 1.5; }
        
        .receipt-section { margin-bottom: 15px; }
        .section-title { font-weight: bold; margin-bottom: 8px; font-size: 11pt; }
        
        table { width: 100%; border-collapse: collapse; font-size: 11pt; }
        td { padding: 4px 0; vertical-align: top; }
        .label-cell { width: 40%; color: #444; }
        .value-cell { width: 60%; font-weight: 500; }
        
        .highlight-code { font-weight: bold; color: #be0000; font-size: 12pt; }
        .amount-highlight { font-weight: bold; color: #16a34a; font-size: 13pt; }
        .italic-text { font-style: italic; }
        
        .formal-text p { margin: 5px 0; text-align: justify; line-height: 1.4; }
        
        .thank-you-box { margin-top: 20px; padding: 15px; border: 1px solid #eee; background: #fafafa; font-style: italic; text-align: justify; font-size: 11pt; line-height: 1.4; }
        .thank-you-box i { display: none; }
        
        .a4-signature { display: flex; justify-content: space-between; margin-top: 30px; }
        .sig-left, .sig-right { flex: 1; text-align: center; }
        .sig-title { font-weight: bold; text-transform: uppercase; font-size: 11pt; }
        .sig-name { font-weight: bold; margin-top: 50px; font-size: 11pt; }
        .sig-note { font-style: italic; font-size: 10pt; }
        
        .qr-box { margin-top: 10px; }
        .qr-img { width: 80px; height: 80px; }
        .qr-label { font-size: 9pt; font-style: italic; margin-bottom: 3px; }
        
        /* HIDE NON-PRINT */
        .no-print, .a4-actions { display: none !important; }
    `);
    doc.write('</style>');
    doc.write('</head><body>');
    doc.write(content.innerHTML); // Write the raw content
    doc.write('</body></html>');
    doc.close();

    // Print after load (give images time)
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        // Remove iframe after print dialog closes (approximate)
        // setTimeout(() => document.body.removeChild(iframe), 1000); 
        // Keeping it doesn't hurt, removing too early breaks print in some browsers
    }, 500);
}

// UTILS
function formatTimeAgo(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Vừa xong';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
}

function removeAccentsSimple(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^a-zA-Z0-9 ]/g, "");
}
function resetDonationForm() {
    if (!window.currentFundData) return;
    const fundId = window.currentFundData.id;
    const container = document.getElementById('all-funds-container') || document.querySelector('.fund-detail-container');
    // Fallback if ID not found, but usually it is passed. 
    // Ideally renderFundDetail should be called on the same container.
    // For now, reload page might be safer or re-call init.
    // But let's try to re-render.
    if (container) {
        renderFundDetail(container, fundId);
    } else {
        location.reload();
    }
}



function openCustomModal(html) {
    let overlay = document.getElementById('custom-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'custom-modal-overlay';
        overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(5px);';
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `<div style="background:white; padding:30px; border-radius:12px; width:90%; max-width:400px; animation: popIn 0.3s;">${html}</div>`;
    overlay.style.display = 'flex';
}

function closeCustomModal() {
    const overlay = document.getElementById('custom-modal-overlay');
    if (overlay) overlay.style.display = 'none';
}

// Global Payment Logic
let currentPayInfo = {};

function openPaymentModal(id, title, bankId, accNo, template) {
    currentPayInfo = { bankId, accNo, template };

    document.getElementById('pay-fund-title').innerText = title;
    document.getElementById('pay-bank-info').innerText = `${bankId} - ${accNo}`;
    document.getElementById('pay-name').value = '';
    document.getElementById('pay-amount').value = '';

    // Default QR (Empty amount)
    updateQRPreview();

    document.getElementById('payment-modal').style.display = 'flex';
}

function closePaymentModal() {
    document.getElementById('payment-modal').style.display = 'none';
}

function updateQRPreview() {
    const name = document.getElementById('pay-name').value.trim() || 'NguoiDan';
    const amount = document.getElementById('pay-amount').value || '0';

    // VietQR Format
    // https://img.vietqr.io/image/<BANK>-<ACC>-<TEMPLATE>.png?amount=<AMT>&addInfo=<CONTENT>

    // Normalize content: Convert template + name -> unsigned
    const content = (currentPayInfo.template + ' ' + removeAccents(name)).toUpperCase();

    // Clean account number (remove spaces)
    const cleanAccNo = currentPayInfo.accNo ? currentPayInfo.accNo.toString().replace(/[^a-zA-Z0-9]/g, '') : '';

    // BANK MAPPING
    const BANK_MAPPING = {
        'CTG': 'VietinBank', 'ICB': 'VietinBank',
        'VCB': 'Vietcombank',
        'MB': 'MB', 'MBBANK': 'MB',
        'TCB': 'Techcombank', 'TECHCOMBANK': 'Techcombank',
        'VPB': 'VPBank', 'VPBANK': 'VPBank',
        'ACB': 'ACB',
        'BIDV': 'BIDV', 'BID': 'BIDV',
        'STB': 'Sacombank', 'SACOMBANK': 'Sacombank',
        'HDB': 'HDBank', 'HDBANK': 'HDBank',
        'VIB': 'VIB',
        'TPB': 'TPBank', 'TPBANK': 'TPBank',
        'SHB': 'SHB',
        'OCB': 'OCB',
        'MSB': 'MSB',
        'LPB': 'LienVietPostBank', 'LPBANK': 'LienVietPostBank',
        'SSB': 'SeABank', 'SEABANK': 'SeABank',
        'VBA': 'Agribank', 'VARB': 'Agribank', 'AGRIBANK': 'Agribank'
    };
    let bankIdRaw = currentPayInfo.bankId || 'MB';
    let useBankId = bankIdRaw.trim().toUpperCase();
    if (BANK_MAPPING[useBankId]) {
        useBankId = BANK_MAPPING[useBankId];
    }

    const qrUrl = `https://img.vietqr.io/image/${useBankId}-${cleanAccNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(content)}`;

    document.getElementById('pay-qr-img').src = qrUrl;
}

function removeAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}

/* --- MISSING DONATION HELPER FUNCTIONS --- */
/* --- MISSING DONATION HELPER FUNCTIONS --- */
function checkDonateInputPage() {
    const name = document.getElementById('d-name-page').value;
    const amountStr = document.getElementById('d-amount-page').value;
    const amount = amountStr ? parseInt(amountStr.replace(/\./g, '')) : 0;
    const btn = document.getElementById('btn-gen-qr-page');

    if ((name || document.getElementById('d-anonymous-page')?.checked) && amount > 0) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    } else {
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
    }
}

function setAmountPage(val) {
    const input = document.getElementById('d-amount-page');
    // Format with dots
    input.value = val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    input.dispatchEvent(new Event('input')); // Trigger formatter
    checkDonateInputPage();
}

function handleAmountInput(el) {
    // 1. Get raw value, remove non-digits
    let raw = el.value.replace(/\D/g, '');
    if (!raw) {
        el.value = '';
        document.getElementById('amount-in-words').innerText = '';
        return;
    }

    // 2. Format with dots
    const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    el.value = formatted;

    // 3. Convert to words
    const num = parseInt(raw);
    const words = numberToVietnameseWords(num);
    document.getElementById('amount-in-words').innerText = words ? `(${words} đồng)` : '';
}

/* --- NEW REAL-TIME RENDER FUNCTION --- */
async function renderFundDetail(container, fundId) {
    try {
        // Cleanup
        if (donationUnsubscribe) { donationUnsubscribe(); donationUnsubscribe = null; }
        if (fundUnsubscribe) { fundUnsubscribe(); fundUnsubscribe = null; }
        localDonationsCache = [];

        container.innerHTML = '<div style="text-align:center; padding:50px;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 30px; color: var(--primary-red);"></i><br><br>Đang tải dữ liệu...</div>';

        // 1. LISTEN TO FUND (Real-time Content Updates)
        const docRef = db.collection('funds').doc(fundId);

        fundUnsubscribe = docRef.onSnapshot(docSnap => {
            if (!docSnap.exists) {
                container.innerHTML = '<div class="alert alert-warning">Cuộc vận động không tồn tại hoặc đã bị xóa.</div>';
                return;
            }

            const fund = docSnap.data();
            window.currentFundData = { id: fundId, ...fund };

            // Hide Intro Check
            const introText = document.getElementById('donation-intro-text');
            if (introText) introText.style.display = 'none';

            // Check if Static Layout exists, if not render it
            if (!document.getElementById('live-fund-title')) {
                renderStaticLayout(container, fund);
            } else {
                // Update Static Elements
                updateStaticContent(fund);
            }

            // Re-render stats if we have donations
            if (localDonationsCache.length >= 0) {
                renderDonationStats(localDonationsCache, window.currentFundData);
            }
        });

        // 2. LISTEN TO DONATIONS (Real-time List)
        donationUnsubscribe = db.collection('donations')
            .where('fundId', '==', fundId)
            .onSnapshot(snapshot => {
                const donations = snapshot.docs.map(d => d.data());

                // Sort
                donations.sort((a, b) => {
                    const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                    const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                    return tB - tA;
                });

                localDonationsCache = donations;

                // Render Stats (pass current fund data if available)
                if (window.currentFundData) {
                    renderDonationStats(donations, window.currentFundData);
                }
            });

    } catch (e) {
        console.error("Fund Detail Error:", e);
        container.innerHTML = '<p class="text-center">Lỗi hệ thống. Vui lòng thử lại.</p>';
    }
}

function renderStaticLayout_OLD(container, fund) {
    container.innerHTML = `
        <div style="margin-bottom: 30px;">
            <a href="dong-gop.html" style="color: var(--p-gray); text-decoration: none; font-weight: 600; font-size: 14px;">
                <i class="fa-solid fa-arrow-left"></i> QUAY LẠI DANH SÁCH
            </a>
        </div>

        <div class="donation-hero-v2">
            <span style="background: rgba(255,255,255,0.2); padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: 800; text-transform: uppercase;">
                <i class="fa-solid fa-circle-check"></i> Đang Tiếp Nhận Đóng Góp
            </span>
            <h1 id="live-fund-title">${fund.title}</h1>
            <p id="live-fund-summary">${fund.summary || ''}</p>
        </div>

        <div class="premium-detail-grid">
            <div class="detail-main-content glass-effect">
                <div style="display: flex; gap: 20px; color: var(--p-gray); font-size: 14px; margin-bottom: 30px; border-bottom: 1px solid #f1f5f9; padding-bottom: 15px;">
                    <span><i class="fa-regular fa-calendar"></i> Ngày đăng: <span id="live-fund-date">${formatDateDisplay(fund.createdAt || fund.created)}</span></span>
                </div>
                
                <div id="live-fund-content" class="article-content" style="font-size: 17px; line-height: 1.8; color: var(--p-slate);">
                    ${fund.content || '<p><em>Nội dung đang được cập nhật...</em></p>'}
                </div>

                <div class="donation-steps" style="margin-top:20px; border-top:1px solid #eee; padding-top:20px;">
                    <h4 style="margin: 0 0 15px 0; font-weight: bold; color: var(--gov-red); font-size: 18px; text-transform: uppercase;">
                        <i class="fa-solid fa-circle-info fa-bounce" style="--fa-animation-duration: 3s;"></i> HƯỚNG DẪN ỦNG HỘ NHANH
                    </h4>
                    <div class="donation-steps-grid">
                        <div class="step-item">
                            <div class="step-icon text-blue"><i class="fa-solid fa-keyboard fa-shake" style="--fa-animation-duration: 5s;"></i></div>
                            <div class="step-content">
                                <div class="step-title">1. Nhập thông tin</div>
                                <div class="step-desc">Điền họ tên & số tiền</div>
                            </div>
                        </div>
                        <div class="step-item">
                            <div class="step-icon text-red"><i class="fa-solid fa-qrcode fa-beat" style="--fa-animation-duration: 2s;"></i></div>
                            <div class="step-content">
                                <div class="step-title">2. Quét mã QR</div>
                                <div class="step-desc">Dùng App ngân hàng</div>
                            </div>
                        </div>
                        <div class="step-item">
                            <div class="step-icon text-green"><i class="fa-solid fa-circle-check fa-flip" style="--fa-animation-duration: 6s; --fa-flip-x: 1;"></i></div>
                            <div class="step-content">
                                <div class="step-title">3. Hoàn tất</div>
                                <div class="step-desc">Hệ thống ghi nhận ngay</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="live-contributor-section" style="margin-top: 50px; padding-top: 30px; border-top: 1px solid #f1f5f9;">
                    <!-- List Rendered Here -->
                </div>
            </div>

            <div class="detail-sidebar">
                <div class="premium-widget-card" id="donation-action-card">
                    <!-- Header removed as per user request -->

                    <div id="donation-form-container" style="padding: 25px;">
                        
                        <div class="progress-container" id="live-progress-bar" style="margin-bottom:30px;">
                            <!-- Progress Rendered Here -->
                        </div>

                        <!-- 1. NAME -->
                        <div class="premium-input-group">
                            <label><i class="fa-solid fa-user"></i> Họ Tên (Hoặc Gia đình)</label>
                            <input type="text" id="d-name-page" class="premium-input" placeholder="Ví dụ: Gia đình ông Nguyễn Văn A..." onkeyup="checkDonateInputPage()">
                        </div>

                        <!-- 2. ANONYMOUS -->
                        <div class="premium-checkbox-wrapper" onclick="document.getElementById('d-anonymous-page').click()">
                            <input type="checkbox" id="d-anonymous-page" class="premium-checkbox" onclick="event.stopPropagation(); toggleAnonymousInput()">
                            <div style="flex:1;">
                                <div style="font-weight:bold; font-size:14px; color:#334155;">Ủng hộ ẩn danh</div>
                                <div style="font-size:12px; color:#64748b;">Tên sẽ được giấu trên danh sách công khai</div>
                            </div>
                        </div>

                        <!-- 3. MONEY -->
                        <div class="premium-input-group">
                            <label><i class="fa-solid fa-sack-dollar"></i> Số tiền (VNĐ)</label>
                            <input type="number" id="d-amount-page" class="premium-input" placeholder="Nhập số tiền (VD: 500000)..." onkeyup="checkDonateInputPage()">
                        </div>

                        <!-- Chips -->
                        <div class="premium-amount-grid">
                            <button onclick="setAmountPage(100000)" class="premium-chip">100k</button>
                            <button onclick="setAmountPage(200000)" class="premium-chip">200k</button>
                            <button onclick="setAmountPage(500000)" class="premium-chip">500k</button>
                        </div>

                        <!-- BUTTON -->
                        <button onclick="registerAndGenMoMo()" id="btn-gen-qr-page" class="premium-submit-btn momo-btn" disabled style="background: linear-gradient(135deg, #ae2070 0%, #d82d8b 100%); box-shadow: 0 8px 20px rgba(174, 32, 112, 0.35);">
                            <span>THANH TOÁN (MOMO)</span> <i class="fa-solid fa-wallet"></i>
                        </button>
                        
                        <p style="font-size:12px; color:#94a3b8; margin-top:20px; text-align:center; font-style:italic;">
                            * Thông tin sẽ được kiểm duyệt trước khi hiển thị.
                        </p>
                    </div>
                </div>
            </div>
            
            <!-- MOBILE STICKY ACTION BAR -->
            <div class="mobile-sticky-action">
                <div style="flex:1;">
                    <div style="font-size:12px; color:#555;">Đã quyên góp</div>
                    <div id="sticky-percent-text" style="font-weight:bold; color:var(--p-red); font-size:16px;">0%</div>
                </div>
                <button onclick="document.getElementById('donation-form-container').scrollIntoView({behavior: 'smooth'})" class="btn-p-submit" style="margin:0; width:auto; padding:12px 25px; font-size:14px;">
                    ỦNG HỘ NGAY
                </button>
            </div>
        </div>
    `;
}

function updateStaticContent(fund) {
    const titleEl = document.getElementById('live-fund-title');
    if (titleEl) titleEl.innerText = fund.title;

    const contentEl = document.getElementById('live-fund-content');
    if (contentEl) contentEl.innerHTML = fund.content || '<p><em>Nội dung đang được cập nhật...</em></p>';
}

function renderDonationStats(donations, fund) {
    // Cache for Search
    window.localDonationsCache = donations;
    window.currentFundData = fund;

    const totalRaised = donations.filter(d => d.verified).reduce((sum, d) => sum + (parseInt(d.amount) || 0), 0);
    const target = parseInt(fund.targetAmount) || 10000000;
    const percent = Math.min(Math.round((totalRaised / target) * 100), 100);

    // Update Progress
    const progressEl = document.getElementById('live-progress-bar');
    if (progressEl) {
        progressEl.innerHTML = `
            <div class="progress-label">
                <span>Đã vận động</span>
                <span style="color: var(--p-red);">${percent}%</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${percent}%;"></div>
            </div>
            <div style="display:flex; justify-content: space-between; font-size: 12px; margin-top: 6px; color: #64748b;">
                <span>Mục tiêu: ${target.toLocaleString('vi-VN')}đ</span>
                <span>Đạt: ${totalRaised.toLocaleString('vi-VN')}đ</span>
            </div>
        `;
    }

    // Update Hidden Summary Widget
    const summaryWidget = document.getElementById('donor-summary-widget');
    if (summaryWidget) {
        const count = donations.filter(d => d.verified).length;
        // Last 1 donor
        const lastDonor = donations.find(d => d.verified);
        let lastHtml = '';
        if (lastDonor) {
            const timeAgo = formatTimeAgo(lastDonor.timestamp);
            const name = lastDonor.isAnonymous ? 'Nhà hảo tâm' : (lastDonor.name || 'Nhà hảo tâm');
            lastHtml = `<div style="margin-top:5px; font-weight:bold; color:#1e293b;">⚡ ${name} <span style="font-weight:normal; color:#64748b;">vừa ủng hộ</span> <span style="color:#ef4444;">${parseInt(lastDonor.amount).toLocaleString()}đ</span></div><div style="font-size:12px;">(${timeAgo})</div>`;
        }

        summaryWidget.innerHTML = `
            <div style="font-size: 24px; font-weight: 800; color: #1e293b;">${count}</div>
            <div style="font-size: 12px; text-transform: uppercase;">Lượt ủng hộ</div>
            ${lastHtml}
        `;
    }

    // Update Modal List
    const listEl = document.getElementById('modal-contributor-list');
    if (listEl) {
        // SEARCH FILTER
        const rawSearchTerm = window.currentSearchTerm ? window.currentSearchTerm.trim() : '';

        // 1. Determine Base List
        let displayDonations = [];
        if (rawSearchTerm) {
            // If Searching: Search EVERYTHING
            displayDonations = donations;
        } else {
            // If NOT Searching: Show ONLY Verified
            displayDonations = donations.filter(d => d.verified);
        }

        // 2. Apply Search
        if (rawSearchTerm) {
            const normalize = (str) => {
                if (!str) return '';
                const noAccents = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
                return noAccents.toLowerCase().replace(/[^a-z0-9]/g, '');
            };

            const searchKey = normalize(rawSearchTerm);
            const searchKeyOriginal = rawSearchTerm.toLowerCase();

            displayDonations = displayDonations.filter(d => {
                const normName = normalize(d.name);
                const normCode = normalize(d.code);
                const normAmount = normalize(d.amount?.toString());

                return (normName.includes(searchKey)) ||
                    (normCode.includes(searchKey)) ||
                    (normAmount.includes(searchKey)) ||
                    (d.name && d.name.toLowerCase().includes(searchKeyOriginal));
            });
        }

        listEl.innerHTML = `
            <div style="padding: 0;">
                ${displayDonations.length > 0 ? displayDonations.map((d, index) => `
                    <div style="padding: 15px 20px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: ${index % 2 === 0 ? 'white' : '#f8fafc'};">
                        <div style="text-align: left;">
                            <div style="font-size: 11px; color: #64748b; font-weight: bold; margin-bottom: 3px; display:flex; align-items:center; gap:5px;">
                                <span style="background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:4px;">
                                    #${d.code || '---'}
                                </span>
                            </div>
                            <div class="contributor-name" style="font-weight: 600; color: #334155; margin-bottom: 2px;">
                                ${d.isAnonymous ? 'Nhà hảo tâm (Ẩn danh)' : (d.name || 'Ẩn danh')} 
                                ${getDonationStatusBadge(d)}
                            </div>
                            <div class="contributor-time" style="font-size: 12px; color: #94a3b8;">
                                ${formatTimeAgo(d.timestamp)}
                            </div>
                            ${d.note ? `<div style="font-size:12px; color:#475569; font-style:italic; margin-top:3px;"><i class="fa-solid fa-message" style="color:#cbd5e1;"></i> "${d.note}"</div>` : ''}
                        </div>
                        <div class="contributor-amount" style="font-weight:900; color:var(--p-red); font-size: 15px;">${parseInt(d.amount).toLocaleString('vi-VN')} đ</div>
                    </div>
                `).join('') : '<div style="padding:40px; text-align:center; color:#999; font-style:italic;">Không tìm thấy dữ liệu phù hợp.</div>'}
            </div>
        `;

        // Restore focus if searching
        if (window.currentSearchTerm) {
            const searchInput = document.getElementById('modal-search-input');
            if (searchInput) {
                searchInput.value = window.currentSearchTerm;
                searchInput.focus();
            }
        }
    }
}

function openDonorModal() {
    const modal = document.getElementById('donor-modal-overlay');
    if (modal) {
        modal.style.display = 'flex';
        // Trigger render to ensure list is populated
        if (window.localDonationsCache && window.currentFundData) {
            renderDonationStats(window.localDonationsCache, window.currentFundData);
        }
    }
}

function closeDonorModal() {
    const modal = document.getElementById('donor-modal-overlay');
    if (modal) modal.style.display = 'none';

    // Clear search on close
    window.currentSearchTerm = '';
    renderDonationStats(window.localDonationsCache, window.currentFundData);
}

function toggleAnonymousInput() {
    const isAnon = document.getElementById('d-anonymous-page').checked;
    const nameInput = document.getElementById('d-name-page');
    if (isAnon) {
        nameInput.disabled = true;
        nameInput.placeholder = "Đang chọn chế độ ẩn danh...";
        nameInput.value = '';
    } else {
        nameInput.disabled = false;
        nameInput.placeholder = "Ví dụ: Gia đình ông A...";
    }
    checkDonateInputPage();
}



function getDonationStatusBadge(d) {
    if (d.verified) {
        return '<i class="fa-solid fa-circle-check verified-badge" style="color:green; animation: icon-pulse 2s infinite;" title="Đã duyệt"></i>';
    }
    if (d.status === 'hold') {
        return '<i class="fa-solid fa-circle-pause" style="color:#eab308;" title="Đang tạm giữ"></i>';
    }
    if (d.status === 'rejected') {
        if (d.rejectReason === 'no_money') {
            return '<i class="fa-solid fa-circle-xmark" style="color:#ef4444;" title="Chưa nhận tiền"></i>';
        }
        if (d.rejectReason === 'spam') {
            return '<i class="fa-solid fa-ban" style="color:#9ca3af;" title="SPAM"></i>';
        }
        // General Reject
        return '<i class="fa-solid fa-circle-xmark" style="color:#ef4444;" title="Từ chối"></i>';
    }
    // Default Pending
    return '<i class="fa-solid fa-circle-notch fa-spin pending-badge" style="color:orange;" title="Chờ duyệt"></i>';
}

function generateTransactionCode() {
    // User-friendly: Numbers only to avoid 0/O 1/I confusion and easier typing
    const chars = '0123456789';
    let result = 'TDP'; // Removed dash for cleaner look, or keep it? Let's keep simpler: TDP + 6 numbers
    // Let's keep TDP- for readability: TDP-829103
    result = 'TDP-';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function filterDonationList(searchTerm) {
    window.currentSearchTerm = searchTerm;
    // Debounce or just render
    if (window.localDonationsCache && window.currentFundData) {
        renderDonationStats(window.localDonationsCache, window.currentFundData);
    }
}
// ----- PUBLIC AUTH STATUS -----
(function checkPublicAuth() {
    // Run after slight delay to ensure Firebase is ready if async
    setTimeout(() => {
        if (typeof firebase === 'undefined' || !firebase.auth) return;

        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                // Target the login button in the main nav
                const loginBtn = document.querySelector('.login-item a');
                if (loginBtn) {
                    const name = user.displayName || "Quản Trị";

                    // Update the button content
                    // Keep the icon but change text
                    loginBtn.innerHTML = `<i class="fa-solid fa-user-shield"></i> <span style="font-weight:bold;">Chào, ${name}</span>`;
                    loginBtn.title = "Truy cập trang quản trị";

                    // Optional category style for better visibility
                    loginBtn.style.backgroundColor = '#fff7ed'; // Light orange tint
                    loginBtn.style.color = '#c2410c'; // Dark orange text
                    loginBtn.style.border = '1px solid #fed7aa';
                }
            }
        });
    }, 500);
})();

// ----- CLOCK FUNCTION -----
function startClock() {
    function update() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('vi-VN');
        const dateString = now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const timeEl = document.getElementById('current-time');
        const dateEl = document.getElementById('current-date');

        if (timeEl) timeEl.innerText = timeString;
        if (dateEl) dateEl.innerText = dateString;
    }
    setInterval(update, 1000);
    update();
}

// --- NEW SEARCH PAGE LOGIC ---
async function handleSearchPageInput(term) {
    if (!term || term.trim().length < 2) {
        if (!term || term.length === 0) {
            const area = document.getElementById('search-results-area');
            if (area) area.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94a3b8; background: white; border-radius: 12px; border: 1px dashed #e2e8f0;">
                    <i class="fa-regular fa-folder-open" style="font-size: 40px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>Vui lòng nhập thông tin để tra cứu.</p>
                </div>`;
        }
        return;
    }

    const container = document.getElementById('search-results-area');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b;"><i class="fa-solid fa-circle-notch fa-spin"></i> Đang tìm kiếm...</div>';

    let allDonations = [];
    try {
        const db = firebase.firestore();
        // Use window.currentFundData if available, otherwise fetch active
        if (window.currentFundData && window.currentFundData.donations) {
            // If we have cached data (unlikely if deep linked, but possible)
            // Actually currentFundData usually just has metadata. 
            // We need to fetch.
        }

        const fundsSnap = await db.collection('funds').where('status', '==', 'active').limit(1).get();
        if (!fundsSnap.empty) {
            const fundDoc = fundsSnap.docs[0];
            const donateSnap = await fundDoc.ref.collection('donations').orderBy('timestamp', 'desc').limit(500).get();
            allDonations = donateSnap.docs.map(d => d.data());
        }
    } catch (e) {
        console.error("Search fetch error:", e);
        container.innerHTML = '<div style="color:red; text-align:center;">Lỗi kết nối. Vui lòng thử lại.</div>';
        return;
    }

    // Filter
    const normalize = (str) => {
        if (!str) return '';
        const noAccents = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
        return noAccents.toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    const searchKey = normalize(term);
    const searchKeyOriginal = term.toLowerCase();

    const results = allDonations.filter(d => {
        if (d.status === 'rejected') return false;
        const normName = normalize(d.name);
        const normCode = normalize(d.code);
        const normAmount = normalize(d.amount?.toString());
        return (normName.includes(searchKey)) ||
            (normCode.includes(searchKey)) ||
            (normAmount.includes(searchKey)) ||
            (d.name && d.name.toLowerCase().includes(searchKeyOriginal));
    });

    // Render
    if (results.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444; background: white; border-radius: 12px; border: 1px dashed #fca5a5;">
                <i class="fa-regular fa-face-frown" style="font-size: 40px; margin-bottom: 15px;"></i>
                <p>Không tìm thấy kết quả nào cho "<strong>${term}</strong>".</p>
                <p style="font-size: 13px; color: #64748b;">Hãy thử tìm bằng Tên, Mã giao dịch, hoặc Số tiền chính xác.</p>
            </div>`;
    } else {
        container.innerHTML = `
            <div style="margin-bottom: 15px; color: #64748b; font-size: 14px;">
                Tìm thấy <strong>${results.length}</strong> kết quả:
            </div>
            ${results.map(d => `
                <div class="result-highlight">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="font-weight: 700; color: #1e293b; font-size: 16px;">
                                ${d.isAnonymous ? 'Nhà hảo tâm (Ẩn danh)' : (d.name || 'Ẩn danh')}
                            </div>
                            <div style="font-size: 13px; color: #64748b; margin-top: 4px;">
                                <i class="fa-regular fa-clock"></i> ${formatTimeAgo(d.timestamp)} &bull; 
                                <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace;">#${d.code || '---'}</span>
                            </div>
                             ${d.note ? `<div style="margin-top:8px; font-style:italic; font-size:13px; color:#475569; background:#f8fafc; padding:8px; border-radius:6px; border-left:3px solid #cbd5e1;">"${d.note}"</div>` : ''}
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 900; color: var(--gov-red); font-size: 18px;">${parseInt(d.amount).toLocaleString('vi-VN')} đ</div>
                             <div style="margin-top: 5px;">${getDonationStatusBadge(d)}</div>
                        </div>
                    </div>
                </div>
            `).join('')}
        `;
    }
}

function switchViewMode(mode) {
    const url = new URL(window.location);
    if (mode) {
        url.searchParams.set('view', mode);
    } else {
        url.searchParams.delete('view');
    }
    window.history.pushState({}, '', url);

    // Force re-render if data is available
    if (window.currentFundData) {
        renderStaticLayout(document.getElementById('fund-content-container') || document.getElementById('donation-detail-container') || document.querySelector('.main-content'), window.currentFundData);
        if (!mode) {
            // If switching back to normal, reload to ensure listeners re-attach properly
            window.location.reload();
        }
    } else {
        window.location.reload();
    }
}

function renderStaticLayout(container, fund) {
    const urlParams = new URLSearchParams(window.location.search);
    const viewMode = urlParams.get('view');
    const searchQuery = urlParams.get('q');

    // --- VIEW: SEARCH INTERFACE ---
    if (viewMode === 'search') {
        container.innerHTML = `
            <div style="margin-bottom: 20px;">
                <a href="dong-gop.html" style="color: #64748b; text-decoration: none; font-weight: 500; font-size: 14px; display: inline-flex; align-items: center; gap: 5px; transition: color 0.2s;">
                    <i class="fa-solid fa-arrow-left"></i> Quay lại trang đóng góp
                </a>
            </div>

            <div class="search-hero" style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 40px 20px; text-align: center; border-radius: 12px; margin-bottom: 30px;">
                <h1 style="color: #1e293b; font-weight: 800; text-transform: uppercase; margin-bottom: 10px; font-size: 24px;">Tra Cứu Thông Tin Công Khai</h1>
                <p style="color: #64748b; font-size: 16px;">Nhập tên, mã giao dịch hoặc số tiền để kiểm tra thông tin đóng góp của bạn.</p>
            </div>

            <div class="search-container-large" style="max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
                <div class="p-input-group" style="margin-bottom: 0;">
                    <label style="font-size: 14px; margin-bottom: 8px;">Nhập từ khóa tìm kiếm:</label>
                    <div style="position: relative;">
                        <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 18px;"></i>
                        <input type="text" id="large-search-input" 
                               class="p-input-control" 
                               placeholder="Ví dụ: Nguyễn Văn A, hoặc TDP-123456..." 
                               style="padding-left: 50px; height: 55px; font-size: 16px;"
                               value="${searchQuery || ''}"
                               onkeyup="handleSearchPageInput(this.value)">
                        <button onclick="handleSearchPageInput(document.getElementById('large-search-input').value)"
                                style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: var(--gov-blue); color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                            Tra Cứu
                        </button>
                    </div>
                </div>
            </div>

            <div id="search-results-area" style="max-width: 800px; margin: 40px auto; min-height: 200px;">
                <div style="text-align: center; padding: 40px; color: #94a3b8; background: white; border-radius: 12px; border: 1px dashed #e2e8f0;">
                    <i class="fa-regular fa-folder-open" style="font-size: 40px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>Vui lòng nhập thông tin để tra cứu.</p>
                </div>
            </div>
            
            <style>
                .result-highlight { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 10px; padding: 15px; transition: all 0.2s; }
                .result-highlight:hover { border-color: #94a3b8; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            </style>
        `;

        if (searchQuery) {
            setTimeout(() => handleSearchPageInput(searchQuery), 500);
        }
        return;
    }


    // --- VIEW: NORMAL FUND DETAIL (FORMAL LETTER) ---
    container.innerHTML = `
        <div style="margin-bottom: 20px;">
            <a href="dong-gop.html" style="color: #64748b; text-decoration: none; font-weight: 500; font-size: 14px; display: inline-flex; align-items: center; gap: 5px; transition: color 0.2s;">
                <i class="fa-solid fa-arrow-left"></i> Quay lại danh sách
            </a>
        </div>

        <div class="fund-redesign-grid" style="display: grid; grid-template-columns: 1fr 380px; gap: 30px; align-items: start;">
            
            <!-- LEFT COLUMN: FORMAL LETTER STYLE -->
            <div class="formal-letter-paper" style="background: white; padding: 50px; border-radius: 2px; box-shadow: 0 5px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; font-family: 'Times New Roman', Times, serif; position: relative;">
                
                <!-- National Emblem & Motto -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="font-weight: bold; font-size: 14px; text-transform: uppercase;">Cộng Hòa Xã Hội Chủ Nghĩa Việt Nam</div>
                    <div style="font-weight: bold; font-size: 14px; border-bottom: 1px solid #ccc; display: inline-block; padding-bottom: 3px; margin-bottom: 5px;">Độc lập - Tự do - Hạnh phúc</div>
                    <div style="margin-top: 5px; font-size: 13px; font-style: italic;">Hà Nội, ngày ${new Date(fund.createdAt || Date.now()).getDate()} tháng ${new Date(fund.createdAt || Date.now()).getMonth() + 1} năm ${new Date(fund.createdAt || Date.now()).getFullYear()}</div>
                </div>

                <!-- Title -->
                <div style="text-align: center; margin: 30px 0;">
                    <h1 id="live-fund-title" style="font-size: 22px; font-weight: bold; color: #be0000; text-transform: uppercase; margin: 0; line-height: 1.4;">${fund.title}</h1>
                    <div style="width: 50px; height: 2px; background: #be0000; margin: 10px auto;"></div>
                </div>

                <!-- Body Content -->
                <div id="live-fund-content" class="formal-content" style="font-size: 17px; line-height: 1.6; text-align: justify; color: #1e293b;">
                    ${fund.content || '<p><em>Nội dung đang được cập nhật...</em></p>'}
                </div>

                <!-- Signature Block -->
                <div style="margin-top: 50px; display: flex; justify-content: flex-end;">
                    <div style="text-align: center; min-width: 200px;">
                        <div style="font-weight: bold; text-transform: uppercase; font-size: 15px;">TM. Ban Lãnh Đạo<br>Tổ Dân Phố Số 21</div>
                        <div style="margin-top: 10px; font-style: italic; color: #64748b;">(Đã ký)</div>
                        <div style="margin-top: 60px; font-weight: bold; color: #be0000; text-transform: uppercase;">Tổ Trưởng</div>
                    </div>
                </div>

                <!-- Watermark -->
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.03; pointer-events: none;">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Emblem_of_Vietnam.svg/1200px-Emblem_of_Vietnam.svg.png" width="300" alt="">
                </div>
            </div>

            <!-- RIGHT COLUMN: ACTION DASHBOARD -->
            <div class="action-dashboard" style="display: flex; flex-direction: column; gap: 20px;">
                
                <!-- 1. STATUS CARD -->
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #f1f5f9;">
                    <div style="font-weight: 600; color: #334155; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-chart-pie" style="color: var(--primary-red);"></i> TIẾN ĐỘ VẬN ĐỘNG
                    </div>
                    <div id="live-progress-bar">
                        <!-- Progress Rendered Via JS -->
                    </div>
                </div>

                <!-- 2. DONATION FORM CARD -->
                <div class="premium-widget-card" id="donation-action-card" style="border: 0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025);">
                    <div style="background: linear-gradient(135deg, #be0000 0%, #dc2626 100%); padding: 15px 20px; border-radius: 12px 12px 0 0; color: white; font-weight: bold; text-align: center;">
                        <i class="fa-solid fa-hand-holding-heart"></i> ĐÓNG GÓP NGAY
                    </div>
                    <div id="donation-form-container" style="padding: 20px;">
                        
                        <!-- 1. NAME -->
                        <div class="premium-input-group">
                            <label style="font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 5px; display: block;">HỌ TÊN / GIA ĐÌNH / TỔ CHỨC</label>
                            <input type="text" id="d-name-page" class="premium-input" placeholder="Ví dụ: Gia đình ông Nguyễn Văn A..." onkeyup="checkDonateInputPage()" 
                                style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; outline: none; transition: all 0.2s;">
                        </div>

                        <!-- 2. ANONYMOUS -->
                        <div class="premium-checkbox-wrapper" onclick="document.getElementById('d-anonymous-page').click()" style="margin: 10px 0 15px;">
                            <input type="checkbox" id="d-anonymous-page" class="premium-checkbox" onclick="event.stopPropagation(); toggleAnonymousInput()">
                            <span style="font-size: 13px; color: #64748b; margin-left: 5px;">Quyên góp ẩn danh</span>
                        </div>

                        <!-- 3. MONEY -->
                        <div class="premium-input-group">
                             <label style="font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 5px; display: block;">Số tiền (VNĐ)</label>
                            <input type="text" id="d-amount-page" class="premium-input" placeholder="Ví dụ: 50.000" oninput="handleAmountInput(this); checkDonateInputPage()"
                                style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; outline: none; transition: all 0.2s;">
                            <div id="amount-in-words" style="font-size: 12px; color: #64748b; margin-top: 5px; font-style: italic; min-height: 18px;"></div>
                        </div>

                        <!-- Chips -->
                        <div class="premium-amount-grid" style="display: flex; gap: 8px; margin: 10px 0 20px;">
                            <button onclick="setAmountPage(100000)" class="premium-chip" style="flex: 1; padding: 6px; font-size: 12px; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; cursor: pointer;">100k</button>
                            <button onclick="setAmountPage(200000)" class="premium-chip" style="flex: 1; padding: 6px; font-size: 12px; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; cursor: pointer;">200k</button>
                            <button onclick="setAmountPage(500000)" class="premium-chip" style="flex: 1; padding: 6px; font-size: 12px; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; cursor: pointer;">500k</button>
                        </div>

                        <!-- BUTTON -->
                        <button onclick="registerAndGenMoMo()" id="btn-gen-qr-page" class="premium-submit-btn momo-btn" disabled
                            style="width: 100%; padding: 12px; border: none; border-radius: 8px; background: linear-gradient(135deg, #ae2070 0%, #d82d8b 100%); color: white; font-weight: bold; cursor: not-allowed; transition: all 0.3s; box-shadow: 0 4px 15px rgba(174, 32, 112, 0.3);">
                            THANH TOÁN NGAY <i class="fa-solid fa-paper-plane"></i>
                        </button>
                    </div>
                </div>

                <!-- 3. DONOR PRIVACY WIDGET -->
                 <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #f1f5f9; text-align: center;">
                    <div style="font-weight: 600; color: #334155; margin-bottom: 10px;">
                        <i class="fa-solid fa-users-viewfinder" style="color: #0ea5e9;"></i> TRA CỨU CÔNG KHAI
                    </div>
                    
                    <div id="donor-summary-widget" style="margin-bottom: 15px; font-size: 14px; color: #64748b;">
                        Đang tải dữ liệu...
                    </div>

                    <button onclick="switchViewMode('search')" class="premium-submit-btn" style="text-decoration:none; display:inline-block; background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; padding: 10px 15px; width: 100%; box-shadow: none;">
                        <i class="fa-solid fa-magnifying-glass"></i> TRA CỨU CHI TIẾT
                    </button>
                    
                    <div style="margin-top: 10px; font-size: 11px; color: #94a3b8; font-style: italic;">
                        * Chỉ hiển thị kết quả khi tìm kiếm để bảo vệ riêng tư.
                    </div>
                </div>

            </div>
        </div>

        <!-- MOBILE RESPONSIVE CSS INJECT -->
        <style>
            @media (max-width: 900px) {
                .fund-redesign-grid {
                    grid-template-columns: 1fr !important;
                }
                .formal-letter-paper {
                    padding: 20px !important;
                }
            }
        </style>
    `;
}

// --- NEW SEARCH PAGE LOGIC ---
async function handleSearchPageInput(term, forceRender = false) {
    const container = document.getElementById('search-results-area');
    if (!container) return;

    // INITIAL STATE: Show Hero Search Instructions if empty
    if (!term || term.trim().length < 2) {
        if (!term) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 40px; color: #64748b; background: white; border-radius: 16px; border: 1px dashed #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <div style="width: 80px; height: 80px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                        <i class="fa-solid fa-magnifying-glass" style="font-size: 30px; color: #94a3b8;"></i>
                    </div>
                    <h3 style="color: #334155; font-weight: 700; margin-bottom: 10px;">Tra cứu thông tin đóng góp</h3>
                    <p style="font-size: 15px; max-width: 400px; margin: 0 auto; line-height: 1.6;">
                        Nhập <strong>Mã giao dịch (TDP-...)</strong>, <strong>Họ tên</strong> hoặc <strong>Số điện thoại</strong> để xem chi tiết và tải biên nhận điện tử.
                    </p>
                </div>`;
        }
        return;
    }

    container.innerHTML = `
        <div style="text-align:center; padding:40px; color:#64748b;">
            <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 30px; color: var(--gov-blue);"></i> 
            <div style="margin-top: 15px; font-weight: 500;">Đang tìm kiếm dữ liệu...</div>
        </div>`;

    const projectId = "tdp21-cms";
    const normalize = (str) => {
        if (!str) return '';
        const noAccents = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
        return noAccents.toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    let results = [];
    const searchKey = normalize(term);
    const searchTermDisplay = term;

    try {
        // STRATEGY: Hybrid Search via REST API
        // 1. Precise Code Search 
        // 2. Fallback to Recent Listing + Client Filter

        // Detect if user is searching for a transaction code
        const upperTerm = term.toUpperCase().trim();
        let isCodeSearch = upperTerm.startsWith('TDP') || (upperTerm.length >= 6 && /^\d+$/.test(upperTerm));

        const runQuery = async (body) => {
            const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            return await response.json();
        };

        let rawDocs = [];

        // QUERY 1: EXACT CODE MATCH (Fastest & Most Accurate)
        if (isCodeSearch) {
            const codeQuery = {
                structuredQuery: {
                    from: [{ collectionId: 'donations' }],
                    where: {
                        fieldFilter: {
                            field: { fieldPath: 'code' },
                            op: 'GREATER_THAN_OR_EQUAL', // Allow partial prefix search slightly
                            value: { stringValue: term.trim() }
                        }
                    }
                }
            };
            const codeRes = await runQuery(codeQuery);
            if (codeRes && codeRes.length > 0 && codeRes[0].document) {
                rawDocs = codeRes.map(r => r.document);
            }
        }

        // SPECIAL CASE: User entered just the random digits (e.g., 471414)
        // We can't query this efficiently in Firestore without full code
        // So we just rely on the fallback below.

        // QUERY 2: RECENT TRANSACTIONS (Fallback for Name Search)
        // Only if code search failed or wasn't a code search
        if (rawDocs.length === 0) {
            const recentQuery = {
                structuredQuery: {
                    from: [{ collectionId: 'donations' }],
                    orderBy: [{ field: { fieldPath: 'timestamp' }, direction: 'DESCENDING' }],
                    limit: 200 // Increased limit for better coverage
                }
            };
            const recentRes = await runQuery(recentQuery);
            if (recentRes) {
                rawDocs = recentRes.filter(r => r.document).map(r => r.document);
            }
        }

        const mapDoc = (doc) => {
            const data = {};
            const fields = doc.fields || {};
            for (const key in fields) {
                const val = fields[key];
                if (val.stringValue !== undefined) data[key] = val.stringValue;
                else if (val.integerValue !== undefined) data[key] = parseInt(val.integerValue);
                else if (val.booleanValue !== undefined) data[key] = val.booleanValue;
                else if (val.timestampValue !== undefined) data[key] = val.timestampValue;
            }
            return data;
        };

        const allDonations = rawDocs.map(mapDoc);

        // Client-side Intelligence Filter
        results = allDonations.filter(d => {
            if (d.status === 'rejected') return false;

            // Strict code match override
            if (d.code === term.trim()) return true;

            // Allow searching by sub-part of the code (e.g. just the random digits)
            if (d.code && d.code.includes(term.trim())) return true;

            const normName = normalize(d.name);
            const normCode = normalize(d.code);
            const normAmount = normalize(d.amount?.toString());
            const normNote = normalize(d.note || '');

            return (normName.includes(searchKey)) ||
                (normCode.includes(searchKey)) ||
                (normAmount.includes(searchKey)) ||
                (normNote.includes(searchKey)) ||
                (d.name && d.name.toLowerCase().includes(term.toLowerCase()));
        });

    } catch (e) {
        console.error("Search fetch error:", e);
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; background: #fef2f2; border-radius: 12px; border: 1px solid #fecaca; color: #b91c1c;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 24px; margin-bottom: 10px;"></i>
                <p>Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.</p>
            </div>`;
        return;
    }

    // RENDER RESULTS
    if (results.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 50px 20px; color: #64748b; background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);">
                <div style="font-size: 50px; margin-bottom: 20px;">🤔</div>
                <h3 style="color: #334155; font-size: 18px; margin-bottom: 10px;">Không tìm thấy kết quả nào</h3>
                <p style="margin-bottom: 25px;">Không tìm thấy dữ liệu phù hợp với từ khóa "<strong>${searchTermDisplay}</strong>".</p>
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <span style="background: #f1f5f9; padding: 5px 12px; border-radius: 20px; font-size: 13px;">Kiểm tra lại chính tả</span>
                    <span style="background: #f1f5f9; padding: 5px 12px; border-radius: 20px; font-size: 13px;">Thử nhập Mã giao dịch</span>
                </div>
            </div>`;
    } else {
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 0 5px;">
                <div style="font-size: 15px; color: #334155; font-weight: 600;">
                    <i class="fa-solid fa-list-check" style="color: var(--gov-blue); margin-right: 5px;"></i>
                    Tìm thấy <span style="color: var(--gov-red); font-size: 17px;">${results.length}</span> kết quả
                </div>
            </div>
            
            <div class="search-result-grid" style="display: grid; gap: 20px;">
                ${results.map((d, index) => {
            const statusConfig = d.verified ?
                { badge: 'Đã Tiếp Nhận', color: 'green', bg: '#ecfdf5', icon: 'fa-circle-check' } :
                { badge: 'Đang Xử Lý', color: '#f59e0b', bg: '#fffbeb', icon: 'fa-clock' };

            const receiptUrl = `dong-gop.html?id=${d.fundId || 'oX3JjCHkmrTmxAM5jcqJ'}&ref=${d.code}&status=success`;
            const uniqueId = d.code || index;

            return `
                    <div class="result-card" style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; transition: all 0.2s; position: relative;">
                        <!-- Status Strip -->
                        <div style="height: 4px; background: ${d.verified ? 'var(--gov-green)' : '#f59e0b'}; width: 100%;"></div>
                        
                        <div style="padding: 20px; display: flex; flex-direction: column; gap: 15px;">
                            <!-- Header: Name & Code -->
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div style="display: flex; gap: 15px;">
                                    <div style="width: 50px; height: 50px; background: ${d.verified ? '#f0fdf4' : '#fffbeb'}; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                        <i class="fa-solid ${d.isAnonymous ? 'fa-user-secret' : detectDonorIdentity(d.name).icon}" style="font-size: 20px; color: ${statusConfig.color};" title="${d.isAnonymous ? 'Ẩn danh' : detectDonorIdentity(d.name).label}"></i>
                                    </div>
                                    <div>
                                        <div style="font-weight: 700; color: #1e293b; font-size: 16px; line-height: 1.4; margin-bottom: 4px;">
                                            ${d.isAnonymous ? 'Nhà hảo tâm (Ẩn danh)' : (d.name || 'Chưa cập nhật tên')}
                                            ${!d.isAnonymous && d.name ? `<span style="display:block; font-size: 11px; color: #64748b; font-weight: normal; margin-top: 2px;">${detectDonorIdentity(d.name).label}</span>` : ''}
                                        </div>
                                        <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #64748b;">
                                            <span style="background: #f1f5f9; padding: 2px 8px; border-radius: 6px; font-family: monospace; font-weight: 600; color: #475569;">
                                                <i class="fa-solid fa-hashtag" style="font-size: 10px; opacity: 0.7;"></i> ${d.code || '---'}
                                            </span>
                                            <span>&bull;</span>
                                            <span>${formatTimeAgo(d.timestamp)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Info Grid -->
                            <div style="background: #f8fafc; border-radius: 10px; padding: 15px; display: grid; grid-template-columns: 1fr auto; align-items: center;">
                                <div>
                                    <div style="font-size: 12px; color: #64748b; margin-bottom: 3px; text-transform: uppercase; font-weight: 600;">Số tiền ủng hộ</div>
                                    <div style="font-size: 20px; font-weight: 800; color: var(--gov-red);">
                                        ${parseInt(d.amount || 0).toLocaleString('vi-VN')} <span style="font-size: 14px; font-weight: 600; color: #94a3b8;">VNĐ</span>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="display: inline-flex; align-items: center; gap: 6px; background: ${statusConfig.bg}; color: ${statusConfig.color}; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;">
                                        <i class="fa-solid ${statusConfig.icon}"></i> ${statusConfig.badge}
                                    </div>
                                </div>
                            </div>

                            <!-- NEW: EXPAND BUTTON (Arrow Down) -->
                            <div style="text-align: center; margin-top: -5px;">
                                 <button onclick="document.getElementById('detail-${uniqueId}').classList.toggle('show'); this.querySelector('i').classList.toggle('fa-rotate-180');" 
                                         style="background:none; border:none; color:#64748b; cursor:pointer; font-size:13px; padding: 5px 15px; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;">
                                    Xem chi tiết <i class="fa-solid fa-chevron-down" style="transition: transform 0.3s;"></i>
                                 </button>
                            </div>

                            <!-- NEW: HIDDEN DETAILS SECTION -->
                            <div id="detail-${uniqueId}" class="search-detail-panel" style="display:none; background: #fff; border-top: 1px dashed #e2e8f0; padding-top: 15px;">
                                <div style="display:grid; gap: 12px; font-size: 14px; text-align: left;">
                                     <div>
                                        <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight:700;">Nội dung / Lời nhắn</div>
                                        <div style="color: #334155; margin-top: 4px; font-style: italic; background: #f8fafc; padding: 8px; border-radius: 6px;">"${d.note || 'Không có nội dung'}"</div>
                                    </div>
                                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                        <div>
                                            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight:700;">Thời gian</div>
                                            <div style="color: #334155; margin-top: 2px; font-family: monospace;">${d.timestamp ? new Date(d.timestamp).toLocaleString('vi-VN') : '---'}</div>
                                        </div>
                                         <div>
                                            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight:700;">Hình thức</div>
                                            <div style="color: #334155; margin-top: 2px;">${d.method || 'Chuyển khoản'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Action -->
                            <div style="border-top: 1px solid #f1f5f9; padding-top: 15px; margin-top: 5px;">
                                <a href="${receiptUrl}" target="_blank" class="view-receipt-btn" style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; background: white; border: 2px solid var(--gov-blue); color: var(--gov-blue); border-radius: 8px; font-weight: 700; transition: all 0.2s; text-decoration: none;">
                                    <i class="fa-solid fa-file-invoice dollar-sign"></i> XEM BIÊN NHẬN ĐIỆN TỬ <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 12px; margin-left: auto; opacity: 0.6;"></i>
                                </a>
                            </div>
                        </div>

                        ${d.verified ? `<div style="position: absolute; top: 0; right: 0; background: var(--gov-green); color: white; padding: 4px 10px; border-radius: 0 0 0 10px; font-size: 10px; font-weight: bold;">ĐÃ XÁC THỰC</div>` : ''}
                    </div>
                    `;
        }).join('')}
            </div>
            
            <style>
                .search-detail-panel.show { display: block !important; animation: fadeIn 0.3s; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
                .view-receipt-btn:hover {
                    background: var(--gov-blue) !important;
                    color: white !important;
                    box-shadow: 0 4px 10px rgba(14, 165, 233, 0.3);
                }
                .result-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
                    border-color: #cbd5e1 !important;
                }
            </style>
        `;
    }
}
