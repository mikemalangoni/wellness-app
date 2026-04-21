#!/usr/bin/env bash
# Usage: ./pipeline/new_migration.sh <migration_name>
# Example: ./pipeline/new_migration.sh add_weight_kg_column
#
# Creates the next migration file for today in pipeline/migrations/ with a safe DDL template.
# Naming: YYYYMMDD_NN_<name>.sql  (NN increments if multiple migrations land on the same day)
# After creating it, open the file and fill in your changes.
# Convention: all DDL must be safe to re-run (use IF NOT EXISTS / IF EXISTS guards).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <migration_name>"
  echo "Example: $0 add_weight_kg_column"
  exit 1
fi

NAME="$1"
TODAY=$(date +%Y%m%d)

# Find the highest NN already used today, increment it
LAST_NUM=$(ls "$MIGRATIONS_DIR"/${TODAY}_*.sql 2>/dev/null \
  | sed -n "s|.*/[0-9]*_\([0-9][0-9]\)_.*|\1|p" \
  | sort -n | tail -1 || true)

if [[ -z "$LAST_NUM" ]]; then
  NEXT_NUM=0
else
  NEXT_NUM=$(( 10#$LAST_NUM + 1 ))
fi

NEXT=$(printf "%02d" "$NEXT_NUM")
FILENAME="$MIGRATIONS_DIR/${TODAY}_${NEXT}_${NAME}.sql"

cat > "$FILENAME" <<EOF
-- Migration: ${TODAY}_${NEXT}_${NAME}
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
--   COMMENT ON COLUMN <table>.<col> IS '<description>';
--   COMMENT ON TABLE <table> IS '<description>';

-- Write your changes below:

EOF

echo "Created: $FILENAME"
echo "Remember to update the matching pipeline/schema/tables/*.sql file after applying."
