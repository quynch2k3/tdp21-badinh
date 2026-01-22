
import os

ROOT_DIR = r"c:\Users\HP\Downloads\tdp21"

REPLACEMENTS = {
    ".cssốv=": ".css?v=",
    ".jsốv=": ".js?v=",
    ".jsốcb=": ".js?cb=",
    "cssố": "css?", # Catch all css?
    "jsố": "js?",   # Catch all js?
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
        print(f"Fixed URL/Script in: {filepath}")
    else:
        # Check if there are other s? breakages
        if "ốv=" in content or "ốcb=" in content:
             print(f"WARNING: Potential remaining breakage in {filepath}")

def main():
    print("Starting URL repair...")
    # Scan ALL html files just in case
    for root, dirs, files in os.walk(ROOT_DIR):
        for filename in files:
            if filename.endswith(".html") or filename.endswith(".js"): # JS might have been hit too if it had strings
                filepath = os.path.join(root, filename)
                fix_file(filepath)

if __name__ == "__main__":
    main()
