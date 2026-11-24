#!/usr/bin/env bash
# Give a git worktree ports of its own, so several sessions (T3 Code threads,
# parallel agents) can run each app's dev server and E2E suite (`pnpm editor:dev`,
# `pnpm site:test:e2e`, `pnpm api:dev`, …) side by side on one host.
#
# Each worktree claims a numbered slot, and the slot fixes a block of host
# ports, written to .env.worktree at the repository's root, one file for every
# app. Each app's vite.config.ts and playwright.config.ts (and the public site's
# Lighthouse script) read that file through scripts/worktree/dev-ports.ts, and the
# API's commands through apps/api/scripts/api.sh, which also names the slot's
# database container's Compose project from it; without it they keep their
# canonical ports (the editor 5173 dev and 4173 preview and E2E, the public site
# 5174 and 4174, the API 8000 and its database 15432), so a main checkout is
# unaffected.
#
#   setup      claim a slot, write .env.worktree, install dependencies (pnpm's,
#              and the API's with uv), create apps/editor/.env.local (idempotent:
#              t3.json runs it on create)
#   teardown   stop whatever listens on the slot's ports, remove the slot's
#              database container and its volume, release the slot
#   info       print this worktree's ports
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT/.env.worktree"
REGISTRY="${RE_WORKTREE_REGISTRY:-${XDG_STATE_HOME:-$HOME/.local/state}/roadmaps/worktree-slots}"
LOCK="$REGISTRY/.lock"
# Below Linux's ephemeral range (32768+), so an outbound connection's source
# port never squats on a slot's block, and above the 20000–20999 block that
# other repositories on this host claim with the same scheme.
PORT_BASE=21000
MAX_SLOT=99
# A slot's ports, in offset order from its base: the one place the layout is
# written down.
PORT_VARS=(DEV_PORT PREVIEW_PORT SITE_DEV_PORT SITE_PREVIEW_PORT API_PORT DB_PORT)

# The Compose project of a slot's database container (apps/api/compose.yaml).
db_project() {
  echo "roadmaps-slot-$1"
}

# Removes a slot's database container and its volume, so the slot's next worktree
# starts with an empty database. By project name alone, with no Compose file, so it
# works for a worktree already deleted. Fails, naming the fix, when Docker is installed
# but cannot remove them (its daemon stopped, say): the caller then keeps the slot, so
# no worktree inherits the data. A host without Docker has no database to remove.
remove_database() {
  command -v docker >/dev/null 2>&1 || return 0
  ( cd / && docker compose --project-name "$1" down --volumes --remove-orphans >/dev/null 2>&1 ) && return 0
  echo "worktree: could not remove Compose project $1; start Docker and rerun, or run docker compose --project-name $1 down --volumes" >&2
  return 1
}

