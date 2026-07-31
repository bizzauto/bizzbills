#!/bin/sh
set -e

echo "🗄️ Running database migrations..."
npx prisma migrate deploy 2>&1 || echo "⚠️ Migration failed or no migrations to apply"

echo "🚀 Starting application..."
exec node server.js
