
import os

# Define the root directory
ROOT_DIR = r"c:\Users\HP\Downloads\tdp21"

# Dictionary of replacements
# Key: Corrupt string, Value: Correct string
REPLACEMENTS = {
    "C?ng s?n": "Cộng sản",
    "t? hào": "tự hào",
    "kh?ng đểnh": "khẳng định",
    "cánh tay ph?i": "cánh tay phải",
    "đểc l?c": "độc lập",
    "đểi dự bị": "đội dự bị",
    "của Đếng": "của Đảng",
    "tu?i tr?": "tuổi trẻ",
    "nhi?t huy?t": "nhiệt huyết",
    "khát v?ng": "khát vọng",
    "cháy b?ng": "cháy bỏng",
    "đ?n thân": "dấn thân",
    "l?c lu?ng": "lực lượng",
    "đểng th?i": "đồng thời",
    "ngọn cờ đểu": "ngọn cờ đầu",
    "giá tr?": "giá trị",
    "đểa bàn": "địa bàn",
    "Đâu c?n": "Đâu cần",
    "vi?c": "việc",
    "ý th?c": "ý thức",
    "sâu s?c": "sâu sắc",
    "tru?c": "trước",
    "th?i đểi": "thời đại",
    "không ng?ng": "không ngừng",
    "tr?ng trách": "trọng trách",
    "công cu?c": "công cuộc",
    "Chuy?n đểi s?": "Chuyển đổi số",
    "qu?c gia": "quốc gia",
    "công ngh?": "công nghệ",
    "cu?c s?ng": "cuộc sống",
    "Bên c?nh đó": "Bên cạnh đó",
    "s?c áo xanh": "sắc áo xanh",
    "tình nguy?n": "tình nguyện",
    "in đểm": "in đậm",
    "đểu ?n": "dấu ấn",
    "nhu:": "như:",
    "hi?n máu": "hiến máu",
    "chi?n đểch": "chiến dịch",
    "đểc bi?t": "đặc biệt",
    "ti?p c?n": "tiếp cận",
    "tiện ích s?": "tiện ích số",
    "hi?n đểi": "hiện đại",
    "D?ch v?": "Dịch vụ",
    "S? m?nh": "Sứ mệnh",
    "T?m nhìn": "Tầm nhìn",
    "ch? nghia": "chủ nghĩa",
    "K? thừa": "Kế thừa",
    "l?n m?nh": "lớn mạnh",
    "truỦNG HỘc": "trường học",
    "t? bào": "tế bào",
    "giai c?p": "giai cấp",
    "ngh? quy?t": "nghị quyết",
    "chính tr?": "chính trị",
    "kinh t?": "kinh tế",
    # Add more likely ones from visual inspection
    "qu?c": "quốc",
    "s?": "số", # Be careful with this one, but 's?' with ? is likely 'số' or 'sự'
    "Ch? t?ch": "Chủ tịch",
    "sáng l?p": "sáng lập",
    "rèn luy?n": "rèn luyện",
    "lãnh đểo": "lãnh đạo",
    "t? ch?c": "tổ chức",
    "Chuy?n": "Chuyển",
    "Ho?t Đếng": "Hoạt Động",
    "Ch? Đểo": "Chỉ Đạo",
    "S?": "Số", 
    "m?t": "mật", # Or mặt, but usually mặt trận is ok locally?
    "đểi s?ng": "đời sống",
    "xây đểng": "xây dựng",
    "m?c dích": "mục đích",
    "TỔNG S?": "TỔNG SỐ",
    "ch?u trách nhiệm": "chịu trách nhiệm",
    "d? lu?n": "dư luận",
    "CHÀO M?NG": "CHÀO MỪNG",
    "ĐểN VềI": "ĐẾN VỚI",
    "C?P ?Y": "CẤP ỦY",
    "TIN T?C": "TIN TỨC",
    "C?P": "CẤP",
    "x?p lo?i": "xếp loại",
    "Thanh Niên C?ng s?n": "Thanh Niên Cộng sản",
    "nh?ng": "những",
    "ph?i": "phải",
    "Ho?t động": "Hoạt động", # If corrupted partial
    "v?": "về",
    "ngu?i": "người",
    "nghi?p": "nghiệp",
    "H?I": "HỘI",
    "NGU?I": "NGƯỜI",
    "CAO TU?I": "CAO TUỔI",
    "ĐOÀN THANH NIÊN": "ĐOÀN THANH NIÊN", # Check casing
    "Ð": "Đ", # Normalize weird Đ
    "đểt": "đạt",
    "v?a": "vừa",
    "ph?c v?": "phục vụ",
    "Thanh Niên": "Thanh Niên", # Normalize
    "th?": "thể", # or thủ?
    "l?i": "lợi",
    "t?n": "tôn", # Tôn giáo?
    "t?ng": "tầng", # Tầng lớp
    "doàn viên": "đoàn viên", 
    "h?ng": "hồng",
    "tham gia": "tham gia",
    "b?n linh": "bản lĩnh",
    "l?p tru?ng": "lập trường",
    "c?p trên": "cấp trên",
    "du?c": "được",
    "đểng thu?n": "đồng thuận",
    "th?c t?": "thực tế",
    "n?p s?ng": "nếp sống",
    "đểm b?o": "đảm bảo",
    "t? n?n": "tệ nạn",
    "Phó Bí thu": "Phó Bí thư", # thu -> thư
    "Phó Bí thư": "Phó Bí thư",
    "Bí thư Chi Bộ": "Bí thư Chi Bộ",
    "Tru?ng ban": "Trưởng ban",
    "Mặt Trận": "Mặt Trận",
    "Ch? t?ch": "Chủ tịch",
    "h? tr?": "hỗ trợ",
    "cài đểt": "cài đặt",
    "tr?c tuy?n": "trực tuyến",
    "th?c hi?n": "thực hiện"
}

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        print(f"Skipping binary/bad encoding file: {filepath}")
        return

    original_content = content
    for wrong, right in REPLACEMENTS.items():
        content = content.replace(wrong, right)
    
    # Generic generic replacements for patterns if simple replace missed
    # Be careful with generic replaces, manual list is safer for now.
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed: {filepath}")
    else:
        print(f"No changes: {filepath}")

def main():
    print("Starting text fix...")
    target_files = [
        "doan-thanh-nien.html",
        "chi-bo.html",
        "cac-doan-the.html",
        "hoi-phu-nu.html", 
        "hoi-cuu-chien-binh.html",
        "hoi-nguoi-cao-tuoi.html",
        "ban-khuyen-hoc.html",
        "mat-tran-to-quoc.html",
        "lien-he.html",
        "tin-tuc.html",
        "index.html",
        "dong-gop.html"
    ]
    
    for filename in target_files:
        filepath = os.path.join(ROOT_DIR, filename)
        if os.path.exists(filepath):
            fix_file(filepath)
        else:
            print(f"File not found: {filepath}")

if __name__ == "__main__":
    main()
