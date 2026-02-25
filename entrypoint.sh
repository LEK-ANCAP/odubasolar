#!/bin/sh
set -e

echo "Starting deployment checks..."

# Check if data directory exists in prisma, if not, wait for volume mount or create it
mkdir -p /app/prisma/data

echo "Running Prisma migrations/push to sync schema with the SQLite volume..."
npx prisma db push --accept-data-loss

echo "Starting Next.js..."
exec "$@"
