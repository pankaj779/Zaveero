from pathlib import Path

ROOT = Path(r"C:\Users\Pankaj_Kumar\My_documents\Applications\graphology-platform")

folders = [
    "docs/roadmap",
]

files = [
    "docs/roadmap/MILESTONES.md",
    "docs/roadmap/SPRINT_PLAN.md",
    "docs/roadmap/RELEASE_PLAN.md",
    "docs/roadmap/FUTURE_IDEAS.md",
    "docs/roadmap/CHANGELOG.md",
]

for folder in folders:
    (ROOT / folder).mkdir(parents=True, exist_ok=True)

for file in files:
    path = ROOT / file
    if not path.exists():
        path.touch()

print("✅ Roadmap documentation created successfully.")