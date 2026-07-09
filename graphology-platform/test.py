from pathlib import Path

# ---------------------------------------------------------
# Change this path if required
# ---------------------------------------------------------
ROOT = Path(r"C:\Users\Pankaj_Kumar\My_documents\Applications\graphology-platform")

# ---------------------------------------------------------
# Folder Structure
# ---------------------------------------------------------

folders = [
    "docs",
    "docs/prompts",
    "docs/architecture",
    "docs/database",
    "docs/api",
    "docs/ui",

    "apps",
    "apps/web",
    "apps/api",
    "apps/mobile",

    "packages",

    "infrastructure",

    "scripts",

    "tests",

    "assets",
    "assets/images",
    "assets/icons",
    "assets/logos",

    ".github",
    ".github/workflows",
]

# ---------------------------------------------------------
# Documentation Files
# ---------------------------------------------------------

files = [

    "README.md",
    "LICENSE",
    ".gitignore",
    ".env.example",

    "docs/00_PROJECT_VISION.md",
    "docs/01_PRODUCT_REQUIREMENTS.md",
    "docs/02_SYSTEM_ARCHITECTURE.md",
    "docs/03_DATABASE_SCHEMA.md",
    "docs/04_UI_UX_GUIDELINES.md",
    "docs/05_CODING_STANDARDS.md",
    "docs/06_SECURITY_GUIDELINES.md",
    "docs/07_API_STANDARDS.md",
    "docs/08_DEPLOYMENT_GUIDE.md",
    "docs/09_TESTING_GUIDE.md",
    "docs/10_FEATURE_ROADMAP.md",

    "docs/architecture/README.md",
    "docs/database/README.md",
    "docs/api/README.md",
    "docs/ui/README.md",
]

# ---------------------------------------------------------
# Prompt Files
# ---------------------------------------------------------

prompt_names = [
    "01_SETUP",
    "02_DATABASE",
    "03_AUTHENTICATION",
    "04_LANDING_PAGE",
    "05_ADMIN_DASHBOARD",
    "06_TEACHER_DASHBOARD",
    "07_STUDENT_DASHBOARD",
    "08_COURSE_MANAGEMENT",
    "09_BATCH_MANAGEMENT",
    "10_GOOGLE_MEET",
    "11_GOOGLE_CLASSROOM",
    "12_ASSIGNMENTS",
    "13_QUIZZES",
    "14_CERTIFICATES",
    "15_PAYMENTS",
    "16_EMAILS",
    "17_WHATSAPP",
    "18_NOTIFICATIONS",
    "19_CRM",
    "20_BLOG",
    "21_GALLERY",
    "22_TESTIMONIALS",
    "23_ANALYTICS",
    "24_AUDIT_LOGS",
    "25_FILE_UPLOADS",
    "26_SEO",
    "27_PERFORMANCE",
    "28_TESTING",
    "29_DOCKER",
    "30_DEPLOYMENT",
]

for prompt in prompt_names:
    files.append(f"docs/prompts/{prompt}.md")

# ---------------------------------------------------------
# Create Folders
# ---------------------------------------------------------

for folder in folders:
    (ROOT / folder).mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------
# Create Files
# ---------------------------------------------------------

for file in files:
    path = ROOT / file

    if not path.exists():
        path.touch()

print("=" * 60)
print("Project Bootstrap Completed Successfully!")
print("=" * 60)
print(f"Root Directory : {ROOT}")
print(f"Folders Created: {len(folders)}")
print(f"Files Created  : {len(files)}")
print("=" * 60)