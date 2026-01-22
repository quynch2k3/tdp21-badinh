
import os

ROOT_DIR = r"c:\Users\HP\Downloads\tdp21"

REPLACEMENTS = {
    "Sáng t?o": "Sáng tạo",
    "đểu": "đều",
    "ngọn cờ đều": "ngọn cờ đầu", # Fix conflict if `đểu`->`đều` happened
    "ngọn cờ đểu": "ngọn cờ đầu",
    "dua": "đưa",
    "đển": "đến",
    "sẵn sàng đến thân": "sẵn sàng dấn thân",
    "đến thân": "dấn thân",
    "cầnh": "cạnh",
    "Bên cầnh": "Bên cạnh",
    "m?nh": "mạnh", # l?n m?nh -> lớn mạnh. s? m?nh -> sứ mệnh (context dependent!)
    "S? m?nh": "Sứ mệnh",
    "lớn m?nh": "lớn mạnh",
    "h?ng": "hồng",
    "v?a": "vừa",
    "t?o": "tạo",
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
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed: {filepath}")

def main():
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
