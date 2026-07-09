from pathlib import Path

ROOT = Path(r"C:\Users\Pankaj_Kumar\My_documents\Applications\graphology-platform")

folders = [
    "docs/security"
]

files = [
    "docs/security/THREAT_MODEL.md",
    "docs/security/SECRETS_MANAGEMENT.md",
    "docs/security/BACKUP_AND_RECOVERY.md",
    "docs/security/INCIDENT_RESPONSE.md",
    "docs/security/SECURITY_CHECKLIST.md",
    "docs/security/DEPENDENCY_POLICY.md"
]

for folder in folders:
    (ROOT / folder).mkdir(parents=True, exist_ok=True)

for file in files:
    path = ROOT / file
    if not path.exists():
        path.touch()

print("✅ Security documentation created successfully.")