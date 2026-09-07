#!/bin/sh
# Fail fast on any unexpected error so a broken container never serves traffic.
set -e

echo "🚀 Starting BizzBills..."

# Use the locally-installed Prisma CLI (NOT `npx`/global `prisma`) — the
# runner image has no global install, and `npx` would try to download from
# the registry at container start. The Dockerfile copies node_modules/.bin.
PRISMA="./node_modules/.bin/prisma"
if [ ! -x "$PRISMA" ]; then
  echo "❌ Prisma CLI not found at $PRISMA — the Docker image is missing node_modules/.bin. Refusing to start." >&2
  exit 1
fi

# NOTE: no runtime `prisma generate` — the client is already generated during
# docker build (RUN npx prisma generate) from the same schema and copied into
# the image via node_modules/.prisma. Regenerating at startup only adds a
# failure mode.

# Apply the schema to the database. This repo uses `prisma db push` (no
# migrations folder), so the container self-heals on every deploy without a
# manual `exec`. Retry a few times in case the DB is still starting up.
#
# NOTE: `--accept-data-loss` is deliberately NOT used — in production a
# destructive schema drift must FAIL LOUDLY (container refuses to start) so a
# human can review the data loss, never silently destroy live invoices.
apply_schema() {
  "$PRISMA" db push --skip-generate
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
