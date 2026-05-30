#!/bin/sh
set -e
cd /app

echo "[zaavero-api] prisma db push"
prisma db push

if [ "${SEED_CATALOG:-1}" = "1" ]; then
  echo "[zaavero-api] seed catalog (idempotent upsert)"
  PYTHONPATH=. python scripts/seed_catalog.py || echo "[zaavero-api] seed warning (non-fatal)"
fi

echo "[zaavero-api] starting uvicorn on port ${PORT:-8000}"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
