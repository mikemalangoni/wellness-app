#!/usr/bin/env bash
# Usage: ./pipeline/new_migration.sh <migration_name>
# Example: ./pipeline/new_migration.sh add_water_ml_column
#
# Creates the next numbered migration file in pipeline/migrations/ with a safe DDL template.
# After creating it, open the file and fill in your changes.
# Convention: all DDL must be safe to re-run (use IF NOT EXISTS / IF EXISTS guards).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <migration_name>"
  echo "Example: $0 add_water_ml_column"
  exit 1
fi

NAME="$1"

# Find the highest existing sequence number and increment
LAST=$(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | grep -oE '^.*/[0-9]+' | grep -oE '[0-9]+$' | sort -n | tail -1)
NEXT=$(printf "%03d" $(( ${LAST:-0} + 1 )))

FILENAME="$MIGRATIONS_DIR/${NEXT}_${NAME}.sql"

cat > "$FILENAME" <<EOF
-- Migration: ${NEXT}_${NAME}
-- Safe to re-run: yes (ensure all DDL uses IF NOT EXISTS / IF EXISTS guards)
-- Applied: $(date +%Y-%m-%d)
-- Description: <describe the change>

-- Safe DDL patterns:
--   ADD COLUMN IF NOT EXISTS <col> <type>
--   DROP COLUMN IF EXISTS <col>
--   CREATE TABLE IF NOT EXISTS <table> ( ... )
--   DROP TABLE IF EXISTS <table>
--   ALTER COLUMN <col> TYPE <newtype>  -- safe only for widening casts (e.g. INT → NUMERIC)
--                                      -- add USING clause if casting between incompatible types

-- Write your changes below:

EOF

echo "Created: $FILENAME"
echo "Remember to update the matching pipeline/schema/tables/*.sql file after applying."
