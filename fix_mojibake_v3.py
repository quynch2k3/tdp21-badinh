
import os

ROOT_DIR = r"c:\Users\HP\Downloads\tdp21"

# Specific order matters. Longer matches first.
REPLACEMENTS = {
    "Cộng sốn": "Cộng sản",
    "Cộng s?n": "Cộng sản",
    "tự hào khồng": "tự hào khẳng",
    "kh?ng đểnh": "khẳng định",
    "kh?ng": "khẳng",
    "đểnh": "định",
    "về thể": "vị thế",
    "v? th?": "vị thế",
    "đến thân": "dấn thân",
    "vềng": "vọng",
    "khát v?ng": "khát vọng",
    "ngọn cờ đểu": "ngọn cờ đầu",
    "đểu ?n": "dấu ấn",
    "in đểm": "in đậm",
    "Bùi Đểc Anh": "Bùi Đức Anh",
    "Luu Duy Đểc": "Lưu Duy Đức",
    "Nguy?n": "Nguyễn",
    "Ngốc": "Ngọc", # Nguyen Duy Ngoc likely
    "Phó Bí thu": "Phó Bí thư",
    "thu?ng xuyên": "thường xuyên",
    "gi?i thi?u": "giới thiệu",
    "hoàn thành xu?t s?c": "hoàn thành xuất sắc",
    "xu?t s?c": "xuất sắc",
    "ch? tr?ng": "chủ trương",
    "t? ch?c": "tổ chức",
    "ch?c": "chức",
    "t? giác": "tự giác",
    "t? nguy?n": "tự nguyện",
    "ngăn ch?n": "ngăn chặn",
    "đ?i t?ng": "đối tượng",
    "k?t qu?": "kết quả",
    "Ch? t?ch": "Chủ tịch",
    "sáng l?p": "sáng lập",
    "rèn luy?n": "rèn luyện",
    "lãnh đểo": "lãnh đạo",
    "đểo": "đạo",
    "lan tỏa nh?ng": "lan tỏa những",
    "nh?ng": "những",
    "v?": "về", 
    "nghi?p": "nghiệp",
    "đểt": "đạt",
    "ph?c v?": "phục vụ",
    "l?p tru?ng": "lập trường",
    "l?p": "lập",
    "t?n": "tôn",
    "t?ng": "tầng",
    "h?ng": "hồng",
    "b?n linh": "bản lĩnh",
    "th?c t?": "thực tế",
    "th?c": "thực",
    "n?p s?ng": "nếp sống",
    "đểm b?o": "đảm bảo",
    "t? n?n": "tệ nạn",
    "h? tr?": "hỗ trợ",
    "cài đểt": "cài đặt",
    "tr?c tuy?n": "trực tuyến",
    "th?c hi?n": "thực hiện",
    "l?c lu?ng": "lực lượng",
    "ch? nghia": "chủ nghĩa",
    "k? th?a": "kế thừa",
    "s? m?nh": "sứ mệnh",
    "c? ng?": "cư ngụ", # if exists
    "đểi s?ng": "đời sống",
    "c?a": "của",
    "d?n t?c": "dân tộc",
    "l?i": "lợi", # quyền lợi
    "quy?n": "quyền",
    "th? thao": "thể thao",
    "văn hóa": "văn hóa",
    "chi?n lu?c": "chiến lược",
    "v?ng m?nh": "vững mạnh",
    "t? hào": "tự hào",
    "S?": "Số",  
    "s?": "số", # Keep this last-ish
    "c?n": "cần"
}

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        print(f"Skipping binary: {filepath}")
        return

    original_content = content
    for wrong, right in REPLACEMENTS.items():
        content = content.replace(wrong, right)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed: {filepath}")
    else:
        print(f"No changes: {filepath}")

def main():
    print("Starting V3 fix...")
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

if __name__ == "__main__":
    main()
