/**
 * DONATION PAGE ANIMATIONS
 * Phase 2 & 3 Implementation
 * - Scroll reveal animations
 * - Progress bar viewport animations
 * - Statistics counter animations
 * - Filter and search functionality
 */

// ====== SCROLL REVEAL ANIMATIONS ======

function initScrollReveal() {
    const observerOptions = {
        root: null,
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');

                // Animate progress bars
                if (entry.target.classList.contains('progress-fill')) {
                    const targetWidth = entry.target.getAttribute('data-progress') || entry.target.style.width;
                    entry.target.style.width = targetWidth;
                }

                // Don't unobserve so animation can repeat if scrolled away and back
                // observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all animatable elements
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });

    // Observe all progress bars
    document.querySelectorAll('.progress-fill').forEach(el => {
        observer.observe(el);
    });
}

// ====== STATISTICS COUNTER ANIMATION ======

function animateCounter(element, target, duration = 2000) {
    const start = 0;
    const increment = target / (duration / 16); // 60fps
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

function initCounters() {
    const statNumbers = document.querySelectorAll('.stat-number[data-target]');

    if (statNumbers.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.getAttribute('data-target'));
                animateCounter(entry.target, target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    statNumbers.forEach(stat => observer.observe(stat));
}

// ====== TABBED INTRO SECTION ======

function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    if (tabButtons.length === 0) return;

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');

            // Remove active class from all buttons and panels
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));

            // Add active class to clicked button and corresponding panel
            btn.classList.add('active');
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });
}

// ====== FILTER & SEARCH FUNCTIONALITY ======

let allFunds = []; // Will be populated from Firestore
let filteredFunds = [];

function initFilterSearch() {
    const searchInput = document.getElementById('fund-search');
    const filterPills = document.querySelectorAll('.filter-pill');
    const sortSelect = document.getElementById('fund-sort');

    if (!searchInput) return;

    // Search functionality
    searchInput.addEventListener('input', debounce((e) => {
        applyFilters();
    }, 300));

    // Filter pills
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            pill.classList.toggle('active');
            applyFilters();
        });
    });

    // Sort functionality
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            applyFilters();
        });
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function applyFilters() {
    const searchValue = document.getElementById('fund-search')?.value.toLowerCase() || '';
    const activeFilters = Array.from(document.querySelectorAll('.filter-pill.active')).map(p => p.getAttribute('data-filter'));
    const sortValue = document.getElementById('fund-sort')?.value || 'default';

    // Filter
    filteredFunds = allFunds.filter(fund => {
        // Search filter
        const matchesSearch = fund.title.toLowerCase().includes(searchValue) ||
            (fund.summary || '').toLowerCase().includes(searchValue);

        if (!matchesSearch) return false;

        // Status filter - if "all" or no filters active, show everything
        if (activeFilters.length === 0 || activeFilters.includes('all')) {
            return true;
        }

        // Check specific filters
        if (activeFilters.includes('active') && !isFundActive(fund)) return false;
        if (activeFilters.includes('completed') && !isFundCompleted(fund)) return false;
        if (activeFilters.includes('new') && !isFundNew(fund)) return false;

        return true;
    });

    // Sort
    sortFunds(filteredFunds, sortValue);

    // Re-render
    renderFilteredFunds(filteredFunds);
}

function isFundActive(fund) {
    const progress = ((fund.currentAmount || 0) / (fund.targetAmount || 1)) * 100;
    return progress < 100;
}

function isFundCompleted(fund) {
    const progress = ((fund.currentAmount || 0) / (fund.targetAmount || 1)) * 100;
    return progress >= 100;
}

function isFundNew(fund) {
    if (!fund.created) return false;
    const createdDate = fund.created.toMillis ? fund.created.toMillis() : new Date(fund.created).getTime();
    return (Date.now() - createdDate) < 7 * 24 * 60 * 60 * 1000;
}

