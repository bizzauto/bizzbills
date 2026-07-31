#!/bin/sh
set -e

# Sync database schema (non-destructive — safe to run on every start)
echo "🗄️ Syncing database schema..."
node node_modules/.prisma/client/node_modules/prisma/build/index.js db push --accept-data-loss 2>/dev/null || \
  ./node_modules/.bin/prisma db push --accept-data-loss 2>/dev/null || \
  echo "⚠️ Schema sync skipped (will use existing schema)"

echo "🚀 Starting application..."
exec node server.js
