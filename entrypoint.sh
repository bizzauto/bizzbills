#!/bin/sh
set -e

echo "🚀 Starting BizzBills..."

# Ensure the Prisma client is generated and the schema is applied to the DB.
# This repo uses `prisma db push` (no migrations folder), so the container
# self-heals on deploy without manual `exec` into it.
echo "🔧 Generating Prisma client..."
npx prisma generate

echo "🔧 Applying database schema (db push)..."
npx prisma db push --skip-generate --accept-data-loss || {
  echo "⚠️  prisma db push failed — continuing; the app may error until the DB is ready."
}

exec node server.js
