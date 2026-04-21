#!/usr/bin/env bash
# Runs all migration files in pipeline/migrations/ in sorted order.
# All migrations must be idempotent (safe to re-run) — use IF NOT EXISTS / IF EXISTS throughout.
# Usage: bash pipeline/run_migrations.sh
#        npm run db:migrate

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL is not set."
  exit 1
fi

MIGRATIONS=$(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort)

if [[ -z "$MIGRATIONS" ]]; then
  echo "No migration files found in $MIGRATIONS_DIR"
  exit 0
fi

for FILE in $MIGRATIONS; do
  echo "Applying $(basename "$FILE")..."
  psql "$DATABASE_URL" -f "$FILE"
  echo "  done."
done

echo "All migrations applied."
