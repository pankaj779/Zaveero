from pathlib import Path

ROOT = Path(r"C:\Users\Pankaj_Kumar\My_documents\Applications\graphology-platform")

new_folders = [
    "docs/database/entities",
]

new_files = [
    "docs/database/ER_DIAGRAM.md",
    "docs/database/RELATIONSHIPS.md",
    "docs/database/INDEXING_STRATEGY.md",
    "docs/database/MIGRATION_GUIDE.md",
]

for folder in new_folders:
    (ROOT / folder).mkdir(parents=True, exist_ok=True)

for file in new_files:
    path = ROOT / file
    if not path.exists():
        path.touch()

print("✅ Database documentation structure created successfully.")