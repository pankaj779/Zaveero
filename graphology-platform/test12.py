from pathlib import Path

ROOT = Path(r"C:\Users\Pankaj_Kumar\My_documents\Applications\graphology-platform")

folders = [
    "docs/prompts/phase-01-foundation",
    "docs/prompts/phase-02-authentication",
    "docs/prompts/phase-03-public-website",
    "docs/prompts/phase-04-student-portal",
    "docs/prompts/phase-05-teacher-portal",
    "docs/prompts/phase-06-admin-portal",
    "docs/prompts/phase-07-learning",
    "docs/prompts/phase-08-payments",
    "docs/prompts/phase-09-production",
]

for folder in folders:
    (ROOT / folder).mkdir(parents=True, exist_ok=True)

print("✅ Prompt folders created successfully.")