from pathlib import Path

ROOT = Path(r"C:\Users\Pankaj_Kumar\My_documents\Applications\graphology-platform")

files = [
    "docs/11_MVP_CHECKLIST.md",
    "docs/12_DEFINITION_OF_DONE.md",
    "docs/13_TECH_STACK.md",
    "docs/14_FOLDER_STRUCTURE.md",
]

for file in files:
    path = ROOT / file
    if not path.exists():
        path.touch()

print("✅ Additional engineering documents created.")