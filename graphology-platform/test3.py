from pathlib import Path

ROOT = Path(r"C:\Users\Pankaj_Kumar\My_documents\Applications\graphology-platform")

folders = [
    "docs/ui/components",
    "docs/ui/pages",
    "docs/ui/wireframes",
]

files = [
    "docs/ui/DESIGN_SYSTEM.md",
    "docs/ui/COMPONENT_LIBRARY.md",
    "docs/ui/RESPONSIVE_GUIDE.md",
    "docs/ui/ACCESSIBILITY.md",
    "docs/ui/TYPOGRAPHY.md",
    "docs/ui/COLOR_SYSTEM.md",
]

for folder in folders:
    (ROOT / folder).mkdir(parents=True, exist_ok=True)

for file in files:
    path = ROOT / file
    if not path.exists():
        path.touch()

print("✅ UI documentation created successfully.")