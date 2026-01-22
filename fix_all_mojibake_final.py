
import os

ROOT_DIR = r"c:\Users\HP\Downloads\tdp21"

# Dictionary of replacements
# Specific long strings to avoid false positives (like css?v=)
REPLACEMENTS = {
    "Phu?ng Ba Đình": "Phường Ba Đình",
    "C?NG THÔNG TIN": "CỔNG THÔNG TIN",
    "T? DÂN PH?": "TỔ DÂN PHỐ",
    "T? Dân Ph?": "Tổ Dân Phố",
    "VềN ĐểNG": "VẬN ĐỘNG",
    "Các Đoàn Th?": "Các Đoàn Thể",
    "CHI B?": "CHI BỘ",
    "M?T TR?N T? QU?C": "MẶT TRẬN TỔ QUỐC",
    "HỘI PH? N?": "HỘI PHỤ NỮ",
    "HỘI C?U CHI?N BINH": "HỘI CỰU CHIẾN BINH",
    "ĐOÀN THANH NIÊN": "ĐOÀN THANH NIÊN", # Just in case
    "HỘI NGƯỜI CAO TUỔI": "HỘI NGƯỜI CAO TUỔI", # Seems ok but add just in case
    "BAN KHUY?N H?C": "BAN KHUYẾN HỌC",
    "Số KI?N N?I B?T": "SỰ KIỆN NỔI BẬT",
    "SỐ KI?N": "SỰ KIỆN",
    "N?I B?T": "NỔI BẬT",
    "Đang k?t n?i d?n h? thểng": "Đang kết nối đến hệ thống",
    "tin t?c": "tin tức",
    "BAN LÃNH ĐểO": "BAN LÃNH ĐẠO",
    "Đểa ch?": "Địa chỉ",
    "Nhà Sinh Ho?t C?ng Đếng": "Nhà Sinh Hoạt Cộng Đồng",
    "B?n quyền": "Bản quyền",
    "C?ng TTĐT": "Cổng TTĐT",
    "Ch?n liên k?t": "Chọn liên kết",
    "Chính Ph?": "Chính Phủ",
    "Thành Ph?": "Thành Phố",
    "Qu?n Ba Đình": "Quận Ba Đình",
    "Dịch vụ công Qu?c gia": "Dịch vụ công Quốc gia",
    "THÔNG BÁO M?I": "THÔNG BÁO MỚI",
    "ĐI?U HÀNH TÁC NGHI?P": "ĐIỀU HÀNH TÁC NGHIỆP",
    "H?i C?u Chi?n Binh": "Hội Cựu Chiến Binh",
    "H?i Ngu?i Cao Tu?i": "Hội Người Cao Tuổi",
    "Ngu?i": "Người",
    "Qu?c": "Quốc",
    "Xem t?t c?": "Xem tất cả",
    "T?NG S?": "TỔNG SỐ",
    "S?": "Số", # Be careful
    "TỔNG S?": "TỔNG SỐ",
    "ĐOÀN K?T": "ĐOÀN KẾT",
    "K? CƯƠNG": "KỶ CƯƠNG",
    "TRÁCH NHI?M": "TRÁCH NHIỆM",
    "VĂN HÓA KI?U M?U": "VĂN HÓA KIỂU MẪU",
    "THI ĐUA": "THI ĐUA",
    "YÊU NƯỚC": "YÊU NƯỚC",
    "VNeID": "VNeID", # Preserve
    "D?ch v?": "Dịch vụ",
    "b?n linh": "bản lĩnh",
    "h?nh phúc": "hạnh phúc",
    "đ?c l?p": "độc lập",
    "t? do": "tự do",
    "H?I LIÊN HI?P": "HỘI LIÊN HIỆP",
    "Ph? N?": "Phụ Nữ",
    "C?u Chi?n Binh": "Cựu Chiến Binh",
    "Khuy?n H?c": "Khuyến Học",
    "M?t Tr?n": "Mặt Trận",
    "C?NG S?N": "CỘNG SẢN",
    "H? CHÍ MINH": "HỒ CHÍ MINH",
    # FIX SYSTEM ERRORS (URL PARAMETERS)
    ".cssựv=": ".css?v=",
    ".jsựv=": ".js?v=",
    ".jsựcb=": ".js?cb=",
    # UNCOMMENT LANG.JS TO FIX TEXT ERRORS (Quan trọng cho index.html)
    '<!-- <script src="lang.jsựv=2"></script> -->': '<script src="lang.js?v=2"></script>',
    '<!-- <script src="lang.js?v=2"></script> -->': '<script src="lang.js?v=2"></script>',
    # FIX DUPLICATE TYPOS
    "TổTổ Dân Phốố": "Tổ Dân Phố",
    "TổTổ Dân Phố": "Tổ Dân Phố",
    # FIX TEXT CONTENT ERRORS
    "Đang k?t n?i dân h? thểng": "Đang kết nối đến hệ thống",
    "Đang k?t n?i": "Đang kết nối",
}

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        return

    original_content = content
    for wrong, right in REPLACEMENTS.items():
        content = content.replace(wrong, right)
    
    # Safety Check for style.css?v= replacement (although specific keys above shouldn't hit it)
    # Restore if accidental hit (e.g. if I added "s?" -> "số" again)
    content = content.replace(".csssốv=", ".css?v=")
    content = content.replace(".jssốv=", ".js?v=")
    # Additional safety for the specific corruption found
    content = content.replace("style.cssựv=", "style.css?v=")
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed: {filepath}")

def main():
    print("Starting Final System-Wide Fix...")
    for root, dirs, files in os.walk(ROOT_DIR):
        for filename in files:
            if filename.endswith(".html") or filename.endswith(".js"):
                filepath = os.path.join(root, filename)
                fix_file(filepath)

if __name__ == "__main__":
    main()
