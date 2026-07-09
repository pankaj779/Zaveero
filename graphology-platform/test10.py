from pathlib import Path

ROOT = Path(r"C:\Users\Pankaj_Kumar\My_documents\Applications\graphology-platform")

folders = [
    "docs/prompts/templates",
    "docs/prompts/archive",
]

files = [
    "docs/prompts/00_MASTER_PROMPT.md",
    "docs/prompts/IMPLEMENTATION_RULES.md",
    "docs/prompts/PROJECT_STATE.md",
]

for folder in folders:
    (ROOT / folder).mkdir(parents=True, exist_ok=True)

for file in files:
    path = ROOT / file
    if not path.exists():
        path.touch()

print("✅ Prompt framework created successfully.")