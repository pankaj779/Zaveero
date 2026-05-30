#!/bin/sh
# Runs on every backend container start (Docker). Order matters:
# 1) prisma db push — create/update tables from schema.prisma
# 2) sql/enable_rls.sql — idempotent RLS policies + report_schedules.workspace_id backfill
# 3) uvicorn — API
set -e
cd /app

echo "[entrypoint] prisma db push"
prisma db push

echo "[entrypoint] Applying Row Level Security (idempotent, safe to re-run)"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /app/sql/enable_rls.sql

echo "[entrypoint] Starting API"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
