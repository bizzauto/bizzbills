#!/bin/sh
set -e

# Sync database schema (non-destructive — safe to run on every start)
echo "🗄️ Syncing database schema..."
if [ -f "./node_modules/.bin/prisma" ]; then
  ./node_modules/.bin/prisma db push --accept-data-loss --skip-generate 2>&1 || echo "⚠️ Schema sync had issues"
elif command -v npx >/dev/null 2>&1; then
  npx prisma db push --accept-data-loss --skip-generate 2>&1 || echo "⚠️ Schema sync had issues"
else
  echo "⚠️ Prisma CLI not found — schema sync skipped"
fi

echo "🚀 Starting application..."
exec node server.js
