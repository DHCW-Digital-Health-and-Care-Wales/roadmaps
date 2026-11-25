#!/usr/bin/env bash
# The API's local commands, run for this checkout's worktree slot (the root package's
# api:* scripts call them through apps/api/package.json):
#
#   db-up    start the slot's PostgreSQL 18 container if it is not running, then
#            bootstrap its roles and local logins (tools/bootstrap_database.py)
#   db-down  stop and remove it, keeping its data volume
#   migrate  db-up, then the migrations, as the migration login
#   dev      migrate, then the API with reload on the slot's API_PORT, as the
#            application's login
#   test     db-up, then pytest under coverage against it, locally and in CI
#
# Ports and the Compose project come from the .env.worktree that
# scripts/worktree/worktree.sh writes; outside a worktree the API takes 8000 and its
# database 15432.
set -euo pipefail

API_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$API_DIR/../../.env.worktree"

# One KEY=value line of .env.worktree, read without sourcing the file.
worktree_value() {
  sed -n "s/^$1=\([A-Za-z0-9-]*\)\$/\1/p" "$ENV_FILE" | tail -n 1
}

if [ -f "$ENV_FILE" ]; then
  API_PORT="$(worktree_value API_PORT)"
  DB_PORT="$(worktree_value DB_PORT)"
  DB_PROJECT="$(worktree_value API_DB_PROJECT)"
  if [ -z "$API_PORT" ] || [ -z "$DB_PORT" ] || [ -z "$DB_PROJECT" ]; then
    echo "api: .env.worktree has no API_PORT, DB_PORT or API_DB_PROJECT — rerun pnpm worktree:setup" >&2
    exit 1
  fi
else
  # The editor's dev proxy falls back to the same 8000 (scripts/worktree/dev-ports.ts).
  API_PORT=8000
  DB_PORT=15432
  DB_PROJECT=roadmaps-api
fi

# Compose's superuser, taken only by the bootstrap and the test harness, and the two
# logins the bootstrap makes, with the fixed local passwords of
# tools/bootstrap_database.py.
DB_ADDRESS="127.0.0.1:$DB_PORT/roadmaps"
ADMIN_DATABASE_URL="postgresql+psycopg://roadmaps:roadmaps@$DB_ADDRESS"
MIGRATION_DATABASE_URL="postgresql+psycopg://roadmaps_migrator_login:roadmaps@$DB_ADDRESS"
APP_DATABASE_URL="postgresql+psycopg://roadmaps_app_login:roadmaps@$DB_ADDRESS"

compose() {
  DB_PORT="$DB_PORT" docker compose --project-name "$DB_PROJECT" \
    --file "$API_DIR/compose.yaml" "$@"
}

db_up() {
  compose up --detach --wait --quiet-pull db
  ROADMAPS_ENV=local ROADMAPS_ADMIN_DATABASE_URL="$ADMIN_DATABASE_URL" \
    uv run --locked python -m tools.bootstrap_database
}

migrate() {
  db_up
  # Only this command's environment holds the migration login (STY-091 D31).
  ROADMAPS_MIGRATION_DATABASE_URL="$MIGRATION_DATABASE_URL" \
    uv run --locked python -m roadmaps_api.migrate
}

cd "$API_DIR"
case "${1:-}" in
  db-up) db_up ;;
  db-down) compose down ;;
  migrate) migrate ;;
  dev)
    migrate
    echo "==> API on http://127.0.0.1:$API_PORT, its database on 127.0.0.1:$DB_PORT" >&2
    # The API refuses to start with the migration login in its environment.
    unset ROADMAPS_MIGRATION_DATABASE_URL ROADMAPS_ADMIN_DATABASE_URL
    export ROADMAPS_ENV=local
    export ROADMAPS_DATABASE_URL="$APP_DATABASE_URL"
    export ROADMAPS_ALLOWED_HOSTS="127.0.0.1,localhost"
    exec uv run --locked python -m roadmaps_api.server --port "$API_PORT" --reload
    ;;
  test)
    shift
    db_up
    # The migration login a developer exported to draft a revision stays out of the run.
    unset ROADMAPS_MIGRATION_DATABASE_URL
    # The harness builds a template database from it, then one per worker
    # (tests/integration/AGENTS.md).
    export ROADMAPS_ADMIN_DATABASE_URL="$ADMIN_DATABASE_URL"
    uv run --locked coverage erase
    uv run --locked coverage run -m pytest "$@"
    uv run --locked coverage combine --quiet
    uv run --locked coverage report
    ;;
  *)
    echo "usage: $0 {db-up|db-down|migrate|dev|test [pytest args]}" >&2
    exit 2
    ;;
esac
