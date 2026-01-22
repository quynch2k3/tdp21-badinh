
import os

files = [
    r"c:\Users\HP\Downloads\tdp21\dong-gop.html",
    r"c:\Users\HP\Downloads\tdp21\lien-he.html",
    r"c:\Users\HP\Downloads\tdp21\cac-doan-the.html"
]

for file_path in files:
    print(f"--- INSPECTING {file_path} ---")
    if not os.path.exists(file_path):
        print("File not found.")
        continue
        
    try:
        with open(file_path, 'rb') as f:
            content = f.read()
            print(f"Size: {len(content)} bytes")
            try:
                decoded = content.decode('utf-8')
                print("UTF-8 Decode Successful")
                print("Snippet (first 500 chars):")
                print(decoded[:500])
                
                print("\nSearching for 'Hà N?i':")
                if "Hà N?i" in decoded:
                    print("FOUND 'Hà N?i'")
                else:
                    print("Not found 'Hà N?i'")
                    
            except UnicodeDecodeError:
                print("UTF-8 Decode FAILED. Trying latin-1")
                try:
                    decoded = content.decode('latin-1')
                    print("Latin-1 Decode Successful")
                    print(decoded[:500])
                except:
                    print("Latin-1 Decode FAILED")
    except Exception as e:
        print(f"Error reading file: {e}")
    print("\n")
