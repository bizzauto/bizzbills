#!/bin/sh
# Fail fast on any unexpected error so a broken container never serves traffic.
set -e

echo "🚀 Starting BizzBills..."

# Use the locally-installed Prisma binary directly (NOT `npx`), because at
# container runtime `npx` may try to resolve/install and fail silently with
# no network — which would skip the schema sync and boot a drifted DB.
PRISMA="./node_modules/.bin/prisma"
if [ ! -x "$PRISMA" ]; then
  PRISMA="prisma"
fi

# Generate the client matching the committed schema.
echo "🔧 Generating Prisma client..."
"$PRISMA" generate

# Apply the schema to the database. This repo uses `prisma db push` (no
# migrations folder), so the container self-heals on every deploy without a
# manual `exec`. Retry a few times in case the DB is still starting up, and
# DO NOT swallow a real failure — if the schema can't be applied the container
# must not start serving a drifted database (P2022 on User.role/orgId, etc.).
echo "🔧 Applying database schema (prisma db push)..."
apply_schema() {
  "$PRISMA" db push --skip-generate --accept-data-loss
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
