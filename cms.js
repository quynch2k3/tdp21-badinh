﻿/**
 * CMS CLIENT SCRIPT - FIREBASE VERSION
 * Migrated from PocketBase
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

const TIMEOUT_MS = 5000;
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
        // Look for the main container (left-col)
        const leftCol = document.querySelector('.left-col');
        if (leftCol) {
            // Hide all children of left-col
            Array.from(leftCol.children).forEach(child => child.style.display = 'none');

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
                leftCol.prepend(articleContainer); // Add to top
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
                <div style="height: 160px; background: linear-gradient(135deg, #ef4444, #b91c1c); display: flex; align-items: center; justify-content: center; color: white;">
                    <i class="fa-solid fa-hand-holding-heart" style="font-size: 50px; opacity: 0.9;"></i>
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
                                <label><i class="fa-solid fa-user-pen fa-fade"></i> HỌ TÊN (Hoặc Gia đình)</label>
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

                            <button onclick="registerAndGenNganLuong()" id="btn-gen-qr-page" class="btn-p-submit pulse-red" disabled>
                                THANH TOÁN NGÂN LƯỢNG <i class="fa-solid fa-credit-card"></i>
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
// --- NGAN LUONG CONFIG (CLIENT-SIDE) ---
// WARNING: MERCHANT PASSWORD IS EXPOSED IN CLIENT SIDE CODE
// This is required for "No-Backend" integration as requested.
const NL_CONFIG = {
    MERCHANT_ID: "69462",
    MERCHANT_PASS: "6260dda75f44acb15fc064d7be4697bb", // Mat khau ket noi
    RECEIVER_EMAIL: "hoangquy@imail.edu.vn",
    URL_PAYMENT: "https://www.nganluong.vn/checkout.php"
};

// Removed GAS_API_URL as requested
// const GAS_API_URL = "...";

// --- MD5 HELPER (Compact) ---
var MD5 = function (d) { var r = M(V(Y(X(d), 8 * d.length))); return r.toLowerCase() }; function M(d) { for (var _, m = "0123456789ABCDEF", f = "", r = 0; r < d.length; r++)_ = d[r], f += m.charAt(_ >>> 4 & 15) + m.charAt(15 & _); return f } function X(d) { for (var _ = Array(d.length >> 2), m = 0; m < _.length; m++)_[m] = 0; for (m = 0; m < 8 * d.length; m += 8)_[m >> 5] |= (255 & d.charCodeAt(m / 8)) << m % 32; return _ } function V(d) { for (var _ = "", m = 0; m < 32 * d.length; m += 8)_ += String.fromCharCode(d[m >> 5] >>> m % 32 & 255); return _ } function Y(d, _) { d[_.constructor == String ? "push" : "length"] = _; for (var m = 8 * d.length, f = 1732584193, r = -271733879, t = -1732584194, h = 271733878, n = 0; n < d.length; n += 16) { var a = f, e = r, g = t, C = h; f = md5_ii(f = md5_ii(f = md5_ii(f = md5_ii(f = md5_hh(f = md5_hh(f = md5_hh(f = md5_hh(f = md5_gg(f = md5_gg(f = md5_gg(f = md5_gg(f = md5_ff(f = md5_ff(f = md5_ff(f = md5_ff(f, r, t, h, d[n + 0], 7, -680876936), r, t, h, d[n + 1], 12, -389564586), r, t, h, d[n + 2], 17, 606105819), r, t, h, d[n + 3], 22, -1044525330), r, t, h, d[n + 4], 7, -176418897), r, t, h, d[n + 5], 12, 1200080426), r, t, h, d[n + 6], 17, -1473231341), r, t, h, d[n + 7], 22, -45705983), r, t, h, d[n + 8], 7, 1770035416), r, t, h, d[n + 9], 12, -1958414417), r, t, h, d[n + 10], 17, -42063), r, t, h, d[n + 11], 22, -1990404162), r, t, h, d[n + 12], 7, 1804112514), r, t, h, d[n + 13], 12, -40341101), r, t, h, d[n + 14], 17, -1502002290), r, t, h, d[n + 15], 22, 1236535329), f = md5_hh(f, r = md5_hh(r, t = md5_hh(t, h = md5_hh(h, f, r, t, d[n + 1], 5, -165796510), f, r, t, d[n + 6], 9, -1069501632), h, f, r, d[n + 11], 14, 643717713), t, h, f, d[n + 0], 20, -373897302), r = md5_ii(r, t = md5_ii(t, h = md5_ii(h, f = md5_ii(f, r, t, h, d[n + 5], 4, -701558691), r, t, h, d[n + 10], 11, 38016083), f, r, t, d[n + 15], 16, -660478335), h, f, r, d[n + 4], 23, -405537848), f = md5_gg(f, r = md5_gg(r, t = md5_gg(t, h = md5_gg(h, f, r, t, d[n + 9], 21, 2127289290 ? 2127289290 : -2167180006), f, r, t, d[n + 14], 6, -1542279162), h, f, r, d[n + 3], 11, -1061905477 ? -1061905477 : -2147483648), t, h, f, d[n + 8], 16, 814660356); f = safe_add(f, a), r = safe_add(r, e), t = safe_add(t, g), h = safe_add(h, C) } return f } function md5_cmn(d, _, m, f, r, t) { return safe_add(bit_rol(safe_add(safe_add(_, d), safe_add(f, t)), r), m) } function md5_ff(d, _, m, f, r, t, h) { return md5_cmn(_ & m | ~_ & f, d, _, r, t, h) } function md5_gg(d, _, m, f, r, t, h) { return md5_cmn(_ & f | m & ~f, d, _, r, t, h) } function md5_hh(d, _, m, f, r, t, h) { return md5_cmn(_ ^ m ^ f, d, _, r, t, h) } function md5_ii(d, _, m, f, r, t, h) { return md5_cmn(m ^ (_ | ~f), d, _, r, t, h) } function safe_add(d, _) { var m = (65535 & d) + (65535 & _); return (d >> 16) + (_ >> 16) + (m >> 16) << 16 | 65535 & m } function bit_rol(d, _) { return d << _ | d >>> 32 - _ }


// 4. ACTION: REGISTER & PAY WITH NGAN LUONG
async function registerAndGenNganLuong() {
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

    const amount = parseInt(amountStr);
    const orderId = "TDP21_" + new Date().getTime(); // Unique ID

    // 1. DEFER SAVE (Store payload)
    window.pendingDonationPayload = {
        fundId: fund.id,
        name: name,
        amount: amount,
        timestamp: new Date().toISOString(),
        verified: false, // Pending Admin Approval
        method: 'NganLuong',
        isAnonymous: isAnonymous,
        code: orderId
    };

    // SAVE SESSION (Critical for Redirect Recovery)
    localStorage.setItem('pending_nganluong_donation', JSON.stringify({
        payload: window.pendingDonationPayload,
        timestamp: Date.now()
    }));

    // UI Feedback: CONFIRMATION STEP
    const container = document.getElementById('donation-form-container');
    container.innerHTML = `<div style="text-align:center; padding:30px 20px;">
        <div style="margin-bottom:20px;">
            <i class="fa-solid fa-wallet" style="font-size:50px; color:#f59e0b; animation: bounceIn 0.5s;"></i>
        </div>
        
        <h3 style="color:#b45309; font-weight:900; margin-bottom:10px;">XÁC NHẬN THANH TOÁN</h3>
        <p style="font-size:13px; color:#555; margin-bottom:20px; line-height:1.5;">
            Hệ thống sẽ chuyển bạn đến cổng thanh toán Ngân Lượng để hoàn tất.
        </p>

        <div style="background:#fffbeb; padding:20px; border-radius:4px; border:2px dashed #f59e0b; margin-bottom:25px;">
            <div style="font-size:12px; color:#b45309; margin-bottom:5px; text-transform:uppercase; font-weight:bold;">MÃ GIAO DỊCH</div>
            <div style="font-size:24px; font-weight:900; color:#92400e; letter-spacing:1px;">${orderId}</div>
            <div style="margin-top:10px; font-size:16px; font-weight:600; color:#333;">
                Số tiền: <span style="color:#dc2626;">${amount.toLocaleString('vi-VN')} đ</span>
            </div>
        </div>

        <div style="display:grid; gap:10px;">
            <button onclick="executeNganLuongPayment()" class="premium-submit-btn" style="background:#f59e0b; box-shadow:0 4px 15px rgba(245, 158, 11, 0.4); border-radius: 4px; width: 100%;">
                <i class="fa-solid fa-credit-card"></i> THANH TOÁN QUA NGÂN LƯỢNG
            </button>
            <button onclick="resetDonationForm()" class="premium-chip" style="width:100%; color:#555; border-radius: 4px;">
                Quay lại / Hủy
            </button>
        </div>
    </div>
    <style>@keyframes bounceIn {0%{transform:scale(0.3);opacity:0}50%{transform:scale(1.05)}70%{transform:scale(0.9)}100%{transform:scale(1)}}</style>`;
}

// 4b. ACTION: DIRECT NGAN LUONG REDIRECT (Client-Side)
async function executeNganLuongPayment() {
    if (!window.pendingDonationPayload) {
        alert("Lỗi dữ liệu phiên. Vui lòng tải lại trang.");
        return;
    }

    const payload = window.pendingDonationPayload;
    const btn = document.querySelector('.premium-submit-btn');

    // SHOW LOADING
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG CHUYỂN HƯỚNG...';
        btn.disabled = true;
    }

    try {
        console.log("Preparing NganLuong Redirect:", payload);

        // --- 1. PREPARE DATA ---
        var merchant_site_code = NL_CONFIG.MERCHANT_ID;
        var return_url = window.location.href;
        var receiver = NL_CONFIG.RECEIVER_EMAIL;
        var transaction_info = "Ung ho quy TDP21";
        var order_code = payload.code;
        var price = payload.amount.toString();
        var currency = "vnd";
        var quantity = "1";
        var tax = "0";
        var discount = "0";
        var fee_cal = "0";
        var fee_shipping = "0";
        var order_description = "Ung ho quy TDP21: " + removeAccentsSimple(payload.name);
        var cleanName = removeAccentsSimple(payload.name);
        var buyer_info = cleanName + "*|*hotro@todanpho21.com*|*0900000000*|*HN";
        var affiliate_code = "";

        // Return URL (Current Page)
        var return_url = window.location.href;
        var cancel_url = window.location.href;

        // --- 2. GENERATE URL (Button Payment Method) ---
        // Using NganLuong Button Redirect format which assumes receiver email based routing
        var url = NL_CONFIG.URL_PAYMENT;


        // --- 3. CREATE FORM ---
        var form = document.createElement("form");
        form.setAttribute("method", "post");
        form.setAttribute("action", url);
        form.setAttribute("target", "_self"); // Redirect same tab

        // SECURE CODE GENERATION
        var secure_string = merchant_site_code + " " + return_url + " " + receiver + " " + transaction_info + " " + order_code + " " + price + " " + currency + " " + quantity + " " + tax + " " + discount + " " + fee_cal + " " + fee_shipping + " " + order_description + " " + buyer_info + " " + affiliate_code + " " + NL_CONFIG.MERCHANT_PASS;
        var secure_code = MD5(secure_string);

        var params = {
            'merchant_site_code': merchant_site_code,
            'return_url': return_url,
            'receiver': receiver,
            'transaction_info': transaction_info,
            'order_code': order_code,
            'price': price,
            'currency': currency,
            'quantity': quantity,
            'tax': tax,
            'discount': discount,
            'fee_cal': fee_cal,
            'fee_shipping': fee_shipping,
            'order_description': order_description,
            'buyer_info': buyer_info,
            'affiliate_code': affiliate_code,
            'secure_code': secure_code
        };

        // NOTE: For simple button payment, strict MD5 might not be enforced if Merchant doesn't enable "Check Order LInk"
        // But let's append other useful fields
        params['tax'] = tax;
        params['discount'] = discount;
        params['fee_cal'] = fee_cal;
        params['fee_shipping'] = fee_shipping;
        params['order_description'] = order_description;
        params['buyer_info'] = buyer_info;

        // --- 4. SUBMIT ---
        for (var key in params) {
            if (params.hasOwnProperty(key)) {
                var hiddenField = document.createElement("input");
                hiddenField.setAttribute("type", "hidden");
                hiddenField.setAttribute("name", key);
                hiddenField.setAttribute("value", params[key]);
                form.appendChild(hiddenField);
            }
        }

        document.body.appendChild(form);
        console.log("Submitting NganLuong Form...", params);
        form.submit();

    } catch (e) {
        console.error("Payment Error:", e);
        alert("Lỗi xử lý: " + e.message);

        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> THỬ LẠI';
            btn.disabled = false;
        }
    }
}

// 5. ACTION: CHECK PAYMENT RETURN (Handle Redirect from MoMo)
// 5. ACTION: CHECK PAYMENT RETURN (Handle Redirect from NganLuong)
function checkPaymentReturn() {
    const urlParams = new URLSearchParams(window.location.search);
    const errorCode = urlParams.get('error_code');
    // const token = urlParams.get('token'); // NganLuong often sends token

    // Only process if we have NganLuong result
    if (errorCode !== null) {
        // Clear params to clean URL but PRESERVE id
        const newUrl = new URL(window.location.href);
        const paramsToRemove = ['error_code', 'token', 'order_code', 'payment_id', 'payment_type', 'discount_amount', 'fee_shipping', 'integration_version', 'created_time', 'buyer_email', 'buyer_fullname', 'buyer_mobile'];
        paramsToRemove.forEach(k => newUrl.searchParams.delete(k));
        window.history.replaceState({}, document.title, newUrl.toString());

        if (errorCode === '00') {
            // SUCCESS
            const stored = localStorage.getItem('pending_nganluong_donation');
            if (stored) {
                try {
                    const data = JSON.parse(stored);
                    const payload = data.payload;

                    // Recover payload and finalize
                    payload.verified = true; // Auto-verify (Simple check)
                    // payload.nlToken = token;

                    // Save to Firebase
                    db.collection('donations').add(payload)
                        .then(() => {
                            renderFullPageSuccess(payload);
                            localStorage.removeItem('pending_nganluong_donation');
                        })
                        .catch(e => {
                            alert("Thanh toán thành công nhưng lỗi lưu dữ liệu: " + e.message);
                        });

                } catch (e) { console.error("Parse stored data error", e); }
            } else {
                alert("Thanh toán thành công! (Không tìm thấy dữ liệu phiên - vui lòng liên hệ Admin)");
            }
            return true; // STOP LOADING
        } else {
            // FAILED or CANCELLED
            if (errorCode === 'CANCEL') {
                alert("Bạn đã hủy giao dịch.");
            } else {
                alert("Giao dịch thất bại. Mã lỗi: " + errorCode);
            }
            return false; // CONTINUE LOADING FUND PAGE
        }
    }
    return false;
}

function renderFullPageSuccess(payload) {
    const container = document.getElementById('all-funds-container') || document.body;

    // Hide Intro Text if exists
    const introText = document.getElementById('donation-intro-text');
    if (introText) introText.style.display = 'none';

    container.innerHTML = `
        <div style="max-width: 600px; margin: 50px auto; background: white; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); overflow: hidden; font-family: 'Segoe UI', sans-serif;">
            <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 30px; text-align: center; color: white;">
                <i class="fa-solid fa-circle-check" style="font-size: 60px; margin-bottom: 15px; animation: bounceIn 0.8s;"></i>
                <h2 style="margin: 0; font-weight: 800;">CẢM ƠN TẤM LÒNG VÀNG!</h2>
                <p style="margin: 10px 0 0; opacity: 0.9;">Giao dịch thành công</p>
            </div>
            
            <div style="padding: 30px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <p style="color: #64748b; margin-bottom: 5px;">Số tiền ủng hộ</p>
                    <div style="color: #16a34a; font-size: 32px; font-weight: 900;">${parseInt(payload.amount).toLocaleString()} đ</div>
                    <div style="margin-top: 15px; padding:10px; background:#f0fdf4; border:1px dashed #16a34a; border-radius:8px;">
                        <div style="font-size:13px; color:#15803d; margin-bottom:5px;">MÃ GIAO DỊCH</div>
                        <div style="font-size: 28px; font-weight: 900; color: #166534; letter-spacing:1px;">${payload.code}</div>
                    </div>
                </div>

                <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
                        <span style="color: #64748b;">Người gửi:</span>
                        <span style="font-weight: 600; color: #334155;">${payload.name}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
                        <span style="color: #64748b;">Thời gian:</span>
                        <span style="font-weight: 600; color: #334155;">${new Date().toLocaleString('vi-VN')}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 14px;">
                        <span style="color: #64748b;">Trạng thái:</span>
                        <span style="font-weight: 600; color: #ea580c;">Đang chờ duyệt</span>
                    </div>
                </div>

                <div style="display: flex; gap: 15px;">
                    <button onclick="window.location.href='dong-gop.html?id=${payload.fundId}'" class="premium-submit-btn" style="background: #3b82f6; box-shadow: 0 5px 15px rgba(59, 130, 246, 0.3);">
                        <i class="fa-solid fa-arrow-left"></i> QUAY LẠI CHƯƠNG TRÌNH
                    </button>
                    <button onclick="window.location.href='dong-gop.html'" class="premium-submit-btn" style="background: #e2e8f0; color: #475569; box-shadow: none;">
                        VỀ TRANG CHỦ
                    </button>
                </div>
            </div>
        </div>
        <style>@keyframes bounceIn {0%{transform:scale(0.3);opacity:0}50%{transform:scale(1.05)}70%{transform:scale(0.9)}100%{transform:scale(1)}}</style>
    `;
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
function checkDonateInputPage() {
    const name = document.getElementById('d-name-page').value;
    const amount = document.getElementById('d-amount-page').value;
    const btn = document.getElementById('btn-gen-qr-page');

    if ((name || document.getElementById('d-anonymous-page')?.checked) && amount && parseInt(amount) > 0) {
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
    document.getElementById('d-amount-page').value = val;
    checkDonateInputPage(); // Trigger validation to enable button
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

function renderStaticLayout(container, fund) {
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
                        <button onclick="registerAndGenNganLuong()" id="btn-gen-qr-page" class="premium-submit-btn" disabled>
                            <span>THANH TOÁN NGÂN LƯỢNG</span> <i class="fa-solid fa-credit-card"></i>
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

    const summaryEl = document.getElementById('live-fund-summary');
    if (summaryEl) summaryEl.innerText = fund.summary || '';

    const dateEl = document.getElementById('live-fund-date');
    if (dateEl) dateEl.innerText = formatDateDisplay(fund.createdAt || fund.created);

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

    // Update List
    const listEl = document.getElementById('live-contributor-section');
    if (listEl) {
        // SEARCH FILTER
        const rawSearchTerm = window.currentSearchTerm ? window.currentSearchTerm.trim() : '';

        // 1. Determine Base List
        let displayDonations = [];
        if (rawSearchTerm) {
            // If Searching: Search EVERYTHING (including Rejected/Spam)
            displayDonations = donations;
        } else {
            // If NOT Searching: Show ONLY Verified (Green Tick)
            // User Request: "chỉ hiển thị những ô tích xanh thôi"
            displayDonations = donations.filter(d => d.verified);
        }

        // 2. Apply Search
        if (rawSearchTerm) {
            // Normalization Helper: Aggressive Alphanumeric Only
            const normalize = (str) => {
                if (!str) return '';
                // 1. Remove accents
                const noAccents = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
                // 2. Lowercase and KEEP ONLY a-z, 0-9
                return noAccents.toLowerCase().replace(/[^a-z0-9]/g, '');
            };

            const searchKey = normalize(rawSearchTerm);
            const searchKeyOriginal = rawSearchTerm.toLowerCase();

            displayDonations = displayDonations.filter(d => {
                const normName = normalize(d.name);
                const normCode = normalize(d.code);
                const normAmount = normalize(d.amount?.toString());

                // Check 1: Strict Normalized Match
                // Check 2: Loose Original Match
                return (normName.includes(searchKey)) ||
                    (normCode.includes(searchKey)) ||
                    (normAmount.includes(searchKey)) ||
                    (d.name && d.name.toLowerCase().includes(searchKeyOriginal));
            });
        }

        listEl.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 25px;">
                <h4 style="margin:0; font-weight: 800; color: var(--p-slate); font-size: 20px; text-transform: uppercase;">DANH SÁCH ỦNG HỘ</h4>
                <span style="font-size: 13px; color: var(--p-gray);"><i class="fa-solid fa-users"></i> ${donations.filter(d => d.verified || d.status !== 'rejected').length} lượt hiển thị</span>
            </div>
            
            <div style="margin-bottom: 15px;">
                 <div class="p-input-group" style="margin:0;">
                    <div style="position:relative;">
                        <i class="fa-solid fa-search" style="position:absolute; left:15px; top:50%; transform:translateY(-50%); color:#9ca3af;"></i>
                        <input type="text" id="donation-search-input" 
                               placeholder="Tìm tên, mã giao dịch, số tiền..." 
                               class="p-input-control" 
                               style="padding-left: 40px; height: 45px;"
                               value="${window.currentSearchTerm || ''}"
                               onkeyup="filterDonationList(this.value)"
                               onfocus="var val=this.value; this.value=''; this.value=val;" autofocus>
                    </div>
                </div>
            </div>

            <div class="contributor-list-card custom-scrollbar" style="max-height: 500px; overflow-y: auto; padding-right: 5px;">
                ${displayDonations.length > 0 ? displayDonations.map(d => `
                    <div class="contributor-item" style="position:relative;">
                        <div style="text-align: left;">
                            <div style="font-size: 11px; color: #64748b; font-weight: bold; margin-bottom: 3px; display:flex; align-items:center gap:5px;">
                                <span style="background:#f1f5f9; padding:2px 6px; border-radius:4px; border:1px solid #e2e8f0;">
                                    <i class="fa-solid fa-hashtag" style="color:#d97706; font-size:10px;"></i> ${d.code || '---'}
                                </span>
                            </div>
                            <div class="contributor-name">
                                ${d.isAnonymous ? 'Nhà hảo tâm (Ẩn danh)' : (d.name || 'Ẩn danh')} 
                                ${getDonationStatusBadge(d)}
                            </div>
                            <div class="contributor-time"><i class="fa-regular fa-clock fa-spin-pulse" style="--fa-animation-duration: 3s;"></i> ${formatTimeAgo(d.timestamp)}</div>
                            ${(!d.verified && !d.status) ? '<div style="font-size:11px; color:#f59e0b; margin-top:2px;">* Đang chờ BQT xác nhận</div>' : ''}
                            ${(d.status === 'hold') ? '<div style="font-size:11px; color:#eab308; margin-top:2px;">* Đang tạm giữ / Cần kiểm tra</div>' : ''}
                            ${d.note ? `<div style="font-size:11px; color:#7f1d1d; font-style:italic; margin-top:3px; background:#fef2f2; padding:3px 6px; border-radius:4px; display:inline-block; border:1px dashed #fca5a5;"><i class="fa-solid fa-circle-exclamation"></i> ${d.note}</div>` : ''}
                        </div>
                        <div class="contributor-amount" style="font-weight:900; color:var(--p-red);">${parseInt(d.amount).toLocaleString('vi-VN')} đ</div>
                    </div>
                `).join('') : '<div style="padding:40px; text-align:center; color:#999; font-style:italic;">Không tìm thấy dữ liệu phù hợp.</div>'}
            </div>
        `;

        // Update Sticky Footer Percent (Mobile)
        const stickyPercent = document.getElementById('sticky-percent-text');
        if (stickyPercent) {
            stickyPercent.innerText = `${percent}%`;
        }

        // Restore focus if searching
        if (window.currentSearchTerm) {
            const searchInput = document.getElementById('donation-search-input');
            if (searchInput) {
                searchInput.value = window.currentSearchTerm;
                searchInput.focus();
            }
        }
    }
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
