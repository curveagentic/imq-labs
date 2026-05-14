#!/usr/bin/env bash
set -euo pipefail

# Apply infra/db/init.sql against the database in DATABASE_URL.
# Usage:
#   DATABASE_URL=postgres://afrostream:afrostream@localhost:5432/afrostream ./scripts/db_init.sh

DB_URL="${DATABASE_URL:-postgres://afrostream:afrostream@localhost:5432/afrostream}"
SQL_DIR="$(dirname "$0")/../infra/db"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found. Install postgres client (brew install libpq && brew link --force libpq), or run via docker:"
  echo "  docker exec -i afrostream-postgres psql -U afrostream -d afrostream < $SQL_DIR/init.sql"
  exit 1
fi

psql "$DB_URL" -f "$SQL_DIR/init.sql"
psql "$DB_URL" -f "$SQL_DIR/init_v2.sql"
echo "Schema applied (init.sql + init_v2.sql)."
