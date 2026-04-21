#!/usr/bin/env bash
# Runs only migration files that this branch adds relative to main.
# Compares pipeline/migrations/ between the current branch and main using git,
# and applies only the files that are new on this branch — in sorted order.
#
# Usage: bash pipeline/run_migrations.sh
#        npm run db:migrate
#
# Run this before merging a PR so the DB and the merged code stay in sync.
# After merge, running this against main produces no output (no new files).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL is not set."
  exit 1
fi

# Find migration files added on this branch that are not yet in main
NEW_FILES=$(git -C "$REPO_ROOT" diff --name-only --diff-filter=A main...HEAD -- pipeline/migrations/ \
  | sort)

if [[ -z "$NEW_FILES" ]]; then
  echo "No new migration files on this branch relative to main. Nothing to apply."
  exit 0
fi

echo "Migrations to apply:"
echo "$NEW_FILES" | sed 's/^/  /'
echo ""

for RELATIVE_PATH in $NEW_FILES; do
  FILE="$REPO_ROOT/$RELATIVE_PATH"
  echo "Applying $(basename "$FILE")..."
  psql "$DATABASE_URL" -f "$FILE"
  echo "  done."
done

echo ""
echo "All branch migrations applied."
