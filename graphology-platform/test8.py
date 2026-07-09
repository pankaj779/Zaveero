from pathlib import Path

ROOT = Path(r"C:\Users\Pankaj_Kumar\My_documents\Applications\graphology-platform")

folders = [
    "docs/testing",
]

files = [
    "docs/testing/UNIT_TESTS.md",
    "docs/testing/INTEGRATION_TESTS.md",
    "docs/testing/E2E_TESTS.md",
    "docs/testing/API_TESTS.md",
    "docs/testing/PERFORMANCE_TESTS.md",
    "docs/testing/SECURITY_TESTS.md",
    "docs/testing/TEST_DATA.md",
    "docs/testing/RELEASE_CHECKLIST.md",
]

for folder in folders:
    (ROOT / folder).mkdir(parents=True, exist_ok=True)

for file in files:
    path = ROOT / file
    if not path.exists():
        path.touch()

print("✅ Testing documentation created successfully.")