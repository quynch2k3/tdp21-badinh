
import os

files_to_fix_text = [
    r"c:\Users\HP\Downloads\tdp21\dong-gop.html",
    r"c:\Users\HP\Downloads\tdp21\lien-he.html",
    r"c:\Users\HP\Downloads\tdp21\cac-doan-the.html",
    r"c:\Users\HP\Downloads\tdp21\mat-tran-to-quoc.html",
    r"c:\Users\HP\Downloads\tdp21\hoi-phu-nu.html",
    r"c:\Users\HP\Downloads\tdp21\hoi-cuu-chien-binh.html",
    r"c:\Users\HP\Downloads\tdp21\doan-thanh-nien.html",
    r"c:\Users\HP\Downloads\tdp21\hoi-nguoi-cao-tuoi.html",
    r"c:\Users\HP\Downloads\tdp21\ban-khuyen-hoc.html",
    r"c:\Users\HP\Downloads\tdp21\chi-bo.html",
    r"c:\Users\HP\Downloads\tdp21\index.html",
    r"c:\Users\HP\Downloads\tdp21\tin-tuc.html",
    r"c:\Users\HP\Downloads\tdp21\admin.html"
]

REPLACEMENTS = {
    "Hà N?i": "Hà Nội",
    "C?NG S?N H? CHÍ MINH": "CỘNG SẢN HỒ CHÍ MINH",
    "CHI Ðoàn": "CHI ĐOÀN",
    "Chi doàn": "Chi đoàn",
    "Ðoàn Phường": "Đoàn Phường",
    "Tổ Dân Phố S?": "Tổ Dân Phố Số",
    "T? Dân Ph?": "Tổ Dân Phố",
    "Phường Ba Ðình": "Phường Ba Đình",
    "Phường Ba ÐÌNH": "Phường Ba ĐÌNH",
    "?y Ban Nhân Dân": "Ủy Ban Nhân Dân",
    "Chi B?": "Chi Bộ",
    "M?t Tr?n T? Qu?c": "Mặt Trận Tổ Quốc",
    "H?i Ph? N?": "Hội Phụ Nữ",
    "H?i C?u Chi?n Binh": "Hội Cựu Chiến Binh",
    "H?i Ngu?i Cao Tu?i": "Hội Người Cao Tuổi",
    "Ban Khuy?n H?c": "Ban Khuyến Học",
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
    "S? Ki?n": "Sự Kiện",
    "Van B?n": "Văn Bản",
    "Ch? Ð?o": "Chỉ Đạo",
    "Phong Trào Thi Ðua": "Phong Trào Thi Đua",
    "Góc Thanh Niên": "Góc Thanh Niên",
    "Khuy?n H?c": "Khuyến Học",
    "Qu?c Huy": "Quốc Huy",
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
    "á»‹": "ị",
    "Thu? Ðô": "Thủ Đô",
    "Qu?c gia": "Quốc gia",
    "Ph? bi?n": "Phổ biến",
    "Tuyên truy?n": "Tuyên truyền",
    "T? ch?c": "Tổ chức",
    "Lãnh d?o": "Lãnh đạo",
    "Kính thu?a": "Kính thưa",
    "Toàn th?": "Toàn thể",
    "B? con": "Bà con",
    "Nhân dân": "Nhân dân",
    "T? dân ph?": "Tổ dân phố",
    "K?NH THUA": "KÍNH THƯA",
    "TO?N TH?": "TOÀN THỂ",
    "B? CON": "BÀ CON",
    "NH?N D?N": "NHÂN DÂN",
    "T? D?N PH?": "TỔ DÂN PHỐ",
    "Tương th?n tương ?i": "Tương thân tương ái",
    "L? lành ðùm l? r?ch": "Lá lành đùm lá rách",
    "t? d?n ph?": "tổ dân phố",
    "v?n d?ng": "vận động",
    "chung tay dóng g?p": "chung tay đóng góp",
    "Quy?n g?p": "Quyên góp",
    "M?i d?ng g?p": "Mọi đóng góp",
    "Ngân hàng": "Ngân hàng",
    "Ch? tài kho?n": "Chủ tài khoản",
    "S? tài kho?n": "Số tài khoản",
    "N?i dung chuy?n kho?n": "Nội dung chuyển khoản",
     "M?t Tr?n T? Qu?c": "Mặt Trận Tổ Quốc",
    "Ðóng Góp": "Đóng Góp",
    "V?n Ð?ng": "Vận Động",
    "L?ch S?": "Lịch Sử",
    "Danh Sách": "Danh Sách",
    "Thông Báo": "Thông Báo",
}

def fix_file(file_path):
    if not os.path.exists(file_path):
        return

    try:
        with open(file_path, 'rb') as f:
            content = f.read()
        
        # Try decoding
        try:
            text = content.decode('utf-8')
        except UnicodeDecodeError:
            try:
                text = content.decode('latin-1')
            except:
                print(f"Cannot decode {file_path}")
                return

        original_text = text
        
        # Apply replacements
        for bad, good in REPLACEMENTS.items():
            if bad in text:
                text = text.replace(bad, good)
        
        # Special check specifically for cac-doan-the.html layout revert
        if "cac-doan-the.html" in file_path and "intro-header" in text:
            # Simple heuristic replacement for the grid container
            if 'display: grid' in text and 'org-card' in text:
                print(f"Reverting layout in {file_path}")
                # We will replace the grid container with a simple list structure
                # Find the start of the grid
                start_marker = '<div style="display: grid'
                end_marker = '<!-- Khuyến Học (Purple) -->'
                
                # This is risky with simple replace if we don't match exactly.
                # Instead, let's just make sure "display: grid" style is removed or changed to block?
                # But the user wants "Previous layout", which was likely a list.
                # Let's change the grid styling to display: block and the cards to be list items or blocks with margin
                
                text = text.replace('display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px;', 
                                    'display: flex; flex-direction: column;')
                
                # Changing org-card style inline if present or relying on css
                # The inline style for org-cards was just border-left.
                # But let's verify if we need to change more.
                # If we change container to flex-column, they will stack.
        
        if text != original_text:
            print(f"Fixed {file_path}")
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(text)
        else:
            print(f"No changes for {file_path}")

    except Exception as e:
        print(f"Error processing {file_path}: {e}")

for f in files_to_fix_text:
    print(f"Processing {f}...")
    fix_file(f)

print("Done.")
