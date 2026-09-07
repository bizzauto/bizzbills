#!/bin/sh
# Fail fast on any unexpected error so a broken container never serves traffic.
set -e

echo "🚀 Starting BizzBills..."

# ---------------------------------------------------------------------------
# Optional schema bootstrap: only runs when RUN_DB_PUSH=1 is explicitly set
# (e.g. first deployment to a FRESH database). Never runs by default.
#
# Why not always? `prisma db push` diffs the committed schema against the
# live database. On an existing production DB with any drift (extra tables,
# renamed columns) it wants to DROP data — silently destroying live invoices
# is not acceptable, and failing the deploy on every restart is worse.
# Schema changes on an existing database must be applied manually:
#   docker exec -it <container> ./node_modules/.bin/prisma db push
# and reviewed before confirming.
# ---------------------------------------------------------------------------
if [ "$RUN_DB_PUSH" = "1" ]; then
  PRISMA="./node_modules/.bin/prisma"
  if [ ! -x "$PRISMA" ]; then
    echo "❌ Prisma CLI not found at $PRISMA — the Docker image is missing node_modules/.bin. Refusing to start." >&2
    exit 1
  fi
  echo "RUN_DB_PUSH=1 — applying schema (prisma db push)..."
  MAX_TRIES=5
  TRY=1
  until "$PRISMA" db push --skip-generate; do
    TRY=$((TRY + 1))
    if [ "$TRY" -gt "$MAX_TRIES" ]; then
      echo "❌ prisma db push failed after $MAX_TRIES attempts. Refusing to start with a drifted schema." >&2
      exit 1
    fi
    echo "⚠️  db push attempt $TRY failed — retrying in 5s..."
    sleep 5
  done
  echo "✅ Database schema is in sync."
fi

exec node server.js
