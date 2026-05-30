# Neon PostgreSQL setup checklist (free tier)
#
# 1. https://neon.tech → Sign up
# 2. New project: zaavero-prod
# 3. SQL Editor → CREATE DATABASE datawhisper;  (zaavero is default)
# 4. Dashboard → Connection Details → Pooled connection string
# 5. Paste into Render:
#      zaavero-api      → DATABASE_URL
#      datawhisper-api  → DATABASE_URL + MIGRATION_DATABASE_URL (same on free tier)
#
# Connection string format:
#   postgresql://USER:PASS@ep-xxx.region.aws.neon.tech/zaavero?sslmode=require
#   postgresql://USER:PASS@ep-xxx.region.aws.neon.tech/datawhisper?sslmode=require
#
# See Zaavero/docs/DEPLOYMENT.md Step 2 for full instructions.
