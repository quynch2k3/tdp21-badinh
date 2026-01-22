import os

# Define the root directory
ROOT_DIR = r"c:\Users\HP\Downloads\tdp21"

# Define the list of files to process
FILES_TO_PROCESS = [
    "chi-bo.html",
    "index.html",
    "lien-he.html",
    "tin-tuc.html",
    "cac-doan-the.html",
    "mat-tran-to-quoc.html",
    "hoi-phu-nu.html",
    "hoi-cuu-chien-binh.html",
    "doan-thanh-nien.html",
    "hoi-nguoi-cao-tuoi.html",
    "ban-khuyen-hoc.html",
    "admin.html"
]

# Comprehensive Dictionary of Replacements (Longest matches first to avoid partial replacements)
REPLACEMENTS = {
    # UPPERCASE HEADERS
    "MẶT TRẬN T? QUỐC": "MẶT TRẬN TỔ QUỐC",
    "Mặt Trận T? Quốc": "Mặt Trận Tổ Quốc",
    "H?I PH? N?": "HỘI PHỤ NỮ",
    "Hội Ph? N?": "Hội Phụ Nữ",
    "H?I C?U CHI?N BINH": "HỘI CỰU CHIẾN BINH",
    "H?i Cựu Chiến Binh": "Hội Cựu Chiến Binh",
    "ĐOÀN THANH NIÊN": "ĐOÀN THANH NIÊN",
    "Đoàn Thưanh Niên": "Đoàn Thanh Niên",
    "H?I NGƯỜI CAO TUỔI": "HỘI NGƯỜI CAO TUỔI",
    "H?i Người Cao Tu?i": "Hội Người Cao Tuổi",
    "BAN KHUY?N H?C": "BAN KHUYẾN HỌC",
    "VAN B?N CH? ĐểO": "VĂN BẢN CHỈ ĐẠO",
    "VĂN B?N CH? ĐẠO": "VĂN BẢN CHỈ ĐẠO",
    "TIN TỨC CẤP ỦY": "TIN TỨC CẤP ỦY",
    "CẤP ?Y": "CẤP ỦY",
    "CHI B?": "CHI BỘ",
    "Chi Bộ": "Chi Bộ", # Ensuring consistency
    "GI?I THI?U CHUNG": "GIỚI THIỆU CHUNG",
    "CHÀO MỪNG QUÝ KHÁCH ĐẾN VỚI": "CHÀO MỪNG QUÝ KHÁCH ĐẾN VỚI",
    "CỔNG THÔNG TIN ĐIỆN TỬ": "CỔNG THÔNG TIN ĐIỆN TỬ",
    "TỔ DÂN PHỐ SỐ 21": "TỔ DÂN PHỐ SỐ 21",
    "PHƯỜNG BA ĐÌNH": "PHƯỜNG BA ĐÌNH",
    "QUYỀN LỢI & NGHĨA VỤ": "QUYỀN LỢI & NGHĨA VỤ",
    "BAN LÃNH ĐẠO": "BAN LÃNH ĐẠO",
    "ĐIỀU HÀNH TÁC NGHIỆP": "ĐIỀU HÀNH TÁC NGHIỆP",
    "THÔNG BÁO MỚI": "THÔNG BÁO MỚI",
    
    # Specific Body Text & Phrases
    "Đếng Cộng sản Vi?t Nam": "Đảng Cộng sản Việt Nam",
    "Đếng": "Đảng",
    "đểi tiên phong": "đội tiên phong",
    "đểi": "đội", # generic
    "dân t?c Vi?t Nam": "dân tộc Việt Nam",
    "dân t?c": "dân tộc",
    "Vi?t Nam": "Việt Nam",
    "sốc mạnh": "sức mạnh",
    "lịch sử đó": "lịch sử đó",
    "vinh để": "vinh dự",
    "tế bào": "tế bào",
    "co số": "cơ sở",
    "noi tr?c ti?p": "nơi trực tiếp",
    "tr?c ti?p": "trực tiếp",
    "dưa đường lối": "đưa đường lối",
    "Nghị quyết": "Nghị quyết",
    "d?i sống": "đời sống",
    "chính tr?": "chính trị",
    "văn hóa": "văn hóa",
    "xã hội": "xã hội",
    "mat đểi sống": "mặt đời sống",
    
    # Section 1
    "CH?C NANG & NHI?M Về CHI?N LU?C": "CHỨC NĂNG & NHIỆM VỤ CHIẾN LƯỢC",
    "CHI?N LU?C": "CHIẾN LƯỢC",
    "LÃNH ĐểO CHÍNH TR? & TU TU?NG": "LÃNH ĐẠO CHÍNH TRỊ & TƯ TƯỞNG",
    "TU TU?NG": "TƯ TƯỞNG",
    "Giáo đểc": "Giáo dục",
    "rèn luyện": "rèn luyện",
    "gi? vọng": "giữ vững",
    "lập trường": "lập trường",
    "tuyên truy?n": "tuyên truyền",
    "vền đếng": "vận động",
    "quận chúng": "quần chúng",
    "tin tu?ng": "tin tưởng",
    "tuyệt đối": "tuyệt đối",
    "số lãnh đạo": "sự lãnh đạo",
    "tạo số đồng thuận": "tạo sự đồng thuận",
    
    # Section 2
    "LÃNH ĐểO PHÁT TRI?N TOÀN DI?N": "LÃNH ĐẠO PHÁT TRIỂN TOÀN DIỆN",
    "TOÀN DI?N": "TOÀN DIỆN",
    "Để ra": "Đề ra",
    "Ngh? quy?t": "Nghị quyết",
    "sát, dúng, trúng": "sát, đúng, trúng",
    "thểc t?": "thực tế",
    "phát tri?n": "phát triển",
    "nâng cao": "nâng cao",
    "d?i sống": "đời sống",
    "n?p sống": "nếp sống",
    "dảm bảo": "đảm bảo",
    "trật tự": "trật tự",
    
    # Section 3
    "XÂY D?NG Hệ Thống CHÍNH TR? VềNG M?NH": "XÂY DỰNG HỆ THỐNG CHÍNH TRỊ VỮNG MẠNH",
    "VềNG M?NH": "VỮNG MẠNH",
    "Tổ chức doàn thể": "Tổ chức đoàn thể",
    "doàn thể": "đoàn thể",
    "Hoạt động dúng": "Hoạt động đúng",
    "tôn ch?": "tôn chỉ",
    "sốc mạnh tỦNG HỘp": "sức mạnh tổng hợp",
    "kh?i đểi đoàn kết": "khối đại đoàn kết",
    
    # Organization Structure
    "CƠ CẤU Tổ chức": "CƠ CẤU TỔ CHỨC",
    "Hi?n nay": "Hiện nay",
    "TỔNG Số": "TỔNG SỐ",
    "dảng viên": "đảng viên",
    "C?p ?y": "Cấp ủy",
    "nhiệm kỳ": "nhiệm kỳ",
    "đồng chí": "đồng chí",
    "H? và tên": "Họ và tên",
    "Chức vụ": "Chức vụ",
    "Đểc": "Đức", # Luu Duy Duc name
    "Ngọc": "Ngọc", # Ensure correct
    "Phó Bí thu": "Phó Bí thư",
    "Tr?n Van C": "Trần Văn C",
    "Nguyễn Van A": "Nguyễn Văn A",
    "Nguyễn Th? B": "Nguyễn Thị B",
    
    # Achievements
    "THÀNH TÍCH NỔI BẬT": "THÀNH TÍCH NỔI BẬT",
    "Nhi?u nam li?n": "Nhiều năm liền",
    "công nh?n": "công nhận",
    "xu?t sốc": "xuất sắc",
    "danh hi?u": "danh hiệu",
    "Khu dân cu": "Khu dân cư",
    "c?p Qu?n": "cấp Quận",
    "5 nam li?n": "5 năm liền",
    "nghiêm tr?ng": "nghiêm trọng",
    
    # Navigation & Footer
    "Xem chi ti?t": "Xem chi tiết",
    "Quay lợi": "Quay lại",
    "Tổ Dân PH?": "Tổ Dân PHỐ",
    "Phường Ba ĐÌNH": "Phường Ba ĐÌNH",
    "Nhà Sinh Ho?t": "Nhà Sinh Hoạt",
    "Cộng Đếng": "Cộng Đồng",
    "đang tải": "đang tải",
    "van b?n": "văn bản",
    "Đang tải van b?n...": "Đang tải văn bản...",
    
    # Common words generic fallback (Careful with these)
    "Ho?t động": "Hoạt động",
    "để": "để", # generic, tricky
    "Đếng": "Đảng", # Usually correct in this context
    "Vi?t": "Việt",
    "T?": "Tổ", # Organisation
    "s?": "sự", # su lanh dao
    "?y": "ủy", # Dang uy
    "l?i": "lợi", # quyen loi
    "ngu?i": "người", 
    "tu?i": "tuổi",
    "Ph?": "Phụ", # Phu nu
    "N?": "Nữ",
    "C?u": "Cựu", # Cuu chien binh
    "Chi?n": "Chiến",
    "thưanh": "thanh", # doan thanh nien
    "S?": "Số", # So 21
    "C?NG": "CỔNG",
    "THÔNG TIN": "THÔNG TIN",
    "LIÊN HỆ": "LIÊN HỆ",
    "ĐĂNG NHẬP": "ĐĂNG NHẬP",
    "TRANG CHỦ": "TRANG CHỦ",
    "ĐÓNG GÓP": "ĐÓNG GÓP",
    "VẬN ĐỘNG": "VẬN ĐỘNG",
}

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        original_content = content
        
        # Apply replacements
        for bad, good in REPLACEMENTS.items():
            content = content.replace(bad, good)
            
        # Additional Generic Safety Check for known badly encoded header
        if "M?T TR?N T? QU?C" in content:
             content = content.replace("M?T TR?N T? QU?C", "MẶT TRẬN TỔ QUỐC")

        if content != original_content:
            print(f"Fixing mojibake in: {os.path.basename(filepath)}")
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
        else:
            print(f"No changes needed for: {os.path.basename(filepath)}")
            
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

def main():
    print("Starting Comprehensive Mojibake Fix...")
    for filename in FILES_TO_PROCESS:
        file_path = os.path.join(ROOT_DIR, filename)
        if os.path.exists(file_path):
            fix_file(file_path)
        else:
            print(f"File not found: {filename}")
    print("All tasks completed.")

if __name__ == "__main__":
    main()
