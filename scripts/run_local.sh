#!/usr/bin/env bash
set -euo pipefail

# One-shot local launcher.
#   1. Brings up Postgres + MinIO via docker compose
#   2. Installs dependencies (npm ci falls back to npm install)
#   3. Copies .env.example -> .env where missing
#   4. Starts API and Web in parallel via npm run dev

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== AfroStream local launcher =="

# 1) Stack
docker compose -f infra/docker-compose.yml up -d
echo "Waiting for Postgres..."
for i in {1..30}; do
  if docker exec afrostream-postgres pg_isready -U afrostream >/dev/null 2>&1; then break; fi
  sleep 1
done

# 2) .env files
if [ ! -f services/api/.env ]; then
  cp services/api/.env.example services/api/.env
  echo "Created services/api/.env from example. Add your FAL_KEY for AI features."
fi
if [ ! -f apps/web/.env.local ]; then
  cp apps/web/.env.example apps/web/.env.local
  echo "Created apps/web/.env.local from example."
fi

# 3) Install deps if missing
if [ ! -d node_modules ]; then npm install; fi

# 4) Run dev (uses concurrently from root package.json)
exec npm run dev