function sortFunds(funds, sortType) {
    switch (sortType) {
        case 'newest':
            funds.sort((a, b) => {
                const aTime = a.created?.toMillis ? a.created.toMillis() : 0;
                const bTime = b.created?.toMillis ? b.created.toMillis() : 0;
                return bTime - aTime;
            });
            break;
        case 'highest':
            funds.sort((a, b) => (b.currentAmount || 0) - (a.currentAmount || 0));
            break;
        case 'mostContributors':
            funds.sort((a, b) => (b.contributorCount || 0) - (a.contributorCount || 0));
            break;
        case 'nearCompletion':
            funds.sort((a, b) => {
                const aProgress = ((a.currentAmount || 0) / (a.targetAmount || 1)) * 100;
                const bProgress = ((b.currentAmount || 0) / (b.targetAmount || 1)) * 100;
                return bProgress - aProgress;
            });
            break;
        default:
            // Default order (as returned from Firestore)
            break;
    }
}

function renderFilteredFunds(funds) {
    const container = document.getElementById('all-funds-container');
    if (!container) return;

    if (funds.length === 0) {
        container.innerHTML = `
            <div class="no-results-state">
                <div class="icon">🔍</div>
                <h3>Không Tìm Thấy Kết Quả</h3>
                <p>Không có quỹ nào phù hợp với tiêu chí tìm kiếm của bạn. Vui lòng thử lại với từ khóa khác hoặc bỏ bớt bộ lọc.</p>
                <button class="reset-btn" onclick="window.donationAnimations.resetFilters()">Xóa Bộ Lọc</button>
            </div>
        `;
        return;
    }

    // Use the same rendering logic as renderFundList
    function getBadge(fund) {
        const currentAmount = fund.currentAmount || 0;
        const targetAmount = fund.targetAmount || 1;
        const progress = (currentAmount / targetAmount) * 100;

        const isNew = fund.created && (Date.now() - fund.created.toMillis()) < 7 * 24 * 60 * 60 * 1000;

        if (progress >= 90) {
            return '<span class="badge badge-hot">🔥 Sắp Đạt Mục Tiêu</span>';
        } else if (isNew) {
            return '<span class="badge badge-new">🆕 Mới</span>';
        }
        return '';
    }

    let html = '<div class="funds-grid">';

    html += funds.map(fund => {
        const currentAmount = fund.currentAmount || 0;
        const targetAmount = fund.targetAmount || 0;
        const contributorCount = fund.contributorCount || 0;
        const progress = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0;

        // Smart fund type detection (Robust matching)
        let rawType = fund.fundType || fund.type || '';
        let fundType = rawType.toLowerCase();

        if (!fundType) {
            const title = fund.title.toLowerCase();
            const budgetKeywords = ['thu quỹ', 'ngân sách', 'quản lý', 'phí', 'lệ phí', 'đóng góp bắt buộc'];
            fundType = budgetKeywords.some(keyword => title.includes(keyword)) ? 'budget' : 'donation';
        }
        const isBudget = fundType === 'budget';
        const hasImage = fund.image && fund.image.trim() !== '';

        return `
            <div class="fund-card animate-on-scroll">
                <div class="fund-image-header" ${!hasImage ? 'style="background: linear-gradient(135deg, #ef4444, #b91c1c); display: flex; align-items: center; justify-content: center;"' : ''}>
                    ${hasImage ? `<img src="${fund.image}" alt="${fund.title}" loading="lazy" onerror="this.parentNode.style.background='linear-gradient(135deg, #ef4444, #b91c1c)'; this.parentNode.style.display='flex'; this.parentNode.style.alignItems='center'; this.parentNode.style.justifyContent='center'; this.parentNode.innerHTML='<i class=\'fa-solid fa-hand-holding-heart\' style=\'font-size: 50px; color: white; opacity: 0.9;\'></i>';">` : '<i class="fa-solid fa-hand-holding-heart" style="font-size: 50px; color: white; opacity: 0.9;"></i>'}
                    <div class="fund-badge-container">
                        ${getBadge(fund)}
                    </div>
                </div>
                <div class="fund-content">
                    <h3 class="fund-title">${fund.title}</h3>
                    <p class="fund-description">${fund.summary || 'Chung tay đóng góp xây dựng Tổ dân phố vững mạnh.'}</p>
                    
                    ${targetAmount > 0 ? `
                    <div class="fund-progress">
                        <div class="progress-stats">
                            <span class="current-amount">${currentAmount.toLocaleString('vi-VN')}đ</span>
                            <span class="target-amount">/ ${targetAmount.toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div class="progress-bar-modern">
                            <div class="progress-fill animate-on-scroll" style="width: ${progress}%" data-progress="${progress}%"></div>
                        </div>
                        <div class="progress-percentage">${progress.toFixed(1)}%</div>
                    </div>
                    ` : ''}
                    
                    <div class="fund-meta">
                        <div class="meta-item">
                            <i class="fas fa-users"></i>
                            <span>${contributorCount} người</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-calendar"></i>
                            <span>Đang tiếp nhận</span>
                        </div>
                    </div>
                    
                    <div class="fund-actions">
                        <a href="dong-gop.html?id=${fund.id}" class="btn btn-secondary">
                            Xem Chi Tiết
                        </a>
                        <a href="dong-gop.html?id=${fund.id}" class="btn ${isBudget ? 'btn-budget' : 'btn-primary'}">
                            <i class="fas fa-${isBudget ? 'coins' : 'heart'}"></i> ${isBudget ? 'Nộp Ngân Sách' : 'Ủng Hộ Ngay'}
                        </a>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    html += '</div>';
    container.innerHTML = html;

    // Re-initialize scroll reveal
    // DISABLED: Causes opacity issues on page load
    /*
    setTimeout(() => {
        document.querySelectorAll('.fund-card').forEach((card, index) => {
            const staggerIndex = (index % 6) + 1;
            card.classList.add(`stagger-${staggerIndex}`);
        });
    }, 100);
    */
}

function resetFilters() {
    document.getElementById('fund-search').value = '';
    document.querySelectorAll('.filter-pill.active').forEach(p => p.classList.remove('active'));
    document.getElementById('fund-sort').value = 'default';
    applyFilters();
}

// ====== SKELETON LOADING ======

function showSkeletonLoading(count = 6) {
    const container = document.getElementById('all-funds-container');
    if (!container) return;

    let html = '<div class="skeleton-grid">';

    for (let i = 0; i < count; i++) {
        html += `
            <div class="skeleton-card">
                <div class="skeleton-image"></div>
                <div class="skeleton-content">
                    <div class="skeleton-line title"></div>
                    <div class="skeleton-line text"></div>
                    <div class="skeleton-line text"></div>
                    <div class="skeleton-progress"></div>
                    <div class="skeleton-buttons">
                        <div class="skeleton-button"></div>
                        <div class="skeleton-button"></div>
                    </div>
                </div>
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

// ====== STAGGER ANIMATION FOR CARDS ======

function addStaggerToCards() {
    const cards = document.querySelectorAll('.fund-card');
    cards.forEach((card, index) => {
        const staggerIndex = (index % 6) + 1; // Repeat 1-6
        card.classList.add(`stagger-${staggerIndex}`);
    });
}

// ====== INITIALIZATION ======

function initDonationAnimations() {
    // Phase 2
    initScrollReveal();
    initCounters();

    // Phase 3
    initTabs();
    initFilterSearch();

    // Add stagger classes to cards after they're rendered
    setTimeout(() => {
        addStaggerToCards();
    }, 100);
}

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDonationAnimations);
} else {
    initDonationAnimations();
}

// Export functions for external use
window.donationAnimations = {
    init: initDonationAnimations,
    showSkeleton: showSkeletonLoading,
    resetFilters: resetFilters,
    setAllFunds: (funds) => { allFunds = funds; filteredFunds = funds; },
    applyFilters: applyFilters,
    initCounters: initCounters
};
