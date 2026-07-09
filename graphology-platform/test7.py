from pathlib import Path

ROOT = Path(r"C:\Users\Pankaj_Kumar\My_documents\Applications\graphology-platform")

folders = [
    "docs/deployment",
    "infrastructure/docker",
    "infrastructure/github-actions",
    "infrastructure/terraform",
]

files = [
    "docs/deployment/CI_CD_PIPELINE.md",
    "docs/deployment/ROLLBACK_PLAN.md",
    "docs/deployment/ENVIRONMENTS.md",
    "docs/deployment/MONITORING.md",
    "docs/deployment/BACKUP_STRATEGY.md",
    "docs/deployment/PRODUCTION_CHECKLIST.md",
    "infrastructure/docker/README.md",
    "infrastructure/github-actions/README.md",
    "infrastructure/terraform/README.md",
]

for folder in folders:
    (ROOT / folder).mkdir(parents=True, exist_ok=True)

for file in files:
    path = ROOT / file
    if not path.exists():
        path.touch()

print("✅ Deployment documentation created successfully.")