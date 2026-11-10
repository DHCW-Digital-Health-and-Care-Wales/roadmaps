#!/bin/bash
set -euo pipefail

cd "$CLAUDE_PROJECT_DIR"

# Warn when this checkout lacks commits of the remote default branch: a session on stale
# history plans and delivers against outdated records and guides, unnoticed until its PR
# conflicts. Added after the EPC-003 planning retro (2026-11-10); review by 2027-02-10.
warn_if_behind_default_branch() {
  local default behind
  default=$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null) || return 0
  if command -v timeout >/dev/null; then
    timeout 15 git fetch --quiet origin "${default#origin/}" 2>/dev/null || true
  fi
  behind=$(git rev-list --count "HEAD..$default" 2>/dev/null) || return 0
  if [ "$behind" -gt 0 ]; then
    echo "==> Warning: HEAD lacks $behind commit(s) of $default. Branch from or rebase onto $default before writing records or code."
  fi
}
warn_if_behind_default_branch

# Only prepare remote (web) sessions; a local checkout is set up by its owner.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "==> Installing dependencies..."
pnpm install --frozen-lockfile

# `pnpm dev` needs .env.local: vite dev does not read .env.production.
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "==> Created .env.local from .env.example."
fi

cat <<'HINT'
==> On demand (nothing started yet):
      pnpm dev                                      http://localhost:5173
      pnpm exec playwright install --with-deps chromium   before the first pnpm test:e2e
HINT
