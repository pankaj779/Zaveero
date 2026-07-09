from pathlib import Path

ROOT = Path(r"C:\Users\Pankaj_Kumar\My_documents\Applications\graphology-platform")

folders = [
    "docs/api/endpoints",
    "docs/api/examples",
]

files = [
    "docs/api/AUTH_API.md",
    "docs/api/STUDENT_API.md",
    "docs/api/TEACHER_API.md",
    "docs/api/ADMIN_API.md",
    "docs/api/PAYMENT_API.md",
    "docs/api/COURSE_API.md",
    "docs/api/WEBHOOKS.md",
    "docs/api/ERROR_CODES.md",
    "docs/api/examples/REQUESTS.md",
    "docs/api/examples/RESPONSES.md",
]

for folder in folders:
    (ROOT / folder).mkdir(parents=True, exist_ok=True)

for file in files:
    path = ROOT / file
    if not path.exists():
        path.touch()

print("✅ API documentation structure created successfully.")