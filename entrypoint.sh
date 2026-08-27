#!/bin/sh
# Fail fast on any unexpected error so a broken container never serves traffic.
set -e

echo "🚀 Starting BizzBills..."

# Ensure the Prisma client matches the committed schema.
echo "🔧 Generating Prisma client..."
npx prisma generate

# Apply the schema to the database. This repo uses `prisma db push` (no
# migrations folder), so the container self-heals on every deploy without a
# manual `exec`. We retry a few times in case the DB is still starting up,
# and we DO NOT swallow a real failure — if the schema can't be applied the
# container must not start serving a drifted database.
echo "🔧 Applying database schema (prisma db push)..."
apply_schema() {
  npx prisma db push --skip-generate --accept-data-loss
}

MAX_TRIES=5
TRY=1
until apply_schema; do
  TRY=$((TRY + 1))
  if [ "$TRY" -gt "$MAX_TRIES" ]; then
    echo "❌ prisma db push failed after $MAX_TRIES attempts. Refusing to start with a drifted schema." >&2
    exit 1
  fi
  echo "⚠️  db push attempt $TRY failed — retrying in 5s..."
  sleep 5
done

echo "✅ Database schema is in sync."

exec node server.js
