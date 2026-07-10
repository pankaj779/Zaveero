#!/bin/sh
set -eu

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "Applying Prisma migrations..."
  cd /app/packages/database
  ./node_modules/.bin/prisma migrate deploy 2>/dev/null \
    || /app/node_modules/.bin/prisma migrate deploy \
    || npx --yes prisma migrate deploy
  cd /app
fi

exec node apps/api/dist/main.js
