/**
 * AUTO-GENERATED FIX SCRIPT
 * Tự động sửa lỗi font/encoding trên trình duyệt (Client-side)
 * Được cập nhật để xử lý các lỗi Mojibake phổ biến.
 */
(function () {
    // Bản đồ thay thế: "Chuỗi lỗi" -> "Chuỗi đúng"
    // Lưu ý: Các chuỗi lỗi bên trái là dự đoán các dạng hiển thị sai lệch phổ biến của UTF-8
    const REPLACEMENTS = {
        // "Thanh Niên": "Thanh Niên", // REMOVED
        "C?NG SốN HỒ CHÍ MINH": "CỘNG SẢN HỒ CHÍ MINH",
        "CHI Ðoàn": "CHI ĐOÀN",
        "Chi doàn": "Chi đoàn",
        "Ðoàn Phường": "Đoàn Phường",
        "Tổ Dân Phố Số": "Tổ Dân Phố Số",
        "Tổ Dân Phố": "Tổ Dân Phố",
        "Phường Ba Ðình": "Phường Ba Đình",
        "Phường Ba ÐÌNH": "Phường Ba ĐÌNH",
        "Hà N?i": "Hà Nội",
        "?y Ban Nhân Dân": "Ủy Ban Nhân Dân",
        "Chi B?": "Chi Bộ",
        "Mặt Trận T? Quốc": "Mặt Trận Tổ Quốc",
        "H?i Phụ Nữ": "Hội Phụ Nữ",
        "Hội Cựu Chiến Binh": "Hội Cựu Chiến Binh",
        "Hội Người Cao Tuổi": "Hội Người Cao Tuổi",
        "Ban Khuyến Học": "Ban Khuyến Học",
        "Ðóng Góp & V?N Ð?NG": "Đóng Góp & VẬN ĐỘNG",
        "Các Ðoàn Th??": "Các Đoàn Thể",
        "C?ng TTÐT": "Cổng TTĐT",
        "Ð?NG B?": "ĐẢNG BỘ",
        "ÐI?N T?": "ĐIỆN TỬ",
        "C?ng Thông Tin": "Cổng Thông Tin",
        "Trang Ch?": "Trang Chủ",
        "Trang ch?": "Trang chủ",
        "Liên H?": "Liên Hệ",
        "Ðang Nh?p": "Đăng Nhập",
        "Ðang t?i": "Đang tải",
        "Ngôn ng?:": "Ngôn ngữ:",
        "Ti?ng Vi?t": "Tiếng Việt",
        "Ð?n": "Đến",
        "V?": "Về",
        "Ð?ng": "Đảng",
        "Ð?": "Để",
        "Ðâu": "Đâu",
        "Ðoàn": "Đoàn",
        "Ði?n tho?i": "Điện thoại",
        "Ð?a ch?": "Địa chỉ",
        "B?n quy?n": "Bản quyền",
        "thu?c v?": "thuộc về",
        "ngu?n": "nguồn",
        "l?i thông tin": "lại thông tin",
        "t? website": "từ website",
        "Lên d?u trang": "Lên đầu trang",
        "Gi?i Thi?u": "Giới Thiệu",
        "Tin T?c": "Tin Tức",
        "Ho?t Ð?ng": "Hoạt Động",
        "Số Ki?n": "Sự Kiện",
        "Van B?n": "Văn Bản",
        "Ch? Ð?o": "Chỉ Đạo",
        "Phong Trào Thi Ðua": "Phong Trào Thi Đua",
        "Góc Thanh Niên": "Góc Thanh Niên",
        "Khuyến Học": "Khuyến Học",
        "Quốc Huy": "Quốc Huy",
        "H? Ch?": "Hỗ Trợ",
        "Ä T": "ĐT",
        "Ä ": "Đ",
        "á» ": "ờ",
        "Ã ": "à",
        "Ã´": "ô",
        "Ãª": "ê",
        "áº£": "ả",
        "áº¯": "ắ",
        "á»‘": "ố",
        "áº¡": "ạ",
        "á»¹": "ỹ",
        "áº§": "ầ",
        "Æ¡": "ơ",
        "Ã½": "ý",
        "Ã¹": "ù",
        "Ä©": "ĩ",
        "á»‹": "ị"
    };

    function fixText(text) {
        if (!text) return text;
        let newText = text;
        for (const [bad, good] of Object.entries(REPLACEMENTS)) {
            // Skip identity mappings to be safe
            if (bad === good) continue;
            if (newText.indexOf(bad) !== -1) {
                // Use split-join for global replacement without recursion
                newText = newText.split(bad).join(good);
            }
        }
        return newText;
    }

    function walk(node) {
        if (node.nodeType === 3) { // Text node
            const original = node.nodeValue;
            if (original && original.trim().length > 0) {
                const fixed = fixText(original);
                if (original !== fixed) {
                    node.nodeValue = fixed;
                }
            }
        } else if (node.nodeType === 1 && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
            // Element node: Duyệt con
            node.childNodes.forEach(walk);
        }
    }

    function init() {
        // 1. Sửa ngay nội dung tĩnh
        walk(document.body);

        // 2. Theo dõi thay đổi (Firebase load sau)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    walk(node);
                });
                // Nếu text node thay đổi trực tiếp
                if (mutation.type === 'characterData') {
                    // Cẩn thận vòng lặp vô hạn
                    // walk(mutation.target); 
                }
            });
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: false });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
