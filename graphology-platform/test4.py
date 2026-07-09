from pathlib import Path

ROOT = Path(r"C:\Users\Pankaj_Kumar\My_documents\Applications\graphology-platform")

folders = [
    "docs/engineering"
]

files = [
    "docs/engineering/GIT_WORKFLOW.md",
    "docs/engineering/BRANCHING_STRATEGY.md",
    "docs/engineering/COMMIT_GUIDELINES.md",
    "docs/engineering/CODE_REVIEW_CHECKLIST.md",
    "docs/engineering/ERROR_HANDLING.md",
    "docs/engineering/LOGGING_GUIDELINES.md"
]

for folder in folders:
    (ROOT / folder).mkdir(parents=True, exist_ok=True)

for file in files:
    path = ROOT / file
    if not path.exists():
        path.touch()

print("✅ Engineering documentation created.")