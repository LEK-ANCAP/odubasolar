#!/bin/sh
set -e

echo "Starting deployment checks..."

# Check if data directory exists in prisma, if not, wait for volume mount or create it
mkdir -p /app/prisma/data

echo "Running Prisma migrations/push to sync schema with the SQLite volume..."
npx --yes prisma@5.22.0 db push --accept-data-loss --skip-generate

echo "Starting Next.js..."
exec "$@"