port_in_use() {
  (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null || (exec 3<>"/dev/tcp/::1/$1") 2>/dev/null
}

# A symlink lock rather than flock(1), which macOS lacks: `ln -s` creates it
# atomically with its owner's pid as the target, so a waiter breaks only a lock
# whose process has died, never a slow one.
lock() {
  local tries=0 owner
  mkdir -p "$REGISTRY"
  until ln -s "$$" "$LOCK" 2>/dev/null; do
    owner="$(readlink "$LOCK" 2>/dev/null || true)"
    if [ -n "$owner" ] && ! kill -0 "$owner" 2>/dev/null && break_dead_lock "$owner"; then
      continue
    fi
    tries=$((tries + 1))
    [ "$tries" -lt "${RE_WORKTREE_LOCK_TRIES:-600}" ] || {
      echo "worktree: registry lock held by pid ${owner:-?}; remove $LOCK and $LOCK.break if no worktree command is running" >&2
      exit 1
    }
    sleep 0.1
  done
  trap unlock EXIT
}

# Removes the lock if the dead owner still holds it. Under a second lock, so a
# waiter that saw the dead owner never removes the lock another waiter has
# taken since: it re-reads the owner first. Fails while another waiter holds
# the second lock, so the caller waits its turn; a second lock left by a crash
# runs that wait out to the error naming both locks.
break_dead_lock() {
  ln -s "$$" "$LOCK.break" 2>/dev/null || return 1
  [ "$(readlink "$LOCK" 2>/dev/null || true)" = "$1" ] && rm -f "$LOCK"
  rm -f "$LOCK.break"
}

unlock() {
  rm -f "$LOCK"
  trap - EXIT
}

# Each slot file holds its worktree's path. A worktree deleted without
# `teardown` — its path gone, and git no longer listing it — has its slot freed
# here, under the lock. A path git still lists (moved by hand, or on an
# unmounted disk) keeps its slot. A `git worktree move` unlists the old path,
# so a moved worktree reruns setup to claim a slot under its new path.
reap_stale_slots() {
  local file path listed
  listed="$(git -C "$ROOT" worktree list --porcelain 2>/dev/null || true)"
  for file in "$REGISTRY"/[0-9]*; do
    [ -e "$file" ] || continue
    path="$(sed -n 1p "$file")"
    [ -d "$path" ] && continue
    grep -qxF "worktree $path" <<<"$listed" && continue
    # Kept until its database is gone, so the slot's next worktree starts empty.
    remove_database "$(db_project "$(basename "$file")")" || continue
    rm -f "$file"
    echo "worktree: reclaimed slot $(basename "$file") from deleted $path"
  done
}

slot_ports_free() {
  local base=$((PORT_BASE + $1 * 10)) offset
  for offset in "${!PORT_VARS[@]}"; do
    port_in_use $((base + offset)) && return 1
  done
  return 0
}

# Sets SLOT to this worktree's slot, claiming the first free one if it has none.
claim_slot() {
  reap_stale_slots
  local file slot
  for file in "$REGISTRY"/[0-9]*; do
    [ -e "$file" ] || continue
    if [ "$(sed -n 1p "$file")" = "$ROOT" ]; then
      SLOT="$(basename "$file")"
      return
    fi
  done
  for slot in $(seq 1 "$MAX_SLOT"); do
    [ -e "$REGISTRY/$slot" ] && continue
    slot_ports_free "$slot" || continue
    printf '%s\n' "$ROOT" > "$REGISTRY/$slot"
    SLOT="$slot"
    return
  done
  echo "worktree: all $MAX_SLOT slots are taken — tear down an old worktree" >&2
  exit 1
}

release_slot() {
  local file
  for file in "$REGISTRY"/[0-9]*; do
    [ -e "$file" ] || continue
    [ "$(sed -n 1p "$file")" = "$ROOT" ] && rm -f "$file"
  done
  return 0
}

# Claims (or confirms) the slot and rewrites .env.worktree from it, so the
# file names the slot the registry holds for this path.
ensure_env() {
  lock
  claim_slot
  unlock

  local base=$((PORT_BASE + SLOT * 10)) offset
  # Plain KEY=VALUE lines: the dev-ports resolver (dev-ports.ts) parses them, and
  # a shell can `source` them. Written aside and renamed, so a
  # concurrent reader (a starting Vite or Playwright) never reads a
  # half-written file.
  {
    echo "# Generated by scripts/worktree/worktree.sh — slot $SLOT. Do not commit."
    echo "WORKTREE_SLOT=$SLOT"
    for offset in "${!PORT_VARS[@]}"; do
      echo "${PORT_VARS[$offset]}=$((base + offset))"
    done
    echo "API_DB_PROJECT=$(db_project "$SLOT")"
  } > "$ENV_FILE.tmp.$$"
  mv -f "$ENV_FILE.tmp.$$" "$ENV_FILE"
  # shellcheck disable=SC1090
  . "$ENV_FILE"
}

require_env() {
  [ -f "$ENV_FILE" ] || { echo "worktree: no .env.worktree — run pnpm worktree:setup" >&2; exit 1; }
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  local var
  for var in "${PORT_VARS[@]}"; do
    [ -n "${!var:-}" ] || { echo "worktree: .env.worktree has no $var — rerun pnpm worktree:setup" >&2; exit 1; }
  done
}

# Stops the listener on a port by its PID, never by a name pattern: worktrees
# share one host.
stop_port() {
  local pids
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -ti "tcp:$1" -sTCP:LISTEN 2>/dev/null || true)"
    [ -n "$pids" ] && kill $pids 2>/dev/null || true
  elif command -v fuser >/dev/null 2>&1; then
    fuser -k "$1/tcp" >/dev/null 2>&1 || true
  fi
}

setup() {
  command -v uv >/dev/null 2>&1 || {
    echo "worktree: uv is required for apps/api; install it (https://docs.astral.sh/uv/getting-started/installation/) and rerun pnpm worktree:setup" >&2
    exit 1
  }
  ensure_env

  echo "==> dependencies"
  ( cd "$ROOT" && pnpm install --frozen-lockfile )
  # Fetches the API's pinned Python too (apps/api/.python-version).
  ( cd "$ROOT/apps/api" && uv sync --locked )

  # `pnpm editor:dev` needs the editor's .env.local: vite dev does not read
  # .env.production.
  if [ ! -f "$ROOT/apps/editor/.env.local" ]; then
    cp "$ROOT/apps/editor/.env.example" "$ROOT/apps/editor/.env.local"
    echo "==> created apps/editor/.env.local from apps/editor/.env.example"
  fi

  info
}

teardown() {
  if [ -f "$ENV_FILE" ]; then
    # shellcheck disable=SC1090
    . "$ENV_FILE"
    # The database first, so stopping DB_PORT's listener below finds none; if Docker
    # cannot remove it, DB_PORT is Docker's own listener, left alone.
    local removed=true var
    if [ -n "${WORKTREE_SLOT:-}" ]; then
      remove_database "${API_DB_PROJECT:-$(db_project "$WORKTREE_SLOT")}" || removed=false
    fi
    for var in "${PORT_VARS[@]}"; do
      [ "$removed" = false ] && [ "$var" = DB_PORT ] && continue
      # A file written before a port was added lacks its line.
      if [ -n "${!var:-}" ]; then stop_port "${!var}"; fi
    done
    # The slot stays claimed until its database is gone.
    [ "$removed" = true ] || exit 1
  fi
  lock
  release_slot
  unlock
  rm -f "$ENV_FILE"
  echo "worktree: released this worktree's slot"
}

info() {
  require_env
  cat <<EOF
Worktree slot $WORKTREE_SLOT
  pnpm editor:dev                       http://localhost:$DEV_PORT
  pnpm editor:preview, editor:test:e2e  http://localhost:$PREVIEW_PORT
  pnpm site:dev                         http://localhost:$SITE_DEV_PORT/product-roadmaps/
  pnpm site:preview, site:test:e2e,     http://localhost:$SITE_PREVIEW_PORT/product-roadmaps/
    site:lighthouse
  pnpm api:dev                          http://127.0.0.1:$API_PORT
  pnpm api:db:up, api:test (database)   127.0.0.1:$DB_PORT
EOF
}

case "${1:-}" in
  setup) setup ;;
  teardown) teardown ;;
  info) info ;;
  *) echo "usage: $0 {setup|teardown|info}" >&2; exit 2 ;;
esac
