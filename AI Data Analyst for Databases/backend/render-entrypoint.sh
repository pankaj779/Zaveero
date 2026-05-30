#!/bin/sh
set -e
cd /app

echo "[datawhisper-api] prisma db push"
prisma db push

if [ "${SKIP_RLS_SETUP:-0}" != "1" ] && [ -n "${MIGRATION_DATABASE_URL:-}" ]; then
  echo "[datawhisper-api] applying RLS policies"
  psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f /app/sql/enable_rls.sql || echo "[datawhisper-api] RLS setup skipped (non-fatal on Neon single-role)"
else
  echo "[datawhisper-api] skipping RLS setup (SKIP_RLS_SETUP=1 or no MIGRATION_DATABASE_URL)"
fi

echo "[datawhisper-api] starting uvicorn on port ${PORT:-8000}"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
